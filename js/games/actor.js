// ROBLOC Actor: the director calls an emotion — show the right face!
// Tap the matching emotion face. 8 rounds, +10 per correct answer.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 4, rounds: 8 },
  pro: { target: 5, rounds: 8 },
  legend: { target: 6, rounds: 8 },
  boost: { target: 3, rounds: 8 },   // win-chance matches
  tough: { target: 7, rounds: 8 },  // others: hard game, so they win about 25%
};
const EMOTIONS = [
  { name: 'Happy', icon: '😊' },
  { name: 'Sad', icon: '😢' },
  { name: 'Angry', icon: '😠' },
  { name: 'Surprised', icon: '😮' },
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function drawStage(ctx, view, t, bob) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#450a0a'); bg.addColorStop(0.45, '#7f1d1d'); bg.addColorStop(0.46, '#92400e'); bg.addColorStop(1, '#78350f');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  // theatre curtains
  ctx.fillStyle = '#991b1b';
  for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.ellipse(80 + i * 170, 60, 90, 70, 0, 0, Math.PI); ctx.fill(); }
  ctx.fillStyle = '#f8fafc'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🎭 ACTOR 🎭', 640, 150 + bob);
  // spotlight
  ctx.fillStyle = 'rgba(253,230,138,.25)';
  ctx.beginPath(); ctx.moveTo(560, 180); ctx.lineTo(720, 180); ctx.lineTo(820, 560); ctx.lineTo(460, 560); ctx.closePath(); ctx.fill();
  // clapperboard
  ctx.fillStyle = '#111827'; rrect(ctx, 80, 60, 150, 90, 10); ctx.fill();
  ctx.fillStyle = '#f8fafc'; ctx.font = '900 26px Nunito'; ctx.textAlign = 'center'; ctx.fillText('🎬', 155, 105);
}
// The 4 face buttons sit in a row: x = 80, 360, 640, 920; y = 300; 240 x 200.
// (The 4th face covers the usual action-button spot, so a tap there picks it.)
const FACE = i => ({ x: 80 + i * 280, y: 300, w: 240, h: 200 });

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  const S = { phase: 'intro', t: 0, swayT: 0, round: 0, correct: 0, points: 0, streak: 0, bestStreak: 0, target: 0, picked: -1, msg: null, msgT: 0, reported: false };
  let hits = [];

  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function nextRound() {
    let n = Math.floor(Math.random() * EMOTIONS.length);
    if (n === S.target && D.rounds > 1) n = (n + 1) % EMOTIONS.length;
    S.target = n; S.picked = -1; S.phase = 'aim'; S.t = 0;
  }
  function pick(i) {
    if (S.phase !== 'aim') return;
    S.picked = i; S.phase = 'shoot'; S.t = 0;
    if (i === S.target) {
      S.correct++; S.streak++; S.points += 10;
      if (S.streak > S.bestStreak) S.bestStreak = S.streak;
      say(S.streak >= 3 ? `CORRECT! ${S.streak} IN A ROW! +10` : 'CORRECT! +10', '#a3e635');
      audio.play('point'); audio.play('badge'); fx.confetti(640, 380, 40);
    } else {
      S.streak = 0;
      say(`WRONG! It was ${EMOTIONS[S.target].name}!`, '#fca5a5');
      audio.play('aww');
    }
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.correct >= D.target;
    say(win ? 'SUPERSTAR!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.correct >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.correct} CORRECT · GOAL ${D.target}`,
      stats: [`Correct: <b>${S.correct}</b>`, `Best streak: <b>${S.bestStreak}</b>`, `Points: <b>${S.points}</b>`],
      match: { game: 'actor', difficulty: options.difficulty, won: win, correct: S.correct, bestStreak: S.bestStreak },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt; S.swayT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'actor') { S.labelKey = 'actor'; input.setLabels('PICK', 'PICK'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.5) nextRound(); return; }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'shoot') {
      if (S.t > 1.2) { S.phase = 'reset'; S.t = 0; }
    } else if (S.phase === 'reset') {
      if (S.t > 0.4) {
        S.round++;
        if (S.round >= D.rounds) endGame();
        else nextRound();
      }
    }
  }

  function draw(ctx, view) {
    hits = [];
    const bob = Math.sin(S.swayT * 1.2) * 4;
    drawStage(ctx, view, S.t, bob);
    // the director's call
    const call = S.phase === 'intro' ? 'GET READY!' : `Show me: ${EMOTIONS[S.target].name.toUpperCase()}!`;
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 340, 190 + bob, 600, 70, 18); ctx.fill();
    ctx.fillStyle = '#fde68a'; ctx.font = "44px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(call, 640, 226 + bob);
    if (S.phase !== 'intro') {
      ctx.font = '64px Nunito'; ctx.fillText(EMOTIONS[S.target].icon, 640, 300 + bob);
    }
    // the 4 face buttons
    EMOTIONS.forEach((e, i) => {
      const f = FACE(i);
      let bg = '#f8fafc';
      if (S.phase === 'shoot' || S.phase === 'reset') {
        if (i === S.target) bg = '#16a34a';
        else if (i === S.picked) bg = '#dc2626';
        else bg = '#94a3b8';
      }
      ctx.fillStyle = bg; rrect(ctx, f.x, f.y, f.w, f.h, 24); ctx.fill();
      ctx.fillStyle = 'rgba(15,23,42,.12)'; rrect(ctx, f.x, f.y, f.w, 40, 24); ctx.fill();
      ctx.font = '96px Nunito'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(e.icon, f.x + f.w / 2, f.y + 92);
      ctx.fillStyle = S.phase === 'shoot' && (i === S.target || i === S.picked) ? '#fff' : '#1e293b';
      ctx.font = '900 24px Nunito'; ctx.fillText(e.name, f.x + f.w / 2, f.y + 168);
      if (S.phase === 'aim') hit(f.x, f.y, f.w, f.h, () => pick(i));
    });
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 40, 60, 260, 150, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Round ${Math.min(S.round + 1, D.rounds)} of ${D.rounds}`, 62, 92);
    ctx.fillText(`Correct: ${S.correct}  (goal ${D.target})`, 62, 122);
    ctx.fillText(`Best streak: ${S.bestStreak}`, 62, 152);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.round === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = 'Tap the face the director asked for!';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 540, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 557);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 600, S.msgT, { size: 52, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 480, S.t, { size: 100, sub: `${S.correct} correct`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'ACTOR!', 640, 480, S.t, { size: 96, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__actor = { S, pick };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  drawStage(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t, 0);
  EMOTIONS.forEach((e, i) => {
    const f = FACE(i);
    ctx.fillStyle = '#f8fafc'; rrect(ctx, f.x, f.y, f.w, f.h, 24); ctx.fill();
    ctx.font = '96px Nunito'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(e.icon, f.x + f.w / 2, f.y + 92);
    ctx.fillStyle = '#1e293b'; ctx.font = '900 24px Nunito'; ctx.fillText(e.name, f.x + f.w / 2, f.y + 168);
  });
  ctx.restore();
}

export default {
  id: 'actor',
  title: 'Actor',
  tagline: 'Show the face the director calls for',
  desc: 'The director calls an emotion — Happy, Sad, Angry or Surprised. Tap the matching face before the round ends! 8 rounds, +10 points per correct face.',
  music: 'menu',
  labels: { a: 'PICK', b: 'PICK' },
  options: [],
  howto: `<ul>
    <li>The director calls an emotion: <b>Happy 😊, Sad 😢, Angry 😠 or Surprised 😮</b>.</li>
    <li><b>Tap the matching face</b> — the big face buttons in the middle of the stage.</li>
    <li>Correct face = +10 points. Get a streak going for the best-streak badge!</li>
    <li>8 rounds per match. Get enough correct faces to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
