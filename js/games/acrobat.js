// ROBLOC Acrobat: flip on the tightrope and land on the mat!
// Aim with the joystick / arrows or tap, then tap FLIP!
// Land close to the mat centre for 100 points! 5 flips per match.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 200, flips: 5, aimTime: 20 },
  pro: { target: 250, flips: 5, aimTime: 15 },
  legend: { target: 300, flips: 5, aimTime: 12 },
  boost: { target: 150, flips: 5, aimTime: 25 },   // win-chance matches
  tough: { target: 320, flips: 5, aimTime: 10 },  // others: hard game, so they win about 25%
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ROPE_Y = 280;
const MAT_Y = 580;

function drawScene(ctx, view, t, wx) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#7dd3fc'); bg.addColorStop(0.55, '#bae6fd'); bg.addColorStop(0.56, '#86efac'); bg.addColorStop(1, '#4ade80');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  ctx.fillStyle = '#f8fafc'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🤸 ACROBAT 🤸', 640, 70);
  // sun + clouds
  ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(150, 110, 42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.ellipse(420, 110, 70, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(950, 90, 80, 24, 0, 0, Math.PI * 2); ctx.fill();
  // tightrope poles
  ctx.fillStyle = '#78350f'; ctx.fillRect(196, ROPE_Y, 10, 260); ctx.fillRect(1074, ROPE_Y, 10, 260);
  ctx.fillStyle = '#92400e'; ctx.fillRect(186, ROPE_Y - 8, 30, 12); ctx.fillRect(1064, ROPE_Y - 8, 30, 12);
  // the rope
  ctx.strokeStyle = '#451a03'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(200, ROPE_Y); ctx.lineTo(1080, ROPE_Y); ctx.stroke();
  // the landing mat (centre 640) with target rings
  ctx.fillStyle = '#1d4ed8'; rrect(ctx, 460, 520, 360, 120, 20); ctx.fill();
  ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.arc(640, MAT_Y, 110, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(640, MAT_Y, 60, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(640, MAT_Y, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '900 15px Nunito'; ctx.fillText('100', 640, MAT_Y);
}
function drawWalker(ctx, x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  // balancing pole
  ctx.strokeStyle = '#451a03'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-70, -62); ctx.lineTo(70, -62); ctx.stroke();
  // body
  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(0, 0); ctx.stroke();
  // head
  ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(0, -62, 13, 0, Math.PI * 2); ctx.fill();
  // arms up to the pole
  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(-34, -62); ctx.moveTo(0, -40); ctx.lineTo(34, -62); ctx.stroke();
  // legs
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, 22); ctx.moveTo(0, 0); ctx.lineTo(10, 22); ctx.stroke();
  ctx.restore();
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = the walker sways slower, Power = a wider
  // 100-point zone on the mat.
  const SWAY = options.power === 'speed' ? 0.55 : 1;
  const BULL = options.power === 'power' ? 90 : 60;
  const S = { phase: 'intro', t: 0, swayT: 0, flip: 0, points: 0, bestPoints: 0, aimX: 640, aimY: 300, flyT: 0, flyFrom: { x: 640, y: ROPE_Y }, msg: null, msgT: 0, reported: false };
  let hits = [];

  const walkerX = () => 640 + Math.sin(S.swayT * 0.8 * SWAY) * 200;
  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function flip() {
    if (S.phase !== 'aim') return;
    S.phase = 'shoot'; S.t = 0; S.flyT = 0; S.flyFrom = { x: walkerX(), y: ROPE_Y }; audio.play('whoosh');
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.points >= D.target;
    say(win ? 'SUPERSTAR!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.points >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.points} POINTS · GOAL ${D.target}`,
      stats: [`Flips: <b>${D.flips}</b>`, `Points: <b>${S.points}</b>`, `Best flip: <b>${S.bestPoints}</b>`],
      match: { game: 'acrobat', difficulty: options.difficulty, won: win, flips: D.flips, points: S.points, bestPoints: S.bestPoints },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt; S.swayT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'acrobat') { S.labelKey = 'acrobat'; input.setLabels('FLIP', 'FLIP'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.5) { S.phase = 'aim'; S.t = 0; } return; }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'aim') {
      if (input.mx) S.aimX = clamp(S.aimX + input.mx * 300 * dt, 200, 1080);
      if (input.my) S.aimY = clamp(S.aimY + input.my * 300 * dt, 120, 620);
      if (input.a.pressed || input.b.pressed || S.t > D.aimTime) flip();
    } else if (S.phase === 'shoot') {
      S.flyT += dt / 0.6;
      const f = Math.min(1, S.flyT);
      if (f >= 1) {
        const dist = Math.abs(S.aimX - 640);
        // Power superpower: a wider 100-point zone on the mat.
        const pts = clamp(100 - Math.round(Math.max(0, dist - BULL) / 2), 0, 100);
        S.points += pts;
        if (pts > S.bestPoints) S.bestPoints = pts;
        if (pts >= 90) { say(`PERFECT LANDING! +${pts}`, '#facc15'); audio.play('badge'); audio.cheer(1.2); fx.confetti(S.aimX, MAT_Y, 60); }
        else if (pts >= 50) { say(`NICE FLIP! +${pts}`, '#a3e635'); audio.play('point'); }
        else if (pts > 0) { say(`+${pts} POINTS!`, '#a3e635'); audio.play('point'); }
        else { say('OFF THE MAT!', '#fca5a5'); audio.play('aww'); }
        S.phase = 'reset'; S.t = 0;
      }
    } else if (S.phase === 'reset') {
      if (S.t > 1.1) {
        S.flip++;
        if (S.flip >= D.flips) endGame();
        else { S.aimX = 640; S.aimY = 300; S.phase = 'aim'; S.t = 0; }
      }
    }
  }

  function draw(ctx, view) {
    hits = [];
    drawScene(ctx, view, S.t, walkerX());
    if (S.phase === 'aim') {
      drawWalker(ctx, walkerX(), ROPE_Y, 0);
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(S.aimX, S.aimY, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(S.aimX - 26, S.aimY); ctx.lineTo(S.aimX - 10, S.aimY); ctx.moveTo(S.aimX + 10, S.aimY); ctx.lineTo(S.aimX + 26, S.aimY); ctx.moveTo(S.aimX, S.aimY - 26); ctx.lineTo(S.aimX, S.aimY - 10); ctx.moveTo(S.aimX, S.aimY + 10); ctx.lineTo(S.aimX, S.aimY + 26); ctx.stroke();
      // landing ring: where you will land on the mat
      ctx.strokeStyle = 'rgba(250,204,21,.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(S.aimX, MAT_Y, 26, 0, Math.PI * 2); ctx.stroke();
      hit(140, 100, 1000, 560, t => { S.aimX = clamp(t.x, 200, 1080); S.aimY = clamp(t.y, 120, 620); audio.play('tick'); });
    }
    if (S.phase === 'shoot') {
      const f = Math.min(1, S.flyT);
      const x = S.flyFrom.x + (S.aimX - S.flyFrom.x) * f;
      const y = S.flyFrom.y + (MAT_Y - S.flyFrom.y) * f - Math.sin(f * Math.PI) * 180;
      drawWalker(ctx, x, y, f * Math.PI * 2);
    }
    if (S.phase === 'reset') drawWalker(ctx, S.aimX, MAT_Y, 0);
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready ? '#16a34a' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "40px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FLIP!', 1110, 322);
    hit(990, 260, 240, 120, () => flip());
    if (ready) {
      const k = clamp(1 - S.t / D.aimTime, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 990, 392, 240, 10, 5); ctx.fill();
      ctx.fillStyle = k > 0.3 ? '#4ade80' : '#f87171'; rrect(ctx, 990, 392, 240 * k, 10, 5); ctx.fill();
    }
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 40, 60, 260, 150, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Flip ${Math.min(S.flip + 1, D.flips)} of ${D.flips}`, 62, 92);
    ctx.fillText(`Points: ${S.points}  (goal ${D.target})`, 62, 122);
    ctx.fillText(`Best flip: ${S.bestPoints}`, 62, 152);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.flip === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = input.touchMode ? 'Tap to aim · tap FLIP!' : 'Use ← → ↑ ↓ to aim · SPACE to flip';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 480, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 480, S.t, { size: 100, sub: `${S.points} points`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'ACROBAT!', 640, 480, S.t, { size: 96, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__acrobat = { S, flip };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  drawScene(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t, 640 + Math.sin(t * 0.8) * 200);
  drawWalker(ctx, 640 + Math.sin(t * 0.8) * 200, ROPE_Y, 0);
  ctx.restore();
}

export default {
  id: 'acrobat',
  title: 'Acrobat',
  tagline: 'Flip on the tightrope and land on the mat',
  desc: 'A tightrope walker sways side to side above a big mat. Aim where to land, tap FLIP, and watch them somersault through the air — land on the gold centre for 100 points! 5 flips per match.',
  music: 'menu',
  labels: { a: 'FLIP', b: 'FLIP' },
  options: [],
  howto: `<ul>
    <li><b>Aim</b>: move the crosshair with ← → ↑ ↓ / the joystick, or tap where you want to land. The gold ring on the mat is the landing spot.</li>
    <li><b>FLIP!</b> (tap it or press <kbd>Space</kbd>): the acrobat flips off the rope and lands where you aimed.</li>
    <li>Land on the mat centre for 100 points — the further out you land, the fewer points. 5 flips per match.</li>
    <li>Score enough points to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
