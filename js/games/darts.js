// ROBLOC Darts: throw darts at the board and score big!
// Aim with the joystick / arrows or tap, then tap THROW!
// The board sways — hit the bullseye for 50! 9 darts per match.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 100, darts: 9, aimTime: 20 },
  pro: { target: 120, darts: 9, aimTime: 15 },
  legend: { target: 150, darts: 9, aimTime: 12 },
  boost: { target: 80, darts: 9, aimTime: 25 },   // win-chance matches
  tough: { target: 180, darts: 9, aimTime: 10 },  // others: hard game, so they win about 25%
};
const SEGMENTS = [20, 5, 12, 9, 14, 11, 8, 16];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function drawBoard(ctx, view, t, bx, by) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#1e1b4b'); bg.addColorStop(1, '#312e81');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  ctx.fillStyle = '#f8fafc'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🎯 DARTS 🎯', 640, 70);
  // board stand
  ctx.fillStyle = '#78350f'; ctx.fillRect(bx - 8, by + 105, 16, 120);
  ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.moveTo(bx - 70, by + 225); ctx.lineTo(bx + 70, by + 225); ctx.lineTo(bx + 50, by + 205); ctx.lineTo(bx - 50, by + 205); ctx.closePath(); ctx.fill();
  // 8 pie segments
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 - Math.PI / 8, a1 = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 8;
    ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#1e293b';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, 105, a0, a1); ctx.closePath(); ctx.fill();
  }
  // double + triple rings
  ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(bx, by, 75, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(bx, by, 45, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(bx, by, 105, 0, Math.PI * 2); ctx.stroke();
  // segment numbers
  ctx.fillStyle = '#facc15'; ctx.font = '900 16px Nunito';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.fillText(String(SEGMENTS[i]), bx + Math.cos(a) * 88, by + Math.sin(a) * 88);
  }
  // bullseye
  ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(bx, by, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
}
function drawDart(ctx, x, y, a) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.strokeStyle = '#92400e'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.stroke();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(16, -7); ctx.lineTo(16, 7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-42, -9); ctx.lineTo(-42, 9); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = board sways slower, Power = bigger bullseye.
  const SWAY = options.power === 'speed' ? 0.55 : 1;
  const BULL = options.power === 'power' ? 26 : 18;
  const S = { phase: 'intro', t: 0, swayT: 0, dart: 0, points: 0, bullseyes: 0, aimX: 640, aimY: 300, flyT: 0, flyFrom: { x: 640, y: 600 }, msg: null, msgT: 0, reported: false };
  let hits = [];

  const boardX = () => 640 + Math.sin(S.swayT * 0.8 * SWAY) * 200;
  const boardY = () => 300;
  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function shoot() {
    if (S.phase !== 'aim') return;
    S.phase = 'shoot'; S.t = 0; S.flyT = 0; S.flyFrom = { x: 640, y: 600 }; audio.play('whoosh');
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.points >= D.target;
    say(win ? 'DART CHAMP!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.points >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.points} POINTS · GOAL ${D.target}`,
      stats: [`Points: <b>${S.points}</b>`, `Bullseyes: <b>${S.bullseyes}</b>`, `Darts: <b>${D.darts}</b>`],
      match: { game: 'darts', difficulty: options.difficulty, won: win, points: S.points, bullseyes: S.bullseyes, darts: D.darts },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt; S.swayT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'dart') { S.labelKey = 'dart'; input.setLabels('THROW', 'THROW'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.5) { S.phase = 'aim'; S.t = 0; } return; }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'aim') {
      if (input.mx) S.aimX = clamp(S.aimX + input.mx * 300 * dt, 200, 1080);
      if (input.my) S.aimY = clamp(S.aimY + input.my * 300 * dt, 120, 620);
      if (input.a.pressed || input.b.pressed || S.t > D.aimTime) shoot();
    } else if (S.phase === 'shoot') {
      S.flyT += dt / 0.5;
      const f = Math.min(1, S.flyT);
      if (f >= 1) {
        const dx = S.aimX - boardX(), dy = S.aimY - boardY();
        const dist = Math.sqrt(dx * dx + dy * dy);
        let pts = 0;
        if (dist < BULL) { pts = 50; S.bullseyes++; say('BULLSEYE! 🎯', '#facc15'); audio.play('badge'); audio.cheer(1.2); fx.confetti(boardX(), boardY(), 60); }
        else if (dist < 105) {
          const ang = Math.atan2(dy, dx);
          const seg = Math.floor((((ang + Math.PI / 8) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2 / 8));
          const mult = dist < 45 ? 3 : dist < 75 ? 2 : 1;
          pts = SEGMENTS[seg] * mult;
          say(mult === 3 ? `TRIPLE ${SEGMENTS[seg]}! +${pts}` : mult === 2 ? `DOUBLE ${SEGMENTS[seg]}! +${pts}` : `+${pts} POINTS!`, '#a3e635');
          audio.play('point');
        } else { say('MISS!', '#fca5a5'); audio.play('aww'); }
        S.points += pts;
        S.phase = 'reset'; S.t = 0;
      }
    } else if (S.phase === 'reset') {
      if (S.t > 1.1) {
        S.dart++;
        if (S.dart >= D.darts) endGame();
        else { S.aimX = 640; S.aimY = 300; S.phase = 'aim'; S.t = 0; }
      }
    }
  }

  function draw(ctx, view) {
    hits = [];
    const bx = boardX(), by = boardY();
    drawBoard(ctx, view, S.t, bx, by);
    if (S.phase === 'aim') {
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(S.aimX, S.aimY, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(S.aimX - 26, S.aimY); ctx.lineTo(S.aimX - 10, S.aimY); ctx.moveTo(S.aimX + 10, S.aimY); ctx.lineTo(S.aimX + 26, S.aimY); ctx.moveTo(S.aimX, S.aimY - 26); ctx.lineTo(S.aimX, S.aimY - 10); ctx.moveTo(S.aimX, S.aimY + 10); ctx.lineTo(S.aimX, S.aimY + 26); ctx.stroke();
      hit(140, 100, 1000, 560, t => { S.aimX = clamp(t.x, 200, 1080); S.aimY = clamp(t.y, 120, 620); audio.play('tick'); });
    }
    if (S.phase === 'shoot') {
      const f = Math.min(1, S.flyT);
      const x = S.flyFrom.x + (S.aimX - S.flyFrom.x) * f;
      const y = S.flyFrom.y + (S.aimY - S.flyFrom.y) * f;
      const a = Math.atan2(S.aimY - S.flyFrom.y, S.aimX - S.flyFrom.x);
      drawDart(ctx, x, y, a);
    }
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready ? '#16a34a' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "40px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('THROW!', 1110, 322);
    hit(990, 260, 240, 120, () => shoot());
    if (ready) {
      const k = clamp(1 - S.t / D.aimTime, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 990, 392, 240, 10, 5); ctx.fill();
      ctx.fillStyle = k > 0.3 ? '#4ade80' : '#f87171'; rrect(ctx, 990, 392, 240 * k, 10, 5); ctx.fill();
    }
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 40, 60, 260, 150, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Dart ${Math.min(S.dart + 1, D.darts)} of ${D.darts}`, 62, 92);
    ctx.fillText(`Points: ${S.points}  (goal ${D.target})`, 62, 122);
    ctx.fillText(`Bullseyes: ${S.bullseyes}`, 62, 152);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.dart === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = input.touchMode ? 'Tap to aim · tap THROW!' : 'Use ← → ↑ ↓ to aim · SPACE to throw';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 480, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 480, S.t, { size: 100, sub: `${S.points} points`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'THROW DARTS!', 640, 480, S.t, { size: 96, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__darts = { S, shoot };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  const bx = 640 + Math.sin(t * 0.8) * 200;
  drawBoard(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t, bx, 300);
  ctx.restore();
}

export default {
  id: 'darts',
  title: 'Darts',
  tagline: 'Throw darts at the board and score big',
  desc: 'A dartboard that sways side to side. Aim your dart, tap THROW, and hit the numbers — double and triple rings score more, bullseye is 50! 9 darts per match.',
  music: 'menu',
  labels: { a: 'THROW', b: 'THROW' },
  options: [],
  howto: `<ul>
    <li><b>Aim</b>: move the crosshair with ← → ↑ ↓ / the joystick, or tap where you want to throw.</li>
    <li><b>THROW!</b> (tap it or press <kbd>Space</kbd>): the dart flies to your aim point.</li>
    <li>The board sways — the number you hit ×1, ×2 (middle ring) or ×3 (inner ring). Bullseye is 50!</li>
    <li>9 darts per match. Score enough points to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
