// ROBLOC Archaeologist: dig in the sand and find ancient treasures!
// Tap a sand patch to pick it, then tap DIG! Artifacts score +20,
// rocks score 0. 10 digs per match.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 3, digs: 10 },
  pro: { target: 4, digs: 10 },
  legend: { target: 5, digs: 10 },
  boost: { target: 2, digs: 10 },   // Trevor: easy game, few artifacts needed
  tough: { target: 6, digs: 10 },   // others: hard game, almost every artifact
};
const ARTIFACTS = ['🏺', '🪙', '🦴'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function drawSite(ctx, view, t) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#fde68a'); bg.addColorStop(0.55, '#fbbf24'); bg.addColorStop(1, '#d97706');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  // sun
  ctx.fillStyle = '#fff7cc'; ctx.beginPath(); ctx.arc(150, 90, 42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(150, 90, 32, 0, Math.PI * 2); ctx.fill();
  // waving flag (sways with the never-resetting sway clock)
  const wave = Math.sin(t * 2) * 6;
  ctx.strokeStyle = '#78350f'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(1180, 90); ctx.lineTo(1180, 170); ctx.stroke();
  ctx.fillStyle = '#dc2626';
  ctx.beginPath(); ctx.moveTo(1180, 90); ctx.lineTo(1180 + 44 + wave, 100); ctx.lineTo(1180, 112); ctx.closePath(); ctx.fill();
  // dunes
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath(); ctx.ellipse(300, 700, 420, 60, 0, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.ellipse(950, 710, 480, 70, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#92400e'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🏺 ARCHAEOLOGIST 🏺', 640, 70);
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Build the dig site: 12 patches, 7 hide artifacts, 3 hide rocks,
  // 2 are just sand. Shuffled fresh every match.
  const kinds = ['artifact', 'artifact', 'artifact', 'artifact', 'artifact', 'artifact', 'artifact', 'rock', 'rock', 'rock', 'empty', 'empty'];
  for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  const patches = kinds.map((kind, i) => {
    const c = i % 4, r = Math.floor(i / 4);
    return {
      x: 140 + c * 190, y: 170 + r * 140, w: 170, h: 120,
      cx: 140 + c * 190 + 85, cy: 170 + r * 140 + 60,
      kind, icon: kind === 'artifact' ? ARTIFACTS[i % ARTIFACTS.length] : kind === 'rock' ? '🪨' : null,
      dug: false,
    };
  });
  const S = { phase: 'intro', t: 0, swayT: 0, dig: 0, artifacts: 0, points: 0, sel: -1, dugPatch: -1, msg: null, msgT: 0, msgColor: '#fff', reported: false };
  let hits = [];

  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function dig() {
    if (S.phase !== 'aim') return;
    if (S.sel < 0) { say('Tap a sand patch first!'); return; }
    if (patches[S.sel].dug) { say('Already dug there!'); return; }
    S.phase = 'dig'; S.t = 0; S.dugPatch = S.sel; audio.play('whoosh');
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.artifacts >= D.target;
    say(win ? 'TREASURE HUNTER!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.artifacts >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.artifacts} ARTIFACTS · GOAL ${D.target}`,
      stats: [`Artifacts: <b>${S.artifacts}</b>`, `Points: <b>${S.points}</b>`, `Digs: <b>${D.digs}</b>`],
      match: { game: 'archaeologist', difficulty: options.difficulty, won: win, artifacts: S.artifacts, points: S.points },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt; S.swayT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'arch') { S.labelKey = 'arch'; input.setLabels('DIG', 'DIG'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.5) { S.phase = 'aim'; S.t = 0; } return; }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'aim') {
      if (input.a.pressed || input.b.pressed) dig();
    } else if (S.phase === 'dig') {
      if (S.t > 0.6) {
        const p = patches[S.dugPatch];
        p.dug = true;
        if (p.kind === 'artifact') { S.artifacts++; S.points += 20; say(`${p.icon} TREASURE! +20`, '#facc15'); audio.play('badge'); fx.confetti(p.cx, p.cy, 40); }
        else if (p.kind === 'rock') { say('Just a rock! 🪨', '#fca5a5'); audio.play('aww'); }
        else { say('Just sand...', '#cbd5e1'); audio.play('tick'); }
        S.phase = 'reset'; S.t = 0;
      }
    } else if (S.phase === 'reset') {
      if (S.t > 1.1) {
        S.dig++;
        S.sel = -1;
        if (S.dig >= D.digs) endGame();
        else { S.phase = 'aim'; S.t = 0; }
      }
    }
  }

  function draw(ctx, view) {
    hits = [];
    drawSite(ctx, view, S.swayT);
    // sand patches
    patches.forEach((p, i) => {
      ctx.fillStyle = p.dug ? '#b45309' : '#eab308';
      rrect(ctx, p.x, p.y, p.w, p.h, 20); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; rrect(ctx, p.x, p.y, p.w, 26, 20); ctx.fill();
      if (p.dug) {
        if (p.icon) { ctx.font = '52px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.icon, p.cx, p.cy); }
        else { ctx.fillStyle = '#451a03'; ctx.beginPath(); ctx.ellipse(p.cx, p.cy, 46, 24, 0, 0, Math.PI * 2); ctx.fill(); }
      } else {
        ctx.fillStyle = 'rgba(120,53,15,.5)';
        ctx.beginPath(); ctx.arc(p.cx - 40, p.cy - 20, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(p.cx + 30, p.cy + 10, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(p.cx + 45, p.cy - 30, 4, 0, Math.PI * 2); ctx.fill();
      }
      if (S.sel === i && !p.dug && S.phase === 'aim') {
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 5;
        rrect(ctx, p.x - 4, p.y - 4, p.w + 8, p.h + 8, 24); ctx.stroke();
      }
      if (S.phase === 'aim' && !p.dug) hit(p.x, p.y, p.w, p.h, () => { S.sel = i; audio.play('tick'); });
    });
    // shovel while digging
    if (S.phase === 'dig') {
      const p = patches[S.dugPatch];
      const f = Math.min(1, S.t / 0.6);
      ctx.font = '64px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⛏️', p.cx, p.cy - 50 + f * 55);
    }
    // DIG button
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready ? '#16a34a' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "40px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DIG!', 1110, 322);
    hit(990, 260, 240, 120, () => dig());
    // HUD (top right, above the button)
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 990, 60, 240, 180, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Dig ${Math.min(S.dig + 1, D.digs)} of ${D.digs}`, 1012, 92);
    ctx.fillText(`Artifacts: ${S.artifacts}  (goal ${D.target})`, 1012, 122);
    ctx.fillText(`Points: ${S.points}`, 1012, 152);
    ctx.fillText(S.sel >= 0 ? 'Patch picked — DIG!' : 'Tap a patch!', 1012, 182);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.dig === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = 'Tap a sand patch, then tap DIG!';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 480, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 480, S.t, { size: 100, sub: `${S.artifacts} artifacts`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'DIG FOR TREASURE!', 640, 480, S.t, { size: 96, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__archaeologist = { S, dig };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  drawSite(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t);
  const spots = [[200, 300, false], [450, 300, true], [700, 300, false], [320, 450, false], [580, 450, false]];
  for (const [x, y, dug] of spots) {
    ctx.fillStyle = dug ? '#b45309' : '#eab308';
    rrect(ctx, x, y, 170, 120, 20); ctx.fill();
    if (dug) { ctx.font = '52px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🏺', x + 85, y + 60); }
  }
  ctx.restore();
}

export default {
  id: 'archaeologist',
  title: 'Archaeologist',
  tagline: 'Dig in the sand and find ancient treasures',
  desc: 'A sandy dig site with 12 patches of sand. Artifacts are hidden under some patches, rocks under others. Tap a patch, then tap DIG! — an artifact scores +20, a rock scores 0. 10 digs per match.',
  music: 'menu',
  labels: { a: 'DIG', b: 'DIG' },
  options: [],
  howto: `<ul>
    <li><b>Tap a sand patch</b> to pick it — it lights up gold.</li>
    <li><b>DIG!</b> (tap it or press <kbd>Space</kbd>): the shovel digs it up.</li>
    <li>An artifact (🏺 🪙 🦴) scores <b>+20</b>. A rock (🪨) scores 0. Just sand scores 0 too.</li>
    <li>10 digs per match. Find enough artifacts to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
