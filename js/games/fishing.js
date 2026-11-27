// ROBLOC Fishing: cast your line and catch the biggest fish!
// Move the hook with the joystick / arrows or tap the water, then tap
// CAST! The hook drops — if it touches a fish, you catch it! The fish
// swim, so time your cast. 10 casts per match.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 12, casts: 10, aimTime: 20 },
  pro: { target: 15, casts: 10, aimTime: 15 },
  legend: { target: 18, casts: 10, aimTime: 12 },
  boost: { target: 9, casts: 10, aimTime: 25 },   // win-chance matches
  tough: { target: 22, casts: 10, aimTime: 10 },  // others: hard game, so they win about 25%
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
// fish sizes: [points, emoji, scale]
const SIZES = [[1, '🐟', 1], [2, '🐠', 1.3], [3, '🐡', 1.7]];

function makeFish(i) {
  const [pts, icon, sc] = SIZES[Math.floor(Math.random() * SIZES.length)];
  return { x: rand(200, 1080), y: 300 + i * 110, dir: Math.random() < 0.5 ? 1 : -1, speed: rand(50, 110), pts, icon, sc, caught: false, respawnT: 0 };
}

function drawPond(ctx, view, t) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#7dd3fc'); bg.addColorStop(0.35, '#38bdf8'); bg.addColorStop(1, '#0369a1');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  // sun + clouds
  ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(150, 110, 44, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (const cx of [400, 800, 1050]) {
    ctx.beginPath(); ctx.ellipse(cx + (t * 8 % 60), 90, 60, 20, 0, 0, Math.PI * 2); ctx.fill();
  }
  // water
  const wg = ctx.createLinearGradient(0, 180, 0, 720);
  wg.addColorStop(0, '#0ea5e9'); wg.addColorStop(1, '#075985');
  ctx.fillStyle = wg; ctx.fillRect(140, 180, 1000, 500);
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const y = 240 + i * 100;
    ctx.beginPath();
    for (let x = 160; x <= 1120; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.02 + t * 2 + i) * 6);
    ctx.stroke();
  }
  // dock
  ctx.fillStyle = '#78350f'; ctx.fillRect(140, 640, 1000, 40);
  ctx.fillStyle = '#92400e'; ctx.fillRect(140, 640, 1000, 10);
  ctx.fillStyle = '#f8fafc'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🎣 FISHING 🎣', 640, 70);
}
function drawFish(ctx, f, t) {
  ctx.save(); ctx.translate(f.x, f.y + Math.sin(t * 3 + f.x) * 4);
  ctx.scale(f.dir * f.sc, f.sc);
  ctx.font = '44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(f.icon, 0, 0);
  ctx.restore();
  ctx.fillStyle = '#fde68a'; ctx.font = '900 14px Nunito'; ctx.textAlign = 'center';
  ctx.fillText('★'.repeat(f.pts), f.x, f.y - 34);
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = fish swim slower, Power = bigger hook.
  const SPD = options.power === 'speed' ? 0.55 : 1;
  const HOOK_R = options.power === 'power' ? 62 : 42;
  const fishes = [makeFish(0), makeFish(1), makeFish(2), makeFish(3)];
  const S = { phase: 'intro', t: 0, swayT: 0, cast: 0, points: 0, fish: 0, biggest: 0, hookX: 640, hookY: 150, msg: null, msgT: 0, reported: false };
  let hits = [];

  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function cast() {
    if (S.phase !== 'aim') return;
    S.phase = 'drop'; S.t = 0; S.hookY = 150; audio.play('whoosh');
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.points >= D.target;
    say(win ? 'MASTER ANGLER!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.points >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.points} POINTS · GOAL ${D.target}`,
      stats: [`Fish caught: <b>${S.fish}</b>`, `Biggest fish: <b>${'★'.repeat(S.biggest) || 'none'}</b>`, `Casts: <b>${D.casts}</b>`],
      match: { game: 'fishing', difficulty: options.difficulty, won: win, fish: S.fish, points: S.points, biggest: S.biggest, casts: D.casts },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt; S.swayT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'fish') { S.labelKey = 'fish'; input.setLabels('CAST', 'CAST'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    // fish always swim (and respawn after being caught)
    for (const f of fishes) {
      if (f.caught) {
        f.respawnT -= dt;
        if (f.respawnT <= 0) { const nf = makeFish(fishes.indexOf(f)); Object.assign(f, nf); }
        continue;
      }
      f.x += f.dir * f.speed * SPD * dt;
      if (f.x > 1120) { f.x = 1120; f.dir = -1; }
      if (f.x < 160) { f.x = 160; f.dir = 1; }
    }
    if (S.phase === 'intro') { if (S.t > 1.5) { S.phase = 'aim'; S.t = 0; } return; }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'aim') {
      if (input.mx) S.hookX = clamp(S.hookX + input.mx * 300 * dt, 180, 1100);
      if (input.a.pressed || input.b.pressed || S.t > D.aimTime) cast();
    } else if (S.phase === 'drop') {
      S.hookY += 520 * dt;
      for (const f of fishes) {
        if (f.caught) continue;
        if (Math.abs(S.hookY - f.y) < 34 && Math.abs(S.hookX - f.x) < HOOK_R) {
          f.caught = true; f.respawnT = 2.5;
          S.fish++; S.points += f.pts; S.biggest = Math.max(S.biggest, f.pts);
          say(f.pts === 3 ? 'BIG CATCH! ★★★' : `CAUGHT! +${f.pts}`, '#a3e635');
          audio.play('point'); audio.cheer(0.8); fx.confetti(S.hookX, f.y, 40);
          S.phase = 'reset'; S.t = 0;
          return;
        }
      }
      if (S.hookY >= 660) { say('NO BITE...', '#fca5a5'); audio.play('aww'); S.phase = 'reset'; S.t = 0; }
    } else if (S.phase === 'reset') {
      if (S.t > 1.1) {
        S.cast++;
        if (S.cast >= D.casts) endGame();
        else { S.hookX = 640; S.hookY = 150; S.phase = 'aim'; S.t = 0; }
      }
    }
  }

  function draw(ctx, view) {
    hits = [];
    drawPond(ctx, view, S.t);
    for (const f of fishes) if (!f.caught) drawFish(ctx, f, S.t);
    // fishing line + hook
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(S.hookX, 150); ctx.lineTo(S.hookX, S.hookY); ctx.stroke();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(S.hookX, S.hookY + 8, 10, 0, Math.PI * 1.2); ctx.stroke();
    ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(S.hookX, S.hookY - 6, 6, 0, Math.PI * 2); ctx.fill();
    if (S.phase === 'aim') {
      hit(140, 180, 1000, 500, t => { S.hookX = clamp(t.x, 180, 1100); audio.play('tick'); });
    }
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready ? '#16a34a' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "40px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('CAST!', 1110, 322);
    hit(990, 260, 240, 120, () => cast());
    if (ready) {
      const k = clamp(1 - S.t / D.aimTime, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 990, 392, 240, 10, 5); ctx.fill();
      ctx.fillStyle = k > 0.3 ? '#4ade80' : '#f87171'; rrect(ctx, 990, 392, 240 * k, 10, 5); ctx.fill();
    }
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 40, 60, 260, 150, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Cast ${Math.min(S.cast + 1, D.casts)} of ${D.casts}`, 62, 92);
    ctx.fillText(`Points: ${S.points}  (goal ${D.target})`, 62, 122);
    ctx.fillText(`Fish: ${S.fish}`, 62, 152);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.cast === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = input.touchMode ? 'Tap the water to move the hook · tap CAST!' : 'Use ← → to move the hook · SPACE to cast';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 480, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 480, S.t, { size: 100, sub: `${S.points} points`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'GO FISHING!', 640, 480, S.t, { size: 96, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__fishing = { S, fishes, cast };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  drawPond(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t);
  const f = { x: 640 + Math.sin(t * 0.7) * 300, y: 420, dir: 1, pts: 3, icon: '🐡', sc: 1.7 };
  drawFish(ctx, f, t);
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(640, 150); ctx.lineTo(640, 300); ctx.stroke();
  ctx.restore();
}

export default {
  id: 'fishing',
  title: 'Fishing',
  tagline: 'Cast your line and catch the biggest fish',
  desc: 'A pond full of swimming fish. Move the hook, tap CAST, and catch fish as the hook drops — big fish are worth more stars! 10 casts per match.',
  music: 'menu',
  labels: { a: 'CAST', b: 'CAST' },
  options: [],
  howto: `<ul>
    <li><b>Aim</b>: move the hook left and right with ← → / the joystick, or tap the water.</li>
    <li><b>CAST!</b> (tap it or press <kbd>Space</kbd>): the hook drops into the water.</li>
    <li>If the hook touches a fish, you catch it! ★ = 1 point, ★★ = 2, ★★★ = 3. The fish keep swimming, so time your cast.</li>
    <li>10 casts per match. Score enough points to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
