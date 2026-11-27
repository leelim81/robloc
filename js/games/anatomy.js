// ROBLOC Anatomy: a big friendly body — the game names a body part
// and you tap it! 8 rounds, +10 points per correct tap. Learn your
// body: head, eye, ear, arm, hand, heart, leg, foot!
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 4, rounds: 8 },
  pro: { target: 5, rounds: 8 },
  legend: { target: 6, rounds: 8 },
  boost: { target: 3, rounds: 8 },   // Trevor: easy game, low goal
  tough: { target: 7, rounds: 8 },   // others: hard game, high goal
};
// Body parts: name, emoji, position, hit radius. Small precise parts
// are checked first when tapping, so the eye never loses to the head.
const PARTS = [
  { name: 'EYE', emoji: '👁️', x: 478, y: 152, r: 22, size: 30 },
  { name: 'EAR', emoji: '👂', x: 446, y: 168, r: 22, size: 30 },
  { name: 'HAND', emoji: '✋', x: 352, y: 372, r: 28, size: 40 },
  { name: 'FOOT', emoji: '🦶', x: 532, y: 592, r: 28, size: 40 },
  { name: 'HEART', emoji: '❤️', x: 500, y: 302, r: 32, size: 44 },
  { name: 'HEAD', emoji: '😀', x: 500, y: 162, r: 58, size: 72 },
  { name: 'ARM', emoji: '💪', x: 402, y: 282, r: 32, size: 40 },
  { name: 'LEG', emoji: '🦵', x: 522, y: 472, r: 32, size: 44 },
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function drawBody(ctx, view, t, pulse) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#7c3aed'); bg.addColorStop(1, '#4c1d95');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  ctx.fillStyle = '#f8fafc'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🫀 ANATOMY 🫀', 640, 70);
  const bob = Math.sin(t * 1.2) * 4;
  // legs + feet
  ctx.strokeStyle = '#f2c89b'; ctx.lineWidth = 30; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(480, 400); ctx.lineTo(470, 560); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(520, 400); ctx.lineTo(532, 560); ctx.stroke();
  // arms
  ctx.beginPath(); ctx.moveTo(452, 260); ctx.lineTo(380, 350); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(548, 260); ctx.lineTo(620, 350); ctx.stroke();
  // torso (shirt)
  ctx.fillStyle = '#3b82f6'; rrect(ctx, 448, 230, 104, 180, 30); ctx.fill();
  // head
  ctx.fillStyle = '#f2c89b'; ctx.beginPath(); ctx.arc(500, 162 + bob, 58, 0, Math.PI * 2); ctx.fill();
  // hair
  ctx.fillStyle = '#4a2c18'; ctx.beginPath(); ctx.arc(500, 148 + bob, 58, Math.PI, Math.PI * 2); ctx.fill();
  // body parts (emoji sit on the body)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of PARTS) {
    const y = p.name === 'HEAD' ? p.y + bob : p.y;
    if (p.name === 'HEART') {
      const s = 1 + 0.12 * pulse;
      ctx.save(); ctx.translate(p.x, y); ctx.scale(s, s);
      ctx.font = `${p.size}px serif`; ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    } else {
      ctx.font = `${p.size}px serif`; ctx.fillText(p.emoji, p.x, y);
    }
  }
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  const S = { phase: 'intro', t: 0, swayT: 0, round: 0, order: shuffleOrder(), target: null, correct: 0, streak: 0, bestStreak: 0, points: 0, picked: null, hintUsed: false, hintT: 0, msg: null, msgT: 0, msgColor: '#fff', reported: false };
  let hits = [];

  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function shuffleOrder() {
    const o = [...PARTS];
    for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
    return o;
  }
  function startRound() {
    S.target = S.order[S.round];
    S.picked = null; S.hintUsed = false; S.hintT = 0;
    S.phase = 'aim'; S.t = 0;
  }
  function hint() {
    if (S.phase !== 'aim' || S.hintUsed || !S.target) return;
    S.hintUsed = true; S.hintT = 0; audio.play('tick');
    say(`Hint: look at the ${S.target.name}!`, '#fde68a');
  }
  function tapPart(part) {
    if (S.phase !== 'aim' || !S.target) return;
    S.picked = part;
    if (part === S.target) {
      S.correct++; S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak); S.points += 10;
      say('CORRECT! +10', '#a3e635'); audio.play('point'); fx.confetti(part.x, part.y, 40);
    } else {
      S.streak = 0;
      say(`That was the ${part.name} — the ${S.target.name} is here!`, '#fca5a5'); audio.play('aww');
    }
    S.phase = 'reveal'; S.t = 0;
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.correct >= D.target;
    say(win ? 'BODY EXPERT!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.correct >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.correct} CORRECT · GOAL ${D.target}`,
      stats: [`Correct: <b>${S.correct}</b>`, `Best streak: <b>${S.bestStreak}</b>`, `Points: <b>${S.points}</b>`],
      match: { game: 'anatomy', difficulty: options.difficulty, won: win, correct: S.correct, bestStreak: S.bestStreak, points: S.points },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt; S.swayT += dt; S.hintT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'ana') { S.labelKey = 'ana'; input.setLabels('HINT 💡', 'HINT 💡'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') {
      if (S.t > 1.5) { S.round = 0; startRound(); }
      return;
    }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'aim') {
      if (input.a.pressed || input.b.pressed) hint();
    } else if (S.phase === 'reveal') {
      if (S.t > 1.6) {
        S.round++;
        if (S.round >= D.rounds) endGame();
        else startRound();
      }
    }
  }

  function draw(ctx, view) {
    hits = [];
    const pulse = Math.sin(S.swayT * 3);
    drawBody(ctx, view, S.swayT, pulse);
    // tap zones for every body part (small parts first, so they win)
    if (S.phase === 'aim') {
      for (const p of PARTS) {
        hit(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2, () => tapPart(p));
      }
    }
    // highlight the right part after a tap, or while the hint flashes
    const show = S.phase === 'reveal' ? S.target : (S.hintUsed && S.hintT < 1 && S.phase === 'aim' ? S.target : null);
    if (show) {
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(show.x, show.y, show.r + 10 + Math.sin(S.swayT * 6) * 4, 0, Math.PI * 2); ctx.stroke();
    }
    // prompt: which part to find?
    if (S.phase === 'aim' || S.phase === 'reveal') {
      ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 700, 120, 480, 90, 18); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.font = "36px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`Find the ${S.target ? S.target.name : ''}!`, 940, 166);
      ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
      ctx.fillText(`Round ${Math.min(S.round + 1, D.rounds)} of ${D.rounds}`, 940, 196);
    }
    // HINT button
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready && !S.hintUsed ? '#d97706' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "34px 'Lilita One'"; ctx.fillText('HINT 💡', 1110, 322);
    hit(990, 260, 240, 120, () => hint());
    // HUD
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 40, 60, 260, 150, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Correct: ${S.correct}  (goal ${D.target})`, 62, 92);
    ctx.fillText(`Points: ${S.points}`, 62, 122);
    ctx.fillText(`Best streak: ${S.bestStreak}`, 62, 152);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.round === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = 'Tap the body part the game names!';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 480, S.msgT, { size: 52, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 480, S.t, { size: 100, sub: `${S.correct} correct`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'FIND THE BODY PART!', 640, 480, S.t, { size: 88, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__anatomy = { S, hint, tapPart };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  drawBody(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t, Math.sin(t * 3));
  ctx.restore();
}

export default {
  id: 'anatomy',
  title: 'Anatomy',
  tagline: 'Find the body part the game names',
  desc: 'A big friendly body! The game names a body part — HEAD, HEART, ARM, LEG, HAND, FOOT, EYE or EAR — and you tap it on the body. 8 rounds, +10 points per correct tap. Wrong tap? The game shows you the right one!',
  music: 'menu',
  labels: { a: 'HINT 💡', b: 'HINT 💡' },
  options: [],
  howto: `<ul>
    <li>Read the prompt: <b>"Find the HEART!"</b> — then tap that part on the body.</li>
    <li>Correct tap is +10 points and grows your streak. A wrong tap shows you the right part.</li>
    <li><b>HINT 💡</b>: flashes the right part once per round, if you are stuck.</li>
    <li>8 rounds per match. Get enough correct to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
