// ROBLOC Alien: abduct the cow with your UFO beam!
// Aim with the joystick / arrows or tap, then tap BEAM!
// Land the beam on the cow to abduct it! 8 beams per match.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 300, beams: 8, aimTime: 20 },
  pro: { target: 350, beams: 8, aimTime: 15 },
  legend: { target: 400, beams: 8, aimTime: 12 },
  boost: { target: 250, beams: 8, aimTime: 25 },   // win-chance matches
  tough: { target: 450, beams: 8, aimTime: 10 },  // others: hard game, so they win about 25%
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const COW_Y = 560;

function drawScene(ctx, view, t, ux, cx) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#0f172a'); bg.addColorStop(0.55, '#312e81'); bg.addColorStop(0.56, '#14532d'); bg.addColorStop(1, '#166534');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  // stars
  ctx.fillStyle = '#f8fafc';
  const stars = [[80, 90], [220, 60], [360, 120], [520, 70], [700, 100], [860, 60], [1020, 110], [1180, 80], [300, 180], [900, 170], [640, 50]];
  for (const [sx, sy] of stars) { ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill(); }
  // moon
  ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(1120, 90, 36, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(1108, 82, 8, 0, Math.PI * 2); ctx.arc(1132, 100, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f8fafc'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('👽 ALIEN 👽', 640, 70);
  // the UFO
  ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.ellipse(ux, 140, 90, 26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.ellipse(ux, 132, 90, 18, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = 'rgba(165,243,252,.9)'; ctx.beginPath(); ctx.arc(ux, 122, 34, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.arc(ux, 122, 14, 0, Math.PI * 2); ctx.fill();
  const lights = ['#f87171', '#facc15', '#4ade80'];
  lights.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(ux - 56 + i * 56, 148, 8, 0, Math.PI * 2); ctx.fill(); });
  // the cow on the ground
  ctx.font = '90px Nunito'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🐄', cx, COW_Y);
  // landing ring under the cow
  ctx.strokeStyle = 'rgba(250,204,21,.7)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cx, COW_Y + 46, 60, 12, 0, 0, Math.PI * 2); ctx.stroke();
}
function drawBeam(ctx, ux, ax, f) {
  const g = ctx.createLinearGradient(0, 160, 0, 620);
  g.addColorStop(0, `rgba(163,230,53,${0.75 * f})`);
  g.addColorStop(1, `rgba(163,230,53,${0.35 * f})`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(ux - 20, 160); ctx.lineTo(ux + 20, 160); ctx.lineTo(ax + 55, 620); ctx.lineTo(ax - 55, 620); ctx.closePath(); ctx.fill();
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = the UFO sways slower, Power = a wider
  // 100-point zone around the cow.
  const SWAY = options.power === 'speed' ? 0.55 : 1;
  const BULL = options.power === 'power' ? 90 : 60;
  const S = { phase: 'intro', t: 0, swayT: 0, beam: 0, points: 0, abductions: 0, cowX: 640, abducted: false, aimX: 640, aimY: 300, flyT: 0, msg: null, msgT: 0, reported: false };
  let hits = [];

  const ufoX = () => 640 + Math.sin(S.swayT * 0.7 * SWAY) * 280;
  const newCow = () => { S.cowX = 320 + Math.random() * 640; S.abducted = false; };
  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function beam() {
    if (S.phase !== 'aim') return;
    S.phase = 'shoot'; S.t = 0; S.flyT = 0; audio.play('whoosh');
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.points >= D.target;
    say(win ? 'UFO MASTER!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.points >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.points} POINTS · GOAL ${D.target}`,
      stats: [`Points: <b>${S.points}</b>`, `Abductions: <b>${S.abductions}</b>`, `Beams: <b>${D.beams}</b>`],
      match: { game: 'alien', difficulty: options.difficulty, won: win, points: S.points, abductions: S.abductions, beams: D.beams },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt; S.swayT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'alien') { S.labelKey = 'alien'; input.setLabels('BEAM', 'BEAM'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.5) { S.phase = 'aim'; S.t = 0; } return; }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'aim') {
      if (input.mx) S.aimX = clamp(S.aimX + input.mx * 300 * dt, 200, 1080);
      if (input.my) S.aimY = clamp(S.aimY + input.my * 300 * dt, 120, 620);
      if (input.a.pressed || input.b.pressed || S.t > D.aimTime) beam();
    } else if (S.phase === 'shoot') {
      S.flyT += dt / 0.5;
      const f = Math.min(1, S.flyT);
      if (f >= 1) {
        const dist = Math.abs(S.aimX - S.cowX);
        const pts = clamp(100 - Math.round(Math.max(0, dist - BULL) / 2), 0, 100);
        S.points += pts;
        if (pts >= 70) {
          S.abductions++; S.abducted = true;
          say(`ABDUCTED! 👽 +${pts}`, '#a3e635'); audio.play('badge'); audio.cheer(1.2); fx.confetti(S.cowX, COW_Y, 60);
        } else if (pts > 0) { say(`+${pts} POINTS!`, '#a3e635'); audio.play('point'); }
        else { say('MISS! The cow got away!', '#fca5a5'); audio.play('aww'); }
        S.phase = 'reset'; S.t = 0;
      }
    } else if (S.phase === 'reset') {
      if (S.t > 1.1) {
        S.beam++;
        if (S.beam >= D.beams) endGame();
        else { newCow(); S.aimX = 640; S.aimY = 300; S.phase = 'aim'; S.t = 0; }
      }
    }
  }

  function draw(ctx, view) {
    hits = [];
    // during the abduction the cow floats up into the UFO
    const cowY = S.phase === 'reset' && S.abducted ? COW_Y - S.t * 260 : COW_Y;
    const cowX = S.phase === 'reset' && S.abducted ? S.aimX : S.cowX;
    // draw the scene, but with the cow at its (possibly floating) spot
    const x0 = -view.ox, y0 = -view.oy;
    const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
    bg.addColorStop(0, '#0f172a'); bg.addColorStop(0.55, '#312e81'); bg.addColorStop(0.56, '#14532d'); bg.addColorStop(1, '#166534');
    ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
    ctx.fillStyle = '#f8fafc';
    const stars = [[80, 90], [220, 60], [360, 120], [520, 70], [700, 100], [860, 60], [1020, 110], [1180, 80], [300, 180], [900, 170], [640, 50]];
    for (const [sx, sy] of stars) { ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(1120, 90, 36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(1108, 82, 8, 0, Math.PI * 2); ctx.arc(1132, 100, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f8fafc'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('👽 ALIEN 👽', 640, 70);
    const ux = ufoX();
    ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.ellipse(ux, 140, 90, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.ellipse(ux, 132, 90, 18, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = 'rgba(165,243,252,.9)'; ctx.beginPath(); ctx.arc(ux, 122, 34, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.arc(ux, 122, 14, 0, Math.PI * 2); ctx.fill();
    const lights = ['#f87171', '#facc15', '#4ade80'];
    lights.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(ux - 56 + i * 56, 148, 8, 0, Math.PI * 2); ctx.fill(); });
    ctx.font = '90px Nunito'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🐄', cowX, cowY);
    ctx.strokeStyle = 'rgba(250,204,21,.7)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(S.cowX, COW_Y + 46, 60, 12, 0, 0, Math.PI * 2); ctx.stroke();
    if (S.phase === 'aim') {
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(S.aimX, S.aimY, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(S.aimX - 26, S.aimY); ctx.lineTo(S.aimX - 10, S.aimY); ctx.moveTo(S.aimX + 10, S.aimY); ctx.lineTo(S.aimX + 26, S.aimY); ctx.moveTo(S.aimX, S.aimY - 26); ctx.lineTo(S.aimX, S.aimY - 10); ctx.moveTo(S.aimX, S.aimY + 10); ctx.lineTo(S.aimX, S.aimY + 26); ctx.stroke();
      hit(140, 100, 1000, 560, t => { S.aimX = clamp(t.x, 200, 1080); S.aimY = clamp(t.y, 120, 620); audio.play('tick'); });
    }
    if (S.phase === 'shoot' || (S.phase === 'reset' && S.abducted)) {
      drawBeam(ctx, ux, S.aimX, S.phase === 'shoot' ? Math.min(1, S.flyT) : 1);
    }
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready ? '#16a34a' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "40px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BEAM!', 1110, 322);
    hit(990, 260, 240, 120, () => beam());
    if (ready) {
      const k = clamp(1 - S.t / D.aimTime, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 990, 392, 240, 10, 5); ctx.fill();
      ctx.fillStyle = k > 0.3 ? '#4ade80' : '#f87171'; rrect(ctx, 990, 392, 240 * k, 10, 5); ctx.fill();
    }
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 40, 60, 260, 150, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Beam ${Math.min(S.beam + 1, D.beams)} of ${D.beams}`, 62, 92);
    ctx.fillText(`Points: ${S.points}  (goal ${D.target})`, 62, 122);
    ctx.fillText(`Abductions: ${S.abductions}`, 62, 152);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.beam === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = input.touchMode ? 'Tap to aim · tap BEAM!' : 'Use ← → ↑ ↓ to aim · SPACE to beam';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 480, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 480, S.t, { size: 100, sub: `${S.points} points`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'ABDUCT THE COW!', 640, 480, S.t, { size: 96, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__alien = { S, beam };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  drawScene(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t, 640 + Math.sin(t * 0.7) * 280, 640);
  ctx.restore();
}

export default {
  id: 'alien',
  title: 'Alien',
  tagline: 'Abduct the cow with your UFO beam',
  desc: 'A UFO sways across the night sky and a cow stands in the field below. Aim the beam, tap BEAM, and abduct the cow — land the beam close to the cow for 100 points! 8 beams per match.',
  music: 'menu',
  labels: { a: 'BEAM', b: 'BEAM' },
  options: [],
  howto: `<ul>
    <li><b>Aim</b>: move the crosshair with ← → ↑ ↓ / the joystick, or tap where you want the beam to land. The cow moves to a new spot every beam!</li>
    <li><b>BEAM!</b> (tap it or press <kbd>Space</kbd>): the UFO fires its beam at your aim point.</li>
    <li>Land the beam on the cow for 100 points — close enough and the cow floats up into the UFO! 8 beams per match.</li>
    <li>Score enough points to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
