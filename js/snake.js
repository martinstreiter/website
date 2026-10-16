// Flöten-Snake: eine Querflöte frisst Noten und wächst je nach Notenwert.
(() => {
  const N = 17; // Felder pro Seite
  const NOTES = [
    { type: 'whole',   name: 'Ganze',   grow: 4, weight: 1 },
    { type: 'half',    name: 'Halbe',   grow: 3, weight: 2 },
    { type: 'quarter', name: 'Viertel', grow: 2, weight: 3 },
    { type: 'eighth',  name: 'Achtel',  grow: 1, weight: 4 },
  ];
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const BEST_KEY = 'floeten-snake-best';

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const pauseBtn = document.getElementById('pause');

  let cell = 20, size = N * cell;
  let snake, dir, queue, pending, note, score, stepMs, acc, last = 0;
  let state = 'ready'; // ready | running | paused | over

  let best = 0;
  try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) {}

  // ---------- Spiellogik ----------

  function reset() {
    snake = [{ x: 7, y: 8 }, { x: 6, y: 8 }, { x: 5, y: 8 }, { x: 4, y: 8 }];
    dir = 'right';
    queue = [];
    pending = 0;
    score = 0;
    stepMs = 170;
    acc = 0;
    spawnNote();
    updateScore();
  }

  function spawnNote() {
    const total = NOTES.reduce((s, n) => s + n.weight, 0);
    let r = Math.random() * total;
    const kind = NOTES.find(n => (r -= n.weight) < 0) || NOTES[0];

    const free = [];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++)
        if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
    const spot = free[Math.floor(Math.random() * free.length)];
    note = spot ? { ...spot, ...kind } : null;
  }

  function step() {
    if (queue.length) dir = queue.shift();
    const [dx, dy] = DIRS[dir];
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N) return gameOver();

    const eats = note && head.x === note.x && head.y === note.y;
    // Das Schwanzende rückt nach, außer die Flöte wächst gerade.
    const body = pending > 0 || eats ? snake : snake.slice(0, -1);
    if (body.some(s => s.x === head.x && s.y === head.y)) return gameOver();

    snake.unshift(head);
    if (eats) {
      pending += note.grow;
      score += note.grow;
      stepMs = Math.max(85, stepMs - 3);
      updateScore();
      buzz(15);
      spawnNote();
    }
    if (pending > 0) pending--;
    else snake.pop();
  }

  function gameOver() {
    state = 'over';
    buzz(80);
    if (score > best) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
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

  // ---------- Zeichnen ----------

  const METAL = '#d5d8dc', METAL_DARK = '#5a5f66', METAL_LIGHT = '#f4f5f6';

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

  function unit(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y, l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  }

  function drawFlute() {
    const pts = snake.map(center);
    const w = cell * 0.46;
    const head = pts[0], tail = pts[pts.length - 1];
    const hd = unit(head, pts[1]);
    const td = unit(tail, pts[pts.length - 2]);
    const front = { x: head.x + hd.x * cell * 0.4, y: head.y + hd.y * cell * 0.4 };
    const end = { x: tail.x + td.x * cell * 0.45, y: tail.y + td.y * cell * 0.45 };

    // Rohr
    ctx.lineJoin = 'round';
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(front.x, front.y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = METAL_DARK; ctx.lineWidth = w + 2; ctx.stroke();
    ctx.strokeStyle = METAL;      ctx.lineWidth = w;     ctx.stroke();
    ctx.strokeStyle = METAL_LIGHT; ctx.lineWidth = w * 0.22; ctx.stroke();

    // Klappen
    for (let i = 2; i < pts.length - 1; i++) {
      const p = pts[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, w * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = '#e9ebee'; ctx.fill();
      ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 1; ctx.stroke();
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, w * 0.11, 0, Math.PI * 2);
        ctx.fillStyle = METAL_DARK; ctx.fill();
      }
    }

    // Krone am Kopfende
    ctx.save();
    ctx.translate(front.x, front.y);
    ctx.rotate(Math.atan2(hd.y, hd.x));
    ctx.fillStyle = '#b9bdc3';
    ctx.fillRect(-cell * 0.12, -(w / 2 + 2), cell * 0.14, w + 4);
    ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 1;
    ctx.strokeRect(-cell * 0.12, -(w / 2 + 2), cell * 0.14, w + 4);
    ctx.restore();

    // Mundplatte mit Anblasloch
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(Math.atan2(hd.y, hd.x));
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.62, w * 0.72, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#e3e6e9'; ctx.fill();
    ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.2, w * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#222'; ctx.fill();
    ctx.restore();

    // offenes Fußende
    ctx.save();
    ctx.translate(end.x, end.y);
    ctx.rotate(Math.atan2(td.y, td.x));
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.14, w / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = METAL_DARK; ctx.fill();
    ctx.restore();
  }

  // Note mittig in ein Feld der Größe s zeichnen.
  function drawNote(c, x, y, s, type) {
    c.save();
    c.strokeStyle = c.fillStyle = '#000';
    c.lineCap = 'round';

    if (type === 'whole') {
      c.beginPath();
      c.ellipse(x, y, s * 0.3, s * 0.2, -0.2, 0, Math.PI * 2);
      c.lineWidth = s * 0.1;
      c.stroke();
      c.restore();
      return;
    }

    const hx = x - s * 0.08, hy = y + s * 0.22;
    const rx = s * 0.21, ry = s * 0.15;
    c.beginPath();
    c.ellipse(hx, hy, rx, ry, -0.4, 0, Math.PI * 2);
    if (type === 'half') { c.lineWidth = s * 0.08; c.stroke(); }
    else c.fill();

    const sx = hx + rx * 0.88, top = y - s * 0.42;
    c.beginPath();
    c.moveTo(sx, hy - s * 0.04);
    c.lineTo(sx, top);
    c.lineWidth = s * 0.07;
    c.stroke();

    if (type === 'eighth') {
      c.beginPath();
      c.moveTo(sx, top);
      c.bezierCurveTo(sx + s * 0.05, top + s * 0.18, sx + s * 0.32, top + s * 0.2, sx + s * 0.2, top + s * 0.48);
      c.lineWidth = s * 0.07;
      c.stroke();
    }
    c.restore();
  }

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

    if (note) drawNote(ctx, (note.x + 0.5) * cell, (note.y + 0.5) * cell, cell, note.type);
    drawFlute();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

    if (state === 'ready') drawMessage(['Flöten-Snake', 'Tippen oder wischen', 'zum Starten']);
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

  // ---------- Legende ----------

  const legend = document.getElementById('legend');
  NOTES.forEach(n => {
    const li = document.createElement('li');
    const c = document.createElement('canvas');
    const px = 28, dpr = window.devicePixelRatio || 1;
    c.width = c.height = px * dpr;
    c.style.width = c.style.height = px + 'px';
    const cc = c.getContext('2d');
    cc.scale(dpr, dpr);
    drawNote(cc, px / 2, px / 2, px, n.type);
    li.append(c, `${n.name} +${n.grow}`);
    legend.append(li);
  });

  reset();
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(t => { last = t; frame(t); });
})();
