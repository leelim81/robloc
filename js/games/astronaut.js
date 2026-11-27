// ROBLOC Astronaut: float in space and grab moon rocks!
// Aim the grabber, tap GRAB! Rocks score +10, asteroids cost -5.
// 10 grabs per match.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 5, grabs: 10, aimTime: 20 },
  pro: { target: 6, grabs: 10, aimTime: 15 },
  legend: { target: 7, grabs: 10, aimTime: 12 },
  boost: { target: 4, grabs: 10, aimTime: 25 },   // Trevor: easy game
  tough: { target: 8, grabs: 10, aimTime: 10 },   // others: hard game
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod = (n, m) => ((n % m) + m) % m;

function drawSpace(ctx, view, t) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#020617'); bg.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  // tiny twinkling stars (twinkle runs on the never-resetting sway clock)
  for (let i = 0; i < 60; i++) {
    const x = 40 + (i * 149) % 1200, y = 30 + (i * 97) % 640;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.3))})`;
    ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
  // ringed planet, bottom left
  ctx.fillStyle = '#a78bfa'; ctx.beginPath(); ctx.arc(150, 610, 55, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#facc15'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.ellipse(150, 610, 95, 22, -0.3, 0, Math.PI * 2); ctx.stroke();
  // moon, top left
  ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(140, 110, 38, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath(); ctx.arc(128, 102, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(152, 120, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e0e7ff'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🧑‍🚀 ASTRONAUT 🧑‍🚀', 640, 70);
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = rocks drift slower, Power = bigger grabber.
  const DRIFT = options.power === 'speed' ? 0.55 : 1;
  const GRAB_R = options.power === 'power' ? 72 : 52;
  // Drifters: their x is a pure function of the never-resetting sway
  // clock, so they never jump when the phase timer resets.
  const objects = [];
  const defs = [
    ['rock', 180, 55], ['rock', 300, 70], ['rock', 430, 45], ['rock', 560, 80],
    ['asteroid', 240, 65], ['asteroid', 380, 50], ['asteroid', 520, 75],
  ];
  for (const [kind, y, speed] of defs) objects.push({ kind, y, speed, off: Math.random() * 840 });
  const objPos = o => ({ x: 120 + mod(o.off + S.swayT * o.speed * DRIFT, 840), y: o.y });
  const S = { phase: 'intro', t: 0, swayT: 0, grab: 0, rocks: 0, points: 0, aimX: 540, aimY: 360, msg: null, msgT: 0, msgColor: '#fff', reported: false };
  let hits = [];

  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function grab() {
    if (S.phase !== 'aim') return;
    S.phase = 'grab'; S.t = 0; audio.play('whoosh');
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.rocks >= D.target;
    say(win ? 'SPACE HERO!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.rocks >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.rocks} ROCKS · GOAL ${D.target}`,
      stats: [`Rocks: <b>${S.rocks}</b>`, `Points: <b>${S.points}</b>`, `Grabs: <b>${D.grabs}</b>`],
      match: { game: 'astronaut', difficulty: options.difficulty, won: win, rocks: S.rocks, points: S.points, grabs: D.grabs },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt; S.swayT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'astro2') { S.labelKey = 'astro2'; input.setLabels('GRAB', 'GRAB'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.5) { S.phase = 'aim'; S.t = 0; } return; }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'aim') {
      if (input.mx) S.aimX = clamp(S.aimX + input.mx * 300 * dt, 120, 960);
      if (input.my) S.aimY = clamp(S.aimY + input.my * 300 * dt, 120, 620);
      if (input.a.pressed || input.b.pressed || S.t > D.aimTime) grab();
    } else if (S.phase === 'grab') {
      if (S.t > 0.35) {
        let best = null, bestD = 1e9;
        for (const o of objects) {
          const p = objPos(o);
          const d = Math.hypot(S.aimX - p.x, S.aimY - p.y);
          if (d < bestD) { bestD = d; best = o; }
        }
        if (best && bestD < GRAB_R) {
          const p = objPos(best);
          if (best.kind === 'rock') {
            S.rocks++; S.points += 10;
            say('ROCK! +10 🪨', '#a3e635'); audio.play('point'); fx.confetti(p.x, p.y, 40);
          } else {
            S.points = Math.max(0, S.points - 5);
            say('ASTEROID! -5 ☄️', '#fca5a5'); audio.play('aww');
          }
          // the grabbed object drifts away and a new one floats in
          best.off = Math.random() * 840;
          best.y = 140 + Math.random() * 460;
          best.speed = 40 + Math.random() * 50;
        } else { say('MISS!', '#fca5a5'); audio.play('aww'); }
        S.phase = 'reset'; S.t = 0;
      }
    } else if (S.phase === 'reset') {
      if (S.t > 1.0) {
        S.grab++;
        if (S.grab >= D.grabs) endGame();
        else { S.phase = 'aim'; S.t = 0; }
      }
    }
  }

  function draw(ctx, view) {
    hits = [];
    drawSpace(ctx, view, S.swayT);
    // drifting rocks and asteroids
    for (const o of objects) {
      const p = objPos(o);
      if (o.kind === 'asteroid') {
        ctx.fillStyle = 'rgba(239,68,68,.25)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 46, 0, Math.PI * 2); ctx.fill();
        ctx.font = '52px serif';
      } else {
        ctx.font = '48px serif';
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.kind === 'rock' ? '🪨' : '☄️', p.x, p.y);
    }
    if (S.phase === 'aim') {
      // grabber crosshair
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(S.aimX, S.aimY, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(S.aimX - 38, S.aimY); ctx.lineTo(S.aimX - 14, S.aimY); ctx.moveTo(S.aimX + 14, S.aimY); ctx.lineTo(S.aimX + 38, S.aimY); ctx.moveTo(S.aimX, S.aimY - 38); ctx.lineTo(S.aimX, S.aimY - 14); ctx.moveTo(S.aimX, S.aimY + 14); ctx.lineTo(S.aimX, S.aimY + 38); ctx.stroke();
      hit(140, 100, 1000, 560, t => { S.aimX = clamp(t.x, 120, 960); S.aimY = clamp(t.y, 120, 620); audio.play('tick'); });
    }
    if (S.phase === 'grab') {
      // the claw closes in on the aim point
      const f = Math.min(1, S.t / 0.35);
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(S.aimX, S.aimY, 34 - f * 16, 0, Math.PI * 2); ctx.stroke();
    }
    // GRAB button
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready ? '#16a34a' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "40px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GRAB!', 1110, 322);
    hit(990, 260, 240, 120, () => grab());
    if (ready) {
      const k = clamp(1 - S.t / D.aimTime, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 990, 392, 240, 10, 5); ctx.fill();
      ctx.fillStyle = k > 0.3 ? '#4ade80' : '#f87171'; rrect(ctx, 990, 392, 240 * k, 10, 5); ctx.fill();
    }
    // HUD (top right, above the button)
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 990, 60, 240, 180, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Grab ${Math.min(S.grab + 1, D.grabs)} of ${D.grabs}`, 1012, 92);
    ctx.fillText(`Rocks: ${S.rocks}  (goal ${D.target})`, 1012, 122);
    ctx.fillText(`Points: ${S.points}`, 1012, 152);
    ctx.fillText('🪨 +10 · ☄️ -5', 1012, 182);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.grab === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = input.touchMode ? 'Tap to aim · tap GRAB!' : 'Use ← → ↑ ↓ to aim · SPACE to grab';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 480, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 480, S.t, { size: 100, sub: `${S.rocks} rocks`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'GRAB THE ROCKS!', 640, 480, S.t, { size: 96, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__astronaut = { S, grab };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  drawSpace(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t);
  ctx.font = '64px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🪨', 480, 300);
  ctx.fillText('🪨', 760, 420);
  ctx.fillText('☄️', 640, 220);
  ctx.fillText('🧑‍🚀', 640, 480);
  ctx.restore();
}

export default {
  id: 'astronaut',
  title: 'Astronaut',
  tagline: 'Float in space and grab the moon rocks',
  desc: 'Moon rocks and asteroids drift across space. Aim the grabber with the joystick, arrows or a tap, then tap GRAB! A rock scores +10, but an asteroid costs -5. 10 grabs per match.',
  music: 'menu',
  labels: { a: 'GRAB', b: 'GRAB' },
  options: [],
  howto: `<ul>
    <li><b>Aim</b>: move the grabber with ← → ↑ ↓ / the joystick, or tap where you want to grab.</li>
    <li><b>GRAB!</b> (tap it or press <kbd>Space</kbd>): the claw grabs what is nearest.</li>
    <li>A moon rock (🪨) scores <b>+10</b>. An asteroid (☄️) costs <b>-5</b> — it glows red, so watch out!</li>
    <li>10 grabs per match. Grab enough rocks to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
