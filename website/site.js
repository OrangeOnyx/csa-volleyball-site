// Mobile menu
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#nav');
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menu?.setAttribute('aria-expanded', 'false');
}));

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);

// Arrow-key movement for radio groups and tab lists (roving tabindex)
function roving(buttons, select) {
  buttons.forEach((btn, i) => btn.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    let next = null;
    if (step) next = (i + step + buttons.length) % buttons.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = buttons.length - 1;
    if (next === null) return;
    e.preventDefault();
    buttons[next].focus();
    select(buttons[next]);
  }));
}

/* ---------- The court: grade rules, drawn to scale ----------
   Source: CSA Coach Quick Reference Card and Curriculum Guide (serving table, net heights). */
const FLOOR = 330, NET_X = 550, PX_PER_FT = 16;
const SKILLS = {
  young: 'make a passing platform, serve underhand, call the ball, rotate, and cheer for her teammates.',
  mid: 'pass to a target, move up the serve progression, run pass–set–hit, hit a downball, and talk on the court.',
  old: 'pass consistently, serve overhand from the end line, set overhead, use a three-step approach, and receive serve in a W formation.'
};
const YOUNG = { netIn: 72, net: '6′ 0″', ball: 'Soft Touch or Volley-Lite', serve: 'Underhand only, from 10 ft', ft: 10, note: 'Each player serves up to three in a row, and the serve rotates on a side-out.', skills: SKILLS.young };
const OLD = { netIn: 84, net: '7′ 0″', ball: 'Volley-Lite or standard', serve: 'Underhand or overhand, from the end line', ft: 30, note: 'A server can score at most five points in a row before the serve changes.', skills: SKILLS.old };
const GRADES = {
  1: { label: '1st grade', ...YOUNG },
  2: { label: '2nd grade', ...YOUNG },
  3: { label: '3rd grade', netIn: 78, net: '6′ 6″', ball: 'Volley-Lite', serve: 'Underhand from 15 ft, or overhand from 10 ft', ft: 15, ohFt: 10, note: 'She chooses underhand or overhand. Coaches encourage overhand attempts.', skills: SKILLS.mid },
  4: { label: '4th grade', netIn: 78, net: '6′ 6″', ball: 'Volley-Lite', serve: 'Underhand or overhand, from 22 ft', ft: 22, note: 'Coaches start pushing toward the overhand serve from 22 feet.', skills: SKILLS.mid },
  5: { label: '5th grade', ...OLD },
  6: { label: '6th grade', ...OLD }
};

const court = {
  netTop: $('net-top'), pole: $('pole'), hdLine: $('hd-line'), hdCap: $('hd-cap'), hLabel: $('height-label'),
  serveLine: $('serve-line'), serveDot: $('serve-dot'), serveDim: $('serve-dim'), sLabel: $('serve-label'),
  ohMark: $('oh-mark'), ohLine: $('oh-line'), ohLabel: $('oh-label'), ball: $('ball'), spin: $('ball-spin')
};
let current = { netY: FLOOR - 78 / 12 * PX_PER_FT, serveX: NET_X - 15 * PX_PER_FT };
let tween = null;

function drawCourt(netY, serveX) {
  court.netTop.setAttribute('transform', `translate(0 ${netY})`);
  court.pole.setAttribute('y', netY - 4);
  court.pole.setAttribute('height', FLOOR - netY + 4);
  court.hdLine.setAttribute('y2', netY);
  court.hdCap.setAttribute('y1', netY);
  court.hdCap.setAttribute('y2', netY);
  court.hLabel.setAttribute('y', (FLOOR + netY) / 2 + 12);
  court.serveLine.setAttribute('x', serveX - 4);
  court.serveDot.setAttribute('cx', serveX);
  court.serveDim.setAttribute('x1', serveX);
  court.sLabel.setAttribute('x', (serveX + NET_X) / 2);
}

function placeBall(x, y, rot = 0) {
  court.ball.setAttribute('transform', `translate(${x} ${y})`);
  court.spin.setAttribute('transform', `rotate(${rot})`);
}

// Parabola through three points (Lagrange form): toss point, just over the net, landing spot.
function arcY(x, [[x0, y0], [x1, y1], [x2, y2]]) {
  return y0 * (x - x1) * (x - x2) / ((x0 - x1) * (x0 - x2))
       + y1 * (x - x0) * (x - x2) / ((x1 - x0) * (x1 - x2))
       + y2 * (x - x0) * (x - x1) / ((x2 - x0) * (x2 - x1));
}

const ease = t => 1 - Math.pow(1 - t, 3);
const REST_Y = FLOOR - 14, TOSS_Y = FLOOR - 68;
// On phones, frame the serving side and the net only, so the court reads larger.
const narrow = window.matchMedia('(max-width: 720px)');
const svgCourt = document.querySelector('.court');
let LAND_X;
function frameCourt() {
  LAND_X = NET_X + (narrow.matches ? 120 : 280);
  svgCourt.setAttribute('viewBox', narrow.matches ? '20 150 740 272' : '0 140 1100 282');
}
frameCourt();
narrow.addEventListener('change', () => { frameCourt(); setGrade(currentGrade, false); });
let currentGrade = 3;

function setGrade(g, animate = true) {
  const d = GRADES[g];
  currentGrade = g;
  const target = { netY: FLOOR - d.netIn / 12 * PX_PER_FT, serveX: NET_X - d.ft * PX_PER_FT };
  const from = { ...current };

  $('r-grade').textContent = d.label;
  $('r-net').textContent = d.net;
  $('r-serve').textContent = d.serve;
  $('r-ball').textContent = d.ball;
  $('r-note').textContent = d.note;
  $('r-skills').textContent = d.skills;
  court.hLabel.textContent = d.net;
  court.sLabel.textContent = d.ft === 30 ? 'End line · 30 ft' : `${d.ft} ft`;

  if (d.ohFt) {
    const ox = NET_X - d.ohFt * PX_PER_FT;
    court.ohLine.setAttribute('x', ox - 4);
    court.ohLabel.setAttribute('x', ox);
    court.ohMark.setAttribute('opacity', '1');
  } else {
    court.ohMark.setAttribute('opacity', '0');
  }

  document.querySelectorAll('.chips button').forEach(b => {
    const on = b.dataset.grade === String(g);
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  });

  cancelAnimationFrame(tween);
  if (!animate || reduceMotion) {
    current = target;
    drawCourt(target.netY, target.serveX);
    placeBall(LAND_X + 50, REST_Y);
    return;
  }

  // 0–450ms: net and serve line glide to the new grade while the ball waits at the server.
  // 450–1650ms: the serve clears the net. Then one small bounce and rest.
  const t0 = performance.now();
  const frame = now => {
    const ms = now - t0;
    const k = ease(Math.min(ms / 450, 1));
    const netY = from.netY + (target.netY - from.netY) * k;
    const serveX = from.serveX + (target.serveX - from.serveX) * k;
    drawCourt(netY, serveX);
    current = { netY, serveX };

    const sx = serveX - 12;
    if (ms < 450) {
      placeBall(sx, TOSS_Y);
    } else if (ms < 1650) {
      const p = (ms - 450) / 1200;
      const x = sx + (LAND_X - sx) * p;
      placeBall(x, arcY(x, [[sx, TOSS_Y], [NET_X, target.netY - 46], [LAND_X, REST_Y]]), p * 540);
    } else if (ms < 2050) {
      const p = (ms - 1650) / 400;
      placeBall(LAND_X + 50 * p, REST_Y - Math.sin(p * Math.PI) * 38, 540 + p * 120);
    } else {
      placeBall(LAND_X + 50, REST_Y, 660);
      return;
    }
    tween = requestAnimationFrame(frame);
  };
  tween = requestAnimationFrame(frame);
}

const chips = [...document.querySelectorAll('.chips button')];
let touched = false;
const pick = b => { touched = true; setGrade(b.dataset.grade); };
chips.forEach(b => b.addEventListener('click', () => pick(b)));
roving(chips, pick);

// The page's one unprompted motion: a single serve when the court first comes into view.
const courtFig = document.querySelector('.court-figure');
if (courtFig && 'IntersectionObserver' in window && !reduceMotion) {
  drawCourt(current.netY, current.serveX);
  placeBall(current.serveX - 12, TOSS_Y);
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { io.disconnect(); if (!touched) setGrade(currentGrade); }
  }, { threshold: 0.35 });
  io.observe(courtFig);
} else {
  setGrade(3, false);
}

/* ---------- Season plan ----------
   Source: CSA Season Curriculum & Practice Plan Guide, weeks 1–9 (condensed; wording kept close). */
const WEEKS = {
  1: { title: 'First contact', focus: 'Introductions, platform mechanics, underhand serve', seg: [
    ['Warm-up & ball control', 'Name game with a movement everyone copies. Self-toss and catch, then partner toss and catch from 10 feet. Introduce the platform: arms together, thumbs parallel, elbows locked.'],
    ['Serving', 'Underhand serve: step with the opposite foot, swing like a pendulum, contact the bottom of the ball. Serve into the net up close first, then back up. Goal: 8–10 serves each.'],
    ['Skill focus: passing', 'The coach tosses and the player passes back with her platform. Cue: "Thumbs down, elbows locked, platform to the target." Form first; accuracy comes later.'],
    ['Team play', 'Learn court positions 1–6 and clockwise rotation. In a modified game, the coach tosses each rally in. Everyone calls "mine" before every contact.']],
    tip: 'Week 1 is about culture, not perfection. Learn every player\'s name. Celebrate every attempt. Set the tone that this is a safe place to try and fail.' },
  2: { title: 'Platform passing', focus: 'Passing accuracy, serve consistency, communication', seg: [
    ['Warm-up & ball control', 'Self-bump and count consecutive contacts. Partner passing at 10 feet: five in a row without a drop. "Belly button to the ball": face it before you pass.'],
    ['Serving', 'Underhand from the grade line, consistency over power. 3rd grade starts overhand mechanics up close: toss, reach, snap. Goal: 10 serves each, counting how many clear the net.'],
    ['Skill focus: passing to a target', 'A hula hoop or cone marks the setter\'s spot. The coach tosses, the player passes to the target, and the tosses get longer and wider as players improve.'],
    ['Team play', 'Modified game with a rotation on every side-out. The coach starts rallies with a toss for 1st–2nd; 3rd and up serve. Keep the "mine" calls coming.']],
    tip: 'Passing to a target is a big jump. Don\'t expect accuracy yet. Reward the attempt and the correct platform form. Accuracy comes with repetition.' },
  3: { title: 'Serve receive basics', focus: 'Reading the serve, serve-receive positioning, rotation review', seg: [
    ['Warm-up & ball control', 'Partner passing out to 15 feet. Movement drill: shuffle where the coach points, then pass the toss. Ready position: knees bent, weight forward, eyes on the ball.'],
    ['Serving', 'Serve from the grade line and aim for the corners. 4th grade moves to 22 feet. 5th–6th serve from the end line, consistency before power.'],
    ['Skill focus: serve receive', 'Three players across the back row. The coach serves or tosses; the closest player calls "mine" and passes to the target while the others clear out.'],
    ['Team play', 'Full game with live serving from grade lines. Rotate after every side-out, then debrief: "What position are you in? Who serves next?"']],
    tip: 'By Week 3, players should know their rotation and call "mine" consistently. If rotation is still shaky, spend extra time on it. It is the foundation for everything in Phase 2.' },
  4: { title: 'Overhand serve & setting intro', focus: 'Overhand serve mechanics, what a set is, setting hand position', seg: [
    ['Warm-up & ball control', 'Alternate self-bump and self-set. In pairs, one bumps and one sets, switching after five. Setting hands make a triangle above the forehead: fingerpads, not palms.'],
    ['Serving', '3rd–6th grade learn the overhand serve from 10 feet (toss high, reach tall, snap the wrist) and move back as mechanics improve. 1st–2nd keep building the underhand serve.'],
    ['Skill focus: setting', 'Self-set and catch, ten times. Partner sets: three in a row without catching. Cue: "Hands up early, push through the ball, extend fully."'],
    ['Team play', 'Position 2 becomes the designated setter for the second ball. Encourage pass–set–hit, and celebrate any three-contact sequence, whatever happens next.']],
    tip: 'Setting is the hardest skill to teach at this age. Don\'t penalize carries aggressively. Focus on hand position and intent. Improvement comes over multiple seasons.' },
  5: { title: 'Pass, set, hit', focus: 'Connecting three contacts, downball hitting, court awareness', seg: [
    ['Warm-up & ball control', 'Groups of three: pass to the setter, set to the hitter, hitter catches, rotate. The passer calls "mine," the setter calls "set," the hitter calls "hit."'],
    ['Serving', 'Serve to zones: deep corners, then short. 5th–6th serve overhand from the end line and aim for the back half.'],
    ['Skill focus: downball & hitting', 'Downball from behind the 10-foot line: toss and drive it over with an open hand. 3rd–4th stay with the downball. 5th–6th learn the three-step approach.'],
    ['Team play', 'Each team needs at least two contacts before sending it over. Any three-contact sequence earns a bonus point while the coach narrates: pass, now set, now hit.']],
    tip: 'The bonus point for three-contact sequences is a powerful motivator. Players start to understand why the sequence matters, not just that they\'re supposed to do it.' },
  6: { title: 'Serve receive & team defense', focus: 'W formation, base defense, free-ball transition', seg: [
    ['Warm-up & ball control', 'Longer partner passing, now while moving sideways. Introduce the free ball: an easy ball from the other side means your team goes on offense.'],
    ['Serving', 'Cones go in the back corners. The team earns a point for every serve that lands within three feet of a cone.'],
    ['Skill focus: serve-receive formation', '5th–6th learn the W: five players across the back two-thirds of the court. 3rd–4th use three back and three at the net. The coach serves and the team tries to run pass–set–hit.'],
    ['Team play', 'Live serving, with the formation set before every serve. When the coach calls "Free ball!" the team transitions to offense.']],
    tip: 'Week 6 is the midpoint. Pause for five minutes and ask, "What\'s one thing you\'ve gotten better at this season?" Recognizing personal growth is a powerful motivator.' },
  7: { title: 'Game-like drills', focus: 'Competitive drills, pressure situations, serve and receive under pressure', seg: [
    ['Warm-up & ball control', 'Pepper for 3rd grade and up: pass, set, hit, in a continuous loop. 1st–2nd run partner rallies and count passes without a drop.'],
    ['Serving', 'Serving competition: five serves each, one point for in, two for the back half. A team total brings low-stakes pressure.'],
    ['Skill focus: Queen of the Court', '3-on-3 on a half court. The first team to three points stays on; the other rotates off. No silent contacts.'],
    ['Team play', 'Full game with tournament rules: rally scoring, standard rotation, live serving. The coach notes each player\'s growth for season-end recognition.']],
    tip: 'Introduce a little competitive pressure this week. It prepares players for the tournament. Keep it fun, but let them feel what it\'s like to play for something.' },
  8: { title: 'Tournament prep', focus: 'Tournament rules review, rotations under pressure, mental preparation', seg: [
    ['Warm-up & ball control', 'Players lead their own warm-up while the coach watches. Partner serving warm-up: serve, receive, pass to the target.'],
    ['Serving', 'Review tournament serving rules for each grade. Every player serves from tournament distance, aiming for consistency.'],
    ['Skill focus: rotation quiz', 'Six on the court, and the coach calls a scenario: "Side-out from position 4. Where does everyone move?" Know where you are. Know who serves next.'],
    ['Team play: simulated match', 'Best two of three under full tournament rules. The coach referees, calls faults, keeps score, and runs timeouts. Debrief: what went well, and what\'s next?']],
    tip: 'The rotation quiz is one of the highest-value activities of the season. Players who know their rotation don\'t panic in games. Run it fast and make it fun, not a test.' },
  9: { title: 'Tournament week', focus: 'Light practice, mental readiness, team unity', seg: [
    ['Warm-up & ball control', 'Keep it light, with no new skills. The team votes on its favorite warm-up drill.'],
    ['Serving', 'Five serves each from tournament distance. Build confidence, not pressure, and celebrate every good serve.'],
    ['Skill focus: team highlights', 'The coach names one specific improvement for each player, out loud, in front of the team. Then a quick tournament review: bracket, schedule, what to bring, arrival time.'],
    ['Team play: fun scrimmage', 'Bonus points for aces and three-contact sequences. End with a team cheer the players choose, and one reminder: "Go have fun at the tournament."']],
    tip: 'Week 9 practice is about confidence and energy, not skill work. Your players are ready. Your job this week is to remind them of that.' }
};
const MINUTES = [15, 10, 15, 20];

function setWeek(n) {
  const w = WEEKS[n];
  $('w-title').textContent = `Week ${n}: ${w.title}`;
  $('w-focus').textContent = w.focus;
  $('w-tip').textContent = w.tip;
  $('w-segments').replaceChildren(...w.seg.map(([name, body], i) => {
    const li = document.createElement('li');
    li.className = `s${i + 1}`;
    const h = document.createElement('h4');
    const mins = document.createElement('span');
    mins.textContent = `${MINUTES[i]} min`;
    h.append(name, ' ', mins);
    const p = document.createElement('p');
    p.textContent = body;
    li.append(h, p);
    return li;
  }));
  document.querySelectorAll('.weeks [role=tab]').forEach(t => {
    const on = t.dataset.week === String(n);
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
  $('week-panel').setAttribute('aria-labelledby', `wk-${n}`);
}
const tabs = [...document.querySelectorAll('.weeks [role=tab]')];
tabs.forEach(t => t.addEventListener('click', () => {
  setWeek(t.dataset.week);
  // On phones the plan sits below all nine weeks, so bring it into view.
  if (narrow.matches) $('week-panel').scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
}));
roving(tabs, t => setWeek(t.dataset.week));
setWeek(1);

/* ---------- Rotation ---------- */
const SPOTS = { 4: [73, 80], 3: [180, 80], 2: [287, 80], 5: [73, 218], 6: [180, 218], 1: [287, 218] };
const NS = 'http://www.w3.org/2000/svg';
const spotLayer = document.querySelector('.spot-labels');
Object.entries(SPOTS).forEach(([n, [x, y]]) => {
  const t = document.createElementNS(NS, 'text');
  t.setAttribute('x', x);
  t.setAttribute('y', y + 47);
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('class', n === '1' ? 'spot-num serve-spot' : 'spot-num');
  t.textContent = n === '1' ? 'Spot 1 · serves' : `Spot ${n}`;
  spotLayer.append(t);
});
const tokens = {};
let spotOf = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 }; // jersey -> spot
for (let j = 1; j <= 6; j++) {
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'player');
  g.innerHTML = `<circle r="24"></circle><text text-anchor="middle" dy="9">${j}</text>`;
  $('rot-players').append(g);
  tokens[j] = g;
}
let rotations = 0;
function drawRotation() {
  for (let j = 1; j <= 6; j++) {
    const [x, y] = SPOTS[spotOf[j]];
    tokens[j].style.transform = `translate(${x}px, ${y}px)`;
    tokens[j].classList.toggle('serving', spotOf[j] === 1);
  }
  const server = Object.keys(spotOf).find(j => spotOf[j] === 1);
  $('rot-status').textContent = rotations === 0
    ? `Jersey ${server} is in spot 1, so she serves.`
    : `Everyone moved one spot clockwise. Jersey ${server} serves now.`;
}
$('rotate-btn').addEventListener('click', () => {
  for (let j = 1; j <= 6; j++) spotOf[j] = spotOf[j] === 1 ? 6 : spotOf[j] - 1;
  rotations = (rotations + 1) % 6;
  drawRotation();
});
drawRotation();
