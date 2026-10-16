// Holzblasinstrumentensnake: ein Holzblasinstrument frisst sein Lieblingsfutter und wächst.
(() => {
  const N = 17; // Felder pro Seite

  const SILVER = { fill: '#e9ebee', stroke: '#5a5f66', dot: '#5a5f66' };
  const INSTRUMENTS = {
    flute: {
      name: 'Querflöte', width: 0.46, front: 0.4,
      tube: { dark: '#5a5f66', main: '#d5d8dc', light: '#f4f5f6' },
      keys: SILVER, ring: null, head: 'flute', tail: 'open',
      foods: [
        { type: 'n16', name: '16tel', grow: 3, weight: 2 },
        { type: 'n32', name: '32tel', grow: 2, weight: 3 },
        { type: 'n64', name: '64tel', grow: 1, weight: 4 },
      ],
    },
    oboe: {
      name: 'Oboe', width: 0.42, front: 0.2,
      tube: { dark: '#000', main: '#1d1d1f', light: '#4a4a4e' },
      keys: { fill: '#d5d8dc', stroke: '#8a8f96', dot: '#1d1d1f' }, ring: '#c9ccd1',
      head: 'reed', tail: 'bell', flare: 1.5,
      foods: [{ type: 'reed', name: 'Oboenrohr', grow: 2, weight: 1 }],
    },
    clarinet: {
      name: 'Klarinette', width: 0.46, front: 0.1,
      tube: { dark: '#000', main: '#1d1d1f', light: '#4a4a4e' },
      keys: { fill: '#d5d8dc', stroke: '#8a8f96', dot: '#1d1d1f' }, ring: '#c9ccd1',
      head: 'mouthpiece', tail: 'bell', flare: 1.9,
      foods: [{ type: 'apple', name: 'Apfel', grow: 2, weight: 1 }],
    },
    bassoon: {
      name: 'Fagott', width: 0.56, front: 0.3,
      tube: { dark: '#5e1714', main: '#a8322d', light: '#d06a5f' },
      keys: SILVER, ring: '#efe6d0', head: 'bocal', tail: 'ivory',
      foods: [{ type: 'pizza', name: 'Pizza', grow: 3, weight: 1 }],
    },
  };
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const STORE = 'holzblas-snake-';

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const pauseBtn = document.getElementById('pause');

  let cell = 20, size = N * cell;
  let snake, dir, queue, pending, food, score, stepMs, acc, last = 0;
  let state = 'ready'; // ready | running | paused | over

  function load(key, fallback) {
    try { return localStorage.getItem(STORE + key) ?? fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(STORE + key, String(value)); } catch (e) {}
  }

  let instId = INSTRUMENTS[load('instrument')] ? load('instrument') : 'flute';
  let inst = INSTRUMENTS[instId];
  let best = Number(load('best-' + instId, 0)) || 0;

  // ---------- Spiellogik ----------

  function reset() {
    snake = [{ x: 7, y: 8 }, { x: 6, y: 8 }, { x: 5, y: 8 }, { x: 4, y: 8 }];
    dir = 'right';
    queue = [];
    pending = 0;
    score = 0;
    stepMs = 170;
    acc = 0;
    spawnFood();
    updateScore();
  }

  function spawnFood() {
    const foods = inst.foods;
    const total = foods.reduce((s, f) => s + f.weight, 0);
    let r = Math.random() * total;
    const kind = foods.find(f => (r -= f.weight) < 0) || foods[0];

    const free = [];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++)
        if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
    const spot = free[Math.floor(Math.random() * free.length)];
    food = spot ? { ...spot, ...kind } : null;
  }

  function step() {
    if (queue.length) dir = queue.shift();
    const [dx, dy] = DIRS[dir];
    // Durch die Wände: wer rechts hinausfährt, kommt links wieder herein.
    const head = { x: (snake[0].x + dx + N) % N, y: (snake[0].y + dy + N) % N };

    const eats = food && head.x === food.x && head.y === food.y;
    // Das Schwanzende rückt nach, außer das Instrument wächst gerade.
    const body = pending > 0 || eats ? snake : snake.slice(0, -1);
    if (body.some(s => s.x === head.x && s.y === head.y)) return gameOver();

    snake.unshift(head);
    if (eats) {
      pending += food.grow;
      score += food.grow;
      stepMs = Math.max(85, stepMs - 3);
      updateScore();
      buzz(15);
      spawnFood();
    }
    if (pending > 0) pending--;
    else snake.pop();
  }

  function gameOver() {
    state = 'over';
    buzz(80);
    if (score > best) {
      best = score;
      save('best-' + instId, best);
    }
    updateScore();
    updatePauseBtn();
  }

  function updateScore() {
    scoreEl.textContent = score;
    bestEl.textContent = best;
  }

  function buzz(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  // ---------- Instrumentwahl ----------

  const picker = document.getElementById('instruments');
  const legend = document.getElementById('legend');

  Object.entries(INSTRUMENTS).forEach(([id, def]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.id = id;
    btn.textContent = def.name;
    btn.addEventListener('click', () => selectInstrument(id));
    picker.append(btn);
  });

  function selectInstrument(id) {
    instId = id;
    inst = INSTRUMENTS[id];
    best = Number(load('best-' + id, 0)) || 0;
    save('instrument', id);
    picker.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    renderLegend();
    reset();
    setState('ready');
  }

  function renderLegend() {
    legend.replaceChildren();
    inst.foods.forEach(f => {
      const li = document.createElement('li');
      const c = document.createElement('canvas');
      const px = 28, dpr = window.devicePixelRatio || 1;
      c.width = c.height = px * dpr;
      c.style.width = c.style.height = px + 'px';
      const cc = c.getContext('2d');
      cc.scale(dpr, dpr);
      drawFood(cc, px / 2, px / 2, px, f.type);
      li.append(c, `${f.name} +${f.grow}`);
      legend.append(li);
    });
  }

  // ---------- Steuerung ----------

  function turn(d) {
    if (state === 'over') return;
    const lastDir = queue.length ? queue[queue.length - 1] : dir;
    if (d !== lastDir && d !== OPPOSITE[lastDir] && queue.length < 2) queue.push(d);
    if (state !== 'running') setState('running');
  }

  function tap() {
    if (state === 'running') setState('paused');
    else if (state === 'over') { reset(); setState('running'); }
    else setState('running');
  }

  function setState(s) {
    state = s;
    acc = 0;
    updatePauseBtn();
  }

  function updatePauseBtn() {
    pauseBtn.textContent = state === 'running' ? 'II' : '▶';
  }

  document.addEventListener('keydown', e => {
    const map = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
    };
    const d = map[e.key];
    if (d) { e.preventDefault(); turn(d); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); }
  });

  // Wischen auf dem Spielfeld; mehrere Richtungswechsel in einer Geste möglich.
  const game = document.getElementById('game');
  let touch = null;
  game.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    touch = { x: t.clientX, y: t.clientY, swiped: false };
    e.preventDefault();
  }, { passive: false });
  game.addEventListener('touchmove', e => {
    if (!touch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 22) {
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      touch = { x: t.clientX, y: t.clientY, swiped: true };
    }
    e.preventDefault();
  }, { passive: false });
  game.addEventListener('touchend', e => {
    if (touch && !touch.swiped) tap();
    touch = null;
    e.preventDefault();
  }, { passive: false });
  game.addEventListener('click', tap); // Maus

  document.querySelectorAll('.pad [data-dir]').forEach(btn => {
    btn.addEventListener('pointerdown', e => { e.preventDefault(); turn(btn.dataset.dir); });
  });
  pauseBtn.addEventListener('pointerdown', e => { e.preventDefault(); tap(); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'running') setState('paused');
  });

  // ---------- Zeichnen: Instrumente ----------

  function resize() {
    const avail = Math.min(game.clientWidth, 440);
    cell = Math.floor(avail / N);
    size = cell * N;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = canvas.style.height = size + 'px';
    canvas.width = canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function center(p) {
    return { x: (p.x + 0.5) * cell, y: (p.y + 0.5) * cell };
  }

  // Richtung von Feld b nach Feld a, auch wenn dazwischen der Rand liegt.
  function gridDir(a, b) {
    const wrap = d => (d > 1 ? -1 : d < -1 ? 1 : d);
    return { x: wrap(a.x - b.x), y: wrap(a.y - b.y) };
  }

  function adjacent(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }

  // Rechteck quer zur Laufrichtung, im lokalen Koordinatensystem (x = vorwärts).
  function band(x0, x1, h, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.fillRect(x0, -h / 2, x1 - x0, h);
    if (stroke) {
      ctx.strokeStyle = stroke; ctx.lineWidth = 1;
      ctx.strokeRect(x0, -h / 2, x1 - x0, h);
    }
  }

  function inFrame(p, d, fn) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(d.y, d.x));
    fn();
    ctx.restore();
  }

  function drawInstrument() {
    const pts = snake.map(center);
    const w = cell * inst.width;
    const { dark, main, light } = inst.tube;
    const head = pts[0], tail = pts[pts.length - 1];
    const hd = gridDir(snake[0], snake[1]);
    const td = gridDir(snake[snake.length - 1], snake[snake.length - 2]);
    const front = { x: head.x + hd.x * cell * inst.front, y: head.y + hd.y * cell * inst.front };
    const end = { x: tail.x + td.x * cell * 0.45, y: tail.y + td.y * cell * 0.45 };
    const half = cell * 0.5;

    // Korpus; wo er durch den Rand geht, endet er an der einen Kante und
    // setzt an der gegenüberliegenden wieder an.
    ctx.lineJoin = 'round';
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(front.x, front.y);
    ctx.lineTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      if (!adjacent(snake[i - 1], snake[i])) {
        const v = gridDir(snake[i], snake[i - 1]);
        ctx.lineTo(pts[i - 1].x + v.x * half, pts[i - 1].y + v.y * half);
        ctx.moveTo(pts[i].x - v.x * half, pts[i].y - v.y * half);
      }
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = dark;  ctx.lineWidth = w + 2;    ctx.stroke();
    ctx.strokeStyle = main;  ctx.lineWidth = w;        ctx.stroke();
    ctx.strokeStyle = light; ctx.lineWidth = w * 0.22; ctx.stroke();

    // Klappen und Zapfenringe
    for (let i = 2; i < pts.length - 1; i++) {
      const p = pts[i];
      const d = gridDir(snake[i - 1], snake[i]);
      const d2 = gridDir(snake[i], snake[i + 1]);
      const straight = d.x === d2.x && d.y === d2.y;
      if (inst.ring && straight && i % 5 === 0) {
        inFrame(p, d, () => band(-cell * 0.06, cell * 0.06, w + 3, inst.ring, dark));
        continue;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, w * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = inst.keys.fill; ctx.fill();
      ctx.strokeStyle = inst.keys.stroke; ctx.lineWidth = 1; ctx.stroke();
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, w * 0.11, 0, Math.PI * 2);
        ctx.fillStyle = inst.keys.dot; ctx.fill();
      }
    }

    inFrame(end, td, () => drawTail(w));
    inFrame(front, hd, () => drawHead(w));
  }

  function drawTail(w) {
    const { dark, main } = inst.tube;
    if (inst.tail === 'open') {
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.14, w / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = dark; ctx.fill();
    } else if (inst.tail === 'bell') {
      // Schallstück, ausgehend von der Mitte des letzten Feldes
      const L = cell * 0.45, f = inst.flare;
      ctx.beginPath();
      ctx.moveTo(-L, -w / 2);
      ctx.quadraticCurveTo(-L * 0.2, -w / 2, 0, -w * f / 2);
      ctx.lineTo(0, w * f / 2);
      ctx.quadraticCurveTo(-L * 0.2, w / 2, -L, w / 2);
      ctx.closePath();
      ctx.fillStyle = main; ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
      band(-cell * 0.05, 0, w * f + 1, inst.ring, dark);
    } else if (inst.tail === 'ivory') {
      band(-cell * 0.14, 0, w + 4, inst.ring, dark);
    }
  }

  function drawHead(w) {
    const c = cell;
    const { dark } = inst.tube;

    if (inst.head === 'flute') {
      // Krone, dahinter Mundplatte mit Anblasloch
      band(-c * 0.12, c * 0.02, w + 4, '#b9bdc3', dark);
      ctx.beginPath();
      ctx.ellipse(-c * 0.4, 0, w * 0.62, w * 0.72, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#e3e6e9'; ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-c * 0.4, 0, w * 0.2, w * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#222'; ctx.fill();

    } else if (inst.head === 'reed') {
      // Oberstück-Ring, dann Rohr: Kork, Garnwicklung, Holz
      band(-c * 0.07, 0, w + 3, inst.ring, '#8a8f96');
      drawReedShape(0, w * 0.95, c * 0.5);

    } else if (inst.head === 'mouthpiece') {
      // Birne, Mundstück mit Blatt und Blattschraube
      band(-c * 0.22, -c * 0.02, w * 1.18, '#1d1d1f', '#000');
      band(-c * 0.24, -c * 0.2, w * 1.18, inst.ring, '#8a8f96');
      band(-c * 0.04, -c * 0.01, w * 1.18, inst.ring, '#8a8f96');
      ctx.beginPath();
      ctx.moveTo(0, -w * 0.45);
      ctx.lineTo(c * 0.42, -w * 0.18);
      ctx.quadraticCurveTo(c * 0.5, 0, c * 0.42, w * 0.2);
      ctx.lineTo(0, w * 0.45);
      ctx.closePath();
      ctx.fillStyle = '#111'; ctx.fill();
      // Blatt an der Unterseite
      ctx.beginPath();
      ctx.moveTo(c * 0.05, w * 0.42);
      ctx.lineTo(c * 0.44, w * 0.24);
      ctx.lineTo(c * 0.44, w * 0.32);
      ctx.lineTo(c * 0.05, w * 0.52);
      ctx.closePath();
      ctx.fillStyle = '#d9bd7a'; ctx.fill();
      band(c * 0.08, c * 0.17, w * 1.05, inst.ring, '#8a8f96');

    } else if (inst.head === 'bocal') {
      // S-Bogen aus Metall mit kleinem Rohr am Ende
      const ex = c * 0.62, ey = -c * 0.34;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-c * 0.05, 0);
      ctx.bezierCurveTo(c * 0.3, 0, c * 0.3, ey, ex, ey);
      ctx.strokeStyle = '#5a5f66'; ctx.lineWidth = w * 0.24 + 2; ctx.stroke();
      ctx.strokeStyle = '#d5d8dc'; ctx.lineWidth = w * 0.24;     ctx.stroke();
      ctx.lineCap = 'butt';
      band(-c * 0.06, c * 0.02, w + 3, inst.ring, dark);
      ctx.save();
      ctx.translate(ex, ey);
      drawReedShape(0, w * 0.55, c * 0.32);
      ctx.restore();
    }
  }

  // Doppelrohr entlang +x ab x0: Kork, Garnwicklung, Holz. h = Breite am Kork.
  function drawReedShape(x0, h, len) {
    band(x0, x0 + len * 0.22, h * 0.8, '#a0703f', '#6e4a26');
    band(x0 + len * 0.22, x0 + len * 0.45, h * 0.6, '#2e6fb5', '#1f4d80');
    ctx.beginPath();
    ctx.moveTo(x0 + len * 0.45, -h * 0.26);
    ctx.lineTo(x0 + len * 0.98, -h * 0.4);
    ctx.quadraticCurveTo(x0 + len * 1.04, 0, x0 + len * 0.98, h * 0.4);
    ctx.lineTo(x0 + len * 0.45, h * 0.26);
    ctx.closePath();
    ctx.fillStyle = '#dcc07e'; ctx.fill();
    ctx.strokeStyle = '#9c7f3c'; ctx.lineWidth = 1; ctx.stroke();
  }

  // ---------- Zeichnen: Futter ----------

  function drawFood(c, x, y, s, type) {
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (type === 'n16') drawShortNote(c, x, y, s, 2);
    else if (type === 'n32') drawShortNote(c, x, y, s, 3);
    else if (type === 'n64') drawShortNote(c, x, y, s, 4);
    else if (type === 'reed') drawReedFood(c, x, y, s);
    else if (type === 'apple') drawApple(c, x, y, s);
    else if (type === 'pizza') drawPizza(c, x, y, s);
    c.restore();
  }

  function drawShortNote(c, x, y, s, flags) {
    c.strokeStyle = c.fillStyle = '#000';
    const hx = x - s * 0.1, hy = y + s * 0.3;
    const rx = s * 0.19, ry = s * 0.135;
    c.beginPath();
    c.ellipse(hx, hy, rx, ry, -0.4, 0, Math.PI * 2);
    c.fill();

    const sx = hx + rx * 0.88, top = y - s * 0.45;
    c.lineWidth = s * 0.065;
    c.beginPath();
    c.moveTo(sx, hy - s * 0.04);
    c.lineTo(sx, top);
    c.stroke();

    const gap = s * 0.13;
    for (let k = 0; k < flags; k++) {
      const fy = top + k * gap;
      c.beginPath();
      c.moveTo(sx, fy);
      c.bezierCurveTo(sx + s * 0.04, fy + s * 0.1, sx + s * 0.26, fy + s * 0.1, sx + s * 0.18, fy + s * 0.26);
      c.stroke();
    }
  }

  function drawReedFood(c, x, y, s) {
    c.translate(x, y);
    c.rotate(-0.35);
    c.lineWidth = 1;
    c.fillStyle = '#a0703f'; c.strokeStyle = '#6e4a26';
    c.fillRect(-s * 0.11, s * 0.18, s * 0.22, s * 0.26);
    c.strokeRect(-s * 0.11, s * 0.18, s * 0.22, s * 0.26);
    c.fillStyle = '#2e6fb5';
    c.fillRect(-s * 0.085, -s * 0.03, s * 0.17, s * 0.21);
    c.beginPath();
    c.moveTo(-s * 0.065, -s * 0.03);
    c.lineTo(-s * 0.13, -s * 0.42);
    c.quadraticCurveTo(0, -s * 0.48, s * 0.13, -s * 0.42);
    c.lineTo(s * 0.065, -s * 0.03);
    c.closePath();
    c.fillStyle = '#dcc07e'; c.fill();
    c.strokeStyle = '#9c7f3c'; c.stroke();
    c.beginPath();
    c.moveTo(-s * 0.1, -s * 0.41);
    c.quadraticCurveTo(0, -s * 0.44, s * 0.1, -s * 0.41);
    c.strokeStyle = '#6b5420'; c.stroke();
  }

  function drawApple(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y - s * 0.2);
    c.bezierCurveTo(x + s * 0.35, y - s * 0.38, x + s * 0.48, y + s * 0.1, x + s * 0.15, y + s * 0.38);
    c.quadraticCurveTo(x, y + s * 0.32, x - s * 0.15, y + s * 0.38);
    c.bezierCurveTo(x - s * 0.48, y + s * 0.1, x - s * 0.35, y - s * 0.38, x, y - s * 0.2);
    c.fillStyle = '#c8312b'; c.fill();
    c.beginPath();
    c.ellipse(x - s * 0.16, y - s * 0.02, s * 0.06, s * 0.1, 0.3, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fill();
    c.beginPath();
    c.moveTo(x, y - s * 0.18);
    c.lineTo(x + s * 0.04, y - s * 0.42);
    c.strokeStyle = '#6b4423'; c.lineWidth = s * 0.06; c.stroke();
    c.beginPath();
    c.ellipse(x + s * 0.15, y - s * 0.34, s * 0.12, s * 0.055, -0.5, 0, Math.PI * 2);
    c.fillStyle = '#4f9a3a'; c.fill();
  }

  function drawPizza(c, x, y, s) {
    const lx = x - s * 0.38, rx = x + s * 0.38, ty = y - s * 0.26, tip = y + s * 0.42;
    c.beginPath();
    c.moveTo(x, tip);
    c.lineTo(lx, ty);
    c.quadraticCurveTo(x, y - s * 0.42, rx, ty);
    c.closePath();
    c.fillStyle = '#f2c14e'; c.fill();
    c.strokeStyle = '#d49b2a'; c.lineWidth = 1; c.stroke();
    c.beginPath();
    c.moveTo(lx, ty);
    c.quadraticCurveTo(x, y - s * 0.42, rx, ty);
    c.strokeStyle = '#c98a3e'; c.lineWidth = s * 0.12; c.stroke();
    c.fillStyle = '#b8322a';
    [[-0.1, -0.08], [0.11, -0.04], [0, 0.15]].forEach(([dx, dy]) => {
      c.beginPath();
      c.arc(x + dx * s, y + dy * s, s * 0.07, 0, Math.PI * 2);
      c.fill();
    });
  }

  // ---------- Zeichnen: Spielfeld ----------

  function drawMessage(lines) {
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fs = Math.max(12, Math.round(cell * 0.7));
    lines.forEach((line, i) => {
      ctx.font = `${i === 0 ? fs + 2 : fs}px "Courier New", Courier, monospace`;
      ctx.fillText(line, size / 2, size / 2 + (i - (lines.length - 1) / 2) * fs * 1.8);
    });
  }

  function draw() {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);

    if (food) drawFood(ctx, (food.x + 0.5) * cell, (food.y + 0.5) * cell, cell, food.type);
    drawInstrument();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

    if (state === 'ready') drawMessage([inst.name, 'Tippen oder wischen', 'zum Starten']);
    else if (state === 'paused') drawMessage(['Pause', 'Tippen zum Weiterspielen']);
    else if (state === 'over') drawMessage([`Ende · ${score} Punkte`, 'Tippen für neues Spiel']);
  }

  function frame(t) {
    if (state === 'running') {
      acc += Math.min(t - last, 250);
      while (acc >= stepMs && state === 'running') {
        acc -= stepMs;
        step();
      }
    }
    last = t;
    draw();
    requestAnimationFrame(frame);
  }

  selectInstrument(instId);
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(t => { last = t; frame(t); });
})();
