// ROBLOC Dream Store: a dreamy night shop full of wonders. Walk around,
// tap a dream item to see it, and BUY it with your money (or coins at
// 1 coin = $1). Prices are real and 8% sales tax is added at checkout —
// the tax goes to Trevor, the boss. Everything you buy is saved to your
// account, just like the Mall.
import { drawHuman, rrect, shade } from '../art.js';
import { withTax, fmtCents } from './shops.js';
import { payPlan as planFor, moneyCentsOf, coinsOf, formatShort, formatBig } from '../economy.js';

// 12 dream items. Prices are in cents, before tax.
export const DREAM_ITEMS = [
  { id: 'dream_shooting_star', name: 'Shooting Star', icon: '🌠', cents: 800 },
  { id: 'dream_star_lamp', name: 'Star Lamp', icon: '⭐', cents: 1200 },
  { id: 'dream_magic_wand', name: 'Magic Wand', icon: '✨', cents: 1500 },
  { id: 'dream_moon_light', name: 'Moon Night Light', icon: '🌙', cents: 1850 },
  { id: 'dream_catcher', name: 'Dream Catcher', icon: '💤', cents: 1999 },
  { id: 'dream_sleepy_bear', name: 'Sleepy Bear', icon: '🧸', cents: 2200 },
  { id: 'dream_cloud_pillow', name: 'Cloud Pillow', icon: '☁️', cents: 2500 },
  { id: 'dream_rainbow_blanket', name: 'Rainbow Blanket', icon: '🌈', cents: 2800 },
  { id: 'dream_unicorn', name: 'Unicorn Plush', icon: '🦄', cents: 3200 },
  { id: 'dream_crystal_ball', name: 'Crystal Ball', icon: '🔮', cents: 4500 },
  { id: 'dream_carousel', name: 'Dream Carousel', icon: '🎠', cents: 5500 },
  { id: 'dream_bed', name: 'Dream Bed', icon: '🛏️', cents: 9900 },
];

const FLOOR = 540;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
// Two shelves of 6 items each.
const SHELF_X = [140, 330, 520, 710, 900, 1090];
const SHELF_Y = [215, 385];
const itemAt = i => ({ x: SHELF_X[i % 6], y: SHELF_Y[Math.floor(i / 6)], ...DREAM_ITEMS[i] });
// Twinkling stars in the night sky.
const STARS = Array.from({ length: 60 }, () => ({ x: rand(0, 1280), y: rand(0, 300), r: rand(1, 2.6), p: rand(0, 6.28) }));
const CLOUDS = [{ x: 200, y: 90, s: 1 }, { x: 700, y: 60, s: 1.3 }, { x: 1100, y: 110, s: 0.9 }];

function create(env) {
  const { input, audio, fx, profile, shop } = env;
  const S = { t: 0, px: 640, py: 620, tx: null, ty: null, padDir: null, phase: 0, moving: 0, flip: false, sel: -1, busy: false, receipt: null, receiptT: 0, error: null, errorT: 0, labelKey: '' };
  const hits = [];
  const prof = () => shop.profile() || profile;
  const balances = () => ({ moneyC: moneyCentsOf(prof()), coins: coinsOf(prof()) });
  const dreamOwned = () => Object.entries(prof().inventory || {}).filter(([k]) => k.startsWith('dream_')).reduce((a, [, b]) => a + b, 0);
  const avatar = prof().avatar || {};

  async function buy(item) {
    if (S.busy) return;
    const total = withTax(item.cents), plan = planFor(prof(), total);
    if (!plan) { S.error = 'Not enough money or coins for this.'; S.errorT = 0; audio.play('fault'); return; }
    S.busy = true;
    try {
      const res = await shop.buy(item, total, total - item.cents);
      S.receipt = { item, total, plan, deviceOnly: !!res?.deviceOnly }; S.receiptT = 0;
      audio.play('coin'); fx.confetti(640, 360, 40);
    } catch (e) {
      console.error(e);
      S.error = e.code === 'not-enough' ? 'Not enough money or coins for this.' : e.code === 'permission-denied' ? 'Firebase refused the purchase: publish the new firestore.rules in the Firebase console.' : 'Could not complete the purchase: ' + (e.code || e.message);
      S.errorT = 0; audio.play('fault');
    } finally { S.busy = false; }
  }

  function update(dt) {
    S.t += dt;
    if (S.receiptT < 10) S.receiptT += dt;
    if (S.errorT < 10) S.errorT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'dream') { S.labelKey = 'dream'; input.setLabels('▲ UP', '▼ DOWN'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    // A (up) buys the selected item; B (down) closes the buy bar.
    if (input.a.pressed && S.sel >= 0) buy(DREAM_ITEMS[S.sel]);
    if (input.b.pressed) S.sel = -1;
    // --- player movement: joystick/arrows, tap-to-move, or the D-pad.
    let mx = 0, my = 0;
    mx = input.mx; my = input.my;
    if (input.a.pressed) { my = -1; mx = 0; }
    if (input.b.pressed) { my = 1; mx = 0; }
    if (S.padDir) { const d = S.padDir; S.padDir = null; mx = d[0]; my = d[1]; S.tx = null; S.ty = null; }
    const SPD = 280;
    if (mx || my) {
      const len = Math.hypot(mx, my) || 1;
      S.px = clamp(S.px + (mx / len) * SPD * dt, 50, 1230);
      S.py = clamp(S.py + (my / len) * SPD * dt, 150, 680);
      S.flip = mx < 0;
      S.moving = 1; S.phase += dt * 8;
      S.tx = null; S.ty = null;
    } else if (S.tx != null) {
      const dx = S.tx - S.px, dy = S.ty - S.py;
      const d = Math.hypot(dx, dy);
      const step = SPD * dt;
      if (d <= step) { S.px = S.tx; S.py = S.ty; S.tx = null; S.ty = null; S.moving = 0; }
      else { S.px += (dx / d) * step; S.py += (dy / d) * step; S.flip = dx < 0; S.moving = 1; S.phase += dt * 8; }
    } else S.moving = 0;
  }

  function draw(ctx, view) {
    const t = S.t;
    hits.length = 0;
    // Tap-to-move area: push FIRST so it is checked LAST (hits are read
    // in reverse) — otherwise this big area swallows every tap on an
    // item, the BUY button, or the D-pad.
    hits.push({
      x: 0, y: 100, w: 1280, h: 620,
      fn: t2 => { S.tx = clamp(t2.x, 50, 1230); S.ty = clamp(t2.y, 150, 680); S.sel = -1; },
    });
    // Night sky.
    const sky = ctx.createLinearGradient(0, -view.oy, 0, FLOOR);
    sky.addColorStop(0, '#0f172a'); sky.addColorStop(0.6, '#1e1b4b'); sky.addColorStop(1, '#312e81');
    ctx.fillStyle = sky; ctx.fillRect(-view.ox, -view.oy, view.W, FLOOR + view.oy);
    // Twinkling stars.
    for (const st of STARS) {
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + st.p));
      ctx.fillStyle = '#fef9c3'; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Big glowing moon.
    const mg = ctx.createRadialGradient(1080, 110, 10, 1080, 110, 110);
    mg.addColorStop(0, 'rgba(254,249,195,.9)'); mg.addColorStop(0.4, 'rgba(254,249,195,.35)'); mg.addColorStop(1, 'rgba(254,249,195,0)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(1080, 110, 110, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef9c3'; ctx.beginPath(); ctx.arc(1080, 110, 52, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(1062, 98, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1096, 122, 7, 0, Math.PI * 2); ctx.fill();
    // Drifting clouds.
    ctx.fillStyle = 'rgba(226,232,240,.16)';
    for (const c of CLOUDS) {
      const cx = ((c.x + t * 12) % 1400) - 60;
      ctx.beginPath(); ctx.ellipse(cx, c.y, 70 * c.s, 22 * c.s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 50 * c.s, c.y + 8, 50 * c.s, 18 * c.s, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Shop sign.
    ctx.fillStyle = '#1e1b4b'; rrect(ctx, 440, 18, 400, 64, 16); ctx.fill();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; rrect(ctx, 440, 18, 400, 64, 16); ctx.stroke();
    ctx.fillStyle = '#fde68a'; ctx.font = "900 34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🌙 DREAM STORE', 640, 50);
    // Floor.
    const fl = ctx.createLinearGradient(0, FLOOR, 0, -view.oy + view.H);
    fl.addColorStop(0, '#4c1d95'); fl.addColorStop(1, '#2e1065');
    ctx.fillStyle = fl; ctx.fillRect(-view.ox, FLOOR, view.W, -view.oy + view.H - FLOOR);
    ctx.strokeStyle = 'rgba(196,181,253,.25)'; ctx.lineWidth = 2;
    for (let y = FLOOR + 40; y < -view.oy + view.H; y += 46) { ctx.beginPath(); ctx.moveTo(-view.ox, y); ctx.lineTo(-view.ox + view.W, y); ctx.stroke(); }
    // Shelves with the dream items.
    for (let r = 0; r < 2; r++) {
      ctx.fillStyle = '#7c3aed'; rrect(ctx, 90, SHELF_Y[r] - 62, 1100, 14, 7); ctx.fill();
      ctx.fillStyle = '#5b21b6'; rrect(ctx, 90, SHELF_Y[r] + 52, 1100, 10, 5); ctx.fill();
    }
    for (let i = 0; i < DREAM_ITEMS.length; i++) {
      const it = itemAt(i);
      const bob = Math.sin(t * 2 + i) * 4;
      const sel = S.sel === i;
      // Glowing pedestal.
      const g = ctx.createRadialGradient(it.x, it.y + bob, 6, it.x, it.y + bob, 62);
      g.addColorStop(0, sel ? 'rgba(251,191,36,.55)' : 'rgba(167,139,250,.4)');
      g.addColorStop(1, 'rgba(167,139,250,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(it.x, it.y + bob, 62, 0, Math.PI * 2); ctx.fill();
      ctx.font = '44px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(it.icon, it.x, it.y + bob);
      ctx.font = "800 15px Nunito"; ctx.fillStyle = '#e9d5ff';
      ctx.fillText(it.name, it.x, it.y + 44);
      ctx.font = "800 15px Nunito"; ctx.fillStyle = '#fbbf24';
      ctx.fillText(fmtCents(it.cents), it.x, it.y + 64);
      if (sel) {
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(it.x, it.y + bob, 52, 0, Math.PI * 2); ctx.stroke();
      }
      hits.push({ x: it.x - 55, y: it.y - 55, w: 110, h: 110, fn: () => { S.sel = i; audio.play('tick'); } });
    }
    // The player.
    drawHuman(ctx, S.px, S.py, 1, { view: 'side', flip: S.flip, phase: S.phase, moving: S.moving, pose: 'run', ...avatar, shorts: '#1e293b' });
    fx.draw(ctx);
    // Top bar: your money, coins, and dream items owned.
    const b = balances();
    ctx.fillStyle = 'rgba(15,23,42,.75)'; rrect(ctx, 16, 96, 420, 44, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "800 19px Nunito"; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`💰 $${formatShort(BigInt(b.moneyC) / 100n)}  🪙 ${formatShort(b.coins)}  🛍️ ${dreamOwned()} dream items`, 30, 118);
    // Buy bar for the selected item.
    if (S.sel >= 0) {
      const it = DREAM_ITEMS[S.sel], total = withTax(it.cents);
      ctx.fillStyle = 'rgba(15,23,42,.92)'; rrect(ctx, 340, 596, 600, 84, 16); ctx.fill();
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; rrect(ctx, 340, 596, 600, 84, 16); ctx.stroke();
      ctx.font = '40px serif'; ctx.textAlign = 'left'; ctx.fillText(it.icon, 360, 638);
      ctx.fillStyle = '#fff'; ctx.font = "800 20px Nunito";
      ctx.fillText(it.name, 412, 626);
      ctx.fillStyle = '#fbbf24'; ctx.font = "800 18px Nunito";
      ctx.fillText(`${fmtCents(it.cents)} + 8% tax = ${fmtCents(total)}`, 412, 654);
      // BUY button.
      ctx.fillStyle = '#16a34a'; rrect(ctx, 800, 612, 110, 52, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = "900 22px Nunito"; ctx.textAlign = 'center';
      ctx.fillText('BUY', 855, 639);
      hits.push({ x: 800, y: 612, w: 110, h: 52, fn: () => buy(it) });
      // CLOSE button.
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 918, 612, 52, 52, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = "900 22px Nunito";
      ctx.fillText('✕', 944, 639);
      hits.push({ x: 918, y: 612, w: 52, h: 52, fn: () => { S.sel = -1; audio.play('tick'); } });
    }
    // Receipt / error.
    if (S.receipt && S.receiptT < 2.5) {
      const r = S.receipt;
      ctx.fillStyle = 'rgba(15,23,42,.92)'; rrect(ctx, 390, 280, 500, 110, 16); ctx.fill();
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3; rrect(ctx, 390, 280, 500, 110, 16); ctx.stroke();
      ctx.fillStyle = '#4ade80'; ctx.font = "900 26px Nunito"; ctx.textAlign = 'center';
      ctx.fillText(`You bought ${r.item.icon} ${r.item.name}!`, 640, 318);
      ctx.fillStyle = '#fff'; ctx.font = "800 18px Nunito";
      ctx.fillText(r.plan.money ? `PAID ${fmtCents(r.plan.money)}` : `PAID ${r.plan.coins.toLocaleString()} COINS`, 640, 352);
      if (r.deviceOnly) { ctx.fillStyle = '#b45309'; ctx.font = '800 12px Nunito'; ctx.fillText('Saved on this device (Firebase did not answer)', 640, 378); }
    }
    if (S.error && S.errorT < 2.5) {
      ctx.font = '800 17px Nunito'; const w = ctx.measureText(S.error).width + 40;
      ctx.fillStyle = 'rgba(127,29,29,.92)'; rrect(ctx, 640 - w / 2, 600, w, 40, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(S.error, 640, 620);
    }
    // D-pad (right side, below the shelves so it never covers an item):
    // tap a direction to walk that way.
    // (The tap-to-move area was pushed first, so it is checked last.)
    const bx = 1120, by = 544, s = 74, g = 10;
    const btn = (x, y, label, dir) => {
      ctx.fillStyle = 'rgba(255,255,255,.22)'; rrect(ctx, x, y, s, s, 14); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = "900 34px Nunito";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x + s / 2, y + s / 2 + 2);
      hits.push({ x, y, w: s, h: s, fn: () => { S.padDir = dir; audio.play('tick'); } });
    };
    btn(bx, by - s - g, '▲', [0, -1]);
    btn(bx - s - g, by, '◀', [-1, 0]);
    btn(bx + s + g, by, '▶', [1, 0]);
    btn(bx, by + s + g, '▼', [0, 1]);
  }

  if (env.debug) env.debug({ S, buy });
  // Test hook (like __hunted): lets Playwright read the shop state and
  // the item positions so a test can tap an item and BUY it.
  if (typeof window !== 'undefined') window.__dream = { S, items: DREAM_ITEMS, at: itemAt };
  audio.setCrowd(0.08);
  return { update, draw };
}

// ---------- menu thumbnail (module level — the hub needs it) ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  // Night sky + moon + stars.
  const sky = ctx.createLinearGradient(0, 0, 0, 720);
  sky.addColorStop(0, '#0f172a'); sky.addColorStop(0.6, '#1e1b4b'); sky.addColorStop(1, '#312e81');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = '#fef9c3';
  for (let i = 0; i < 40; i++) { const x = (i * 173) % 1280, y = (i * 97) % 320; ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#fef9c3'; ctx.beginPath(); ctx.arc(1080, 110, 52, 0, Math.PI * 2); ctx.fill();
  // Floor.
  ctx.fillStyle = '#4c1d95'; ctx.fillRect(0, 540, 1280, 180);
  // A few dream items on a shelf, bobbing.
  const items = ['🌙', '⭐', '🦄', '☁️', '✨', '🧸'];
  ctx.fillStyle = '#7c3aed'; rrect(ctx, 90, 300, 1100, 14, 7); ctx.fill();
  items.forEach((icon, i) => {
    const x = 200 + i * 180, y = 250 + Math.sin(t * 2 + i) * 6;
    ctx.font = '64px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, y);
  });
  // A player walking under the moon.
  drawHuman(ctx, 640 + Math.sin(t * 0.5) * 120, 640, 1, { view: 'side', flip: false, phase: t * 6, moving: 1, pose: 'run', skin: '#eebb94', hair: '#4a2c18', style: 'short', shirt: '#2563eb', shorts: '#1e293b' });
  ctx.restore();
}

export default {
  id: 'dream',
  title: 'Dream Store',
  tagline: 'A dreamy shop full of wonders',
  desc: 'Walk the Dream Store at night: a moonlit shop with 12 dream things — a Shooting Star, a Star Lamp, a Magic Wand, a Moon Night Light, a Dream Catcher, a Sleepy Bear, a Cloud Pillow, a Rainbow Blanket, a Unicorn Plush, a Crystal Ball, a Dream Carousel and a Dream Bed. Tap an item to see it, then BUY it. Prices are real and 8% sales tax is added at checkout — the tax goes to Trevor, the boss. You pay with your money ($) first, or with coins at 1 coin = $1.',
  music: 'mall',
  noDifficulty: true,
  playLabel: 'ENTER DREAM STORE',
  labels: { a: 'BUY', b: 'CLOSE' },
  options: [],
  howto: `<ul>
    <li>Walk around the Dream Store by tapping where you want to go, or with the arrows / the D-pad on the right.</li>
    <li>Tap a dream item on the shelf to see it — its price shows at the bottom, with 8% sales tax.</li>
    <li>Tap <b>BUY</b> (or press <b>▲</b>) to buy it. You pay with your money ($) first. If you don't have enough money, you can pay with coins: 1 coin = $1.</li>
    <li>Everything you buy is saved to your account. Earn more coins by playing the other games.</li>
  </ul>`,
  create,
  drawThumb,
};
