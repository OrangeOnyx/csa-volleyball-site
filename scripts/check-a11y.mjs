#!/usr/bin/env node
/* Accessibility and runtime check: loads every page in the sitemap in Chromium, runs axe
   (WCAG 2.2 A and AA rules) and fails on any violation or any script error.
   Every page runs at desktop width; the home page and one page of each kind also run at phone width.
   Run after the build:  npm run check:a11y   (needs: npx playwright install chromium) */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { SITE, readJSON } from './lib/util.mjs';
import { startServer } from './serve.mjs';

const PORT = Number(process.env.PORT || 4321);
const base = readJSON('data/facts.json').site.url.replace(/\/$/, '');
let paths = [...readFileSync(join(SITE, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].slice(base.length));
let phone = ['/', '/plans/', '/plans/developmental/', '/plans/developmental/week-5/', '/method/', '/coaches/', '/drills/', '/handbooks/', '/handbooks/master-handbook/', '/handbooks/quick-reference-card/'];
// Optional: check only the paths given on the command line, e.g. npm run check:a11y -- /method/
const only = process.argv.slice(2);
if (only.length) { paths = paths.filter(p => only.includes(p)); phone = phone.filter(p => only.includes(p)); }
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const server = await startServer(PORT);
const browser = await chromium.launch();
const problems = [];
try {
  for (const [label, viewport, list] of [['desktop', { width: 1280, height: 900 }, paths], ['phone', { width: 390, height: 844 }, phone]]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    for (const path of list) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      const res = await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'networkidle' });
      if (!res || res.status() !== 200) problems.push(`${label} ${path}: HTTP ${res ? res.status() : 'no response'}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) problems.push(`${label} ${path}: page scrolls sideways by ${overflow}px`);
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      for (const v of violations) {
        const where = v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ');
        problems.push(`${label} ${path}: ${v.id} (${v.impact}) ${v.help} — ${v.nodes.length} element(s): ${where}`);
      }
      for (const e of errors) problems.push(`${label} ${path}: script error: ${e}`);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}.`);
  process.exit(1);
}
console.log(`Accessibility check passed: ${paths.length} pages at desktop width, ${phone.length} at phone width, no axe violations, no script errors, no sideways scrolling.`);
