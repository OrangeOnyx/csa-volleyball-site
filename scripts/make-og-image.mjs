#!/usr/bin/env node
/* Draws the link-preview card (website/assets/og-image.png, 1200×630) that chat apps and
   social sites show when someone shares the site. Run after changing the facts it uses:
     npm run og-image
   Needs the Playwright browser (npx playwright install chromium) and access to Google Fonts. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { ROOT, SITE, readJSON, esc } from './lib/util.mjs';

const facts = readJSON('data/facts.json');
const logo = 'data:image/jpeg;base64,' + readFileSync(join(ROOT, 'handbooks/src/csa_logo.jpg')).toString('base64');

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #0f1f3d; color: #fff; font-family: Inter, sans-serif; position: relative; }
  .stripe { position: absolute; inset: 0 0 auto; height: 10px; background: #c0272d; }
  .copy { position: absolute; left: 72px; top: 64px; right: 72px; }
  .brand { display: flex; align-items: center; gap: 22px; }
  .brand img { width: 210px; border-radius: 8px; display: block; }
  .brand span { font: 400 64px/1 'Bebas Neue', sans-serif; letter-spacing: .06em; }
  h1 { margin-top: 34px; font: 400 132px/.9 'Bebas Neue', sans-serif; letter-spacing: .01em; }
  p { margin-top: 22px; font-size: 30px; line-height: 1.3; color: #c9d6ea; max-width: 860px; }
  .floor { position: absolute; left: 0; right: 0; bottom: 0; height: 74px; background: linear-gradient(#d9ae75, #ecc994); }
  .floor::before { content: ''; position: absolute; left: 0; right: 0; top: 26px; height: 4px; background: #fff; opacity: .9; }
  .floor b { position: absolute; left: 72px; top: 38px; font: 600 22px/1 Inter, sans-serif; color: #3d2a12; letter-spacing: .01em; }
  .floor i { position: absolute; right: 72px; top: 38px; font: 400 26px/1 'Bebas Neue', sans-serif; font-style: normal; color: #3d2a12; letter-spacing: .08em; }
</style></head>
<body>
  <div class="stripe"></div>
  <div class="copy">
    <div class="brand"><img src="${logo}" alt=""><span>Volleyball</span></div>
    <h1>Every girl<br>belongs here.</h1>
    <p>Girls volleyball for grades ${esc(facts.program.gradeRange)} in ${esc(facts.program.place)}.</p>
  </div>
  <div class="floor"><b>Curriculum by ${esc(facts.director.name)}, ${esc(facts.director.title)}</b><i>${esc(facts.program.motto)}</i></div>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const ok = await page.evaluate(() => document.fonts.check('132px "Bebas Neue"'));
  if (!ok) throw new Error('Bebas Neue did not load (no network to Google Fonts?). Not writing a card in fallback type.');
  const out = join(SITE, 'assets/og-image.png');
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  console.log('Wrote website/assets/og-image.png');
} finally {
  await browser.close();
}
