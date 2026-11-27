// ROBLOC Golf: putt the ball into the hole!
// Aim with the joystick / arrows or tap the green, then tap PUTT!
// The hole moves — time your putt! 10 putts per match.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 5, putts: 10, aimTime: 20 },
  pro: { target: 6, putts: 10, aimTime: 15 },
  legend: { target: 7, putts: 10, aimTime: 12 },
  boost: { target: 4, putts: 10, aimTime: 25 },   // win-chance matches
  tough: { target: 8, putts: 10, aimTime: 10 },  // others: hard game, so they win about 25%
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function drawGreen(ctx, view, t, holeX) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#14532d'); bg.addColorStop(1, '#052e16');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  // green
  ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(640, 400, 420, 280, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.ellipse(640, 400, 340, 220, 0, 0, Math.PI * 2); ctx.fill();
  // sand + trees
  ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.ellipse(300, 250, 70, 40, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#166534';
  for (const [tx, ty] of [[220, 500], [1040, 480], [1080, 240], [200, 220]]) {
    ctx.beginPath(); ctx.arc(tx, ty, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#78350f'; ctx.fillRect(tx - 6, ty + 20, 12, 30); ctx.fillStyle = '#166534';
  }
  ctx.fillStyle = '#f8fafc'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('⛳ GOLF ⛳', 640, 70);
  // hole + flag
  ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.ellipse(holeX, 200, 42, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(holeX, 200); ctx.lineTo(holeX, 120); ctx.stroke();
  ctx.fillStyle = '#dc2626';
  ctx.beginPath(); ctx.moveTo(holeX, 120); ctx.lineTo(holeX + 44, 132); ctx.lineTo(holeX, 144); ctx.closePath(); ctx.fill();
}
function drawBall(ctx, x, y) {
  ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath(); ctx.arc(x - 5, y - 4, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 6, y + 3, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 2, y - 8, 2.5, 0, Math.PI * 2); ctx.fill();
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = hole moves slower, Power = bigger hole.
  const SWAY = options.power === 'speed' ? 0.55 : 1;
  const HOLE_R = options.power === 'power' ? 65 : 45;
  const S = { phase: 'intro', t: 0, swayT: 0, putt: 0, holes: 0, holeInOne: false, ballX: 640, ballY: 600, msg: null, msgT: 0, reported: false };
  let hits = [];

  const holeX = () => 640 + Math.sin(S.swayT * 0.9 * SWAY) * 220;
  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function putt() {
    if (S.phase !== 'aim') return;
    S.phase = 'roll'; S.t = 0; audio.play('whoosh');
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.holes >= D.target;
    say(win ? 'GOLF CHAMP!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.holes >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.holes} HOLES · GOAL ${D.target}`,
      stats: [`Holes sunk: <b>${S.holes}</b>`, `Putts: <b>${D.putts}</b>`, `Best: <b>${S.holes}</b>`],
      match: { game: 'golf', difficulty: options.difficulty, won: win, holes: S.holes, putts: D.putts, holeInOne: S.holeInOne },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt; S.swayT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'golf') { S.labelKey = 'golf'; input.setLabels('PUTT', 'PUTT'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.5) { S.phase = 'aim'; S.t = 0; } return; }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'aim') {
      if (input.mx) S.ballX = clamp(S.ballX + input.mx * 300 * dt, 300, 980);
      if (input.a.pressed || input.b.pressed || S.t > D.aimTime) putt();
    } else if (S.phase === 'roll') {
      S.ballY -= 560 * dt;
      if (S.ballY <= 200) {
        const sunk = Math.abs(S.ballX - holeX()) < HOLE_R;
        if (sunk) {
          S.holes++;
          if (S.putt === 0) S.holeInOne = true;
          say(S.putt === 0 ? 'HOLE IN ONE! ⛳' : 'IN THE HOLE! ⛳', '#a3e635');
          audio.play('point'); audio.cheer(1.0); fx.confetti(holeX(), 200, 50);
        } else { say('MISSED!', '#fca5a5'); audio.play('aww'); }
        S.phase = 'reset'; S.t = 0;
      }
    } else if (S.phase === 'reset') {
      if (S.t > 1.1) {
        S.putt++;
        if (S.putt >= D.putts) endGame();
        else { S.ballX = 640; S.ballY = 600; S.phase = 'aim'; S.t = 0; }
      }
    }
  }

  function draw(ctx, view) {
    hits = [];
    drawGreen(ctx, view, S.t, holeX());
    drawBall(ctx, S.ballX, S.ballY);
    if (S.phase === 'aim') {
      ctx.strokeStyle = 'rgba(250,204,21,.5)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(S.ballX, S.ballY - 30); ctx.lineTo(S.ballX, 230); ctx.stroke(); ctx.setLineDash([]);
      hit(220, 120, 840, 560, t => { S.ballX = clamp(t.x, 300, 980); audio.play('tick'); });
    }
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready ? '#16a34a' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "40px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PUTT!', 1110, 322);
    hit(990, 260, 240, 120, () => putt());
    if (ready) {
      const k = clamp(1 - S.t / D.aimTime, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 990, 392, 240, 10, 5); ctx.fill();
      ctx.fillStyle = k > 0.3 ? '#4ade80' : '#f87171'; rrect(ctx, 990, 392, 240 * k, 10, 5); ctx.fill();
    }
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 40, 60, 260, 150, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Putt ${Math.min(S.putt + 1, D.putts)} of ${D.putts}`, 62, 92);
    ctx.fillText(`Holes: ${S.holes}  (goal ${D.target})`, 62, 122);
    ctx.font = '30px sans-serif'; ctx.fillText('⛳'.repeat(Math.min(S.holes, 10)), 62, 168);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.putt === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = input.touchMode ? 'Tap the green to aim · tap PUTT!' : 'Use ← → to aim · SPACE to putt';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 380, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 380, S.t, { size: 100, sub: `${S.holes} holes`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'TEE OFF!', 640, 380, S.t, { size: 96, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__golf = { S, putt };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  const hx = 640 + Math.sin(t * 0.9) * 220;
  drawGreen(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t, hx);
  drawBall(ctx, 640, 600 - Math.abs(Math.sin(t * 0.8)) * 300);
  ctx.restore();
}

export default {
  id: 'golf',
  title: 'Golf',
  tagline: 'Putt the ball into the hole',
  desc: 'A golf green where the hole moves side to side. Aim the ball, tap PUTT, and sink as many putts as you can in 10 tries.',
  music: 'menu',
  labels: { a: 'PUTT', b: 'PUTT' },
  options: [],
  howto: `<ul>
    <li><b>Aim</b>: move the ball left and right with ← → / the joystick, or tap the green.</li>
    <li><b>PUTT!</b> (tap it or press <kbd>Space</kbd>): the ball rolls to the hole.</li>
    <li>The hole moves — time your putt so the ball lands in it!</li>
    <li>10 putts per match. Sink enough holes to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
