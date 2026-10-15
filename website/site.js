// Program facts and the season plan come from data/ through the build (see scripts/build.mjs).
const DATA = JSON.parse(document.getElementById('csa-data').textContent);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
let currentWeek = 1;

// The "Open week N" links under the season plan follow the selected week and grade.
function updateDivisionLinks() {
  const label = $('dl-week');
  if (label) label.textContent = currentWeek;
  document.querySelectorAll('#division-links a[data-division]').forEach(a => {
    a.href = `/plans/${a.dataset.division}/week-${currentWeek}/`;
    a.classList.toggle('mine', a.dataset.grades.split(',').includes(String(currentGrade)));
  });
}

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
   Source: CSA Coach Quick Reference Card and Curriculum Guide (serving table, net heights).
   The scene is an oblique view from above the near sideline. World units are feet:
   x runs down the length of the court (net at 30), z across its width, y up. */
const U = 20, KX = 8, KZ = 5, Y0 = 360;
const NET_X = 30, NET_DEPTH = 3.2, COURT_W = 30;
const P = (x, y, z) => [x * U + z * KX, Y0 - z * KZ - y * U];
const pts = list => list.map(p => P(...p).join(',')).join(' ');
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.append(n);
  return n;
}

const GRADES = Object.fromEntries(Object.entries(DATA.grades).map(([g, d]) => [g, { ...d, ft: d.serveFt, ohFt: d.overhandFt }]));

// Static scene, painted back to front.
const scene = document.getElementById('court-scene');
el('polygon', { points: pts([[-8, 0, -4], [52, 0, -4], [52, 0, 34], [-8, 0, 34]]), fill: '#1A4F9C' }, scene);
el('polygon', { points: pts([[0, 0, 0], [60, 0, 0], [60, 0, 30], [0, 0, 30]]), fill: 'url(#maple)' }, scene);
for (let z = 2; z < 30; z += 2) {
  const a = P(0, 0, z), b = P(60, 0, z);
  el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#a8743d', 'stroke-opacity': .22 }, scene);
}
const lines = el('g', { stroke: '#fff', 'stroke-width': 3.5, fill: 'none', 'stroke-linejoin': 'round' }, scene);
el('polygon', { points: pts([[0, 0, 0], [60, 0, 0], [60, 0, 30], [0, 0, 30]]) }, lines);
for (const x of [20, 30, 40]) el('polyline', { points: pts([[x, 0, 0], [x, 0, 30]]) }, lines);
// ball shadow sits on the floor, under everything that stands up
const shadow = el('ellipse', { rx: 10, ry: 4, fill: '#000', 'fill-opacity': .25 }, scene);
// serve lines on the floor
const ohLine = el('polyline', { points: pts([[20, 0, 0], [20, 0, 30]]), stroke: '#ffcf32', 'stroke-width': 5, fill: 'none', opacity: 0 }, scene);
const ohLabel = el('text', { class: 'dim-label small', opacity: 0 }, scene); ohLabel.textContent = 'overhand';
const serveLine = el('polyline', { points: pts([[15, 0, 0], [15, 0, 30]]), stroke: '#C0272D', 'stroke-width': 5, fill: 'none' }, scene);
// serve distance dimension, in the free zone beside the near sideline
const serveDim = el('g', { stroke: '#ff9ea3', 'stroke-width': 2 }, scene);
const sdLine = el('line', {}, serveDim), sdTickA = el('line', {}, serveDim), sdTickB = el('line', {}, serveDim);
const serveLabel = el('text', { class: 'dim-label', fill: '#ffd6d8' }, scene);
// the net: far post, mesh, bands, antennae, near post
const farPost = el('rect', { width: 7, rx: 1.5, fill: '#b7c4d8' }, scene);
const mesh = el('polygon', { fill: '#0f1f3d', 'fill-opacity': .45 }, scene);
const meshLines = el('polygon', { fill: 'url(#mesh)' }, scene);
const topBand = el('polygon', { fill: '#fff' }, scene);
const bottomBand = el('polygon', { fill: '#fff', 'fill-opacity': .85 }, scene);
const antennae = el('g', { 'stroke-width': 4, 'stroke-linecap': 'round' }, scene);
const antFar = [el('line', { stroke: '#fff' }, antennae), el('line', { stroke: '#C0272D', 'stroke-dasharray': '10 10' }, antennae)];
const antNear = [el('line', { stroke: '#fff' }, antennae), el('line', { stroke: '#C0272D', 'stroke-dasharray': '10 10' }, antennae)];
const nearPost = el('rect', { width: 7, rx: 1.5, fill: '#b7c4d8' }, scene);
// net height dimension beside the near post
const hDim = el('g', { stroke: '#9cc3ff', 'stroke-width': 2 }, scene);
const hdLine = el('line', {}, hDim), hdTop = el('line', {}, hDim), hdBottom = el('line', {}, hDim);
const hLabel = el('text', { class: 'dim-label', fill: '#d6e6ff' }, scene);
// ball
const ball = el('g', {}, scene);
const spin = el('g', {}, ball);
el('circle', { r: 11, fill: '#fff' }, spin);
el('path', { d: 'M-11 0a11 11 0 0 1 22 0z', fill: '#1A4F9C' }, spin);
el('path', { d: 'M-4 -10.2c5.5 4 7 10 5.5 20.4', fill: 'none', stroke: '#C0272D', 'stroke-width': 3 }, spin);
el('circle', { r: 11, fill: 'none', stroke: '#0f1f3d', 'stroke-opacity': .3 }, spin);

function setLine(l, a, b) { l.setAttribute('x1', a[0]); l.setAttribute('y1', a[1]); l.setAttribute('x2', b[0]); l.setAttribute('y2', b[1]); }
function setPost(r, z, h) { const [x, y] = P(NET_X, h + .4, z); r.setAttribute('x', x - 3.5); r.setAttribute('y', y); r.setAttribute('height', (h + .4) * U); }
function setAntenna([white, red], z, h) { const a = P(NET_X, h - NET_DEPTH, z), b = P(NET_X, h + 2.6, z); setLine(white, a, b); setLine(red, a, b); }

function drawCourt(h, sx) {
  const zA = -2.5, zB = 32.5;
  mesh.setAttribute('points', pts([[NET_X, h, zA], [NET_X, h, zB], [NET_X, h - NET_DEPTH, zB], [NET_X, h - NET_DEPTH, zA]]));
  meshLines.setAttribute('points', mesh.getAttribute('points'));
  topBand.setAttribute('points', pts([[NET_X, h + .25, zA], [NET_X, h + .25, zB], [NET_X, h - .1, zB], [NET_X, h - .1, zA]]));
  bottomBand.setAttribute('points', pts([[NET_X, h - NET_DEPTH + .15, zA], [NET_X, h - NET_DEPTH + .15, zB], [NET_X, h - NET_DEPTH, zB], [NET_X, h - NET_DEPTH, zA]]));
  setPost(farPost, zB, h); setPost(nearPost, zA, h);
  setAntenna(antFar, COURT_W, h); setAntenna(antNear, 0, h);
  // height dimension, beside the far post where the background is clear
  const hx = P(NET_X, 0, zB)[0] + 30, floorY = P(NET_X, 0, zB)[1], topY = P(NET_X, h, zB)[1];
  setLine(hdLine, [hx, floorY], [hx, topY]); setLine(hdTop, [hx - 10, topY], [hx + 10, topY]); setLine(hdBottom, [hx - 10, floorY], [hx + 10, floorY]);
  hLabel.setAttribute('x', hx + 16); hLabel.setAttribute('y', (floorY + topY) / 2 + 11);
  // serve line, with its distance measured along the far sideline
  serveLine.setAttribute('points', pts([[sx, 0, 0], [sx, 0, COURT_W]]));
  const a = P(sx, 0, COURT_W + 4.5), b = P(NET_X, 0, COURT_W + 4.5);
  setLine(sdLine, a, b); setLine(sdTickA, [a[0], a[1] - 7], [a[0], a[1] + 7]); setLine(sdTickB, [b[0], b[1] - 7], [b[0], b[1] + 7]);
  serveLabel.setAttribute('x', a[0] + 4); serveLabel.setAttribute('y', a[1] - 14);
}

function placeBall(x, y, z, rot = 0) {
  const [bx, by] = P(x, y, z), [gx, gy] = P(x, 0, z);
  ball.setAttribute('transform', `translate(${bx} ${by})`);
  spin.setAttribute('transform', `rotate(${rot})`);
  shadow.setAttribute('cx', gx); shadow.setAttribute('cy', gy);
  const k = Math.max(.35, 1 - y / 12);
  shadow.setAttribute('rx', 10 * k); shadow.setAttribute('ry', 4 * k); shadow.setAttribute('fill-opacity', .25 * k);
}

// Parabola through three points (Lagrange form): toss, just over the net, landing.
function arcY(x, [[x0, y0], [x1, y1], [x2, y2]]) {
  return y0 * (x - x1) * (x - x2) / ((x0 - x1) * (x0 - x2))
       + y1 * (x - x0) * (x - x2) / ((x1 - x0) * (x1 - x2))
       + y2 * (x - x0) * (x - x1) / ((x2 - x0) * (x2 - x1));
}
const ease = t => 1 - Math.pow(1 - t, 3);
const BALL_Z = 11, TOSS_H = 4.5, REST_H = .35;
// On phones, frame the serving side and the net so the court reads larger.
const narrow = window.matchMedia('(max-width: 720px)');
const svgCourt = document.querySelector('.court');
let landX;
function frameCourt() {
  landX = narrow.matches ? 39 : 45;
  // the phone frame runs a little deeper so the larger "overhand" label clears the bottom edge
  svgCourt.setAttribute('viewBox', narrow.matches ? '-40 5 1080 404' : '-70 5 1390 390');
}
frameCourt();
let currentGrade = 3, current = { h: 6.5, sx: 15 }, tween = null;
narrow.addEventListener('change', () => { frameCourt(); setGrade(currentGrade, false); });

function setGrade(g, animate = true) {
  const d = GRADES[g];
  currentGrade = g;
  const target = { h: d.netFt, sx: NET_X - d.ft };
  const from = { ...current };

  $('r-grade').textContent = d.label;
  $('r-net').textContent = d.net;
  $('r-serve').textContent = d.serve;
  $('r-ball').textContent = d.ball;
  $('r-note').textContent = d.note;
  $('r-skills').textContent = d.skills;
  hLabel.textContent = d.net;
  serveLabel.textContent = d.ft === 30 ? 'End line · 30 ft' : `${d.ft} ft`;

  if (d.ohFt) {
    const ox = NET_X - d.ohFt;
    ohLine.setAttribute('points', pts([[ox, 0, 0], [ox, 0, COURT_W]]));
    const [lx, ly] = P(ox, 0, -2.2);
    ohLabel.setAttribute('x', lx); ohLabel.setAttribute('y', ly + 6); ohLabel.setAttribute('text-anchor', 'middle');
    ohLine.setAttribute('opacity', 1); ohLabel.setAttribute('opacity', 1);
  } else {
    ohLine.setAttribute('opacity', 0); ohLabel.setAttribute('opacity', 0);
  }

  document.querySelectorAll('.chips button').forEach(b => {
    const on = b.dataset.grade === String(g);
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  updateDivisionLinks();

  cancelAnimationFrame(tween);
  if (!animate || reduceMotion) {
    current = target;
    drawCourt(target.h, target.sx);
    placeBall(landX + 3, REST_H, BALL_Z);
    return;
  }

  // 0–450ms: net and serve line glide to the new grade while the ball waits at the server.
  // 450–1650ms: the serve clears the net. Then one small bounce and rest.
  const t0 = performance.now();
  const frame = now => {
    const ms = now - t0;
    const k = ease(Math.min(ms / 450, 1));
    const h = from.h + (target.h - from.h) * k;
    const sx = from.sx + (target.sx - from.sx) * k;
    drawCourt(h, sx);
    current = { h, sx };

    const x0 = sx - 1;
    if (ms < 450) {
      placeBall(x0, TOSS_H, BALL_Z);
    } else if (ms < 1650) {
      const p = (ms - 450) / 1200;
      const x = x0 + (landX - x0) * p;
      placeBall(x, arcY(x, [[x0, TOSS_H], [NET_X, target.h + 1.6], [landX, REST_H]]), BALL_Z, p * 540);
    } else if (ms < 2050) {
      const p = (ms - 1650) / 400;
      placeBall(landX + 3 * p, REST_H + Math.sin(p * Math.PI) * 1.6, BALL_Z, 540 + p * 120);
    } else {
      placeBall(landX + 3, REST_H, BALL_Z, 660);
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
  drawCourt(current.h, current.sx);
  placeBall(current.sx - 1, TOSS_H, BALL_Z);
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { io.disconnect(); if (!touched) setGrade(currentGrade); }
  }, { threshold: 0.35 });
  io.observe(courtFig);
} else {
  setGrade(3, false);
}

/* ---------- Season plan ----------
   Source: data/plans.json, from the CSA Season Curriculum & Practice Plan Guide (condensed for this page). */
const WEEKS = Object.fromEntries(DATA.weeks.map(w => [w.n, w]));
const MINUTES = [15, 10, 15, 20];

function setWeek(n) {
  n = Number(n);
  currentWeek = n;
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
  updateDivisionLinks();
}
const tabs = [...document.querySelectorAll('.weeks [role=tab]')];
tabs.forEach(t => t.addEventListener('click', () => {
  setWeek(t.dataset.week);
  // On phones the plan sits below all nine weeks, so bring it into view.
  if (narrow.matches) $('week-panel').scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
}));
roving(tabs, t => setWeek(t.dataset.week));

// This week of the season, once CSA has confirmed the dates (data/facts.json → season.weekOneStart).
function seasonWeek(season) {
  if (!season.weekOneStart) return null;
  const [y, m, d] = season.weekOneStart.split('-').map(Number);
  const today = new Date();
  const days = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(y, m - 1, d)) / 86400000);
  if (days < 0) return null;
  const n = Math.floor(days / 7) + 1;
  return n <= 9 ? n : null;
}
const thisWeek = seasonWeek(DATA.season);
if (thisWeek) {
  const tw = $('this-week');
  tw.textContent = `This week: Week ${thisWeek}, ${WEEKS[thisWeek].title}.`;
  tw.hidden = false;
}
setWeek(thisWeek || 1);

/* ---------- Rotation ---------- */
const SPOTS = { 4: [73, 80], 3: [180, 80], 2: [287, 80], 5: [73, 218], 6: [180, 218], 1: [287, 218] };
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
