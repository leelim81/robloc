// ROBLOC Archery: shoot the bow and hit the target.
// Aim with the joystick / arrows or tap, then tap SHOOT!
// The target sways — hit the bullseye for 10 points! 10 arrows per match.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 50, arrows: 10, aimTime: 20 },
  pro: { target: 60, arrows: 10, aimTime: 15 },
  legend: { target: 70, arrows: 10, aimTime: 12 },
  boost: { target: 40, arrows: 10, aimTime: 25 },   // win-chance matches
  tough: { target: 80, arrows: 10, aimTime: 10 },  // others: hard game, so they win about 25%
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// rings: [radius, points] from the outside in
const RINGS = [[100, 2], [80, 4], [60, 6], [40, 8], [20, 10]];
const RING_COLORS = ['#f8fafc', '#1e293b', '#3b82f6', '#dc2626', '#facc15'];

function drawField(ctx, view, t, tx, ty) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#14532d'); bg.addColorStop(1, '#052e16');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  // grass stripes
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  for (let i = 0; i < 6; i++) ctx.fillRect(x0, y0 + i * 120, view.W, 60);
  ctx.fillStyle = '#f8fafc'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🏹 ARCHERY 🏹', 640, 70);
  // target stand
  ctx.fillStyle = '#78350f'; ctx.fillRect(tx - 8, ty + 100, 16, 120);
  ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.moveTo(tx - 70, ty + 220); ctx.lineTo(tx + 70, ty + 220); ctx.lineTo(tx + 50, ty + 200); ctx.lineTo(tx - 50, ty + 200); ctx.closePath(); ctx.fill();
  // rings
  for (let i = 0; i < RINGS.length; i++) {
    ctx.fillStyle = RING_COLORS[i];
    ctx.beginPath(); ctx.arc(tx, ty, RINGS[i][0], 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(tx, ty, 100, 0, Math.PI * 2); ctx.stroke();
}
function drawBow(ctx, x, y, aimX, aimY) {
  const a = Math.atan2(aimY - y, aimX - x);
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.strokeStyle = '#78350f'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, 46, -1.1, 1.1); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(0, 42); ctx.stroke();
  ctx.restore();
  // arrow
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.strokeStyle = '#92400e'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(64, 0); ctx.stroke();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath(); ctx.moveTo(64, 0); ctx.lineTo(50, -7); ctx.lineTo(50, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawArrowFly(ctx, x, y, a) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.strokeStyle = '#92400e'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.stroke();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(16, -7); ctx.lineTo(16, 7); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-40, -8); ctx.moveTo(-30, 0); ctx.lineTo(-40, 8); ctx.stroke();
  ctx.restore();
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = target sways slower, Power = bigger bullseye.
  const SWAY = options.power === 'speed' ? 0.55 : 1;
  const BULL = options.power === 'power' ? 30 : 20;
  const S = { phase: 'intro', t: 0, arrow: 0, points: 0, bullseyes: 0, aimX: 640, aimY: 300, flyT: 0, flyFrom: { x: 640, y: 600 }, msg: null, msgT: 0, reported: false };
  let hits = [];

  const targetX = () => 640 + Math.sin(S.t * 0.8 * SWAY) * 200;
  const targetY = () => 300;
  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function shoot() {
    if (S.phase !== 'aim') return;
    S.phase = 'shoot'; S.t = 0; S.flyT = 0; S.flyFrom = { x: 640, y: 600 }; audio.play('whoosh');
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.points >= D.target;
    say(win ? 'SHARP SHOOTER!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.points >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.points} POINTS · GOAL ${D.target}`,
      stats: [`Points: <b>${S.points}</b>`, `Bullseyes: <b>${S.bullseyes}</b>`, `Arrows: <b>${D.arrows}</b>`],
      match: { game: 'archery', difficulty: options.difficulty, won: win, points: S.points, bullseyes: S.bullseyes, arrows: D.arrows },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'bow') { S.labelKey = 'bow'; input.setLabels('SHOOT', 'SHOOT'); }
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
        const dx = S.aimX - targetX(), dy = S.aimY - targetY();
        const dist = Math.sqrt(dx * dx + dy * dy);
        let pts = 0;
        if (dist < BULL) pts = 10;
        else if (dist < 40) pts = 8;
        else if (dist < 60) pts = 6;
        else if (dist < 80) pts = 4;
        else if (dist < 100) pts = 2;
        S.points += pts;
        if (pts === 10) {
          S.bullseyes++;
          say('BULLSEYE! 🎯', '#facc15'); audio.play('badge'); audio.cheer(1.2); fx.confetti(targetX(), targetY(), 60);
        } else if (pts > 0) { say(`+${pts} POINTS!`, '#a3e635'); audio.play('point'); }
        else { say('MISS!', '#fca5a5'); audio.play('aww'); }
        S.phase = 'reset'; S.t = 0;
      }
    } else if (S.phase === 'reset') {
      if (S.t > 1.1) {
        S.arrow++;
        if (S.arrow >= D.arrows) endGame();
        else { S.aimX = 640; S.aimY = 300; S.phase = 'aim'; S.t = 0; }
      }
    }
  }

  function draw(ctx, view) {
    hits = [];
    const tx = targetX(), ty = targetY();
    drawField(ctx, view, S.t, tx, ty);
    // aim crosshair
    if (S.phase === 'aim') {
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(S.aimX, S.aimY, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(S.aimX - 26, S.aimY); ctx.lineTo(S.aimX - 10, S.aimY); ctx.moveTo(S.aimX + 10, S.aimY); ctx.lineTo(S.aimX + 26, S.aimY); ctx.moveTo(S.aimX, S.aimY - 26); ctx.lineTo(S.aimX, S.aimY - 10); ctx.moveTo(S.aimX, S.aimY + 10); ctx.lineTo(S.aimX, S.aimY + 26); ctx.stroke();
      hit(140, 100, 1000, 560, t => { S.aimX = clamp(t.x, 200, 1080); S.aimY = clamp(t.y, 120, 620); audio.play('tick'); });
    }
    // bow + arrow
    if (S.phase === 'aim' || S.phase === 'reset' || S.phase === 'intro') drawBow(ctx, 640, 600, S.aimX, S.aimY);
    if (S.phase === 'shoot') {
      const f = Math.min(1, S.flyT);
      const x = S.flyFrom.x + (S.aimX - S.flyFrom.x) * f;
      const y = S.flyFrom.y + (S.aimY - S.flyFrom.y) * f;
      const a = Math.atan2(S.aimY - S.flyFrom.y, S.aimX - S.flyFrom.x);
      drawArrowFly(ctx, x, y, a);
    }
    // SHOOT button
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready ? '#16a34a' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "40px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SHOOT!', 1110, 322);
    hit(990, 260, 240, 120, () => shoot());
    if (ready) {
      const k = clamp(1 - S.t / D.aimTime, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 990, 392, 240, 10, 5); ctx.fill();
      ctx.fillStyle = k > 0.3 ? '#4ade80' : '#f87171'; rrect(ctx, 990, 392, 240 * k, 10, 5); ctx.fill();
    }
    // scoreboard
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 40, 60, 260, 150, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Arrow ${Math.min(S.arrow + 1, D.arrows)} of ${D.arrows}`, 62, 92);
    ctx.fillText(`Points: ${S.points}  (goal ${D.target})`, 62, 122);
    ctx.fillText(`Bullseyes: ${S.bullseyes}`, 62, 152);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.arrow === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = input.touchMode ? 'Tap to aim · tap SHOOT!' : 'Use ← → ↑ ↓ to aim · SPACE to shoot';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 480, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 480, S.t, { size: 100, sub: `${S.points} points`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'HIT THE TARGET!', 640, 480, S.t, { size: 80, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__archery = { S, shoot };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  const tx = 640 + Math.sin(t * 0.8) * 200;
  drawField(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t, tx, 300);
  drawBow(ctx, 640, 600, tx, 300);
  ctx.restore();
}

export default {
  id: 'archery',
  title: 'Archery',
  tagline: 'Shoot the bow and hit the target',
  desc: 'An archery range where the target sways side to side. Aim your bow, tap SHOOT, and hit the bullseye for 10 points. 10 arrows per match.',
  music: 'menu',
  labels: { a: 'SHOOT', b: 'SHOOT' },
  options: [],
  howto: `<ul>
    <li><b>Aim</b>: move the crosshair with ← → ↑ ↓ / the joystick, or tap where you want to shoot.</li>
    <li><b>SHOOT!</b> (tap it or press <kbd>Space</kbd>): the arrow flies to your aim point.</li>
    <li>The target sways — the closer to the middle, the more points. Bullseye is 10!</li>
    <li>10 arrows per match. Score enough points to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
