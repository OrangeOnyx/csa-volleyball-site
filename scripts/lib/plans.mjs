import { esc, curly, gradeWord } from './util.mjs';
import { page, calendarLink } from './layout.mjs';

const SEG_CLASS = { warmup: 's1', serving: 's2', skill: 's3', team: 's4' };

export const weekPath = (div, n) => `/plans/${div.id}/week-${n}/`;
export const divisionPath = div => `/plans/${div.id}/`;

const applies = (item, div) => !item.for || item.for.includes(div.id);

/** Grade-level facts for a division, merged where the grades agree. */
export function divisionSpecs(facts, div) {
  const gs = div.grades.map(g => ({ g, ...facts.grades[String(g)] }));
  const merge = key => {
    const vals = [...new Set(gs.map(x => x[key]))];
    if (vals.length === 1) return [{ text: vals[0] }];
    return gs.map(x => ({ grade: x.g, text: x[key] }));
  };
  return { net: merge('net'), ball: merge('ball'), serve: merge('serve') };
}

function specHtml(list) {
  return list.map(v => (v.grade ? `<span class="by-grade"><b>${gradeWord(v.grade)}:</b> ${esc(v.text)}</span>` : esc(v.text))).join('');
}

export function specsBlock(facts, div) {
  const s = divisionSpecs(facts, div);
  return `<dl class="plan-facts">
        <div><dt>Net</dt><dd>${specHtml(s.net)}</dd></div>
        <div><dt>Ball</dt><dd>${specHtml(s.ball)}</dd></div>
        <div><dt>Serve</dt><dd>${specHtml(s.serve)}</dd></div>
      </dl>`;
}

/** Library drill suggestions that fit the division, with a grade note when only part of it qualifies. */
function swapFor(drill, div) {
  const max = Math.max(...div.grades), min = Math.min(...div.grades);
  if (drill.minGrade > max) return null;
  const note = drill.minGrade > min ? `${gradeWord(drill.minGrade)} grade and up` : (drill.minGrade === 1 ? 'all grades' : `${gradeWord(drill.minGrade)} grade and up`);
  return `<a href="/drills/#${drill.id}">${esc(drill.name)}</a> <span class="swap-note">(${note})</span>`;
}

export function recapText(week, div, facts) {
  const r = { ...week.recap, ...(week.recapBy?.[div.id] || {}) };
  return [
    `Week ${week.n} at ${facts.program.name} practice (${div.label}): ${r.did}.`,
    r.ask
  ];
}

function sceneFigure(sceneId, scenes) {
  const sc = scenes[sceneId];
  if (!sc) throw new Error(`Unknown scene: ${sceneId}`);
  const json = JSON.stringify({ title: sc.title, summary: sc.summary, spots: !!sc.spots, marks: sc.marks || [], actors: sc.actors, steps: sc.steps }).replace(/</g, '\\u003c');
  const steps = sc.steps.map(s => `<li>${esc(s.say)}</li>`).join('');
  return `<figure class="court-anim" data-scene="${esc(sceneId)}">
            <figcaption class="anim-title">${esc(sc.title)} <span>Animated court diagram</span></figcaption>
            <div class="anim-stage"><p class="anim-fallback">${esc(sc.summary)}</p></div>
            <div class="anim-controls">
              <button type="button" data-act="prev" aria-label="Previous step">&#8249;</button>
              <button type="button" data-act="play" aria-pressed="false">Play</button>
              <button type="button" data-act="next" aria-label="Next step">&#8250;</button>
              <span class="anim-count"></span>
            </div>
            <p class="anim-caption" aria-live="polite"></p>
            <ol class="anim-steps">${steps}</ol>
            <script type="application/json" class="scene-json">${json}</script>
          </figure>`;
}

function draftNote(plans, facts) {
  if (plans.review.status !== 'draft') return '';
  return `<aside class="draft-note" aria-label="Draft notice">
        <p><strong>Draft for the director’s review.</strong> Every line comes from ${esc(facts.director.name)}’s Season Curriculum &amp; Practice Plan Guide; only the split by grade is new. Open questions for her are marked “For the director.”</p>
      </aside>`;
}

function crumbs(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map(([href, text]) => (href ? `<li><a href="${href}">${esc(text)}</a></li>` : `<li aria-current="page">${esc(text)}</li>`)).join('')}</ol></nav>`;
}

export function renderWeek({ facts, plans, drills, scenes, div, week }) {
  const phase = plans.phases.find(p => p.id === week.phase);
  const names = { warmup: 'Warm-up & ball control', serving: 'Serving', skill: 'Skill focus', team: 'Team play', ...week.names };
  const drillById = Object.fromEntries(drills.drills.map(d => [d.id, d]));
  const segs = plans.segments.map(seg => {
    const items = week.items[seg.id].filter(i => applies(i, div));
    const swaps = (week.swaps || []).filter(s => s.segment === seg.id).map(s => swapFor(drillById[s.drill], div)).filter(Boolean);
    const flags = (week.flags || []).filter(f => f.segment === seg.id && f.division === div.id);
    const diagrams = (week.diagrams || []).filter(d => d.segment === seg.id && (!d.for || d.for.includes(div.id)));
    return `        <li class="plan-seg ${SEG_CLASS[seg.id]}">
          <h2><span>${esc(names[seg.id])}</span> <span class="seg-min">${seg.minutes} min</span></h2>
          <ul class="plan-items">
${items.map(i => `            <li${i.cue ? ' class="cue"' : ''}>${esc(curly(i.t))}</li>`).join('\n')}
          </ul>
${swaps.length ? `          <p class="swap">Swap in from her drill library: ${swaps.join(', ')}</p>\n` : ''}${flags.map(f => `          <p class="flag"><strong>For the director:</strong> ${esc(f.text)}</p>\n`).join('')}${diagrams.map(d => `          ${sceneFigure(d.scene, scenes)}\n`).join('')}        </li>`;
  }).join('\n');

  const [r1, r2] = recapText(week, div, facts);
  const prev = plans.weeks.find(w => w.n === week.n - 1);
  const next = plans.weeks.find(w => w.n === week.n + 1);
  const others = facts.divisions.filter(d => d.id !== div.id).map(d => `<a href="${weekPath(d, week.n)}">${esc(d.label)}</a>`).join(' · ');
  const hasAnim = (week.diagrams || []).some(d => !d.for || d.for.includes(div.id));

  const body = `    <article class="plan">
      <div class="wrap narrow">
      ${crumbs([['/plans/', 'Practice plans'], [divisionPath(div), div.label], [null, `Week ${week.n}`]])}
      ${draftNote(plans, facts)}
      <header class="plan-head">
        <p class="eyebrow">Week ${week.n} · ${esc(phase.name)} phase · ${esc(div.label)} · 60 minutes</p>
        <h1>${esc(week.title)}</h1>
        <p class="themes">${week.themes.map(esc).join(' · ')}</p>
        <p class="byline">From the Season Curriculum &amp; Practice Plan Guide by ${esc(facts.director.name)}, ${esc(facts.director.title)}</p>
      </header>
      ${specsBlock(facts, div)}
      <div class="clock" role="img" aria-label="60-minute practice: 15 minutes warm-up, 10 serving, 15 skill focus, 20 team play">
        <span class="seg s1" style="flex:15">Warm-up <i>15 min</i></span>
        <span class="seg s2" style="flex:10">Serving <i>10</i></span>
        <span class="seg s3" style="flex:15">Skill <i>15</i></span>
        <span class="seg s4" style="flex:20">Team play <i>20</i></span>
      </div>
      <ol class="plan-segs">
${segs}
      </ol>
      <p class="principle"><strong>The rule for every drill:</strong> ${esc(plans.principle)}</p>
      <blockquote class="tip"><p>${esc(curly(week.tip))}</p><cite>Coaching tip from ${esc(facts.director.name)}</cite></blockquote>
      <section class="recap" aria-labelledby="recap-h">
        <h2 id="recap-h">Recap for parents</h2>
        <p class="recap-help">Copy this into your team chat after practice.</p>
        <div class="recap-box" id="recap-text"><p>${esc(r1)}</p><p>${esc(r2)}</p></div>
        <div class="recap-actions">
          <button class="button red" type="button" data-copy="#recap-text">Copy recap</button>
          <button class="button ghost" type="button" data-print>Print this plan</button>
          <span class="copy-status" role="status"></span>
        </div>
      </section>
      <nav class="week-nav" aria-label="Other weeks">
        ${prev ? `<a rel="prev" href="${weekPath(div, prev.n)}"><span>Previous</span>Week ${prev.n}: ${esc(prev.tabLabel)}</a>` : '<span></span>'}
        <a class="all" href="${divisionPath(div)}"><span>${esc(div.label)}</span>All nine weeks</a>
        ${next ? `<a rel="next" href="${weekPath(div, next.n)}"><span>Next</span>Week ${next.n}: ${esc(next.tabLabel)}</a>` : '<span></span>'}
      </nav>
      <p class="other-div">Week ${week.n} for ${others}</p>
      </div>
    </article>`;

  return page(facts, {
    path: weekPath(div, week.n),
    title: `Week ${week.n}: ${week.title}, ${div.label}`,
    description: `CSA Volleyball practice plan, week ${week.n} for ${div.label}: ${week.focus}. Sixty minutes in four segments, from ${facts.director.name}'s curriculum.`,
    active: 'plans',
    body,
    scripts: ['/assets/plans.js', ...(hasAnim ? ['/assets/court-anim.js'] : [])]
  });
}

function seasonDataScript(facts, plans) {
  const data = {
    weekOneStart: facts.season.weekOneStart,
    tournamentDate: facts.season.tournamentDate,
    weeks: plans.weeks.map(w => ({ n: w.n, title: w.title }))
  };
  return `<script type="application/json" id="season-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function renderDivision({ facts, plans, div }) {
  const groups = plans.phases.map(ph => `        <section class="phase-group" aria-labelledby="ph-${ph.id}">
          <h2 id="ph-${ph.id}">${esc(ph.name)} <span>Weeks ${ph.weeks[0]}–${ph.weeks.at(-1)}</span></h2>
          <p>${esc(ph.focus)}</p>
          <ol class="week-cards">
${ph.weeks.map(n => {
    const w = plans.weeks.find(x => x.n === n);
    return `            <li data-week="${n}"><a href="${weekPath(div, n)}"><b>${n}</b><strong>${esc(w.title)}</strong><span>${w.themes.map(esc).join(' · ')}</span><em class="this-week" hidden>This week</em></a></li>`;
  }).join('\n')}
          </ol>
        </section>`).join('\n');

  const body = `    <article class="plan-index">
      <div class="wrap narrow">
      ${crumbs([['/plans/', 'Practice plans'], [null, div.label]])}
      ${draftNote(plans, facts)}
      <header class="plan-head">
        <p class="eyebrow">${esc(div.name)} division · ages ${esc(div.ages)}</p>
        <h1>${esc(div.label)} practice plans</h1>
        <p class="themes">${esc(div.focus)}</p>
        <p class="byline">From the Season Curriculum &amp; Practice Plan Guide by ${esc(facts.director.name)}, ${esc(facts.director.title)}</p>
      </header>
      ${specsBlock(facts, div)}
      <p class="season-now" id="season-now" hidden></p>${calendarLink(facts)}
${groups}
      <section class="goals" aria-labelledby="goals-h">
        <h2 id="goals-h">By the end of the season, players should be able to</h2>
        <ul class="checks">
${div.goals.map(g => `          <li>${esc(g)}</li>`).join('\n')}
        </ul>
        <p class="fineprint">From the Master Handbook, section 12.</p>
      </section>
      </div>
    </article>
    ${seasonDataScript(facts, plans)}`;

  return page(facts, {
    path: divisionPath(div),
    title: `${div.label} practice plans`,
    description: `Nine weekly CSA Volleyball practice plans for ${div.label}: net ${divisionSpecs(facts, div).net.map(v => v.text).join(' / ')}, sixty minutes each, from ${facts.director.name}'s curriculum.`,
    active: 'plans',
    body,
    scripts: ['/assets/plans.js']
  });
}

export function renderHub({ facts, plans }) {
  const cards = facts.divisions.map(div => {
    const s = divisionSpecs(facts, div);
    return `          <li><a class="div-card" href="${divisionPath(div)}">
            <span class="who">${esc(div.name)} · ages ${esc(div.ages)}</span>
            <strong>${esc(div.label)}</strong>
            <span class="what">Net ${s.net.map(v => esc(v.text)).join(' / ')} · ${esc(div.focus)}</span>
            <span class="go">Open the nine weeks</span>
          </a></li>`;
  }).join('\n');
  const phases = plans.phases.map(p => `            <tr><th scope="row">${esc(p.name)}</th><td class="n">${p.weeks[0]}–${p.weeks.at(-1)}</td><td>${esc(p.theme)}</td></tr>`).join('\n');
  const segs = plans.segments.map(s => `            <tr><th scope="row">${esc(s.name)}</th><td class="n">${s.minutes} min</td><td>${esc(s.purpose)}</td></tr>`).join('\n');
  const body = `    <article class="plan-index">
      <div class="wrap narrow">
      ${draftNote(plans, facts)}
      <header class="plan-head">
        <p class="eyebrow">Season curriculum · ${esc(facts.director.name)}</p>
        <h1>Practice plans</h1>
        <p class="themes">Nine weeks, one 60-minute practice a week, and a tournament where every team plays. Pick your division to see each week's plan, written for your grade.</p>
      </header>
      <p class="season-now" id="season-now" hidden></p>${calendarLink(facts)}
      <ul class="div-cards">
${cards}
      </ul>
      <p class="principle"><strong>The rule for every drill:</strong> ${esc(plans.principle)}</p>
      <div class="two-tables">
        <section aria-labelledby="t-phases">
          <h2 id="t-phases">The season at a glance</h2>
          <section class="table-scroll" tabindex="0" aria-label="Table: phases and weeks"><table>
            <thead><tr><th scope="col">Phase</th><th scope="col">Weeks</th><th scope="col">Theme</th></tr></thead>
            <tbody>
${phases}
            </tbody>
          </table></section>
        </section>
        <section aria-labelledby="t-segs">
          <h2 id="t-segs">Every practice, the same four segments</h2>
          <section class="table-scroll" tabindex="0" aria-label="Table: the four practice segments"><table>
            <thead><tr><th scope="col">Segment</th><th scope="col">Time</th><th scope="col">Purpose</th></tr></thead>
            <tbody>
${segs}
            </tbody>
          </table></section>
        </section>
      </div>
      <p class="fineprint">Need a drill? See the <a href="/drills/">drill library</a>. New to coaching? Start with <a href="/coaches/">the coach guide</a>.</p>
      </div>
    </article>
    ${seasonDataScript(facts, plans)}`;
  return page(facts, {
    path: '/plans/',
    title: 'Practice plans',
    description: `Nine-week CSA Volleyball practice plans for every division, grades 1–6, from ${facts.director.name}'s curriculum.`,
    active: 'plans',
    body,
    scripts: ['/assets/plans.js']
  });
}
