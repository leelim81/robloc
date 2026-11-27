// ROBLOC Astrology: watch the stars light up, then tap them in order!
// 4 stars per constellation, 5 constellations per match. A correct
// star scores +10; a wrong star restarts the constellation.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 12, constellations: 5, starsPer: 4 },
  pro: { target: 14, constellations: 5, starsPer: 4 },
  legend: { target: 16, constellations: 5, starsPer: 4 },
  boost: { target: 10, constellations: 5, starsPer: 4 },   // Trevor: easy game
  tough: { target: 18, constellations: 5, starsPer: 4 },   // others: hard game
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// 12 stars scattered across the night sky (kept clear of the button).
const STAR_POS = [
  { x: 180, y: 180 }, { x: 360, y: 150 }, { x: 560, y: 190 }, { x: 760, y: 160 },
  { x: 900, y: 280 }, { x: 700, y: 320 }, { x: 480, y: 300 }, { x: 260, y: 330 },
  { x: 170, y: 480 }, { x: 380, y: 520 }, { x: 600, y: 500 }, { x: 830, y: 470 },
];

function drawSky(ctx, view, t) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#0f172a'); bg.addColorStop(1, '#312e81');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  // tiny twinkling stars (twinkle runs on the never-resetting sway clock)
  for (let i = 0; i < 50; i++) {
    const x = 40 + (i * 137) % 1200, y = 30 + (i * 89) % 620;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.7))})`;
    ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
  // moon
  ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.arc(1180, 90, 36, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath(); ctx.arc(1168, 84, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1192, 100, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e0e7ff'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🔮 ASTROLOGY 🔮', 640, 70);
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  const S = { phase: 'intro', t: 0, swayT: 0, con: 0, seq: [], prog: 0, stars: 0, points: 0, resetKind: 'next', msg: null, msgT: 0, msgColor: '#fff', reported: false };
  let hits = [];

  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function newConstellation() {
    const idx = [...STAR_POS.keys()];
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    S.seq = idx.slice(0, D.starsPer);
    S.prog = 0;
  }
  // Replay the light-up sequence (the SHOW! button).
  function show() {
    if (S.phase !== 'aim' && S.phase !== 'show') return;
    S.phase = 'show'; S.t = 0; audio.play('tick');
  }
  function tapStar(i) {
    if (S.phase !== 'aim') return;
    if (i === S.seq[S.prog]) {
      S.prog++; S.stars++; S.points += 10;
      audio.play('point');
      if (S.prog >= D.starsPer) {
        say('CONSTELLATION! ✨', '#facc15'); audio.play('badge'); audio.cheer(1.2);
        const p = STAR_POS[S.seq[S.seq.length - 1]];
        fx.confetti(p.x, p.y, 60);
        S.resetKind = 'next'; S.phase = 'reset'; S.t = 0;
      } else {
        say(`+10 ⭐ (${S.prog}/${D.starsPer})`, '#a3e635');
      }
    } else {
      say('Oops! Wrong star — try again!', '#fca5a5'); audio.play('aww');
      S.prog = 0; S.resetKind = 'retry'; S.phase = 'reset'; S.t = 0;
    }
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.stars >= D.target;
    say(win ? 'STAR MASTER!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.stars >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.stars} STARS · GOAL ${D.target}`,
      stats: [`Stars: <b>${S.stars}</b>`, `Points: <b>${S.points}</b>`, `Constellations: <b>${D.constellations}</b>`],
      match: { game: 'astrology', difficulty: options.difficulty, won: win, stars: S.stars, points: S.points },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt; S.swayT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'astro') { S.labelKey = 'astro'; input.setLabels('SHOW', 'SHOW'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.5) { newConstellation(); S.phase = 'show'; S.t = 0; } return; }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'show') {
      if (S.t > D.starsPer * 0.6 + 0.5) { S.phase = 'aim'; S.t = 0; }
    } else if (S.phase === 'aim') {
      if (input.a.pressed || input.b.pressed) show();
    } else if (S.phase === 'reset') {
      if (S.t > 1.3) {
        if (S.resetKind === 'retry') { S.phase = 'show'; S.t = 0; }
        else {
          S.con++;
          if (S.con >= D.constellations) endGame();
          else { newConstellation(); S.phase = 'show'; S.t = 0; }
        }
      }
    }
  }

  function draw(ctx, view) {
    hits = [];
    drawSky(ctx, view, S.swayT);
    // lines between the stars already tapped right, in order
    if (S.prog > 1) {
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(STAR_POS[S.seq[0]].x, STAR_POS[S.seq[0]].y);
      for (let i = 1; i < S.prog; i++) ctx.lineTo(STAR_POS[S.seq[i]].x, STAR_POS[S.seq[i]].y);
      ctx.stroke();
    }
    // the 12 stars
    const litIdx = S.phase === 'show' ? Math.floor(S.t / 0.6) : -1;
    STAR_POS.forEach((p, i) => {
      const inSeq = S.seq.indexOf(i);
      const isLit = litIdx >= 0 && litIdx < S.seq.length && S.seq[litIdx] === i;
      const isDone = S.prog > 0 && inSeq >= 0 && inSeq < S.prog;
      const tw = 0.75 + 0.25 * Math.sin(S.swayT * 2 + i);
      ctx.globalAlpha = tw;
      ctx.font = isLit ? '64px serif' : '44px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⭐', p.x, p.y);
      ctx.globalAlpha = 1;
      if (isLit) {
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, 42 + Math.sin(S.t * 10) * 4, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#facc15'; ctx.font = '900 22px Nunito';
        ctx.fillText(String(litIdx + 1), p.x, p.y - 52);
      }
      if (isDone) {
        ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#4ade80'; ctx.font = '900 20px Nunito';
        ctx.fillText('✓', p.x, p.y - 46);
      }
      if (S.phase === 'aim') hit(p.x - 45, p.y - 45, 90, 90, () => tapStar(i));
    });
    // SHOW button (replays the light-up sequence)
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready ? '#7c3aed' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "40px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SHOW!', 1110, 322);
    hit(990, 260, 240, 120, () => show());
    // HUD (top right, above the button)
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 990, 60, 240, 180, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Stars ${Math.min(S.con + 1, D.constellations)} of ${D.constellations}`, 1012, 92);
    ctx.fillText(`Stars: ${S.stars}  (goal ${D.target})`, 1012, 122);
    ctx.fillText(`Points: ${S.points}`, 1012, 152);
    ctx.fillText(S.phase === 'show' ? 'Watch the stars!' : S.phase === 'aim' ? 'Tap them in order!' : '', 1012, 182);
    fx.draw(ctx);
    if (S.phase === 'show' && S.con === 0 && S.t < 3) {
      ctx.font = '800 17px Nunito'; const text = 'Watch the stars light up in order!';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 480, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 480, S.t, { size: 100, sub: `${S.stars} stars`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'DRAW THE STARS!', 640, 480, S.t, { size: 96, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__astrology = { S, show, tapStar };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  drawSky(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t);
  const pts = [STAR_POS[0], STAR_POS[1], STAR_POS[2], STAR_POS[5]];
  ctx.strokeStyle = '#facc15'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.font = '52px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of pts) ctx.fillText('⭐', p.x, p.y);
  ctx.restore();
}

export default {
  id: 'astrology',
  title: 'Astrology',
  tagline: 'Watch the stars light up, then tap them in order',
  desc: 'Stars are scattered in the night sky. One constellation at a time, 4 stars light up in order — tap them in that same order to draw the constellation. Each correct star scores +10; a wrong star restarts that constellation. 5 constellations per match.',
  music: 'menu',
  labels: { a: 'SHOW', b: 'SHOW' },
  options: [],
  howto: `<ul>
    <li><b>Watch</b>: 4 stars light up one by one, in order. Remember the order!</li>
    <li><b>Tap the stars</b> in that same order. Each right star scores <b>+10</b> and draws a line.</li>
    <li>A wrong star restarts that constellation. Tap <b>SHOW!</b> (or press <kbd>Space</kbd>) to watch the order again.</li>
    <li>5 constellations per match. Collect enough stars to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
