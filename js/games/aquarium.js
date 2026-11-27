// ROBLOC Aquarium: fish swim back and forth in the tank! Aim the food
// drop, tap FEED! and drop food — a fish eats it if it lands close.
// 10 feeds per match, +10 points per fish fed.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 5, feeds: 10 },
  pro: { target: 6, feeds: 10 },
  legend: { target: 7, feeds: 10 },
  boost: { target: 4, feeds: 10 },   // Trevor: easy game, low goal
  tough: { target: 8, feeds: 10 },   // others: hard game, high goal
};
const TANK = { x: 140, y: 110, w: 860, h: 500 };
const FISH = [
  { emoji: '🐠', y: 200, baseX: 400, range: 220, speed: 0.9, phase: 0, size: 54 },
  { emoji: '🐟', y: 300, baseX: 640, range: 260, speed: 0.7, phase: 1.5, size: 50 },
  { emoji: '🐡', y: 400, baseX: 500, range: 200, speed: 1.1, phase: 3, size: 56 },
  { emoji: '🐠', y: 500, baseX: 700, range: 240, speed: 0.8, phase: 4.5, size: 52 },
  { emoji: '🐟', y: 250, baseX: 820, range: 150, speed: 1.3, phase: 2.2, size: 46 },
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function drawTank(ctx, view, t) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#0c4a6e'); bg.addColorStop(1, '#075985');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  ctx.fillStyle = '#f8fafc'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🐠 AQUARIUM 🐠', 640, 70);
  // tank glass + water
  const wg = ctx.createLinearGradient(0, TANK.y, 0, TANK.y + TANK.h);
  wg.addColorStop(0, '#38bdf8'); wg.addColorStop(1, '#0369a1');
  ctx.fillStyle = wg; rrect(ctx, TANK.x, TANK.y, TANK.w, TANK.h, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 6;
  rrect(ctx, TANK.x, TANK.y, TANK.w, TANK.h, 18); ctx.stroke();
  // sand + plants + rocks
  ctx.fillStyle = '#fde68a'; ctx.fillRect(TANK.x + 4, TANK.y + TANK.h - 34, TANK.w - 8, 30);
  ctx.font = '52px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🪨', TANK.x + 70, TANK.y + TANK.h - 40);
  ctx.fillText('🌿', TANK.x + 150, TANK.y + TANK.h - 55);
  ctx.fillText('🌿', TANK.x + TANK.w - 150, TANK.y + TANK.h - 55);
  ctx.fillText('🪸', TANK.x + TANK.w - 70, TANK.y + TANK.h - 45);
  // bubbles rising
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (let i = 0; i < 6; i++) {
    const bx = TANK.x + 80 + i * 140;
    const by = TANK.y + TANK.h - 60 - ((t * 40 + i * 70) % (TANK.h - 80));
    ctx.beginPath(); ctx.arc(bx, by, 5 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
}
function fishX(f, swayT) {
  return clamp(f.baseX + Math.sin(swayT * f.speed + f.phase) * f.range, TANK.x + 40, TANK.x + TANK.w - 40);
}
function fishDir(f, swayT) {
  return Math.cos(swayT * f.speed + f.phase) >= 0 ? 1 : -1;
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = the food falls slower, Power = bigger eat radius.
  const FALL = options.power === 'speed' ? 130 : 210;
  const EAT_R = options.power === 'power' ? 85 : 55;
  const S = { phase: 'intro', t: 0, swayT: 0, aimX: 640, aimY: 300, feed: 0, fed: 0, points: 0, food: null, eatT: 0, eatFish: null, msg: null, msgT: 0, msgColor: '#fff', reported: false };
  let hits = [];

  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function feed() {
    if (S.phase !== 'aim') return;
    S.phase = 'shoot'; S.t = 0;
    S.food = { x: S.aimX, y: S.aimY };
    audio.play('whoosh');
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.fed >= D.target;
    say(win ? 'FISH FEEDER!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.fed >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.fed} FISH FED · GOAL ${D.target}`,
      stats: [`Fed: <b>${S.fed}</b>`, `Points: <b>${S.points}</b>`, `Feeds: <b>${D.feeds}</b>`],
      match: { game: 'aquarium', difficulty: options.difficulty, won: win, fed: S.fed, points: S.points },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt; S.swayT += dt; S.eatT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'aq') { S.labelKey = 'aq'; input.setLabels('FEED!', 'FEED!'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.5) { S.phase = 'aim'; S.t = 0; } return; }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'aim') {
      if (input.mx) S.aimX = clamp(S.aimX + input.mx * 300 * dt, TANK.x + 20, TANK.x + TANK.w - 20);
      if (input.my) S.aimY = clamp(S.aimY + input.my * 300 * dt, TANK.y + 20, TANK.y + TANK.h - 20);
      if (input.a.pressed || input.b.pressed || S.t > 20) feed();
    } else if (S.phase === 'shoot') {
      if (S.food) {
        S.food.y += FALL * dt;
        // did a fish eat it?
        for (const f of FISH) {
          const fxPos = fishX(f, S.swayT);
          if (Math.abs(S.food.y - f.y) < 28 && Math.abs(S.food.x - fxPos) < EAT_R) {
            S.fed++; S.points += 10; S.eatFish = f; S.eatT = 0; S.food = null;
            say('YUM! +10', '#a3e635'); audio.play('point'); fx.confetti(fxPos, f.y, 40);
            S.phase = 'reset'; S.t = 0;
            return;
          }
        }
        // food hit the sand — missed
        if (S.food.y >= TANK.y + TANK.h - 30) {
          S.food = null;
          say('Miss! The food sank.', '#fca5a5'); audio.play('aww');
          S.phase = 'reset'; S.t = 0;
        }
      }
    } else if (S.phase === 'reset') {
      if (S.t > 0.9) {
        S.feed++;
        if (S.feed >= D.feeds) endGame();
        else { S.phase = 'aim'; S.t = 0; }
      }
    }
  }

  function draw(ctx, view) {
    hits = [];
    drawTank(ctx, view, S.swayT);
    // fish (they swim with the swayT clock — it never resets)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of FISH) {
      const x = fishX(f, S.swayT);
      const dir = fishDir(f, S.swayT);
      ctx.save(); ctx.translate(x, f.y);
      if (dir < 0) ctx.scale(-1, 1);
      ctx.font = `${f.size}px serif`;
      ctx.fillText(f.emoji, 0, 0);
      ctx.restore();
      if (S.eatFish === f && S.eatT < 0.8) {
        ctx.font = '28px serif'; ctx.fillText('💖', x, f.y - 40);
      }
    }
    // falling food
    if (S.food) {
      ctx.fillStyle = '#92400e';
      ctx.beginPath(); ctx.arc(S.food.x, S.food.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d97706';
      ctx.beginPath(); ctx.arc(S.food.x - 2, S.food.y - 2, 4, 0, Math.PI * 2); ctx.fill();
    }
    // crosshair (aim phase)
    if (S.phase === 'aim') {
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(S.aimX, S.aimY, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(S.aimX - 26, S.aimY); ctx.lineTo(S.aimX - 10, S.aimY); ctx.moveTo(S.aimX + 10, S.aimY); ctx.lineTo(S.aimX + 26, S.aimY); ctx.moveTo(S.aimX, S.aimY - 26); ctx.lineTo(S.aimX, S.aimY - 10); ctx.moveTo(S.aimX, S.aimY + 10); ctx.lineTo(S.aimX, S.aimY + 26); ctx.stroke();
      hit(TANK.x, TANK.y, TANK.w, TANK.h, t => { S.aimX = clamp(t.x, TANK.x + 20, TANK.x + TANK.w - 20); S.aimY = clamp(t.y, TANK.y + 20, TANK.y + TANK.h - 20); audio.play('tick'); });
    }
    // FEED! button
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready ? '#16a34a' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "40px 'Lilita One'"; ctx.fillText('FEED!', 1110, 322);
    hit(990, 260, 240, 120, () => feed());
    if (ready) {
      const k = clamp(1 - S.t / 20, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 990, 392, 240, 10, 5); ctx.fill();
      ctx.fillStyle = k > 0.3 ? '#4ade80' : '#f87171'; rrect(ctx, 990, 392, 240 * k, 10, 5); ctx.fill();
    }
    // HUD
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 40, 60, 260, 150, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Feed ${Math.min(S.feed + 1, D.feeds)} of ${D.feeds}`, 62, 92);
    ctx.fillText(`Fed: ${S.fed}  (goal ${D.target})`, 62, 122);
    ctx.fillText(`Points: ${S.points}`, 62, 152);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.feed === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = input.touchMode ? 'Tap to aim · tap FEED! to drop food' : 'Use ← → ↑ ↓ to aim · SPACE to feed';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 480, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 480, S.t, { size: 100, sub: `${S.fed} fish fed`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'FEED THE FISH!', 640, 480, S.t, { size: 96, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__aquarium = { S, feed };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  drawTank(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of FISH) {
    const x = fishX(f, t);
    const dir = fishDir(f, t);
    ctx.save(); ctx.translate(x, f.y);
    if (dir < 0) ctx.scale(-1, 1);
    ctx.font = `${f.size}px serif`;
    ctx.fillText(f.emoji, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

export default {
  id: 'aquarium',
  title: 'Aquarium',
  tagline: 'Aim the food drop and feed the fish',
  desc: 'Fish swim back and forth in the tank! Move the crosshair, tap FEED! and drop food — if it lands close to a fish, the fish eats it (+10 points). 10 feeds per match.',
  music: 'menu',
  labels: { a: 'FEED!', b: 'FEED!' },
  options: [],
  howto: `<ul>
    <li><b>Aim</b>: move the crosshair with ← → ↑ ↓ / the joystick, or tap in the tank.</li>
    <li><b>FEED!</b> (tap it or press <kbd>Space</kbd>): drop food where the crosshair is.</li>
    <li>The food sinks — if it lands close to a fish, the fish eats it (+10). Watch where the fish are swimming!</li>
    <li>10 feeds per match. Feed enough fish to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
