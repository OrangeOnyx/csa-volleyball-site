import { esc, curly, gradeWord, fmtDate, TBC, playersText, telLink } from './util.mjs';
import { page, directorContact, calendarLink } from './layout.mjs';
import { divisionPath, weekPath, divisionSpecs } from './plans.mjs';
import { HANDBOOKS } from './handbooks.mjs';

const gradesText = min => (min === 1 ? 'All grades' : `${gradeWord(min)} grade and up`);

/* ---------- The method: Stephanie's program, in her words ---------- */
export function renderMethod({ facts, plans, drills }) {
  const values = [
    ['Fun First', 'Every practice and game should leave players wanting to come back. Coaches design sessions that are energetic, positive, and engaging.'],
    ['Development Over Winning', 'Scores matter less than skill growth. We celebrate improvement at every level, not just victories.'],
    ['Respect', 'For teammates, opponents, coaches, officials, and the facility. Always.'],
    ['Effort', 'We ask every player to give her best — not someone else’s best. Consistent effort is the standard.'],
    ['Inclusion', 'Every registered player plays. No one sits the bench for an entire game. No one is made to feel unwelcome.']
  ];
  const gradeRows = Object.entries(facts.grades).map(([g, x]) => `            <tr><th scope="row">${esc(x.label)}</th><td>${esc(x.net)}</td><td>${esc(x.ball)}</td><td>${esc(x.serve)}</td></tr>`).join('\n');
  const library = drills.drills.filter(d => d.library).map(d => `          <li id="m-${d.id}"><h3>${esc(d.name)}</h3><p class="meta">${[gradesText(d.minGrade), playersText(d.players), d.time].filter(Boolean).map(esc).join(' · ')}</p><p>${esc(d.how)}</p></li>`).join('\n');
  const phases = plans.phases.map(p => `          <li class="ph-${p.id}"><b>Weeks ${p.weeks[0]}–${p.weeks.at(-1)}</b><strong>${esc(p.name)}</strong><span>${esc(p.focus)}</span></li>`).join('\n');
  // Divisions that share a name (3rd and 4th grade, Developmental) share one card;
  // a goal that differs between them is listed once per grade.
  const goalGroups = [];
  for (const d of facts.divisions) {
    const same = goalGroups.find(g => g[0].name === d.name && g[0].goals.length === d.goals.length);
    if (same) same.push(d); else goalGroups.push([d]);
  }
  const goalItems = ds => ds[0].goals.map((_, i) => {
    const vals = ds.map(d => d.goals[i]);
    if (vals.every(v => v === vals[0])) return `<li>${esc(vals[0])}</li>`;
    return ds.map(d => `<li><b>${esc(d.label)}:</b> ${esc(d.goals[i])}</li>`).join('');
  }).join('');
  const groupLabel = ds => (ds.length > 1 && ds.every(d => d.label.endsWith(' grade'))
    ? `${ds.slice(0, -1).map(d => d.label.replace(/ grade$/, '')).join(', ')} and ${ds.at(-1).label}`
    : ds.map(d => d.label).join(' and '));
  const divGoals = goalGroups.map(ds => `          <section class="goal-card" aria-labelledby="g-${ds[0].id}">
            <h3 id="g-${ds[0].id}">${esc(groupLabel(ds))} <span>${esc(ds[0].name)}</span></h3>
            <ul class="checks">${goalItems(ds)}</ul>
            ${ds.map(d => `<a href="${divisionPath(d)}">Open the ${esc(d.label)} plans</a>`).join(' ')}
          </section>`).join('\n');

  const body = `    <article class="method">
      <header class="page-hero">
        <div class="wrap">
          <p class="eyebrow">By ${esc(facts.director.name)} · ${esc(facts.director.title)}</p>
          <h1>The CSA Volleyball method</h1>
          <p class="lead">A recreational, developmental league for girls in grades ${esc(facts.program.gradeRange)}: no cuts, equal playing time, and a nine-week curriculum built so every girl touches the ball as often as possible.</p>
        </div>
      </header>

      <section class="section letter" aria-labelledby="msg-h">
        <div class="wrap narrow">
          <h2 id="msg-h">A message from the director</h2>
          <div class="letter-body">
            <p>Welcome to CSA Volleyball. My name is Stephanie Abdalla, and I serve as the Volleyball Director for the Cajun Sports Association here in Lafayette, Louisiana. I am proud to lead a program that is rooted in community, built on a love of the game, and committed to developing young athletes the right way.</p>
            <p>This handbook exists because our players, their families, and our volunteer coaches deserve clarity. You deserve to know exactly what this program stands for, what we expect from everyone involved, and what your daughter will learn from the first day of practice to the last point of the season. Nothing in here is arbitrary — every rule, every expectation, and every practice plan has been designed with one goal in mind: to give every girl in this program a great experience with volleyball.</p>
            <p>CSA Volleyball is a recreational, developmental league. That means we are not a club program, we do not cut players, and we do not prioritize winning over learning. What we do prioritize is effort, attitude, skill growth, and sportsmanship. A player who hustles every practice, encourages her teammates, and improves her serve over nine weeks is a success story — regardless of the scoreboard.</p>
            <p>Please read this handbook carefully. Share it with your daughter. If you are a coach, treat it as your operating manual. If you are a parent, treat it as your partnership agreement with this program. And if you ever have questions, my door is open.</p>
            <p class="signature">— ${esc(facts.director.name)}, CSA ${esc(facts.director.title)}</p>
          </div>
          <p class="fineprint">From the Master Handbook, section 1.</p>
        </div>
      </section>

      <section class="section mission" aria-labelledby="mission-h">
        <div class="wrap">
          <h2 id="mission-h">Mission and values</h2>
          <p class="mission-line">To provide every girl in grades 1–6 with a safe, fun, and structured environment to learn the game of volleyball — building athletic skills, teamwork, confidence, and a love of sport that lasts a lifetime.</p>
          <ul class="values">
${values.map(([v, t]) => `            <li><strong>${esc(v)}</strong><span>${esc(t)}</span></li>`).join('\n')}
          </ul>
        </div>
      </section>

      <section class="section principle-band" aria-labelledby="principle-h">
        <div class="wrap narrow">
          <h2 id="principle-h">The core principle</h2>
          <p class="big-quote">${esc(plans.principle)}</p>
          <p class="fineprint">From the Season Curriculum &amp; Practice Plan Guide.</p>
        </div>
      </section>

      <section class="section" aria-labelledby="season-h">
        <div class="wrap">
          <h2 id="season-h">Nine weeks, three phases</h2>
          <p class="intro-p">One 60-minute practice a week in the same four segments: 15 minutes of warm-up and ball control, 10 of serving, 15 on the skill of the week, and 20 of team play. The season ends in a tournament where every team plays.</p>
          <ol class="phase-strip">
${phases}
          </ol>
          <p><a class="button red" href="/plans/">Open the practice plans</a></p>
        </div>
      </section>

      <section class="section paper" aria-labelledby="prog-h">
        <div class="wrap">
          <h2 id="prog-h">The game grows with the player</h2>
          <p class="intro-p">Nets rise, balls get firmer and the serve line moves back as players grow. Each division has its own goals for the season.</p>
          <section class="table-scroll" tabindex="0" aria-label="Table: net, ball and serve by grade"><table class="grade-table">
            <thead><tr><th scope="col">Grade</th><th scope="col">Net</th><th scope="col">Ball</th><th scope="col">Serve</th></tr></thead>
            <tbody>
${gradeRows}
            </tbody>
          </table></section>
          <div class="goal-grid">
${divGoals}
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="lib-h">
        <div class="wrap">
          <h2 id="lib-h">Her drill library</h2>
          <p class="intro-p">Six drills to supplement or replace segments in the weekly plans. All are designed to maximize ball contacts and minimize standing time.</p>
          <ul class="lib-cards">
${library}
          </ul>
          <p><a href="/drills/">See all twenty drills from the curriculum</a></p>
        </div>
      </section>

      <section class="section library" aria-labelledby="docs-h">
        <div class="wrap">
          <div class="intro">
            <h2 id="docs-h">The handbooks</h2>
            <p>Written for CSA by ${esc(facts.director.name)}. Free to read online or download.</p>
          </div>
          ${shelf(facts)}
        </div>
      </section>
    </article>`;

  return page(facts, {
    path: '/method/',
    title: 'The CSA Volleyball method',
    description: `How ${facts.director.name} built CSA Volleyball: a no-cut, equal-playing-time league with a nine-week curriculum where every girl touches the ball as often as possible.`,
    active: 'method',
    body
  });
}

/** The handbook shelf, shared by the home page, the method page and the handbooks hub. */
export function shelf(facts, { indent = '          ' } = {}) {
  const books = HANDBOOKS.map(h => `${indent}  <div class="book ${h.shelfClass}">
${indent}    <span class="who">${esc(h.audience)}</span>
${indent}    <strong>${esc(h.title)}</strong>
${indent}    <span class="what">${esc(h.blurb)}</span>
${indent}    <span class="book-links"><a href="/handbooks/${h.slug}/">Read online</a><a href="/resources/${h.pdf}">PDF</a></span>
${indent}  </div>`).join('\n');
  return `<div class="shelf">
${books}
${indent}  <div class="book set">
${indent}    <span class="who">Complete set</span>
${indent}    <strong>All five handouts</strong>
${indent}    <span class="what">Family and coach PDFs in one download. ${esc(facts.documents.edition)} edition.</span>
${indent}    <span class="book-links"><a href="/resources/CSA_Volleyball_All_Five_Handouts.zip">ZIP</a></span>
${indent}  </div>
${indent}</div>`;
}

/* ---------- Coaches: start here ---------- */
export function renderCoaches({ facts, plans }) {
  const phone = facts.director.phone;
  const contact = directorContact(facts);
  // Once the season start date is set, plans.js points these at this week's plan.
  const divButtons = facts.divisions.map(d => `<a class="button red" href="${divisionPath(d)}" data-week-link="${d.id}">${esc(d.label)}</a>`).join(' ');
  const body = `    <article class="coaches">
      <header class="page-hero">
        <div class="wrap">
          <p class="eyebrow">For volunteer coaches</p>
          <h1>Coach guide: start here</h1>
          <p class="lead">Thank you for coaching. This page puts the season in order: what to finish before your first practice, how every practice runs, and what to do on game day and if someone gets hurt.</p>
        </div>
      </header>

      <div class="wrap narrow">
      <ol class="steps">
        <li id="before">
          <h2>Before your first practice</h2>
          <ul class="checks">
            <li>Complete the CSA volunteer registration form.</li>
            <li>Pass a background check through CSA’s approved screening provider. It is renewed every year.</li>
            <li>Complete USA Volleyball’s SafeSport training online at <a href="https://safesport.org">safesport.org</a>. It takes about 90 minutes, is renewed every year, and you send proof of completion to the ${esc(facts.director.title)}.</li>
            <li>Sign and return the <a href="/resources/CSA_Volleyball_Coach_Agreement.pdf">Coach Agreement</a>.</li>
            <li>Read the <a href="/handbooks/master-handbook/">Master Handbook</a>, then print and laminate the <a href="/resources/CSA_Volleyball_Coach_Quick_Reference_Card.pdf">Quick Reference Card</a> for your clipboard.</li>
          </ul>
          <p class="fineprint">Head coaches must be at least 18. Assistant coaches may be 16–17 with direct adult supervision. From the Master Handbook, sections 5 and 8.</p>
        </li>

        <li id="practice">
          <h2>Every practice</h2>
          <p>Arrive at least 15 minutes early, and stay until every player has been picked up by a parent or guardian. Every practice runs 60 minutes in the same four segments. Open this week’s plan for your division:</p>
          <p class="div-buttons">${divButtons}</p>
          <p class="season-now" id="season-now" hidden></p>${calendarLink(facts)}
          <div class="clock" role="img" aria-label="60-minute practice: 15 minutes warm-up, 10 serving, 15 skill focus, 20 team play">
            <span class="seg s1" style="flex:15">Warm-up <i>15 min</i></span>
            <span class="seg s2" style="flex:10">Serving <i>10</i></span>
            <span class="seg s3" style="flex:15">Skill <i>15</i></span>
            <span class="seg s4" style="flex:20">Team play <i>20</i></span>
          </div>
          <p class="principle"><strong>The rule for every drill:</strong> ${esc(plans.principle)}</p>
          <p>Teach skills progressively: do not move players to harder techniques before the basics are in place. Need something different? The <a href="/drills/">drill library</a> lists twenty drills by grade.</p>
        </li>

        <li id="gameday">
          <h2>Game day</h2>
          <ul class="checks">
            <li>Every player gets equal playing time. No player sits out more than one rotation per set without a documented reason (injury or discipline).</li>
            <li>One head coach and one assistant may stand on the bench-side sideline. Stay off the court, and don’t cross the 10-foot line toward the net during play.</li>
            <li>Matches are best two of three sets with rally scoring. A team can start with four players and has a 15-minute grace period.</li>
            <li>No arguing with officials, opposing coaches or parents. Disputes go calmly to the ${esc(facts.director.title)}.</li>
          </ul>
          <p>Net heights, balls and serve lines for each grade are on the <a href="/#top">home page court</a> and the <a href="/#gameday">game day rules</a>.</p>
        </li>

        <li id="emergency">
          <h2>If a player gets hurt</h2>
          <p class="alert">If a player is unconscious, not breathing, or in severe distress, call 911 immediately. Do not wait.</p>
          <ol class="numbered">
            <li>Stop play immediately. Clear the court. Keep other players calm and away from the injured player.</li>
            <li>Assess the situation. Do not move the player if a head, neck, or spine injury is suspected.</li>
            <li>Call 911 if the injury is serious, the player is unconscious, or you are unsure of the severity.</li>
            <li>Give first aid only if you are trained to do so and it is safe. Do not exceed your training.</li>
            <li>Contact the player’s parent or guardian using the emergency contact information on file.</li>
            <li>Notify the ${esc(facts.director.title)} by phone as soon as the player is stable and parents have been contacted.</li>
            <li>Document the incident in writing as soon as possible: time, nature of injury, actions taken, and who was notified.</li>
          </ol>
          <p><strong>Concussion:</strong> any player with a blow to the head or concussion symptoms (headache, dizziness, confusion, nausea, sensitivity to light) leaves play and may not return the same day. She needs written clearance from a licensed healthcare provider before returning. When in doubt, sit them out.</p>
          <dl class="contact-list">
            <div><dt>Emergency</dt><dd>${telLink('911')}</dd></div>
            <div><dt>${esc(facts.director.title)} ${esc(facts.director.name)}</dt><dd>${phone ? contact.join(' · ') : `Phone: ${TBC.toLowerCase()}`}</dd></div>
            <div><dt>Comeaux Sports Complex staff (LPRD main office)</dt><dd>${telLink('(337) 291-8400')}</dd></div>
            <div><dt>Louisiana Child Protective Services</dt><dd>${telLink('1-855-452-5437')}</dd></div>
          </dl>
          <p class="fineprint">From the Master Handbook, section 10.</p>
        </li>

        <li id="conduct">
          <h2>Conduct and communication</h2>
          <ul class="checks">
            <li><strong>Two-deep rule.</strong> Never be alone with a single player. At least two adults are present whenever you are working with players.</li>
            <li>No communication with players by personal social media, direct messages or text outside official team channels.</li>
            <li>No physical contact beyond age-appropriate instruction. When in doubt, demonstrate on yourself.</li>
            <li>No yelling at, belittling, or publicly embarrassing any player.</li>
            <li>Report suspected abuse or neglect right away to Louisiana Child Protective Services, 1-855-452-5437, or 911 if a child is in immediate danger. Then tell the ${esc(facts.director.title)}.</li>
          </ul>
          <section class="table-scroll" tabindex="0" aria-label="Table: who to contact, by situation"><table>
            <thead><tr><th scope="col">Situation</th><th scope="col">Who to contact</th><th scope="col">How</th></tr></thead>
            <tbody>
              <tr><td>Practice schedule change</td><td>Director → coach → parents</td><td>CSA communication platform or email</td></tr>
              <tr><td>Player injury or incident</td><td>Coach → Director immediately</td><td>Phone call, same day</td></tr>
              <tr><td>Parent concern about a player</td><td>Parent → coach first</td><td>In person or email</td></tr>
              <tr><td>Coach concern about a player</td><td>Coach → Director</td><td>Private conversation</td></tr>
              <tr><td>Game cancellation or weather</td><td>Director → coaches → parents</td><td>CSA platform or email, at least 2 hours’ notice</td></tr>
            </tbody>
          </table></section>
        </li>

        <li id="season-end">
          <h2>End of the season</h2>
          <p>Week 9 is tournament week. Every team plays in a single-elimination tournament seeded by regular-season record. Send your team the tournament schedule at least a week ahead, and arrive 30 minutes before your first match.</p>
          <p>Recognition goes beyond wins: participation certificates for every player who completes the season, a Most Improved Player and a Team Spirit Award chosen by the coach, and a champion in each division.</p>
          <p>After the tournament, answer the <a href="/coaches/feedback/">three-question season survey</a>. Your answers shape next season’s plans.</p>
        </li>
      </ol>
      </div>
    </article>
    <script type="application/json" id="season-data">${JSON.stringify({ weekOneStart: facts.season.weekOneStart, tournamentDate: facts.season.tournamentDate, weeks: plans.weeks.map(w => ({ n: w.n, title: w.title })) }).replace(/</g, '\\u003c')}</script>`;

  return page(facts, {
    path: '/coaches/',
    title: 'Coach guide: start here',
    description: 'Everything a CSA Volleyball volunteer coach needs: SafeSport and background checks, the 60-minute practice, game day rules, the emergency plan, and the weekly practice plans.',
    active: 'coaches',
    body,
    scripts: ['/assets/plans.js']
  });
}

/* ---------- Season feedback survey ---------- */
export function renderFeedback({ facts }) {
  const qs = [
    'Which week’s plan ran best, and which one did you change? What did you change?',
    'Which skill did your players find hardest at your grade?',
    'What one thing would make next season’s plans easier to run?'
  ];
  const cta = facts.feedback.formUrl
    ? `<p><a class="button red big" href="${esc(facts.feedback.formUrl)}">Answer the three questions</a></p>`
    : `<p class="alert soft">The survey link will be posted here before week 9. Until then, send your answers to the ${esc(facts.director.title)} through <a href="${esc(facts.program.csaPage)}">CSA’s volleyball page</a>.</p>`;
  const body = `    <article class="feedback">
      <header class="page-hero">
        <div class="wrap">
          <p class="eyebrow">For coaches · week 9</p>
          <h1>Season feedback</h1>
          <p class="lead">Three questions, about five minutes. Every answer goes to the ${esc(facts.director.title)} and shapes next season’s practice plans.</p>
        </div>
      </header>
      <div class="wrap narrow">
        <aside class="draft-note" aria-label="Draft notice"><p><strong>Draft for the director’s review.</strong> These questions are proposed; she may change them before the survey opens.</p></aside>
        <ol class="survey-qs">
${qs.map(q => `          <li>${esc(q)}</li>`).join('\n')}
        </ol>
        ${cta}
        <p class="fineprint">No names of players, please. The survey asks about the plans, not about any child.</p>
      </div>
    </article>`;
  return page(facts, {
    path: '/coaches/feedback/',
    title: 'Season feedback for coaches',
    description: 'Three questions for CSA Volleyball coaches at the end of the season, used to improve next season’s practice plans.',
    active: 'coaches',
    body
  });
}

/* ---------- Drill library ---------- */
export function renderDrills({ facts, drills }) {
  const cards = drills.drills.map(d => {
    const meta = [gradesText(d.minGrade), playersText(d.players), d.time].filter(Boolean).map(esc).join(' · ');
    return `          <li class="drill" id="${d.id}" data-min-grade="${d.minGrade}" data-skills="${esc(d.skills.join('|'))}">
            <h2>${esc(d.name)}${d.library ? ' <span class="badge">Her library</span>' : ''}</h2>
            <p class="meta">${meta}</p>
            <p>${esc(curly(d.how))}</p>
            ${d.goal ? `<p class="goal"><strong>Goal:</strong> ${esc(curly(d.goal))}</p>` : ''}
            ${d.cue ? `<p class="cue">“${esc(d.cue)}”</p>` : ''}
            ${d.note ? `<p class="flag"><strong>For the director:</strong> ${esc(d.note)}</p>` : ''}
            <p class="from">${d.skills.map(esc).join(' · ')} — from ${d.from.map(esc).join(', ')}</p>
          </li>`;
  }).join('\n');
  const skillButtons = ['All', ...drills.skills].map((s, i) => `<button type="button" data-skill="${esc(s)}" aria-pressed="${i === 0}">${esc(s)}</button>`).join('');
  const gradeOpts = [['0', 'Any grade'], ...[1, 2, 3, 4, 5, 6].map(g => [String(g), `${gradeWord(g)} grade`])].map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  const body = `    <article class="drills-page">
      <header class="page-hero">
        <div class="wrap">
          <p class="eyebrow">From ${esc(facts.director.name)}’s curriculum</p>
          <h1>Drill library</h1>
          <p class="lead">Twenty drills: the six in her drill library, plus the named activities from her weekly plans. Each one keeps players moving and touching the ball.</p>
        </div>
      </header>
      <div class="wrap">
        <div class="drill-filters" role="group" aria-label="Filter drills">
          <div class="skill-buttons" role="group" aria-label="Skill">${skillButtons}</div>
          <label class="grade-select">Grade <select id="drill-grade">${gradeOpts}</select></label>
          <p class="drill-count" role="status" aria-live="polite"></p>
        </div>
        <ul class="drill-list">
${cards}
        </ul>
      </div>
    </article>`;
  return page(facts, {
    path: '/drills/',
    title: 'Drill library',
    description: `Twenty CSA Volleyball drills by grade and skill, from ${facts.director.name}'s curriculum: passing, serving, setting, hitting, serve receive and team play.`,
    active: 'coaches',
    body,
    scripts: ['/assets/drills.js']
  });
}

/* ---------- Handbooks hub ---------- */
export function renderHandbooksHub({ facts }) {
  const rows = HANDBOOKS.map(h => `          <li>
            <h2>${esc(h.title)}</h2>
            <p class="meta">${esc(h.audience)} · ${esc(facts.documents.edition)} edition</p>
            <p>${esc(h.blurb)}</p>
            <p class="book-actions"><a class="button red" href="/handbooks/${h.slug}/">Read online</a> <a class="button ghost" href="/resources/${h.pdf}">Download the PDF</a></p>
          </li>`).join('\n');
  const body = `    <article class="handbooks-page">
      <header class="page-hero">
        <div class="wrap">
          <p class="eyebrow">${esc(facts.documents.byline)}</p>
          <h1>Handbooks</h1>
          <p class="lead">Every CSA Volleyball handbook, free to read on your phone or download and print. Coaches don’t need to request access.</p>
        </div>
      </header>
      <div class="wrap narrow">
        <ul class="hb-list">
${rows}
        </ul>
        <p><a href="/resources/CSA_Volleyball_All_Five_Handouts.zip">Download all five PDFs as one ZIP</a></p>
      </div>
    </article>`;
  return page(facts, {
    path: '/handbooks/',
    title: 'Handbooks',
    description: 'CSA Volleyball handbooks for families and coaches: Player & Parent Handbook, Master Handbook, Curriculum & Practice Guide, Quick Reference Card and Coach Agreement.',
    active: 'handbooks',
    body
  });
}

export { fmtDate, weekPath, divisionSpecs };

/** The page Vercel serves for an address that doesn't exist. */
export function renderNotFound({ facts }) {
  const body = `    <article class="not-found">
      <header class="page-hero">
        <div class="wrap">
          <h1>Page not found</h1>
          <p class="lead">This page doesn’t exist, or it has moved.</p>
        </div>
      </header>
      <div class="wrap narrow">
        <p>These pages are the places most people are looking for:</p>
        <p class="div-buttons"><a class="button red" href="/plans/">Practice plans</a> <a class="button ghost" href="/coaches/">Coach guide</a> <a class="button ghost" href="/">Home page</a></p>
      </div>
    </article>`;
  return page(facts, { path: '/404.html', title: 'Page not found', description: `This page isn't on the ${facts.program.name} site.`, body, noindex: true });
}
