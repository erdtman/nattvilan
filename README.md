# Nattvilan

Static website for Nattvilan, a family-run hostel and Timber House in Skir, just outside Växjö, Sweden.

## How it works

Content is maintained in a Google Doc (one tab for Swedish, one for English). A build script fetches the doc, converts it to Markdown, and generates a fully static site in the `dist/` folder. The site is hosted on GitHub Pages.

```
Google Doc → fetch-docs.js → swedish/index.md + english/index.md → build.js → dist/
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the Google Doc ID

Copy `.env.example` to `.env` and fill in the Google Doc ID:

```bash
cp .env.example .env
```

Then open `.env` and set:

```
GOOGLE_DOC_ID=your-google-doc-id-here
```

The doc ID is the long string in the Google Doc URL:
`https://docs.google.com/document/d/**THIS_PART**/edit`

The Google Doc must be shared as **"Anyone with the link can view"**.

## Updating content

Edit the Google Doc (Swedish tab or English tab), then run:

```bash
npm run fetch-build-deploy
```

This fetches the latest content, rebuilds the site, and publishes it to GitHub Pages in one step.

## NPM scripts

| Command | Description |
|---|---|
| `npm run fetch` | Download content from Google Docs and write Markdown files |
| `npm run build` | Build the static site from the Markdown files |
| `npm run fetch-build` | Fetch and build |
| `npm run deploy` | Publish `dist/` to the `gh-pages` branch |
| `npm run fetch-build-deploy` | Fetch, build, and deploy in one step |
| `npm run serve` | Serve the site locally at http://localhost:3000 |

## Google Doc structure

The doc has two tabs:

- **svenska** — Swedish content
- **english** — English content

Use Google Docs heading styles (not manual bold/size) so the structure maps correctly:

- **Heading 1** — page title
- **Heading 2** — sections (shown in navigation)
- **Heading 3** — subsections
- Tables, bold text, and bullet lists work as normal

## Project structure

```
build.js          # Generates the static site from Markdown
fetch-docs.js     # Downloads content from Google Docs
src/              # HTML templates and CSS/JS assets
images/           # Site images
icons/            # Flag icons for language switcher
dist/             # Generated site (not committed, deployed to gh-pages)
swedish/          # Generated Markdown (not committed)
english/          # Generated Markdown (not committed)
.env              # Google Doc ID (not committed)
.env.example      # Template for .env
```
