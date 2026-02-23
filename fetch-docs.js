#!/usr/bin/env node
'use strict';

/**
 * fetch-docs.js
 *
 * Downloads content from a single Google Doc (shared as "Anyone with the
 * link can view") that contains both Swedish and English sections, and
 * writes them to swedish/index.md and english/index.md.
 *
 * The doc is split at the paragraph styled as "Title" containing the word
 * "english" — Swedish content comes first, English follows.
 *
 * Usage:
 *   node fetch-docs.js
 */

const https  = require('https');
const fs     = require('fs');
const TurndownService = require('turndown');
const { tables }     = require('turndown-plugin-gfm');

// ─── Config ───────────────────────────────────────────────────────────────────

const DOC_ID = '1fIM9SLyOoXb8XFOoK70QTJiykIpPgHCUoJgJO3c2ITI';

const OUTPUTS = {
  sv: 'swedish/index.md',
  en: 'english/index.md',
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const doRequest = (targetUrl, redirectCount = 0) => {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));
      https.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return doRequest(res.headers.location, redirectCount + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${targetUrl}`));
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', reject);
      }).on('error', reject);
    };
    doRequest(url);
  });
}

// ─── HTML processing ──────────────────────────────────────────────────────────

function extractBody(html) {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : html;
}

/**
 * Split the body HTML using "Title"-styled paragraphs as language dividers.
 * Google Docs renders the built-in "Title" style as <p class="... title ...">.
 * The doc structure is: [svenska title] Swedish content [english title] English content.
 * Returns [svHtml, enHtml].
 */
function splitLanguages(body) {
  // Collect all title-styled paragraphs with their positions
  const titleRe = /<p[^>]*\btitle\b[^>]*>([\s\S]*?)<\/p>/gi;
  const titles  = [];
  let m;
  while ((m = titleRe.exec(body)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
    titles.push({ text, start: m.index, end: m.index + m[0].length });
  }

  const svTitle = titles.find(t => t.text.includes('svenska') || t.text.includes('swedish'));
  const enTitle = titles.find(t => t.text.includes('english'));

  if (!enTitle) {
    throw new Error('Could not find the "english" divider in the Google Doc. ' +
      'Make sure there is a paragraph styled as "Title" containing the word "english".');
  }

  const svStart = svTitle ? svTitle.end : 0;
  return [body.slice(svStart, enTitle.start), body.slice(enTitle.end)];
}

function stripAttributes(html) {
  return html
    .replace(/\s+(style|class|id|dir|lang|data-[a-z-]+)="[^"]*"/gi, '')
    .replace(/\s+(style|class|id|dir|lang)='[^']*'/gi, '');
}

/**
 * Google Docs wraps every table cell's content in a <p> tag.
 * Turndown adds newlines around block elements, which breaks Markdown table
 * syntax. Strip the <p> wrapper inside <td>/<th> before converting.
 */
function flattenTableCells(html) {
  return html.replace(/(<(?:td|th)[^>]*>)\s*<p[^>]*>([\s\S]*?)<\/p>\s*(<\/(?:td|th)>)/gi,
    (_, open, content, close) => open + content.trim() + close);
}

function collapseBlankLines(md) {
  return md.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// ─── Turndown setup ───────────────────────────────────────────────────────────

function makeTurndown() {
  const td = new TurndownService({
    headingStyle:     'atx',
    bulletListMarker: '-',
    codeBlockStyle:   'fenced',
    hr:               '---',
  });

  td.use(tables);

  // Strip <span> wrappers, keep their text
  td.addRule('removeSpans', {
    filter: 'span',
    replacement: content => content,
  });

  // Keep <hr> as ---
  td.addRule('hr', {
    filter: 'hr',
    replacement: () => '\n\n---\n\n',
  });

  return td;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const exportUrl = `https://docs.google.com/document/d/${DOC_ID}/export?format=html`;
  console.log(`↓  Fetching doc (${DOC_ID.slice(0, 8)}…)`);

  const html = await fetchUrl(exportUrl);
  const body = extractBody(html);

  let svHtml, enHtml;
  try {
    [svHtml, enHtml] = splitLanguages(body);
  } catch (err) {
    console.error(`✗  ${err.message}`);
    process.exit(1);
  }

  const td = makeTurndown();

  for (const [lang, rawHtml] of [['sv', svHtml], ['en', enHtml]]) {
    const clean = flattenTableCells(stripAttributes(rawHtml));
    let md = td.turndown(clean);
    md = collapseBlankLines(md);
    fs.mkdirSync(require('path').dirname(OUTPUTS[lang]), { recursive: true });
    fs.writeFileSync(OUTPUTS[lang], md, 'utf8');
    console.log(`✓  Written to ${OUTPUTS[lang]} (${md.length} chars)`);
  }
}

main().catch(err => {
  console.error(`✗  ${err.message}`);
  process.exit(1);
});
