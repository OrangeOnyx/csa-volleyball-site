#!/usr/bin/env node
/* Builds the site from data/: practice plans, coach and method pages, drill library,
   handbook web pages, the facts on the home page, sitemap, robots and the season calendar.
   Everything it writes lives in website/ and is committed, so Vercel serves plain files.
   Run: npm run build */
import { readFileSync, writeFileSync, existsSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, SITE, readJSON, writeSite, tidy, esc, curly, fmtDate, addDays } from './lib/util.mjs';
import { header, footer, headMeta, seasonStatus, directorContact } from './lib/layout.mjs';
import { renderHub, renderDivision, renderWeek, divisionPath, weekPath } from './lib/plans.mjs';
import { renderMethod, renderCoaches, renderFeedback, renderDrills, renderHandbooksHub, shelf } from './lib/pages.mjs';
import { HANDBOOKS, renderHandbookWeb } from './lib/handbooks.mjs';

const facts = readJSON('data/facts.json');
const plans = readJSON('data/plans.json');
const drills = readJSON('data/drills.json');
const { scenes } = readJSON('data/scenes.json');

/* ---------- integrity: every reference in the data must resolve ---------- */
const problems = [];
const divIds = new Set(facts.divisions.map(d => d.id));
const drillIds = new Set(drills.drills.map(d => d.id));
for (const g of Object.values(facts.grades)) if (!divIds.has(g.division)) problems.push(`grade ${g.label}: unknown division ${g.division}`);
if (plans.weeks.length !== 9) problems.push(`expected 9 weeks, found ${plans.weeks.length}`);
for (const w of plans.weeks) {
  for (const seg of plans.segments) if (!w.items[seg.id]?.length) problems.push(`week ${w.n}: no items for ${seg.id}`);
  for (const seg of plans.segments) for (const i of w.items[seg.id] || []) for (const d of i.for || []) if (!divIds.has(d)) problems.push(`week ${w.n}: unknown division ${d}`);
  for (const d of w.diagrams || []) if (!scenes[d.scene]) problems.push(`week ${w.n}: unknown scene ${d.scene}`);
  for (const s of w.swaps || []) if (!drillIds.has(s.drill)) problems.push(`week ${w.n}: unknown drill ${s.drill}`);
  for (const f of w.flags || []) if (!divIds.has(f.division)) problems.push(`week ${w.n}: flag for unknown division ${f.division}`);
  // every division must get at least one item in every segment
  for (const div of facts.divisions) for (const seg of plans.segments) {
    if (!(w.items[seg.id] || []).some(i => !i.for || i.for.includes(div.id))) problems.push(`week ${w.n} ${seg.id}: nothing for ${div.id}`);
  }
}
if (problems.length) {
  console.error('Data problems:\n  ' + problems.join('\n  '));
  process.exit(1);
}

const written = [];
const out = (rel, html) => written.push(writeSite(rel, html));

/* ---------- practice plans: the hub, then a page per division and per division-week ---------- */
// A division that left facts.json takes its old pages with it (vercel.json redirects the old URLs).
const plansDir = join(SITE, 'plans');
if (existsSync(plansDir)) for (const name of readdirSync(plansDir)) {
  if (statSync(join(plansDir, name)).isDirectory() && !divIds.has(name)) rmSync(join(plansDir, name), { recursive: true });
}
out('plans/index.html', renderHub({ facts, plans }));
for (const div of facts.divisions) {
  out(`plans/${div.id}/index.html`, renderDivision({ facts, plans, div }));
  for (const week of plans.weeks) out(`plans/${div.id}/week-${week.n}/index.html`, renderWeek({ facts, plans, drills, scenes, div, week }));
}

/* ---------- other pages ---------- */
out('method/index.html', renderMethod({ facts, plans, drills }));
out('coaches/index.html', renderCoaches({ facts, plans }));
out('coaches/feedback/index.html', renderFeedback({ facts }));
out('drills/index.html', renderDrills({ facts, drills }));
out('handbooks/index.html', renderHandbooksHub({ facts }));
for (const h of HANDBOOKS) out(`handbooks/${h.slug}/index.html`, renderHandbookWeb(h, facts));
if (!existsSync(join(SITE, 'handbooks', 'csa-logo.jpg'))) {
  console.error('Missing website/handbooks/csa-logo.jpg (the web-sized logo for handbook pages).');
  process.exit(1);
}

/* ---------- home page: facts into marked regions ---------- */
function inject(html, name, content) {
  const re = new RegExp(`(<!-- build:${name} -->)[\\s\\S]*?(\\s*<!-- /build:${name} -->)`);
  if (!re.test(html)) throw new Error(`index.html is missing the build:${name} markers`);
  return html.replace(re, (_, a, b) => `${a}\n${content}${b}`);
}
const indexPath = join(SITE, 'index.html');
let index = readFileSync(indexPath, 'utf8');
const homeDesc = 'Girls volleyball for grades 1–6 in Lafayette, Louisiana. Pick a grade and see her net, her ball, and her serve line.';
index = inject(index, 'head', '  ' + headMeta(facts, { path: '/', title: 'CSA Volleyball: Every girl belongs here', description: homeDesc }));
index = inject(index, 'header', header({ home: true }));
const st = seasonStatus(facts);
index = inject(index, 'status', `    <section class="status" aria-label="Season status">
      <div class="wrap status-inner">
        <p>${st.text} <span class="this-week" id="this-week" hidden></span></p>
        <a href="${esc(st.link.href)}">${esc(st.link.text)}</a>
      </div>
    </section>`);
index = inject(index, 'season-extra', `        <div class="division-links" id="division-links">
          <p>Open week <span id="dl-week">1</span>, written for each division:</p>
          <ul>
${facts.divisions.map(d => `            <li><a href="${weekPath(d, 1)}" data-division="${d.id}" data-grades="${d.grades.join(',')}">${esc(d.label)}</a></li>`).join('\n')}
          </ul>
        </div>
        <p class="fineprint">From the <a href="/handbooks/curriculum-guide/">Curriculum &amp; Practice Guide</a> by ${esc(facts.director.name)}. See <a href="/plans/">every plan</a> and the <a href="/drills/">drill library</a>.</p>`);
const contact = directorContact(facts);
index = inject(index, 'ladder', `              <li><span>Coach conduct, or a team issue that’s still open</span><b>${esc(facts.director.title)} ${esc(facts.director.name)}</b><small>${contact.length ? contact.join(' · ') : 'Through csalaf.com'}</small></li>`);
index = inject(index, 'where', `            <dl>
${facts.venues.games === facts.venues.practice
    ? `              <div><dt>Practices and games</dt><dd>${esc(facts.venues.practice)}</dd></div>`
    : `              <div><dt>Practices</dt><dd>${esc(facts.venues.practice)}</dd></div>
              <div><dt>Games</dt><dd>${esc(facts.venues.games || 'Venue to be announced')}</dd></div>`}
              <div><dt>Tournament</dt><dd>${facts.season.tournamentDate ? `${esc(fmtDate(facts.season.tournamentDate))}, week 9` : 'Week 9'}. Every team plays.</dd></div>
            </dl>`);
index = inject(index, 'shelf', '        ' + shelf(facts, { indent: '        ' }));
index = inject(index, 'contact', `        <h2 id="contact-title">See you on the court.</h2>
        <p>CSA posts registration windows, team assignments, and game schedules each season. ${esc(facts.director.title)} ${esc(facts.director.name)} leads the program.</p>
        <a class="button red big" href="${esc(facts.season.registrationUrl || facts.program.csaPage)}">${facts.season.registrationUrl ? 'Register for the season' : 'Visit CSA’s volleyball page'}</a>
        <p class="fineprint">${contact.length ? `Reach the director at ${contact.join(' · ')}.` : 'For program questions, use the contact link on CSA’s site.'}</p>`);
index = inject(index, 'footer', footer(facts, { home: true }));
const SEG_NAMES = { warmup: 'Warm-up & ball control', serving: 'Serving', skill: 'Skill focus', team: 'Team play' };
const siteData = {
  grades: facts.grades,
  divisions: facts.divisions.map(d => ({ id: d.id, label: d.label, grades: d.grades })),
  season: { weekOneStart: facts.season.weekOneStart, tournamentDate: facts.season.tournamentDate },
  weeks: plans.weeks.map(w => ({
    n: w.n, title: w.title, focus: w.focus, tip: curly(w.tip),
    seg: plans.segments.map(s => [w.names?.[s.id] || SEG_NAMES[s.id], w.overview[s.id]])
  }))
};
index = inject(index, 'data', `  <script type="application/json" id="csa-data">${JSON.stringify(siteData).replace(/</g, '\\u003c')}</script>`);
writeFileSync(indexPath, tidy(index));
written.push('index.html');

/* ---------- sitemap and robots ---------- */
const urls = ['/', ...written.filter(p => p !== 'index.html' && p.endsWith('index.html')).map(p => '/' + p.replace(/index\.html$/, ''))];
writeSite('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${facts.site.url}${u}</loc></url>`).join('\n')}
</urlset>
`);
writeSite('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${facts.site.url}/sitemap.xml\n`);

/* ---------- season calendar (.ics), only once the dates are confirmed ---------- */
const icsPath = join(SITE, 'season.ics');
if (facts.season.weekOneStart) {
  const s = facts.season;
  const stamp = d => d.replace(/-/g, '');
  // RFC 5545: escape text values, fold lines longer than 75 octets
  const text = v => String(v).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const fold = line => {
    const out = [];
    let cur = '';
    for (const ch of line) {
      if (Buffer.byteLength(cur + ch) > (out.length ? 74 : 75)) { out.push(cur); cur = ''; }
      cur += ch;
    }
    out.push(cur);
    return out.join('\r\n ');
  };
  const season = stamp(s.weekOneStart);
  const ev = ({ uid, start, days = 1, summary, description, url }) => [
    'BEGIN:VEVENT', `UID:${season}-${uid}@csa-volleyball`, `DTSTAMP:${stamp(facts.confirmed.date || s.weekOneStart)}T000000Z`,
    `DTSTART;VALUE=DATE:${stamp(start)}`, `DTEND;VALUE=DATE:${stamp(addDays(start, days))}`,
    `SUMMARY:${text(summary)}`, description && `DESCRIPTION:${text(description)}`, url && `URL:${url}`, 'END:VEVENT'
  ].filter(Boolean).map(fold).join('\r\n');
  const events = [];
  if (s.registrationOpens) events.push(ev({ uid: 'reg-open', start: s.registrationOpens, summary: 'CSA Volleyball registration opens', url: s.registrationUrl }));
  if (s.registrationCloses) events.push(ev({ uid: 'reg-close', start: s.registrationCloses, summary: 'CSA Volleyball registration closes', url: s.registrationUrl }));
  for (const w of plans.weeks) {
    const links = facts.divisions.map(d => `${d.label}: ${facts.site.url}${weekPath(d, w.n)}`).join('\n');
    // a week-long, all-day event: each team practises once that week on its own day
    events.push(ev({ uid: `week-${w.n}`, start: addDays(s.weekOneStart, 7 * (w.n - 1)), days: 7, summary: `CSA Volleyball week ${w.n}: ${w.title}`, description: `This week's practice plan, by grade:\n${links}`, url: `${facts.site.url}/plans/` }));
  }
  if (s.tournamentDate) events.push(ev({ uid: 'tournament', start: s.tournamentDate, summary: 'CSA Volleyball end-of-season tournament' }));
  const cal = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CSA Volleyball//Season//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', fold(`X-WR-CALNAME:${text(s.name ? `CSA Volleyball ${s.name}` : 'CSA Volleyball season')}`), ...events, 'END:VCALENDAR', ''];
  writeFileSync(icsPath, cal.join('\r\n'));
  written.push('season.ics');
} else if (existsSync(icsPath)) {
  rmSync(icsPath);
}

console.log(`Built ${written.length} files.`);
const nulls = [];
const walk = (o, p) => { for (const [k, v] of Object.entries(o)) { if (v === null) nulls.push(p + k); else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, p + k + '.'); } };
walk({ director: facts.director, season: facts.season, venues: facts.venues, photoConsent: facts.photoConsent, feedback: facts.feedback }, '');
if (nulls.length) console.log(`Still to be confirmed (shown as "to be confirmed"): ${nulls.join(', ')}`);
