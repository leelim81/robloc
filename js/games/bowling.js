// ROBLOC Bowling: roll the ball down the lane and knock down pins.
// Aim with the joystick / arrows or tap the lane, then tap ROLL!
// 5 rolls per match. Win by knocking down enough pins.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 30, rolls: 5, aimTime: 15 },
  pro: { target: 35, rolls: 5, aimTime: 12 },
  legend: { target: 40, rolls: 5, aimTime: 10 },
  boost: { target: 25, rolls: 5, aimTime: 18 },   // win-chance matches
  tough: { target: 42, rolls: 5, aimTime: 8 },  // others: hard game, so they win about 25%
};
const LANE = { x0: 440, x1: 840, y0: 120, y1: 660 };
const CENTER = 640;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

// 10 pins in a triangle: front row (nearest the ball) has 1 pin,
// then 2, then 3, then 4 at the back.
function makePins() {
  const pins = [];
  const rows = [[640], [615, 665], [590, 640, 690], [565, 615, 665, 715]];
  const ys = [300, 265, 230, 195];
  rows.forEach((xs, r) => xs.forEach(x => pins.push({ x, y: ys[r], fallen: false, rot: 0 })));
  return pins;
}

function drawLane(ctx, view, t) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#1e1b4b'); bg.addColorStop(1, '#312e81');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  // wooden lane
  const lg = ctx.createLinearGradient(LANE.x0, 0, LANE.x1, 0);
  lg.addColorStop(0, '#b45309'); lg.addColorStop(0.5, '#d97706'); lg.addColorStop(1, '#92400e');
  ctx.fillStyle = lg; ctx.fillRect(LANE.x0, LANE.y0, LANE.x1 - LANE.x0, LANE.y1 - LANE.y0);
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3;
  for (let i = 1; i < 8; i++) {
    const x = LANE.x0 + i * 50;
    ctx.beginPath(); ctx.moveTo(x, LANE.y0); ctx.lineTo(x, LANE.y1); ctx.stroke();
  }
  ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 5; ctx.strokeRect(LANE.x0, LANE.y0, LANE.x1 - LANE.x0, LANE.y1 - LANE.y0);
  // gutters
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(LANE.x0 - 34, LANE.y0, 30, LANE.y1 - LANE.y0);
  ctx.fillRect(LANE.x1 + 4, LANE.y0, 30, LANE.y1 - LANE.y0);
  ctx.fillStyle = '#f8fafc'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🎳 BOWLING 🎳', 640, 70);
}
function drawPin(ctx, p) {
  ctx.save(); ctx.translate(p.x, p.y);
  if (p.fallen) { ctx.rotate(p.rot); ctx.globalAlpha = 0.55; }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#dc2626'; ctx.fillRect(-13, -6, 26, 7);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -22, 9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawBall(ctx, x, y) {
  const g = ctx.createRadialGradient(x - 8, y - 10, 4, x, y, 26);
  g.addColorStop(0, '#7c3aed'); g.addColorStop(1, '#4c1d95');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath(); ctx.arc(x - 7, y - 6, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 7, y - 6, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y + 4, 3.5, 0, Math.PI * 2); ctx.fill();
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = ball rolls 50% faster, Power = +2 pins per roll.
  const SPD = options.power === 'speed' ? 1.5 : 1;
  const PWR = options.power === 'power' ? 2 : 0;
  const pins = makePins();
  const S = { phase: 'intro', t: 0, roll: 0, pinsTotal: 0, strikes: 0, lastPins: 0, ballX: 480 + Math.random() * 320, ballY: 600, msg: null, msgT: 0, reported: false };
  let hits = [];

  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function roll() {
    if (S.phase !== 'aim') return;
    S.phase = 'roll'; S.t = 0; audio.play('whoosh');
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.pinsTotal >= D.target;
    say(win ? 'BOWLING CHAMP!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.pinsTotal >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.pinsTotal} PINS · GOAL ${D.target}`,
      stats: [`Pins knocked: <b>${S.pinsTotal}</b>`, `Strikes: <b>${S.strikes}</b>`, `Rolls: <b>${D.rolls}</b>`],
      match: { game: 'bowling', difficulty: options.difficulty, won: win, pins: S.pinsTotal, strikes: S.strikes, rolls: D.rolls },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'bowl') { S.labelKey = 'bowl'; input.setLabels('ROLL', 'ROLL'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.5) { S.phase = 'aim'; S.t = 0; } return; }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'aim') {
      if (input.mx) S.ballX = clamp(S.ballX + input.mx * 260 * SPD * dt, LANE.x0 + 30, LANE.x1 - 30);
      if (input.a.pressed || input.b.pressed || S.t > D.aimTime) roll();
    } else if (S.phase === 'roll') {
      S.ballY -= 620 * SPD * dt;
      if (S.ballY <= 320) {
        // pins fall: how close to the middle of the lane?
        const acc = Math.max(0, 1 - Math.pow(Math.abs(S.ballX - CENTER) / 160, 2));
        const standing = pins.filter(p => !p.fallen);
        let n = clamp(Math.round(acc * 10 * rand(0.75, 1.05)) + PWR, 0, 10);
        n = Math.min(n, standing.length);
        for (let i = 0; i < n; i++) {
          const p = standing.splice(Math.floor(Math.random() * standing.length), 1)[0];
          p.fallen = true; p.rot = rand(-1.4, 1.4);
        }
        S.lastPins = n; S.pinsTotal += n;
        if (n === 10) { S.strikes++; say('STRIKE! 🎳', '#fde68a'); audio.cheer(1.2); fx.confetti(640, 300, 60); }
        else if (n >= 7) { say(`${n} PINS!`, '#a3e635'); audio.play('point'); }
        else if (n > 0) { say(`${n} pin${n === 1 ? '' : 's'}`, '#fff'); audio.play('thud'); }
        else { say('GUTTER BALL!', '#fca5a5'); audio.play('aww'); }
        S.phase = 'reset'; S.t = 0;
      }
    } else if (S.phase === 'reset') {
      if (S.t > 1.4) {
        S.roll++;
        if (S.roll >= D.rolls) endGame();
        else {
          pins.forEach(p => { p.fallen = false; p.rot = 0; });
          S.ballX = 480 + Math.random() * 320; S.ballY = 600;
          S.phase = 'aim'; S.t = 0;
        }
      }
    }
  }

  function draw(ctx, view) {
    hits = [];
    drawLane(ctx, view, S.t);
    for (const p of pins) drawPin(ctx, p);
    drawBall(ctx, S.ballX, S.ballY);
    // aim guide
    if (S.phase === 'aim') {
      ctx.strokeStyle = 'rgba(250,204,21,.5)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(S.ballX, S.ballY - 30); ctx.lineTo(S.ballX, 200); ctx.stroke(); ctx.setLineDash([]);
      hit(LANE.x0, LANE.y0, LANE.x1 - LANE.x0, LANE.y1 - LANE.y0, t => { S.ballX = clamp(t.x, LANE.x0 + 30, LANE.x1 - 30); audio.play('tick'); });
    }
    // ROLL button
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready ? '#16a34a' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "44px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ROLL!', 1110, 322);
    hit(990, 260, 240, 120, () => roll());
    if (ready) {
      const k = clamp(1 - S.t / D.aimTime, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 990, 392, 240, 10, 5); ctx.fill();
      ctx.fillStyle = k > 0.3 ? '#4ade80' : '#f87171'; rrect(ctx, 990, 392, 240 * k, 10, 5); ctx.fill();
    }
    // scoreboard
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 40, 60, 260, 150, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Roll ${Math.min(S.roll + 1, D.rolls)} of ${D.rolls}`, 62, 92);
    ctx.fillText(`Pins: ${S.pinsTotal}  (goal ${D.target})`, 62, 122);
    ctx.fillText(`Strikes: ${S.strikes}`, 62, 152);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.roll === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = input.touchMode ? 'Tap the lane to aim · tap ROLL!' : 'Use ← → to aim · SPACE to roll';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 260, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 280, S.t, { size: 100, sub: `${S.pinsTotal} pins`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'KNOCK THEM DOWN!', 640, 280, S.t, { size: 80, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__bowling = { S, pins, roll };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  drawLane(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t);
  const pins = makePins();
  pins.forEach((p, i) => { if (i % 3 === 0) { p.fallen = true; p.rot = 1.2; } drawPin(ctx, p); });
  const bx = 640 + Math.sin(t * 0.8) * 120;
  drawBall(ctx, bx, 600 - Math.abs(Math.sin(t * 0.8)) * 120);
  ctx.restore();
}

export default {
  id: 'bowling',
  title: 'Bowling',
  tagline: 'Roll the ball and knock down all the pins',
  desc: 'A bowling lane with 10 pins. Aim the ball, tap ROLL, and knock down as many pins as you can in 5 rolls.',
  music: 'menu',
  labels: { a: 'ROLL', b: 'ROLL' },
  options: [],
  howto: `<ul>
    <li><b>Aim</b>: move the ball left and right with ← → / the joystick, or tap the lane.</li>
    <li><b>ROLL!</b> (tap it or press <kbd>Space</kbd>): the ball rolls down the lane.</li>
    <li>The closer to the middle you roll, the more pins fall. A strike knocks down all 10!</li>
    <li>5 rolls per match. Knock down enough pins to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
