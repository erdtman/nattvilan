#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const { marked } = require('marked');

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const ICONS = {
  home: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
  bed:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
  leaf: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
  tag:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  cal:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  pin:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
};

// Background image shown in compact header on each section page
const SECTION_IMAGES = {
  'boende':        'nattvilan-common-area.jpg',
  'accommodation': 'nattvilan-common-area.jpg',
  'om-garden':     'flying-over-nybygget-facing-north.jpg',
  'about':         'flying-over-nybygget-facing-north.jpg',
  'priser':        'nattvilan-front.jpg',
  'prices':        'nattvilan-front.jpg',
  'bokning':       'fence-summer.jpg',
  'booking':       'fence-summer.jpg',
  'hitta-hit':     'panorama-over-nybygget.jpg',
  'directions':    'panorama-over-nybygget.jpg',
};

// Hero slideshow images (used on landing page only)
const HERO_IMAGES = [
  'images/flying-over-nybygget-facing-north.jpg',
  'images/fence-summer.jpg',
  'images/nattvilan-front.jpg',
  'images/panorama-over-nybygget.jpg',
];

// ─── Language configs ─────────────────────────────────────────────────────────

const LANG_CONFIGS = {
  sv: {
    mdFile:      'swedish/index.md',
    homeUrl:     '/',
    homePath:    'index.html',
    homeDir:     '.',
    altLang:     'en',
    altLabel:    'English',
    altHomeUrl:  '/en/',
    siteTitle:   'Nattvilan',
    homeTitle:   'Nattvilan – Familjärt och naturnära boende utanför Växjö',
    homeDesc:    'Vandrarhem och Timmerhuset i natursköna Skir, strax utanför Växjö. Boende för 1–5 personer. Frukost, djur, sjöar och natursköna promenadstigar.',
    readMore:    'Läs mer',
    homeNav:     'Hem',
    bookUrl:     '/bokning/',
    bookLabel:   'Boka nu',
    langIcon:    'icons/sweden_round_icon_64.png',
    altLangIcon: 'icons/united_kingdom_round_icon_64.png',
  },
  en: {
    mdFile:      'english/index.md',
    homeUrl:     '/en/',
    homePath:    'en/index.html',
    homeDir:     'en',
    altLang:     'sv',
    altLabel:    'Svenska',
    altHomeUrl:  '/',
    siteTitle:   'Nattvilan',
    homeTitle:   'Nattvilan – Cosy nature retreat near Växjö, Sweden',
    homeDesc:    'Family-run hostel and Timber House in scenic Skir, just outside Växjö. Rooms for 1–5 persons with breakfast, animals, lakes, and forest walks.',
    readMore:    'Read more',
    homeNav:     'Home',
    bookUrl:     '/en/booking/',
    bookLabel:   'Book now',
    langIcon:    'icons/united_kingdom_round_icon_64.png',
    altLangIcon: 'icons/sweden_round_icon_64.png',
  },
};

// ─── Output directory ─────────────────────────────────────────────────────────

const DIST = 'dist';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

function excerpt(sectionHtml, maxLen = 170) {
  const m = sectionHtml.match(/<p>([\s\S]*?)<\/p>/);
  if (!m) return '';
  const txt = stripTags(m[1]).trim().replace(/\s+/g, ' ');
  return txt.length > maxLen ? txt.slice(0, maxLen).replace(/\s+\S*$/, '') + '…' : txt;
}

function sectionIcon(slug) {
  const map = {
    boende: ICONS.bed, accommodation: ICONS.bed,
    'om-garden': ICONS.leaf, about: ICONS.leaf,
    priser: ICONS.tag, prices: ICONS.tag,
    bokning: ICONS.cal, booking: ICONS.cal,
    'hitta-hit': ICONS.pin, directions: ICONS.pin,
  };
  return map[slug] || ICONS.home;
}

// Compute path prefix from output file path to repo root
// e.g. 'boende/index.html' → '../', 'en/accommodation/index.html' → '../../'
function assetsPrefix(outFile) {
  const depth = outFile.split('/').length - 1; // number of directories deep
  return depth === 0 ? '' : '../'.repeat(depth);
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function distFile(relPath) {
  return path.join(DIST, relPath);
}

// ─── Markdown → sections ──────────────────────────────────────────────────────

function parseMd(lang) {
  const cfg  = LANG_CONFIGS[lang];
  const md   = fs.readFileSync(cfg.mdFile, 'utf8');
  const html = marked.parse(md);

  // Split on <h2> boundaries
  const firstH2 = html.search(/<h2[\s>]/);
  const intro    = firstH2 >= 0 ? html.slice(0, firstH2) : html;
  const rest     = firstH2 >= 0 ? html.slice(firstH2) : '';

  const sections = [];
  for (const part of rest.split(/(?=<h2[\s>])/)) {
    if (!part.trim()) continue;
    const m = part.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    if (!m) continue;
    const title = stripTags(m[1]).trim();
    const id    = slugify(title);
    sections.push({ id, title, html: part, url: `/${lang === 'en' ? 'en/' : ''}${id}/` });
  }

  // Hero info from intro
  const heroTitle    = stripTags((intro.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || 'Nattvilan').trim();
  const heroSubtitle = stripTags((intro.match(/<strong>([\s\S]*?)<\/strong>/) || [])[1] || '').trim();

  // Contact from full content
  const allText = sections.map(s => s.html).join(' ');
  const email   = 'info@nattvilan.se';
  const phones  = [...allText.matchAll(/07[0-9][-\s][\d\s-]{8,}/g)].map(m => m[0].trim());

  return { sections, heroTitle, heroSubtitle, email, phones };
}

// ─── HTML builders ────────────────────────────────────────────────────────────

function buildNav(sections, lang, activePath) {
  const cfg = LANG_CONFIGS[lang];
  const homeActive = activePath === cfg.homeUrl ? ' active' : '';
  let html = `  <a href="${cfg.homeUrl}" class="nav-item${homeActive}" aria-current="${homeActive ? 'page' : 'false'}">
    <span class="nav-icon">${ICONS.home}</span>
    <span class="nav-label">${cfg.homeNav}</span>
  </a>`;

  for (const s of sections) {
    const active = activePath === s.url ? ' active' : '';
    html += `
  <a href="${s.url}" class="nav-item${active}" aria-current="${active ? 'page' : 'false'}">
    <span class="nav-icon">${sectionIcon(s.id)}</span>
    <span class="nav-label">${s.title}</span>
  </a>`;
  }
  return html;
}

function buildFooter(email, phones) {
  const phonesHtml = phones
    .map(p => `<a href="tel:+46${p.replace(/^0/, '').replace(/[\s-]/g, '')}">${p}</a>`)
    .join(' &nbsp;·&nbsp; ');
  return `  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <span class="footer-logo">Nattvilan</span>
        <p class="footer-tagline">Skir Nybygget 1 &nbsp;·&nbsp; 355 91 Växjö</p>
      </div>
      <div class="footer-contact">
        <a href="mailto:${email}">${email}</a>
        <span class="footer-phones">${phonesHtml}</span>
      </div>
      <p class="footer-copy">© 2013–2025 Nattvilan</p>
    </div>
  </footer>`;
}

function buildJsonLd(lang, pageTitle, pageDesc, pageUrl) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": "Nattvilan",
    "description": pageDesc,
    "url": pageUrl,
    "telephone": ["+46705980031", "+46704441257"],
    "email": "info@nattvilan.se",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Skir Nybygget 1",
      "postalCode": "355 91",
      "addressLocality": "Växjö",
      "addressCountry": "SE"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 56.828152,
      "longitude": 14.855422
    },
    "priceRange": "SEK 425–880 per room/night",
    "currenciesAccepted": "SEK"
  }, null, 2);
}

// ─── Page generators ──────────────────────────────────────────────────────────

function buildHomePage(lang, data, altData) {
  const cfg      = LANG_CONFIGS[lang];
  const altCfg   = LANG_CONFIGS[cfg.altLang];
  const pfx      = assetsPrefix(cfg.homePath);
  const template = fs.readFileSync('src/template-home.html', 'utf8');

  // Hero slides
  const slides = HERO_IMAGES.map((img, i) =>
    `    <div class="hero-slide${i === 0 ? ' active' : ''}" style="background-image:url('${pfx}${img}')" role="img" aria-label="Nattvilan"></div>`
  ).join('\n');

  // Section cards
  const cards = data.sections.map((s, i) => {
    const altSection = altData.sections[i];
    return `    <a class="section-card" href="${s.url}">
      <span class="card-icon">${sectionIcon(s.id)}</span>
      <h2 class="card-title">${s.title}</h2>
      <p class="card-excerpt">${excerpt(s.html)}</p>
      <span class="card-cta">${cfg.readMore} →</span>
    </a>`;
  }).join('\n');

  // Nav (home page is active)
  const nav = buildNav(data.sections, lang, cfg.homeUrl);

  const canonical    = `https://nattvilan.se${cfg.homeUrl}`;
  const altCanonical = `https://nattvilan.se${altCfg.homeUrl}`;

  const page = template
    .replace(/\{\{LANG\}\}/g,           lang)
    .replace(/\{\{TITLE\}\}/g,          cfg.homeTitle)
    .replace(/\{\{DESCRIPTION\}\}/g,    cfg.homeDesc)
    .replace(/\{\{CANONICAL\}\}/g,      canonical)
    .replace(/\{\{ALT_LANG\}\}/g,       cfg.altLang)
    .replace(/\{\{ALT_CANONICAL\}\}/g,  altCanonical)
    .replace(/\{\{ALT_LANG_PATH\}\}/g,  cfg.altHomeUrl)
    .replace(/\{\{ALT_LANG_LABEL\}\}/g, cfg.altLabel)
    .replace(/\{\{ASSETS_PATH\}\}/g,    pfx)
    .replace(/\{\{HERO_SLIDES\}\}/g,    slides)
    .replace(/\{\{HERO_TITLE\}\}/g,     data.heroTitle)
    .replace(/\{\{HERO_SUBTITLE\}\}/g,  data.heroSubtitle)
    .replace(/\{\{FIRST_SECTION\}\}/g,  data.sections[0]?.url || '/')
    .replace(/\{\{BOOK_URL\}\}/g,       cfg.bookUrl)
    .replace(/\{\{BOOK_LABEL\}\}/g,     cfg.bookLabel)
    .replace(/\{\{LANG_ICON\}\}/g,      `${pfx}${cfg.langIcon}`)
    .replace(/\{\{ALT_LANG_ICON\}\}/g,  `${pfx}${cfg.altLangIcon}`)
    .replace(/\{\{NAV_ITEMS\}\}/g,      nav)
    .replace(/\{\{SECTION_CARDS\}\}/g,  cards)
    .replace(/\{\{JSON_LD\}\}/g,        buildJsonLd(lang, cfg.homeTitle, cfg.homeDesc, canonical))
    .replace(/\{\{FOOTER\}\}/g,         buildFooter(data.email, data.phones));

  const out = distFile(cfg.homePath);
  ensureDir(out);
  fs.writeFileSync(out, page, 'utf8');
  console.log(`✓  ${out}`);
}

function buildSectionPage(section, lang, allSections, altSection) {
  const cfg    = LANG_CONFIGS[lang];
  const altCfg = LANG_CONFIGS[cfg.altLang];
  const outFile = `${lang === 'en' ? 'en/' : ''}${section.id}/index.html`;
  const pfx     = assetsPrefix(outFile);

  const template = fs.readFileSync('src/template-section.html', 'utf8');

  // Section content: add map for directions
  let content = section.html;
  if (section.id === 'hitta-hit' || section.id === 'directions') {
    content += `
<div class="map-wrap">
  <iframe
    src="https://www.openstreetmap.org/export/embed.html?bbox=14.840%2C56.823%2C14.870%2C56.834&amp;layer=mapnik&amp;marker=56.828152%2C14.855422"
    title="Karta / Map"
    loading="lazy"
    allowfullscreen></iframe>
  <a class="map-link" href="https://www.openstreetmap.org/?mlat=56.828152&amp;mlon=14.855422#map=15/56.828152/14.855422" target="_blank" rel="noopener">
    ${section.id === 'directions' ? 'Open in OpenStreetMap' : 'Öppna i OpenStreetMap'}
  </a>
</div>`;
  }

  const nav          = buildNav(allSections, lang, section.url);
  const canonical    = `https://nattvilan.se${section.url}`;
  const altUrl       = altSection ? `https://nattvilan.se${altSection.url}` : `https://nattvilan.se${altCfg.homeUrl}`;
  const altPath      = altSection ? altSection.url : altCfg.homeUrl;
  const headerImg    = `${pfx}images/${SECTION_IMAGES[section.id] || 'nattvilan-front.jpg'}`;
  const pageTitle    = `${section.title} – Nattvilan`;
  const pageDesc     = excerpt(section.html, 155);

  const page = template
    .replace(/\{\{LANG\}\}/g,           lang)
    .replace(/\{\{TITLE\}\}/g,          pageTitle)
    .replace(/\{\{DESCRIPTION\}\}/g,    pageDesc)
    .replace(/\{\{CANONICAL\}\}/g,      canonical)
    .replace(/\{\{ALT_LANG\}\}/g,       cfg.altLang)
    .replace(/\{\{ALT_CANONICAL\}\}/g,  altUrl)
    .replace(/\{\{ALT_LANG_PATH\}\}/g,  altPath)
    .replace(/\{\{ALT_LANG_LABEL\}\}/g, cfg.altLabel)
    .replace(/\{\{ASSETS_PATH\}\}/g,    pfx)
    .replace(/\{\{HOME_URL\}\}/g,       cfg.homeUrl)
    .replace(/\{\{SITE_TITLE\}\}/g,     cfg.siteTitle)
    .replace(/\{\{SECTION_TITLE\}\}/g,  section.title)
    .replace(/\{\{HEADER_IMAGE\}\}/g,   headerImg)
    .replace(/\{\{BOOK_URL\}\}/g,       cfg.bookUrl)
    .replace(/\{\{BOOK_LABEL\}\}/g,     cfg.bookLabel)
    .replace(/\{\{LANG_ICON\}\}/g,      `${pfx}${cfg.langIcon}`)
    .replace(/\{\{ALT_LANG_ICON\}\}/g,  `${pfx}${cfg.altLangIcon}`)
    .replace(/\{\{NAV_ITEMS\}\}/g,      nav)
    .replace(/\{\{CONTENT\}\}/g,        content)
    .replace(/\{\{JSON_LD\}\}/g,        buildJsonLd(lang, pageTitle, pageDesc, canonical))
    .replace(/\{\{FOOTER\}\}/g,         buildFooter('info@nattvilan.se', ['070-598 00 31', '070-444 12 57']));

  const out = distFile(outFile);
  ensureDir(out);
  fs.writeFileSync(out, page, 'utf8');
  console.log(`✓  ${out}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function build() {
  // Clean and recreate dist
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // Copy assets (CSS/JS)
  fs.mkdirSync(distFile('assets'), { recursive: true });
  fs.copyFileSync('src/style.css', distFile('assets/style.css'));
  fs.copyFileSync('src/main.js',   distFile('assets/main.js'));

  // Copy images and icons
  if (fs.existsSync('images')) {
    fs.cpSync('images', distFile('images'), { recursive: true });
  }
  if (fs.existsSync('icons')) {
    fs.cpSync('icons', distFile('icons'), { recursive: true });
  }

  // Prevent Jekyll processing on GitHub Pages
  fs.writeFileSync(distFile('.nojekyll'), '', 'utf8');

  const svData = parseMd('sv');
  const enData = parseMd('en');

  // Landing pages
  buildHomePage('sv', svData, enData);
  buildHomePage('en', enData, svData);

  // One page per section
  for (let i = 0; i < svData.sections.length; i++) {
    buildSectionPage(svData.sections[i], 'sv', svData.sections, enData.sections[i]);
    buildSectionPage(enData.sections[i], 'en', enData.sections, svData.sections[i]);
  }

  console.log('\nBuild complete. Run: npm run serve');
}

build();
