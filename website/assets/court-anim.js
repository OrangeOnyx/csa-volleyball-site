/* Animated court diagrams for the practice plans.
   Each <figure class="court-anim"> carries its scene as JSON and a server-rendered list of steps.
   This script draws one side of the court from above (net at the top) and plays the steps.
   Coordinates are feet: x 0–30 across the court, y 0 at the net to 30 at the end line. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => motionQuery.matches;
  const PX = x => 20 + x * 10;
  const PY = y => 120 + y * 10;
  const SPOTS = { 4: [5, 6], 3: [15, 6], 2: [25, 6], 5: [5, 21], 6: [15, 21], 1: [25, 21] };
  const MOVE_MS = 900;
  const words = s => (String(s).match(/\S+/g) || []).length;

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.append(n);
    return n;
  }
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const same = (p, q) => !!p && !!q && Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.5;
  // If the ball point is within 1.6 ft of a player, draw it at her shoulder, up and to the right,
  // so it never covers her letter.
  function atShoulder(p, ...sets) {
    for (const pos of sets) for (const q of Object.values(pos)) {
      if (q && Math.hypot(q[0] - p[0], q[1] - p[1]) < 1.6) return [q[0] + 1.6, q[1] - 1.6];
    }
    return p;
  }
  const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

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

  // The drawing stops just below the end line unless someone stands behind it (the server in
  // the rotation), so most diagrams carry no empty band under the court.
  function heightOf(states) {
    let maxY = 30;
    for (const s of states) {
      for (const p of Object.values(s.pos)) if (p) maxY = Math.max(maxY, p[1]);
      if (s.ball) maxY = Math.max(maxY, s.ball[1]);
    }
    return Math.ceil(Math.max(PY(30) + 12, PY(maxY) + 22));
  }

  // Returns the court's text labels, which call-outs keep clear of, and the layer for trails,
  // which sits over the floor and its lines but under the labels. A label on our side is edged
  // with the floor's own paint, so a trail passing under it stops short of the letters.
  function drawCourt(svg, scene, gradId, height) {
    const g = el('g', {}, svg);
    el('rect', { x: 0, y: 0, width: 340, height, fill: '#0b1830', class: 'ca-bg' }, g);
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
    const trails = el('g', { class: 'ca-trails' }, g);
    const labels = [];
    const txt = (x, y, s, cls) => {
      const t = el('text', { x, y, class: cls }, g);
      if (y > PY(0)) t.setAttribute('stroke', `url(#${gradId})`);
      t.textContent = s; labels.push(t); return t;
    };
    // with spot labels shown, the spot 3 label sits where this one would, so it drops below the line
    txt(PX(15), scene.spots ? PY(10) + 18 : PY(10) - 7, '10-FOOT LINE', 'ca-floor');
    txt(PX(15), PY(30) - 7, 'END LINE', 'ca-floor');
    // corner labels, clear of the coach and the ball (both stay near the middle of the other side)
    txt(PX(30) - 8, PY(-10) + 17, 'OTHER SIDE', 'ca-side');
    txt(PX(0) + 8, PY(0) - 11, 'NET', 'ca-net');
    if (scene.spots) {
      for (const [n, [x, y]] of Object.entries(SPOTS)) txt(PX(x), PY(y) + 33, `Spot ${n}`, 'ca-spot');
    }
    for (const m of scene.marks || []) {
      if (m.type === 'hoop') {
        // a dark ring under the dashed yellow keeps the hoop visible on the light floor
        el('circle', { cx: PX(m.at[0]), cy: PY(m.at[1]), r: 17, fill: 'none', stroke: '#0f1f3d', 'stroke-opacity': 0.6, 'stroke-width': 7 }, g);
        el('circle', { cx: PX(m.at[0]), cy: PY(m.at[1]), r: 17, fill: 'none', stroke: '#ffcf32', 'stroke-width': 4, 'stroke-dasharray': '6 4' }, g);
        txt(PX(m.at[0]), PY(m.at[1]) + 33, m.label || 'Target', 'ca-mark');
      }
    }
    return { labels, trails };
  }

  function build(fig, idx) {
    const data = JSON.parse(fig.querySelector('script.scene-json').textContent);
    const states = statesOf(data);
    const last = states.length - 1;
    const stage = fig.querySelector('.anim-stage');
    const list = fig.querySelector('.anim-steps');
    const items = list ? [...list.children] : [];

    const height = heightOf(states);
    const svg = el('svg', { viewBox: `0 0 340 ${height}`, class: 'ca-svg', role: 'img', 'aria-label': data.summary }, null);
    const defs = el('defs', {}, svg);
    const gradId = `ca-maple-${idx}`, arrowId = `ca-arrow-${idx}`;
    // in court units, so the labels' edging (see drawCourt) matches the floor exactly beneath them
    const grad = el('linearGradient', { id: gradId, gradientUnits: 'userSpaceOnUse', x1: 0, x2: 0, y1: PY(0), y2: PY(30) }, defs);
    el('stop', { offset: 0, 'stop-color': '#d9ae75' }, grad);
    el('stop', { offset: 1, 'stop-color': '#ecc994' }, grad);
    const arrow = el('marker', { id: arrowId, viewBox: '0 0 10 10', refX: 7, refY: 5, markerWidth: 4, markerHeight: 4, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0 0L10 5L0 10z', fill: '#0f1f3d', 'fill-opacity': 0.75 }, arrow);
    // where the ball and the players went in this step, drawn under the players
    const { labels, trails } = drawCourt(svg, data, gradId, height);
    const shadow = el('ellipse', { rx: 7, ry: 3, fill: '#000', 'fill-opacity': 0.25, visibility: 'hidden' }, svg);
    const actors = {};
    for (const a of data.actors) {
      const coach = a.kind === 'coach';
      const g = el('g', { class: 'ca-actor' + (coach ? ' coach' : ''), 'data-id': a.id }, svg);
      const r = coach ? 15 : 14;
      el('circle', { r }, g);
      const t = el('text', { 'text-anchor': 'middle', dy: 7 }, g);
      t.textContent = coach ? 'C' : a.label;
      actors[a.id] = { g, r, coach, bubble: null };
    }
    const ball = el('g', { class: 'ca-ball', visibility: 'hidden' }, svg);
    el('circle', { r: 7, fill: '#fff' }, ball);
    el('path', { d: 'M-7 0a7 7 0 0 1 14 0z', fill: '#1a4f9c' }, ball);
    el('circle', { r: 7, fill: 'none', stroke: '#0f1f3d', 'stroke-opacity': 0.35 }, ball);
    // call-outs sit above everything else
    const calls = el('g', { class: 'ca-calls' }, svg);
    stage.replaceChildren(svg);

    const caption = fig.querySelector('.anim-caption');
    const counter = fig.querySelector('.anim-count');
    const playBtn = fig.querySelector('[data-act="play"]');
    const prevBtn = fig.querySelector('[data-act="prev"]');
    const nextBtn = fig.querySelector('[data-act="next"]');

    // Every caption sits in the same grid cell, hidden but for the current one, so the box is
    // always as tall as the longest caption and the page below never jumps between steps.
    const capBox = document.createElement('div');
    capBox.className = 'anim-caption-box';
    caption.replaceWith(capBox);
    capBox.append(caption);
    for (const s of states) {
      const sizer = document.createElement('span');
      sizer.className = 'anim-caption-sizer';
      sizer.setAttribute('aria-hidden', 'true');
      sizer.textContent = s.say;
      capBox.append(sizer);
    }

    // The numbered steps become buttons, so a step can be picked by keyboard as well as by tap.
    const stepBtns = items.map(li => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'anim-step';
      b.append(...li.childNodes);
      li.replaceChildren(b);
      return b;
    });

    let step = 0, playing = false, raf = 0, timer = 0, run = 0;

    function place(id, x, y) {
      const a = actors[id];
      a.g.setAttribute('transform', `translate(${PX(x)} ${PY(y)})`);
      a.g.style.display = '';
    }
    // the ball at (x, y) in the air, its shadow on the floor below it at (fx, fy)
    function placeBall(x, y, fx, fy) {
      ball.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      shadow.setAttribute('cx', fx.toFixed(1)); shadow.setAttribute('cy', (fy + 6).toFixed(1));
      ball.setAttribute('visibility', 'visible'); shadow.setAttribute('visibility', 'visible');
    }
    function hideBall() { ball.setAttribute('visibility', 'hidden'); shadow.setAttribute('visibility', 'hidden'); }
    // Where the ball is at time t of a flight (0 to 1): it travels the straight line and rises
    // on a sine curve. The animation and the drawn trail both use this, so they match.
    const flightAt = (a, b, lift, t) => [lerp(PX(a[0]), PX(b[0]), t), lerp(PY(a[1]), PY(b[1]), t) - Math.sin(Math.PI * t) * lift];
    // The ball's arc rises in proportion to how far it travels. A pass or set that stays on our
    // side keeps the whole ball below the net band (PY(0) + 5), so it never looks as if it went over.
    function liftOf(from, to) {
      const lift = Math.min(60, Math.hypot(to[0] - from[0], to[1] - from[1]) * 2.2);
      if (from[1] < -1 || to[1] < -1) return lift;
      const floor = PY(0) + 18;
      const top = L => { let m = Infinity; for (let i = 0; i <= 32; i++) m = Math.min(m, flightAt(from, to, L, i / 32)[1]); return m; };
      if (top(lift) >= floor) return lift;
      let lo = 0, hi = lift;
      for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (top(mid) >= floor) lo = mid; else hi = mid; }
      return lo;
    }

    function frame(s, t) {
      const k = ease(t);
      for (const id in actors) {
        const to = s.pos[id];
        if (!to) { actors[id].g.style.display = 'none'; continue; }
        const from = s.before[id] || to;
        place(id, lerp(from[0], to[0], k), lerp(from[1], to[1], k));
      }
      if (s.ball) {
        const a = atShoulder(s.ballFrom || s.ball, s.before, s.pos), b = atShoulder(s.ball, s.pos);
        const [x, y] = flightAt(a, b, liftOf(a, b), k);
        placeBall(x, y, lerp(PX(a[0]), PX(b[0]), k), lerp(PY(a[1]), PY(b[1]), k));
      } else hideBall();
    }

    // A settled frame says what just happened: a dotted arc for the ball's flight and an arrow
    // for each player who moved.
    function drawTrails(s) {
      trails.replaceChildren();
      const held = s.ball && atShoulder(s.ball, s.pos), bx = held && PX(held[0]), by = held && PY(held[1]);
      for (const id of Object.keys(s.pos)) {
        const from = s.before[id], to = s.pos[id];
        // a step of a few feet is a shuffle, not a move worth an arrow
        if (!from || !to || !actors[id] || Math.hypot(to[0] - from[0], to[1] - from[1]) < 4.5) continue;
        const x1 = PX(from[0]), y1 = PY(from[1]), x2 = PX(to[0]), y2 = PY(to[1]);
        const d = Math.hypot(x2 - x1, y2 - y1);
        // the arrow stops at her edge, or short of the ball if she is holding it there
        let stopShort = actors[id].r + 5, ex, ey;
        for (;;) {
          ex = x2 - (x2 - x1) * stopShort / d; ey = y2 - (y2 - y1) * stopShort / d;
          if (!held || Math.hypot(ex - bx, ey - by) > 15 || stopShort > 44) break;
          stopShort += 3;
        }
        el('path', { d: `M${x1} ${y1}L${ex.toFixed(1)} ${ey.toFixed(1)}`, class: 'ca-move', 'marker-end': `url(#${arrowId})` }, trails);
      }
      if (s.ball && s.ballFrom && !same(s.ball, s.ballFrom)) {
        const a = atShoulder(s.ballFrom, s.before, s.pos), b = atShoulder(s.ball, s.pos), lift = liftOf(a, b);
        // the same path the ball took, sampled
        const pts = Array.from({ length: 25 }, (_, i) => flightAt(a, b, lift, i / 24).map(v => v.toFixed(1)).join(' '));
        const dPath = `M${pts.join('L')}`;
        el('path', { d: dPath, class: 'ca-flight-halo' }, trails);
        el('path', { d: dPath, class: 'ca-flight' }, trails);
      }
    }

    // Call-outs go where they cover nothing: above the player, else beside her, else below,
    // never across the net, a court label, another player or the ball, and clear of the trails
    // where there is room, so the arrow or arc that shows what she did stays in view.
    function drawCalls(s) {
      calls.replaceChildren();
      const ballAt = s.ball && atShoulder(s.ball, s.pos);
      const taken = [{ x: 0, y: PY(0) - 12, w: 340, h: 24 }];
      for (const t of labels) { const b = t.getBBox(); taken.push({ x: b.x - 2, y: b.y - 2, w: b.width + 4, h: b.height + 4 }); }
      if (ballAt) taken.push({ x: PX(ballAt[0]) - 9, y: PY(ballAt[1]) - 9, w: 18, h: 18 });
      for (const id in s.pos) if (actors[id] && s.pos[id]) {
        const [x, y] = s.pos[id], r = actors[id].r + 3;
        taken.push({ id, x: PX(x) - r, y: PY(y) - r, w: 2 * r, h: 2 * r });
      }
      for (const p of trails.querySelectorAll('.ca-flight, .ca-move')) {
        const L = p.getTotalLength();
        for (let d = 0; d <= L; d += 6) { const q = p.getPointAtLength(d); taken.push({ x: q.x - 3, y: q.y - 3, w: 6, h: 6 }); }
      }
      for (const id in s.calls) {
        const a = actors[id], at = s.pos[id];
        if (!a || !at) continue;
        const g = el('g', { class: 'ca-call', 'data-by': id }, calls);
        const tail = el('path', { class: 'ca-call-tail' }, g), rect = el('rect', { rx: 12, height: 24 }, g), edge = el('path', { class: 'ca-call-edge' }, g);
        const text = el('text', { 'text-anchor': 'middle' }, g);
        text.textContent = s.calls[id];
        const w = Math.max(50, Math.ceil(text.getComputedTextLength()) + 24), h = 24;
        const cx = PX(at[0]), cy = PY(at[1]), gap = a.r + 12;
        const options = [
          { side: 'above', x: cx - w / 2, y: cy - gap - h },
          { side: 'right', x: cx + gap, y: cy - h / 2 },
          { side: 'left', x: cx - gap - w, y: cy - h / 2 },
          { side: 'below', x: cx - w / 2, y: cy + gap }
        ];
        let best = null;
        for (const o of options) {
          const box = { x: o.x, y: o.y, w, h };
          const inside = box.x >= 2 && box.y >= 2 && box.x + w <= 338 && box.y + h <= height - 2;
          // a sliver of overlap (under 16 square units) doesn't count
          const cost = inside ? taken.filter(t => t.id !== id).reduce((sum, t) => { const o = overlap(box, t); return sum + (o < 16 ? 0 : o); }, 0) : Infinity;
          if (!best || cost < best.cost) best = { ...o, cost };
          if (cost === 0) break;
        }
        rect.setAttribute('x', best.x); rect.setAttribute('y', best.y); rect.setAttribute('width', w);
        text.setAttribute('x', best.x + w / 2); text.setAttribute('y', best.y + 16.5);
        // the tail: a white wedge into the bubble, then its two dark sides
        const tip = {
          above: [[cx - 6, best.y + h - 1], [cx, cy - a.r - 4], [cx + 6, best.y + h - 1]],
          below: [[cx - 6, best.y + 1], [cx, cy + a.r + 4], [cx + 6, best.y + 1]],
          right: [[best.x + 1, cy - 6], [cx + a.r + 4, cy], [best.x + 1, cy + 6]],
          left: [[best.x + w - 1, cy - 6], [cx - a.r - 4, cy], [best.x + w - 1, cy + 6]]
        }[best.side].map(p => p.map(v => v.toFixed(1)).join(' '));
        tail.setAttribute('d', `M${tip[0]}L${tip[1]}L${tip[2]}Z`);
        edge.setAttribute('d', `M${tip[0]}L${tip[1]}L${tip[2]}`);
        g.append(tail, edge, text);
        g.insertBefore(rect, tail);
        taken.push({ x: best.x, y: best.y, w, h });
      }
    }

    function label() { playBtn.textContent = playing ? 'Pause' : step === last ? 'Replay' : 'Play'; }

    function show(i, animate) {
      step = i;
      const s = states[i];
      // the player who has the ball (or calls for it) is drawn in red
      const active = s.hl.length ? s.hl : Object.keys(s.calls).filter(id => actors[id] && !actors[id].coach);
      for (const id in actors) actors[id].g.classList.toggle('hl', active.includes(id));
      calls.replaceChildren();
      trails.replaceChildren();
      caption.textContent = s.say;
      counter.textContent = `Step ${i + 1} of ${states.length}`;
      stepBtns.forEach((b, j) => (j === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
      // aria-disabled rather than disabled: a button that has focus keeps it at the first or last step
      prevBtn.setAttribute('aria-disabled', String(i === 0));
      nextBtn.setAttribute('aria-disabled', String(i === last));
      label();
      cancelAnimationFrame(raf);
      const settle = () => { drawTrails(s); drawCalls(s); };
      if (!animate || reduced()) {
        frame(s, 1); settle();
        // Reduced motion: nobody slides, but whoever moved (and the ball) fades in where she lands,
        // so the change still reads.
        if (animate) {
          const moved = Object.keys(s.pos).filter(id => actors[id] && !same(s.before[id], s.pos[id])).map(id => actors[id].g);
          if (s.ball && !same(s.ball, s.ballFrom)) moved.push(ball);
          for (const n of [...moved, trails]) n.animate?.([{ opacity: 0.15 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
        }
        return Promise.resolve();
      }
      return new Promise(res => {
        const t0 = performance.now();
        const tick = now => {
          const t = Math.min((now - t0) / MOVE_MS, 1);
          frame(s, t);
          if (t < 1) raf = requestAnimationFrame(tick); else { settle(); res(); }
        };
        raf = requestAnimationFrame(tick);
      });
    }

    // Each step stays up long enough to read its caption; the opening formation, the one a coach
    // sets up on the floor, stays longest when the diagram starts by itself.
    const dwell = i => Math.max(1500, 900 + 250 * words(states[i].say)) + (reduced() ? MOVE_MS : 0);
    const hold = i => Math.max(3000, 1200 + 300 * words(states[i].say));

    function stop() {
      playing = false; run++; clearTimeout(timer);
      label();
    }
    // Steps are announced when someone asks for them, not while the diagram plays by itself on
    // scroll (the same rule as an auto-rotating carousel).
    const announce = on => caption.setAttribute('aria-live', on ? 'polite' : 'off');
    async function play(auto) {
      clearTimeout(timer);
      const mine = ++run;
      if (step === last) await show(0, false);
      if (mine !== run) return;
      playing = true;
      label();
      const next = async () => {
        if (!playing || mine !== run) return;
        if (step >= last) { stop(); return; }
        await show(step + 1, true);
        // a Pause and Play during the move started a newer run; this one stops here
        if (playing && mine === run) timer = setTimeout(next, dwell(step));
      };
      timer = setTimeout(next, auto ? hold(step) : 1200);
    }
    const unavailable = b => b.getAttribute('aria-disabled') === 'true';

    playBtn.addEventListener('click', () => { announce(true); playing ? stop() : play(false); });
    prevBtn.addEventListener('click', () => {
      if (unavailable(prevBtn)) return;
      announce(true); stop(); show(step - 1, false);
    });
    nextBtn.addEventListener('click', () => {
      if (unavailable(nextBtn)) return;
      announce(true); stop(); show(step + 1, true);
    });
    stepBtns.forEach((b, j) => {
      b.addEventListener('click', () => { announce(true); stop(); show(j, false); });
    });

    // Printing shows the opening formation, then puts the diagram back where it was.
    let printStep = null;
    addEventListener('beforeprint', () => { printStep = step; stop(); show(0, false); });
    addEventListener('afterprint', () => { if (printStep !== null) { show(printStep, false); printStep = null; } });

    fig.classList.add('ready');
    show(0, false);

    // It plays once by itself, but only when the court and its caption are both in view and
    // nobody has touched it yet; it pauses when scrolled out of sight.
    if ('IntersectionObserver' in window) {
      let armed = !reduced();
      const disarm = () => { armed = false; };
      fig.addEventListener('pointerdown', disarm);
      fig.addEventListener('focusin', disarm);
      // The sticky header hides the top of the screen, except on a phone on its side, where it
      // scrolls away; the watcher is rebuilt whenever that height changes.
      const header = document.querySelector('.site-header');
      const coveredNow = () => (header && getComputedStyle(header).position === 'sticky' ? Math.round(header.getBoundingClientRect().height) : 0);
      let io = null, covered = -1;
      const watch = () => {
        const c = coveredNow();
        if (c === covered) return;
        covered = c;
        io?.disconnect();
        const seen = new Map();
        io = new IntersectionObserver(entries => {
          for (const e of entries) seen.set(e.target, e.intersectionRatio);
          const court = seen.get(stage) || 0, cap = seen.get(capBox) || 0;
          if (armed && court > 0.95 && cap > 0.98 && step === 0 && !playing) { armed = false; announce(false); play(true); }
          if (playing && court === 0) stop();
        }, { threshold: [0, 0.5, 0.95, 0.99, 1], rootMargin: `-${c}px 0px 0px 0px` });
        io.observe(stage);
        io.observe(capBox);
      };
      watch();
      let resized = 0;
      addEventListener('resize', () => { clearTimeout(resized); resized = setTimeout(watch, 200); });
    }
  }

  document.querySelectorAll('figure.court-anim').forEach((fig, idx) => {
    try { build(fig, idx); } catch (err) { fig.classList.add('anim-failed'); console.error('court-anim', err); }
  });
})();
