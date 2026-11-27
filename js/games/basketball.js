// ROBLOC Basketball: shoot hoops and score big.
// Aim with the joystick / arrows or tap the court, then tap SHOOT!
// The hoop sways — time your shot! 10 shots per match.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 5, shots: 10, aimTime: 20 },
  pro: { target: 6, shots: 10, aimTime: 15 },
  legend: { target: 7, shots: 10, aimTime: 12 },
  boost: { target: 4, shots: 10, aimTime: 25 },   // win-chance matches
  tough: { target: 8, shots: 10, aimTime: 10 },  // others: hard game, so they win about 25%
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function drawCourt(ctx, view, t, hoopX) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#0c4a6e'); bg.addColorStop(1, '#082f49');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  // wooden court
  ctx.fillStyle = '#b45309'; ctx.fillRect(240, 120, 800, 560);
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 4;
  ctx.strokeRect(240, 120, 800, 560);
  ctx.beginPath(); ctx.arc(640, 640, 130, Math.PI, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(640, 120); ctx.lineTo(640, 680); ctx.stroke();
  ctx.fillStyle = '#f8fafc'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🏀 BASKETBALL 🏀', 640, 70);
  // backboard + hoop (sways)
  ctx.fillStyle = '#f8fafc'; rrect(ctx, hoopX - 70, 130, 140, 90, 10); ctx.fill();
  ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 4; ctx.strokeRect(hoopX - 70, 130, 140, 90);
  ctx.fillStyle = '#dc2626'; ctx.fillRect(hoopX - 26, 176, 52, 8);
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.ellipse(hoopX, 226, 52, 12, 0, 0, Math.PI * 2); ctx.stroke();
  // net
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.moveTo(hoopX + i * 20, 228); ctx.lineTo(hoopX + i * 14, 262); ctx.stroke();
  }
}
function drawBall(ctx, x, y, r = 30) {
  const g = ctx.createRadialGradient(x - 8, y - 10, 4, x, y, r);
  g.addColorStop(0, '#fb923c'); g.addColorStop(1, '#c2410c');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.6, -0.6, 0.9); ctx.stroke();
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = hoop sways slower, Power = bigger hoop.
  const SWAY = options.power === 'speed' ? 0.55 : 1;
  const RIM = options.power === 'power' ? 68 : 46;
  const S = { phase: 'intro', t: 0, swayT: 0, shot: 0, baskets: 0, ballX: 640, ballY: 600, flyT: 0, flyFrom: 640, msg: null, msgT: 0, reported: false };
  let hits = [];

  const hoopX = () => 640 + Math.sin(S.swayT * 0.9 * SWAY) * 220;
  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function shoot() {
    if (S.phase !== 'aim') return;
    S.phase = 'shoot'; S.t = 0; S.flyFrom = S.ballX; audio.play('whoosh');
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.baskets >= D.target;
    say(win ? 'HOOP STAR!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.baskets >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.baskets} BASKETS · GOAL ${D.target}`,
      stats: [`Baskets: <b>${S.baskets}</b>`, `Shots: <b>${D.shots}</b>`, `Best: <b>${S.baskets}</b>`],
      match: { game: 'basketball', difficulty: options.difficulty, won: win, baskets: S.baskets, shots: D.shots },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt; S.swayT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'hoop') { S.labelKey = 'hoop'; input.setLabels('SHOOT', 'SHOOT'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.5) { S.phase = 'aim'; S.t = 0; } return; }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'aim') {
      if (input.mx) S.ballX = clamp(S.ballX + input.mx * 300 * dt, 300, 980);
      if (input.a.pressed || input.b.pressed || S.t > D.aimTime) shoot();
    } else if (S.phase === 'shoot') {
      S.flyT += dt / 0.7;
      const f = Math.min(1, S.flyT);
      S.ballX = S.flyFrom + (hoopX() - S.flyFrom) * f * 0.3;
      S.ballY = 600 - 450 * f;
      if (f >= 1) {
        const scored = Math.abs(S.ballX - hoopX()) < RIM;
        if (scored) {
          S.baskets++;
          say(S.baskets === 10 ? 'PERFECT GAME!' : 'SCORE! 🏀', '#a3e635');
          audio.play('point'); audio.cheer(0.8); fx.confetti(hoopX(), 240, 40);
        } else { say('MISS!', '#fca5a5'); audio.play('aww'); }
        S.phase = 'reset'; S.t = 0;
      }
    } else if (S.phase === 'reset') {
      if (S.t > 1.1) {
        S.shot++;
        if (S.shot >= D.shots) endGame();
        else { S.ballX = 640; S.ballY = 600; S.phase = 'aim'; S.t = 0; }
      }
    }
  }

  function draw(ctx, view) {
    hits = [];
    drawCourt(ctx, view, S.t, hoopX());
    drawBall(ctx, S.ballX, S.ballY);
    // aim guide
    if (S.phase === 'aim') {
      ctx.strokeStyle = 'rgba(250,204,21,.5)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(S.ballX, S.ballY - 40); ctx.lineTo(S.ballX, 260); ctx.stroke(); ctx.setLineDash([]);
      hit(240, 120, 800, 560, t => { S.ballX = clamp(t.x, 300, 980); audio.play('tick'); });
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
    ctx.fillText(`Shot ${Math.min(S.shot + 1, D.shots)} of ${D.shots}`, 62, 92);
    ctx.fillText(`Baskets: ${S.baskets}  (goal ${D.target})`, 62, 122);
    ctx.font = '30px sans-serif'; ctx.fillText('🏀'.repeat(Math.min(S.baskets, 10)), 62, 168);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.shot === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = input.touchMode ? 'Tap the court to aim · tap SHOOT!' : 'Use ← → to aim · SPACE to shoot';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 380, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 380, S.t, { size: 100, sub: `${S.baskets} baskets`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'SHOOT HOOPS!', 640, 380, S.t, { size: 96, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__basketball = { S, shoot };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  const hx = 640 + Math.sin(t * 0.9) * 220;
  drawCourt(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t, hx);
  const f = (t % 2) / 2;
  drawBall(ctx, 640 + (hx - 640) * f * 0.3, 600 - 450 * f);
  ctx.restore();
}

export default {
  id: 'basketball',
  title: 'Basketball',
  tagline: 'Shoot hoops and score big',
  desc: 'A basketball court where the hoop sways side to side. Aim the ball, tap SHOOT, and sink as many baskets as you can in 10 shots.',
  music: 'menu',
  labels: { a: 'SHOOT', b: 'SHOOT' },
  options: [],
  howto: `<ul>
    <li><b>Aim</b>: move the ball left and right with ← → / the joystick, or tap the court.</li>
    <li><b>SHOOT!</b> (tap it or press <kbd>Space</kbd>): the ball flies to the hoop.</li>
    <li>The hoop sways — time your shot so the ball lands in the rim!</li>
    <li>10 shots per match. Score enough baskets to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
