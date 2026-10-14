/* Animated court diagrams for the practice plans.
   Each <figure class="court-anim"> carries its scene as JSON and a server-rendered list of steps.
   This script draws one side of the court from above (net at the top) and plays the steps.
   Coordinates are feet: x 0–30 across the court, y 0 at the net to 30 at the end line. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PX = x => 20 + x * 10;
  const PY = y => 120 + y * 10;
  const SPOTS = { 4: [5, 6], 3: [15, 6], 2: [25, 6], 5: [5, 21], 6: [15, 21], 1: [25, 21] };
  const MOVE_MS = 900, DWELL_MS = 1500;

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.append(n);
    return n;
  }
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  // If the ball point is within 1.6 ft of a player, draw it up and to the right of her.
  function atShoulder(p, ...sets) {
    for (const pos of sets) for (const q of Object.values(pos)) {
      if (q && Math.hypot(q[0] - p[0], q[1] - p[1]) < 1.6) return [q[0] + 1.4, q[1] - 1.4];
    }
    return p;
  }

  // Fold the steps into full states: where everyone is after each step.
  function statesOf(scene) {
    const out = [];
    let pos = {}, ball = null;
    for (const s of scene.steps) {
      const before = { ...pos };
      const ballBefore = ball;
      if (s.at) pos = { ...pos, ...s.at };
      if ('ball' in s) ball = s.ball;
      out.push({
        before, pos: { ...pos },
        ballFrom: s.ballFrom || ballBefore, ball,
        calls: s.calls || {}, hl: s.hl || [], say: s.say
      });
    }
    return out;
  }

  function drawCourt(svg, scene, gradId) {
    const g = el('g', {}, svg);
    el('rect', { x: 0, y: 0, width: 340, height: 470, fill: '#0b1830' }, g);
    // the other side, partly visible
    el('rect', { x: PX(0), y: PY(-10), width: 300, height: 100, fill: '#c99a62', 'fill-opacity': 0.55 }, g);
    // our side
    el('rect', { x: PX(0), y: PY(0), width: 300, height: 300, fill: `url(#${gradId})` }, g);
    const lines = el('g', { stroke: '#fff', 'stroke-width': 3, fill: 'none' }, g);
    el('polyline', { points: `${PX(0)},${PY(-10)} ${PX(0)},${PY(30)} ${PX(30)},${PY(30)} ${PX(30)},${PY(-10)}` }, lines);
    el('line', { x1: PX(0), y1: PY(10), x2: PX(30), y2: PY(10) }, lines);
    el('line', { x1: PX(0), y1: PY(-10), x2: PX(30), y2: PY(-10), 'stroke-opacity': 0.6 }, lines);
    // net: posts, band, antennae
    el('rect', { x: PX(-1.2), y: PY(0) - 5, width: 324, height: 10, rx: 2, fill: '#0f1f3d' }, g);
    el('rect', { x: PX(-1.2), y: PY(0) - 5, width: 324, height: 3, fill: '#fff' }, g);
    for (const x of [0, 30]) el('rect', { x: PX(x) - 2, y: PY(0) - 9, width: 4, height: 18, fill: '#c0272d' }, g);
    const txt = (x, y, s, cls) => { const t = el('text', { x, y, class: cls }, g); t.textContent = s; return t; };
    // with spot labels shown, the spot 3 label sits where this one would, so it drops below the line
    txt(PX(15), scene.spots ? PY(10) + 16 : PY(10) - 6, '10-FOOT LINE', 'ca-floor');
    txt(PX(15), PY(30) - 6, 'END LINE', 'ca-floor');
    // corner labels, clear of the coach and the ball (both stay near the middle of the other side)
    txt(PX(30) - 8, PY(-10) + 16, 'OTHER SIDE', 'ca-side');
    txt(PX(0) + 8, PY(0) - 11, 'NET', 'ca-net');
    if (scene.spots) {
      for (const [n, [x, y]] of Object.entries(SPOTS)) txt(PX(x), PY(y) + 34, `spot ${n}`, 'ca-spot');
    }
    for (const m of scene.marks || []) {
      if (m.type === 'hoop') {
        el('circle', { cx: PX(m.at[0]), cy: PY(m.at[1]), r: 17, fill: 'none', stroke: '#ffcf32', 'stroke-width': 4, 'stroke-dasharray': '6 4' }, g);
        txt(PX(m.at[0]), PY(m.at[1]) + 32, m.label || 'Target', 'ca-mark');
      }
    }
  }

  function build(fig, idx) {
    const data = JSON.parse(fig.querySelector('script.scene-json').textContent);
    const states = statesOf(data);
    const stage = fig.querySelector('.anim-stage');
    const list = fig.querySelector('.anim-steps');
    const items = list ? [...list.children] : [];

    const svg = el('svg', { viewBox: '0 0 340 470', class: 'ca-svg', role: 'img', 'aria-label': data.summary }, null);
    const defs = el('defs', {}, svg);
    const gradId = `ca-maple-${idx}`;
    const grad = el('linearGradient', { id: gradId, x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#d9ae75' }, grad);
    el('stop', { offset: 1, 'stop-color': '#ecc994' }, grad);
    drawCourt(svg, data, gradId);

    const shadow = el('ellipse', { rx: 7, ry: 3, fill: '#000', 'fill-opacity': 0.25, visibility: 'hidden' }, svg);
    const actors = {};
    for (const a of data.actors) {
      const g = el('g', { class: 'ca-actor' + (a.kind === 'coach' ? ' coach' : '') }, svg);
      el('circle', { r: a.kind === 'coach' ? 15 : 14 }, g);
      const t = el('text', { 'text-anchor': 'middle', dy: 7 }, g);
      t.textContent = a.kind === 'coach' ? 'C' : a.label;
      const bubble = el('g', { class: 'ca-call', visibility: 'hidden' }, g);
      el('rect', { x: -34, y: -46, width: 68, height: 22, rx: 11 }, bubble);
      const bt = el('text', { 'text-anchor': 'middle', y: -30 }, bubble);
      actors[a.id] = { g, bubble, bt };
    }
    const ball = el('g', { class: 'ca-ball', visibility: 'hidden' }, svg);
    el('circle', { r: 7, fill: '#fff' }, ball);
    el('path', { d: 'M-7 0a7 7 0 0 1 14 0z', fill: '#1a4f9c' }, ball);
    el('circle', { r: 7, fill: 'none', stroke: '#0f1f3d', 'stroke-opacity': 0.35 }, ball);
    stage.replaceChildren(svg);

    const caption = fig.querySelector('.anim-caption');
    const counter = fig.querySelector('.anim-count');
    const playBtn = fig.querySelector('[data-act="play"]');
    const prevBtn = fig.querySelector('[data-act="prev"]');
    const nextBtn = fig.querySelector('[data-act="next"]');

    let step = 0, playing = false, raf = 0, timer = 0;

    function place(id, x, y) {
      const a = actors[id];
      a.g.setAttribute('transform', `translate(${PX(x)} ${PY(y)})`);
      a.g.style.display = '';
    }
    function placeBall(x, y, lift) {
      ball.setAttribute('transform', `translate(${PX(x)} ${PY(y) - lift})`);
      shadow.setAttribute('cx', PX(x)); shadow.setAttribute('cy', PY(y) + 6);
      ball.setAttribute('visibility', 'visible'); shadow.setAttribute('visibility', 'visible');
    }
    function hideBall() { ball.setAttribute('visibility', 'hidden'); shadow.setAttribute('visibility', 'hidden'); }

    function frame(s, t) {
      const k = ease(t);
      for (const id in actors) {
        const to = s.pos[id];
        if (!to) { actors[id].g.style.display = 'none'; continue; }
        const from = s.before[id] || to;
        place(id, lerp(from[0], to[0], k), lerp(from[1], to[1], k));
      }
      if (s.ball) {
        const from = s.ballFrom || s.ball;
        const dist = Math.hypot(s.ball[0] - from[0], s.ball[1] - from[1]);
        const lift = Math.sin(Math.PI * k) * Math.min(60, dist * 2.2);
        // a ball with a player sits at her shoulder, so it never covers her letter
        const a = atShoulder(from, s.before, s.pos), b = atShoulder(s.ball, s.pos);
        placeBall(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lift);
      } else hideBall();
    }

    function show(i, animate) {
      step = i;
      const s = states[i];
      for (const id in actors) {
        const a = actors[id];
        a.g.classList.toggle('hl', s.hl.includes(id));
        a.bubble.setAttribute('visibility', 'hidden');
      }
      caption.textContent = s.say;
      counter.textContent = `Step ${i + 1} of ${states.length}`;
      items.forEach((li, j) => li.toggleAttribute('aria-current', j === i));
      prevBtn.disabled = i === 0;
      nextBtn.disabled = i === states.length - 1;
      cancelAnimationFrame(raf);
      const showCalls = () => {
        for (const id in s.calls) {
          const a = actors[id];
          if (!a) continue;
          a.bt.textContent = s.calls[id];
          // near the top edge (the coach across the net) the bubble goes below the player
          const y = (s.pos[id] || [0, 0])[1];
          a.bubble.setAttribute('transform', PY(y) < 60 ? 'translate(0 64)' : '');
          a.bubble.setAttribute('visibility', 'visible');
        }
      };
      if (!animate || reduce) { frame(s, 1); showCalls(); return Promise.resolve(); }
      return new Promise(res => {
        const t0 = performance.now();
        const tick = now => {
          const t = Math.min((now - t0) / MOVE_MS, 1);
          frame(s, t);
          if (t < 1) raf = requestAnimationFrame(tick); else { showCalls(); res(); }
        };
        raf = requestAnimationFrame(tick);
      });
    }

    function stop() {
      playing = false; clearTimeout(timer);
      playBtn.textContent = step === states.length - 1 ? 'Replay' : 'Play';
      playBtn.setAttribute('aria-pressed', 'false');
    }
    async function play() {
      if (step === states.length - 1) await show(0, false);
      playing = true;
      playBtn.textContent = 'Pause';
      playBtn.setAttribute('aria-pressed', 'true');
      const run = async () => {
        if (!playing) return;
        if (step >= states.length - 1) { stop(); return; }
        await show(step + 1, true);
        if (playing) timer = setTimeout(run, DWELL_MS);
      };
      timer = setTimeout(run, 500);
    }

    playBtn.addEventListener('click', () => (playing ? stop() : play()));
    prevBtn.addEventListener('click', () => { stop(); show(Math.max(0, step - 1), false); });
    nextBtn.addEventListener('click', () => { stop(); show(Math.min(states.length - 1, step + 1), true); });
    items.forEach((li, j) => {
      li.addEventListener('click', () => { stop(); show(j, false); });
    });

    fig.classList.add('ready');
    show(0, false);
    stop();

    if (!reduce && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => {
        if (es.some(e => e.isIntersecting)) { io.disconnect(); if (step === 0) play(); }
      }, { threshold: 0.6 });
      io.observe(stage);
    }
  }

  document.querySelectorAll('figure.court-anim').forEach((fig, idx) => {
    try { build(fig, idx); } catch (err) { fig.classList.add('anim-failed'); console.error('court-anim', err); }
  });
})();
