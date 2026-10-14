#!/usr/bin/env node
/* Site checks. Run after the build:  npm run build && npm run check
   1. data/facts.json matches data/facts.schema.json
   2. every page is valid HTML (html-validate, recommended rules)
   3. every internal link, image, script and #anchor resolves
   4. the sitemap lists every page, and only pages that exist
   5. no unfilled placeholders on the pages or in the PDFs, and every PDF carries
      Stephanie's name and the edition from the facts file
   Exits 1 on any failure, so CI blocks the pull request. */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, posix, basename } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { HtmlValidate, StaticConfigLoader } from 'html-validate';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { SITE, TBC, readJSON, readText, get } from './lib/util.mjs';
import { HANDBOOKS } from './lib/handbooks.mjs';

const failures = [];
const fail = (section, msg) => failures.push(`[${section}] ${msg}`);
const facts = readJSON('data/facts.json');

function walk(dir, ext, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}
const pages = walk(SITE, '.html').sort();
const urlOf = file => '/' + relative(SITE, file).split('\\').join('/').replace(/(^|\/)index\.html$/, '$1');

/* 1. Facts schema */
{
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(readJSON('data/facts.schema.json'));
  if (!validate(facts)) for (const e of validate.errors) fail('facts', `${e.instancePath || '/'} ${e.message}`);
}

/* 2. HTML validity */
{
  const hv = new HtmlValidate(new StaticConfigLoader({
    extends: ['html-validate:recommended'],
    rules: {
      'no-inline-style': 'off',                                  // segment widths and the print documents use style attributes
      'doctype-style': ['error', { style: 'lowercase' }],
      'prefer-native-element': ['error', { exclude: ['radio'] }], // the grade picker is an ARIA radio group by design
      'long-title': ['error', { maxlength: 80 }],                 // plan titles carry week, topic and grade
      'tel-non-breaking': ['error', { ignoreClasses: ['tel'] }]   // .tel links are white-space: nowrap
    }
  }));
  for (const file of pages) {
    const report = await hv.validateFile(file);
    for (const r of report.results) for (const m of r.messages) fail('html', `${urlOf(file)}:${m.line}:${m.column} ${m.ruleId}: ${m.message}`);
  }
}

/* 3. Internal links and anchors */
const htmlCache = new Map();
const htmlOf = file => { if (!htmlCache.has(file)) htmlCache.set(file, readFileSync(file, 'utf8')); return htmlCache.get(file); };
const idsOf = file => new Set([...htmlOf(file).matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
function resolveFile(path) {
  const abs = join(SITE, decodeURIComponent(path));
  if (path.endsWith('/')) return existsSync(join(abs, 'index.html')) ? join(abs, 'index.html') : null;
  if (existsSync(abs) && statSync(abs).isFile()) return abs;
  if (existsSync(join(abs, 'index.html'))) return join(abs, 'index.html');
  return null;
}
{
  let checked = 0;
  for (const file of pages) {
    const here = urlOf(file);
    const html = htmlOf(file).replace(/<script\b[^>]*type="application\/(?:ld\+)?json"[^>]*>[\s\S]*?<\/script>/g, '');
    for (const [, attr, raw] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
      const ref = raw.replace(/&amp;/g, '&');
      if (!ref) { fail('links', `${here}: empty ${attr}`); continue; }
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref)) continue; // http, https, mailto, tel, data
      if (ref.startsWith('/_vercel/')) continue;               // served by Vercel itself
      checked++;
      const [withQuery, hash] = ref.split('#');
      const pathPart = withQuery.split('?')[0];
      let targetFile = file;
      if (pathPart) {
        const from = posix.dirname(here.endsWith('/') ? here + 'index.html' : here);
        targetFile = resolveFile(pathPart.startsWith('/') ? pathPart : posix.join(from, pathPart));
      }
      if (!targetFile) { fail('links', `${here}: ${attr}="${raw}" points to a missing file`); continue; }
      if (hash && targetFile.endsWith('.html') && !idsOf(targetFile).has(decodeURIComponent(hash))) fail('links', `${here}: ${attr}="${raw}" has no #${hash} on the target page`);
    }
  }
  if (!checked) fail('links', 'no internal links found; the checker is broken');
}

/* 4. Sitemap */
{
  const xml = readFileSync(join(SITE, 'sitemap.xml'), 'utf8');
  const base = facts.site.url.replace(/\/$/, '');
  const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const listedPaths = new Set();
  for (const loc of listed) {
    if (!loc.startsWith(base + '/')) { fail('sitemap', `${loc} is not under ${base}`); continue; }
    const path = loc.slice(base.length);
    listedPaths.add(path);
    if (!resolveFile(path)) fail('sitemap', `${loc} has no page`);
  }
  for (const file of pages) if (!listedPaths.has(urlOf(file))) fail('sitemap', `${urlOf(file)} is missing from sitemap.xml`);
}

/* 5. Placeholders, byline and edition */
const BANNED = [/\{\{/, /\[Director/i, /For Coaches Only/i, /lorem ipsum/i, /\bTODO\b/];
for (const file of pages) {
  const text = htmlOf(file).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  for (const re of BANNED) if (re.test(text)) fail('content', `${urlOf(file)} contains ${re}`);
}
{
  // Compare with spaces removed and case folded: the PDFs set some lines in capitals
  // with letter-spacing, which text extraction returns as "ABDALL A" or "C S A".
  const squash = s => String(s).normalize('NFKC').replace(/\s+/g, '').toLowerCase();
  const pdfs = walk(join(SITE, 'resources'), '.pdf');
  if (pdfs.length !== HANDBOOKS.length) fail('pdf', `expected ${HANDBOOKS.length} PDFs in website/resources, found ${pdfs.length}`);
  const texts = new Map();
  for (const file of pdfs) {
    const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0, isEvalSupported: false }).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      text += content.items.map(it => it.str).join(' ') + '\n';
    }
    await doc.destroy();
    const name = relative(SITE, file);
    const flat = squash(text);
    texts.set(basename(file), flat);
    for (const bad of ['{{', '[director', 'forcoachesonly', 'loremipsum']) if (flat.includes(bad)) fail('pdf', `${name} contains "${bad}"`);
    if (!flat.includes(squash(facts.director.name))) fail('pdf', `${name} does not name ${facts.director.name}`);
    if (!flat.includes(squash(facts.documents.edition))) fail('pdf', `${name} does not carry the "${facts.documents.edition}" edition`);
  }
  // Each PDF must show the current value of every fact its source uses, so a facts change
  // without "npm run pdf" fails here instead of shipping a stale handbook.
  for (const h of HANDBOOKS) {
    const flat = texts.get(h.pdf);
    if (flat == null) { fail('pdf', `${h.pdf} is missing`); continue; }
    const src = readText(`handbooks/src/${h.slug}.html`);
    for (const [, path, fallback] of src.matchAll(/\{\{\s*([\w.]+)\s*(?:\|([^}]*))?\}\}/g)) {
      const v = get(facts, path);
      const expected = v == null || v === '' ? (fallback ?? TBC) : String(v);
      if (!flat.includes(squash(expected))) fail('pdf', `${h.pdf} is out of date: ${path} should read "${expected}". Run npm run pdf.`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  console.error(`\n${failures.length} problem${failures.length === 1 ? '' : 's'}.`);
  process.exit(1);
}
console.log(`All checks passed: ${pages.length} pages, facts schema, links, sitemap, placeholders and 5 PDFs.`);
