#!/usr/bin/env node
/* Accessibility and runtime check: loads every page in the sitemap in Chromium, runs axe
   (WCAG 2.2 A and AA rules) and fails on any violation or any script error.
   Every page runs at desktop width; the home page, one page of each other kind and every weekly
   plan also run at phone width. Then each court diagram scene runs once with motion on (see checkDiagrams).
   Run after the build:  npm run check:a11y   (needs: npx playwright install chromium) */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { SITE, readJSON } from './lib/util.mjs';
import { startServer } from './serve.mjs';

const PORT = Number(process.env.PORT || 4321);
const base = readJSON('data/facts.json').site.url.replace(/\/$/, '');
let paths = [...[...readFileSync(join(SITE, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].slice(base.length)), '/404.html'];
// Coaches read the weekly plans on a phone at courtside, so every plan page also runs at phone width.
let phone = ['/', '/plans/', '/plans/grade-3/', '/method/', '/coaches/', '/drills/', '/handbooks/', '/handbooks/master-handbook/', '/handbooks/quick-reference-card/',
  ...paths.filter(p => /^\/plans\/[^/]+\/week-\d+\/$/.test(p))];
// Optional: check only the paths given on the command line, e.g. npm run check:a11y -- /method/
const only = process.argv.slice(2);
if (only.length) { paths = paths.filter(p => only.includes(p)); phone = phone.filter(p => only.includes(p)); }
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/* The court diagrams with motion on (the pass above runs with reduced motion): each scene once,
   on a phone. It plays by itself when scrolled into view, the step buttons work by keyboard,
   focus stays put at the first and last step, the current step is marked for screen readers,
   the caption matches it, and the figure doesn't change height from step to step. */
async function checkDiagrams() {
  const plans = readJSON('data/plans.json');
  const facts = readJSON('data/facts.json');
  const firstPage = new Map();
  for (const w of plans.weeks) for (const d of w.diagrams || []) {
    const div = facts.divisions.find(v => !d.for || d.for.includes(v.id));
    if (div && !firstPage.has(d.scene)) firstPage.set(d.scene, `/plans/${div.id}/week-${w.n}/`);
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  for (const [scene, path] of firstPage) {
    const where = `diagram ${scene} on ${path}`;
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'networkidle' });
    const fig = page.locator(`figure.court-anim[data-scene="${scene}"]`).first();
    await fig.scrollIntoViewIfNeeded();
    const play = fig.locator('[data-act="play"]');
    try { await page.waitForFunction(b => b.textContent.trim() === 'Pause', await play.elementHandle(), { timeout: 3000 }); }
    catch { problems.push(`${where}: did not start playing when scrolled into view`); }
    await play.click();
    const n = await fig.locator('.anim-steps li').count();
    const state = () => fig.evaluate(f => ({
      current: [...f.querySelectorAll('.anim-steps li')].findIndex(li => (li.querySelector('button') || li).getAttribute('aria-current') === 'step'),
      caption: f.querySelector('.anim-caption').textContent.trim(),
      text: (f.querySelector('.anim-steps [aria-current]') || {}).textContent?.trim(),
      height: Math.round(f.getBoundingClientRect().height)
    }));
    const prev = fig.locator('[data-act="prev"]'), next = fig.locator('[data-act="next"]');
    // back to the first step with the keyboard; the button keeps focus there
    await prev.focus();
    for (let i = 0; i < n; i++) await page.keyboard.press('Enter');
    if (!(await prev.evaluate(b => b === document.activeElement))) problems.push(`${where}: focus leaves the previous-step button at the first step`);
    // forward through every step: marked, captioned, and the same height each time
    await next.focus();
    const heights = [];
    for (let i = 0; i < n; i++) {
      if (i) await page.keyboard.press('Enter');
      const st = await state();
      if (st.current !== i) problems.push(`${where}: step ${i + 1} is not marked aria-current="step"`);
      if (st.caption !== st.text) problems.push(`${where}: caption doesn't match step ${i + 1}`);
      heights.push(st.height);
    }
    if (Math.max(...heights) - Math.min(...heights) > 1) problems.push(`${where}: figure height changes between steps (${heights.join('/')} px)`);
    await page.keyboard.press('Enter');
    if (!(await next.evaluate(b => b === document.activeElement))) problems.push(`${where}: focus leaves the next-step button at the last step`);
    // any step can be picked from the numbered list by keyboard
    const picks = fig.locator('.anim-steps li > button');
    if (await picks.count() !== n) problems.push(`${where}: the numbered steps can't be picked by keyboard (they aren't buttons)`);
    else for (let i = n - 1; i >= 0; i--) {
      await picks.nth(i).press('Enter');
      if ((await state()).current !== i) problems.push(`${where}: picking step ${i + 1} from the list doesn't show it`);
    }
    for (const e of errors) problems.push(`${where}: script error: ${e}`);
    await page.close();
  }
  await context.close();
}

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
  if (!only.length) await checkDiagrams();
} finally {
  await browser.close();
  server.close();
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}.`);
  process.exit(1);
}
console.log(`Accessibility check passed: ${paths.length} pages at desktop width, ${phone.length} at phone width, no axe violations, no script errors, no sideways scrolling${only.length ? '' : '; every court diagram plays, steps by keyboard and keeps focus'}.`);
