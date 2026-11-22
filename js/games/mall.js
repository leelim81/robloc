// ROBLOC Shopping Mall: walk a two-story mall, enter shops and buy things at real-world prices.
// Prices are in cents. Purchases are paid with money ($) first, or with coins at 1 coin = $1.
import { drawHuman, shade, rrect, SKINS, HAIRS, HAIR_STYLES, SHIRTS } from '../art.js';
import { drawBanner } from '../fx.js';
import { payPlan as planFor, coinsOf, moneyCentsOf, itemsOwned, formatBig, formatShort } from '../economy.js';

import { SHOP_COUNT, SECTIONS, shopInfo, shopItems, withTax, fmtCents, TAX_RATE } from './shops.js';

const SHOP_W = 470, X0 = 260, FLOOR = 540;
const WORLD_W = X0 * 2 + SHOP_COUNT * SHOP_W;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const doorX = i => X0 + i * SHOP_W + SHOP_W / 2;
const MAP_PAGE = 16;

// ---------- scenery ----------
function drawMall(ctx, view, camX, t, nearShop) {
  const x0 = -view.ox, y0 = -view.oy, W = view.W, H = view.H;
  // upper level and skylights
  const wall = ctx.createLinearGradient(0, y0, 0, FLOOR);
  wall.addColorStop(0, '#e0e7ff'); wall.addColorStop(1, '#f8fafc');
  ctx.fillStyle = wall; ctx.fillRect(x0, y0, W, FLOOR - y0);
  ctx.save(); ctx.translate(-camX * 0.5, 0);
  for (let x = Math.floor((camX * 0.5 + x0) / 300) * 300 - 300; x < camX * 0.5 + x0 + W + 300; x += 300) {
    const g = ctx.createLinearGradient(0, y0, 0, 40);
    g.addColorStop(0, '#7dd3fc'); g.addColorStop(1, '#bae6fd');
    ctx.fillStyle = g; rrect(ctx, x + 30, y0 - 10, 240, 60 - y0, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 150, y0); ctx.lineTo(x + 150, 50); ctx.stroke();
  }
  ctx.restore();
  // second-floor balcony
  ctx.fillStyle = '#cbd5e1'; ctx.fillRect(x0, 60, W, 14);
  ctx.fillStyle = 'rgba(148,163,184,.35)'; ctx.fillRect(x0, 74, W, 40);
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
  for (let x = Math.floor((camX + x0) / 26) * 26 - camX; x < x0 + W; x += 26) { ctx.beginPath(); ctx.moveTo(x, 74); ctx.lineTo(x, 112); ctx.stroke(); }
  ctx.fillStyle = '#e2e8f0'; ctx.fillRect(x0, 112, W, 10);
  // floor
  const fl = ctx.createLinearGradient(0, FLOOR, 0, y0 + H);
  fl.addColorStop(0, '#e7e5e4'); fl.addColorStop(1, '#d6d3d1');
  ctx.fillStyle = fl; ctx.fillRect(x0, FLOOR, W, y0 + H - FLOOR);
  ctx.strokeStyle = 'rgba(120,113,108,.18)'; ctx.lineWidth = 1.5;
  for (let x = Math.floor((camX + x0) / 90) * 90 - camX; x < x0 + W + 200; x += 90) { ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x - 140, y0 + H); ctx.stroke(); }
  for (let y = FLOOR + 30; y < y0 + H; y += 40) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + W, y); ctx.stroke(); }

  ctx.save(); ctx.translate(-camX, 0);
  const vis0 = camX + x0 - SHOP_W, vis1 = camX + x0 + W + SHOP_W;
  // mall entrance at both ends
  for (const ex of [X0 - 130, WORLD_W - X0 + 130]) {
    if (ex < vis0 || ex > vis1) continue;
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(ex - 110, 140, 220, FLOOR - 140);
    ctx.fillStyle = '#bae6fd'; ctx.fillRect(ex - 95, 190, 190, FLOOR - 190);
    ctx.fillStyle = '#0f172a'; ctx.font = "26px 'Lilita One'"; ctx.textAlign = 'center'; ctx.fillText('ROBLOC MALL', ex, 172);
  }
  const first = clamp(Math.floor((vis0 - X0) / SHOP_W), 0, SHOP_COUNT - 1), last = clamp(Math.ceil((vis1 - X0) / SHOP_W), 0, SHOP_COUNT - 1);
  for (let i = first; i <= last; i++) {
    const x = X0 + i * SHOP_W;
    const info = shopInfo(i), s = { ...info, items: shopItems(i).slice(0, 8) };
    drawStore(ctx, s, x, t, nearShop === i);
    // pillar + plant between stores
    ctx.fillStyle = '#f1f5f9'; ctx.fillRect(x - 12, 122, 24, FLOOR - 122);
    ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(x + 4, 122, 8, FLOOR - 122);
    if (i % 3 === 1) {
      ctx.fillStyle = '#a16207'; rrect(ctx, x - 22, FLOOR - 10, 44, 34, 6); ctx.fill();
      ctx.fillStyle = '#16a34a';
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + (k - 2) * 9, FLOOR - 26 - Math.abs(k - 2) * -4, 10, 22, (k - 2) * 0.35, 0, Math.PI * 2); ctx.fill(); }
    }
    // a fountain every few shops
    if (i % 9 === 8) drawFountain(ctx, x + SHOP_W, t);
  }
  ctx.restore();
}
function drawFountain(ctx, x, t) {
  const y = FLOOR + 70;
  ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.ellipse(x, y, 90, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(x, y - 4, 80, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(224,242,254,.9)'; ctx.lineWidth = 3;
  for (let k = -3; k <= 3; k++) {
    const h = 70 + Math.sin(t * 3 + k) * 6;
    ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.quadraticCurveTo(x + k * 12, y - h, x + k * 26, y - 6); ctx.stroke();
  }
}
function drawStore(ctx, s, x, t, near) {
  const c = s.color;
  // facade
  const g = ctx.createLinearGradient(0, 122, 0, FLOOR);
  g.addColorStop(0, shade(c, 0.15)); g.addColorStop(1, shade(c, -0.25));
  ctx.fillStyle = g; ctx.fillRect(x + 12, 122, SHOP_W - 24, FLOOR - 122);
  // sign
  ctx.fillStyle = '#0f172a'; rrect(ctx, x + 40, 140, SHOP_W - 80, 64, 14); ctx.fill();
  ctx.strokeStyle = shade(c, 0.4); ctx.lineWidth = 3; rrect(ctx, x + 40, 140, SHOP_W - 80, 64, 14); ctx.stroke();
  ctx.font = "30px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = c; ctx.shadowBlur = near ? 22 : 10;
  ctx.fillStyle = '#fff'; fitText(ctx, s.icon + ' ' + s.name, x + SHOP_W / 2, 167, SHOP_W - 110);
  ctx.shadowBlur = 0;
  ctx.font = '800 12px Nunito'; ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.fillText(`${s.section === 'Shops' ? 'SHOP' : s.section.toUpperCase()} #${s.number.toLocaleString()} · ${s.count.toLocaleString()} ITEMS`, x + SHOP_W / 2, 193);
  // windows with displays
  const win = (wx, items) => {
    ctx.fillStyle = 'rgba(224,242,254,.85)'; ctx.fillRect(wx, 230, 140, 220);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(wx + 10, 230); ctx.lineTo(wx + 60, 230); ctx.lineTo(wx + 10, 330); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(c, -0.4); ctx.fillRect(wx, 340, 140, 8); ctx.fillRect(wx, 442, 140, 8);
    ctx.font = '40px sans-serif';
    items.forEach((it, k) => ctx.fillText(it.icon, wx + 38 + (k % 2) * 64, k < 2 ? 312 : 412));
    ctx.strokeStyle = shade(c, -0.45); ctx.lineWidth = 4; ctx.strokeRect(wx, 230, 140, 220);
  };
  win(x + 30, s.items.slice(0, 4)); win(x + SHOP_W - 170, s.items.slice(4, 8).length ? s.items.slice(4, 8) : s.items.slice(0, 4));
  // door
  const dx = x + SHOP_W / 2;
  ctx.fillStyle = near ? 'rgba(254,249,195,.95)' : 'rgba(30,41,59,.85)'; ctx.fillRect(dx - 62, 250, 124, FLOOR - 250);
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 5; ctx.strokeRect(dx - 62, 250, 124, FLOOR - 250);
  ctx.beginPath(); ctx.moveTo(dx, 250); ctx.lineTo(dx, FLOOR); ctx.stroke();
  ctx.fillStyle = '#fbbf24'; ctx.fillRect(dx - 12, 380, 6, 30); ctx.fillRect(dx + 6, 380, 6, 30);
  ctx.fillStyle = near ? '#16a34a' : '#22c55e'; rrect(ctx, dx - 34, 222, 68, 22, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '900 13px Nunito'; ctx.fillText('OPEN', dx, 234);
}
function fitText(ctx, text, x, y, maxW) {
  const w = ctx.measureText(text).width;
  if (w > maxW) { ctx.save(); ctx.translate(x, y); ctx.scale(maxW / w, 1); ctx.fillText(text, 0, 0); ctx.restore(); }
  else ctx.fillText(text, x, y);
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, profile, shop } = env;
  const av = profile?.avatar || {};
  const me = { x: X0 - 60, y: FLOOR + 90, vx: 0, phase: 0, flip: false };
  const npcs = Array.from({ length: 14 }, () => ({
    x: rand(X0, X0 + 6 * SHOP_W), y: rand(FLOOR + 40, FLOOR + 150), dir: Math.random() < 0.5 ? -1 : 1, speed: rand(50, 110), phase: rand(0, 6),
    look: { skin: SKINS[(Math.random() * SKINS.length) | 0], hair: HAIRS[(Math.random() * 7) | 0], style: HAIR_STYLES[(Math.random() * 5) | 0], shirt: SHIRTS[(Math.random() * SHIRTS.length) | 0] },
    bag: Math.random() < 0.6 ? shopInfo((Math.random() * 60) | 0).color : null, pause: 0,
  }));
  const S = { t: 0, mode: 'walk', shop: -1, sel: 0, navT: 0, navHeld: 0, lastNav: '', busy: false, receipt: null, receiptT: 0, error: null, mapSel: 0, labelKey: '', intro: 0 };
  let camX = 0;

  const prof = () => shop.profile() || profile;
  const balances = () => ({ moneyC: moneyCentsOf(prof()), coins: coinsOf(prof()) });
  const payPlan = total => planFor(prof(), total);

  function nav(onMove) {
    // joystick / arrows step the selection once per push, then repeat while held
    const dx = input.mx > 0.5 ? 1 : input.mx < -0.5 ? -1 : 0, dy = input.my > 0.5 ? 1 : input.my < -0.5 ? -1 : 0;
    const key = dx + ',' + dy;
    if (key === '0,0') { S.lastNav = key; S.navHeld = 0; return; }
    if (key !== S.lastNav) S.navHeld = 0;
    // holding a direction speeds up: 1, 5, 25, 100, then 500 steps at a time
    const mult = S.navHeld > 5 ? 500 : S.navHeld > 4 ? 100 : S.navHeld > 2.5 ? 25 : S.navHeld > 1.2 ? 5 : 1;
    if (key !== S.lastNav || S.navT <= 0) { onMove(dx, dy, mult); S.navT = key !== S.lastNav ? 0.35 : 0.1; S.lastNav = key; audio.play('tick'); }
  }

  async function buy(item) {
    if (S.busy) return;
    const total = withTax(item.cents), plan = payPlan(total);
    if (!plan) { S.error = 'Not enough money or coins for this.'; S.errorT = 0; audio.play('fault'); return; }
    S.busy = true;
    try {
      const res = await shop.buy(item, total);
      S.receipt = { item, total, plan, deviceOnly: !!res?.deviceOnly }; S.receiptT = 0;
      audio.play('coin'); fx.confetti(640, 360, 40);
    } catch (e) {
      console.error(e);
      S.error = e.code === 'not-enough' ? 'Not enough money or coins for this.' : e.code === 'permission-denied' ? 'Firebase refused the purchase: publish the new firestore.rules in the Firebase console.' : 'Could not complete the purchase: ' + (e.code || e.message); S.errorT = 0;
      audio.play('fault');
    }
    S.busy = false;
  }

  function nearShop() {
    const i = Math.floor((me.x - X0) / SHOP_W);
    return i >= 0 && i < SHOP_COUNT && Math.abs(me.x - doorX(i)) < SHOP_W / 2 - 12 ? i : -1;
  }

  // Tap targets are recorded while drawing and checked on the next update (last one drawn wins).
  let hits = [];
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });
  function handleTaps() {
    for (const t of input.taps) {
      for (let k = hits.length - 1; k >= 0; k--) {
        const h = hits[k];
        if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
      }
    }
  }
  const enterShop = i => { S.mode = 'shop'; S.shop = i; S.sel = 0; S.walkTo = null; S.autoShop = -1; audio.play('select'); };
  const openMap = () => { S.mode = 'map'; S.walkTo = null; S.autoShop = -1; const ns = nearShop(); S.mapSel = Math.max(0, ns >= 0 ? ns : clamp(Math.floor((me.x - X0) / SHOP_W), 0, SHOP_COUNT - 1)); audio.play('select'); };
  const goToShop = i => { me.x = doorX(i); me.y = FLOOR + 70; me.vx = 0; camX = clamp(me.x - 640, 0, WORLD_W - 1280); S.mode = 'walk'; audio.play('whoosh'); fx.dust(640, FLOOR + 70, 8); };

  function update(dt) {
    handleTaps();
    input.setTapMode(S.mode !== 'walk');
    S.t += dt; S.intro += dt; S.navT -= dt; S.navHeld += dt; S.receiptT += dt; if (S.errorT !== undefined) S.errorT += dt;
    if (S.receipt && S.receiptT > 2.6) S.receipt = null;
    if (S.error && S.errorT > 2.6) S.error = null;
    const labelKey = S.mode;
    if (labelKey !== S.labelKey) {
      S.labelKey = labelKey;
      const L = { walk: ['ENTER', 'MAP'], shop: ['BUY', 'LEAVE'], map: ['GO', 'CLOSE'] }[labelKey];
      input.setLabels(L[0], L[1]);
    }
    // shoppers
    for (const n of npcs) {
      if (n.pause > 0) { n.pause -= dt; continue; }
      n.x += n.dir * n.speed * dt; n.phase += n.speed * dt * 0.06;
      if (n.x < X0 - 40 || n.x > WORLD_W - X0 + 40) n.dir *= -1;
      if (Math.abs(n.x - me.x) > 1600) { n.x = me.x + (Math.random() < 0.5 ? -1 : 1) * rand(700, 1400); n.dir = n.x > me.x ? -1 : 1; }
      if (Math.random() < dt * 0.08) n.pause = rand(1, 3);
    }
    if (S.mode === 'walk') {
      const sp = 430;
      let mx = input.mx;
      if (mx || input.my) { S.walkTo = null; S.autoShop = -1; }
      else if (S.walkTo !== null && S.walkTo !== undefined) {
        // walking to where the player tapped; enter the shop if they tapped one
        const d = S.walkTo - me.x;
        if (Math.abs(d) < 18) { S.walkTo = null; if (S.autoShop >= 0) { const i = S.autoShop; S.autoShop = -1; enterShop(i); return; } }
        else mx = clamp(d / 120, -1, 1);
      }
      me.vx += (mx * sp - me.vx) * Math.min(1, dt * 10);
      me.x = clamp(me.x + me.vx * dt, X0 - 120, WORLD_W - X0 + 120);
      me.y = clamp(me.y + input.my * 160 * dt, FLOOR + 30, FLOOR + 160);
      if (Math.abs(me.vx) > 10) me.flip = me.vx < 0;
      me.phase += Math.abs(me.vx) * dt * 0.035 + Math.abs(input.my) * dt * 5;
      const ns = nearShop();
      if (input.a.pressed && ns >= 0) enterShop(ns);
      else if (input.b.pressed) openMap();
    } else if (S.mode === 'shop') {
      const items = shopItems(S.shop), cols = 4;
      nav((dx, dy, mult) => { S.sel = clamp(S.sel + dx + dy * cols * mult, 0, items.length - 1); });
      if (input.a.pressed) buy(items[S.sel]);
      if (input.b.pressed) leaveShop();
    } else if (S.mode === 'map') {
      // up/down pick a shop, left/right flip pages of 16 (hold to fly through thousands)
      nav((dx, dy, mult) => { S.mapSel = clamp(S.mapSel + dy * mult + dx * MAP_PAGE * mult, 0, SHOP_COUNT - 1); });
      if (input.a.pressed) goToShop(S.mapSel);
      if (input.b.pressed) { S.mode = 'walk'; audio.play('back'); }
    }
    camX += (clamp(me.x - 640, 0, WORLD_W - 1280) - camX) * Math.min(1, dt * 6);
  }

  function draw(ctx, view) {
    hits = [];
    const ns = S.mode === 'walk' ? nearShop() : -1;
    drawMall(ctx, view, camX, S.t, ns);
    if (S.mode === 'walk') {
      // tap the floor to walk there, or a shop front to walk in
      hit(-view.ox, -view.oy, view.W, view.H, t => { S.walkTo = clamp(t.x + camX, X0 - 120, WORLD_W - X0 + 120); S.autoShop = -1; });
      const first = Math.max(0, Math.floor((camX - view.ox - X0) / SHOP_W)), last = Math.min(SHOP_COUNT - 1, Math.ceil((camX - view.ox + view.W - X0) / SHOP_W));
      for (let i = first; i <= last; i++) hit(X0 + i * SHOP_W + 12 - camX, 122, SHOP_W - 24, FLOOR - 122, () => { S.walkTo = doorX(i); S.autoShop = i; audio.play('tick'); });
    }
    // people, back to front
    const people = npcs.map(n => ({ y: n.y, d: () => drawPerson(ctx, n.x - camX, n.y, n.look, n.phase, n.pause > 0 ? 0 : 1, n.dir < 0, n.bag) }));
    people.push({ y: me.y, d: () => {
      drawPerson(ctx, me.x - camX, me.y, { skin: av.skin, hair: av.hair, style: av.style, shirt: av.shirt || '#2563eb' }, me.phase, Math.min(1, Math.abs(me.vx) / 200), me.flip, null);
      ctx.strokeStyle = 'rgba(34,211,238,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(me.x - camX, me.y + 2, 40, 12, 0, 0, Math.PI * 2); ctx.stroke();
    } });
    people.sort((a, b) => a.y - b.y).forEach(p => p.d());
    fx.draw(ctx);
    drawWallet(ctx);
    if (S.mode === 'walk') {
      button(ctx, 18, 68, 130, 44, '🗺️ MAP', '#7c3aed', openMap);
      if (ns >= 0) prompt(ctx, `${input.touchMode ? 'Tap ENTER' : 'Press SPACE'} to go into ${shopInfo(ns).name}`, 1, '#fde68a');
      else prompt(ctx, input.touchMode ? 'Tap a shop to go in · MAP to jump to any shop' : 'Arrows to walk · SPACE enter a shop · SHIFT mall map · or click', 0.85);
      if (S.intro < 2) drawBanner(ctx, 'ROBLOC MALL', 640, 300, S.intro, { size: 96, color: '#fbcfe8', glow: '#db2777' });
    }
    if (S.mode === 'shop') drawShop(ctx);
    if (S.mode === 'map') drawMap(ctx);
    if (S.receipt) drawReceipt(ctx);
    if (S.error) toastBar(ctx, S.error, '#fecaca');
  }

  function drawPerson(ctx, x, y, look, phase, moving, flip, bag) {
    const s = 1.15 + (y - FLOOR) / 160 * 0.3;
    drawHuman(ctx, x, y, s, { view: 'side', flip, phase, moving, pose: 'run', ...look, shorts: '#1e293b' });
    if (bag) {
      const bx = x + (flip ? -14 : 14) * s, by = y - 46 * s;
      ctx.fillStyle = bag; rrect(ctx, bx - 9 * s, by, 18 * s, 20 * s, 3); ctx.fill();
      ctx.strokeStyle = shade(bag, -0.4); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 6 * s, Math.PI, 0); ctx.stroke();
    }
  }

  function drawWallet(ctx) {
    const { moneyC, coins } = balances();
    const text = `💵 ${fmtCents(moneyC)}   🪙 ${coins.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} coins`;
    ctx.save(); ctx.font = '900 18px Nunito'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const w = Math.min(1100, ctx.measureText(text).width + 32);
    ctx.fillStyle = 'rgba(15,23,42,.88)'; rrect(ctx, 18, 14, w, 44, 14); ctx.fill();
    ctx.fillStyle = '#fff'; fitText(ctx, text, 34, 37, w - 32);
    ctx.restore();
  }

  function panel(ctx, x, y, w, h, title, color) {
    ctx.fillStyle = 'rgba(2,6,23,.55)'; ctx.fillRect(-2000, -2000, 6000, 6000);
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30;
    ctx.fillStyle = '#0f172a'; rrect(ctx, x, y, w, h, 24); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = color; rrect(ctx, x, y, w, 64, 24); ctx.fill(); ctx.fillRect(x, y + 40, w, 24);
    ctx.fillStyle = '#fff'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitText(ctx, title, x + w / 2, y + 34, w - 60);
  }

  function drawShop(ctx) {
    const s = shopInfo(S.shop), items = shopItems(S.shop), cols = 4, rows = 3;
    const X = 90, Y = 70, W = 1100, H = 580;
    panel(ctx, X, Y, W, H, s.icon + ' ' + s.name, s.color);
    const cw = 236, ch = 112, gx = 14, gy = 12, ox = X + 20, oy = Y + 80;
    closeButton(ctx, X + W - 52, Y + 13, () => leaveShop());
    // scroll buttons: one page or 25 pages up/down
    const step = n => () => { S.sel = clamp(S.sel + n, 0, items.length - 1); audio.play('tick'); };
    const sx = X + W - 72;
    button(ctx, sx, oy, 56, 82, '⏫', '#334155', step(-cols * rows * 25));
    button(ctx, sx, oy + 92, 56, 82, '▲', '#334155', step(-cols * rows));
    button(ctx, sx, oy + 184, 56, 82, '▼', '#334155', step(cols * rows));
    button(ctx, sx, oy + 276, 56, 82, '⏬', '#334155', step(cols * rows * 25));
    // show 3 rows at a time, scrolling with the selection
    const totalRows = Math.ceil(items.length / cols), selRow = Math.floor(S.sel / cols);
    const top = clamp(selRow - 1, 0, Math.max(0, totalRows - rows));
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '900 15px Nunito';
    ctx.fillText(`Item ${(S.sel + 1).toLocaleString()} of ${items.length.toLocaleString()}`, X + W - 68, Y + 34);
    items.slice(top * cols, (top + rows) * cols).forEach((it, k) => {
      const i = top * cols + k;
      const cx = ox + (k % cols) * (cw + gx), cy = oy + Math.floor(k / cols) * (ch + gy);
      const sel = i === S.sel, owned = (prof().inventory || {})[it.id] || 0;
      ctx.fillStyle = sel ? shade(s.color, -0.2) : '#1e293b'; rrect(ctx, cx, cy, cw, ch, 16); ctx.fill();
      if (sel) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4; rrect(ctx, cx, cy, cw, ch, 16); ctx.stroke(); }
      ctx.font = '48px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.icon, cx + 46, cy + 56);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 17px Nunito'; fitTextLeft(ctx, it.name, cx + 88, cy + 32, cw - 98);
      ctx.fillStyle = '#facc15'; ctx.font = "23px 'Lilita One'"; fitTextLeft(ctx, fmtCents(it.cents), cx + 88, cy + 62, cw - 98);
      if (owned) { ctx.fillStyle = '#86efac'; ctx.font = '800 13px Nunito'; ctx.fillText(`You own ${owned}`, cx + 88, cy + 90); }
      // tap once to choose, tap again to buy
      hit(cx, cy, cw, ch, () => { if (S.sel === i) buy(it); else { S.sel = i; audio.play('tick'); } });
    });
    // checkout bar
    const it = items[S.sel], total = withTax(it.cents), tax = total - it.cents, plan = payPlan(total);
    const by = Y + H - 104;
    ctx.fillStyle = '#1e293b'; rrect(ctx, X + 24, by, W - 48, 80, 16); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 20px Nunito';
    fitTextLeft(ctx, `${it.icon} ${it.name}:  ${fmtCents(it.cents)}  +  tax ${fmtCents(tax)}  =  ${fmtCents(total)}`, X + 44, by + 28, W - 360);
    ctx.font = '800 15px Nunito';
    ctx.fillStyle = plan ? '#86efac' : '#fca5a5';
    ctx.fillText(plan ? (plan.money ? `Pay ${fmtCents(plan.money)} from your money` : `Pay ${plan.coins.toLocaleString()} coins (1 coin = $1)`) : 'Not enough money or coins', X + 44, by + 58);
    button(ctx, X + W - 224, by + 12, 180, 56, S.busy ? 'PAYING…' : plan ? `BUY ${fmtShortCents(total)}` : 'CAN\'T AFFORD', plan ? '#16a34a' : '#475569', () => buy(it));
  }
  function fmtShortCents(c) { return c >= 100000000 ? '$' + formatShort(BigInt(c) / 100n) : fmtCents(c); }
  function leaveShop() { if (!S.busy) { S.mode = 'walk'; audio.play('back'); } }
  // A rounded button drawn on the canvas that also responds to taps.
  function button(ctx, x, y, w, h, label, color, fn) {
    ctx.fillStyle = color; rrect(ctx, x, y, w, h, 14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; rrect(ctx, x, y, w, h / 2, 14); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "22px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitText(ctx, label, x + w / 2, y + h / 2 + 1, w - 16);
    hit(x, y, w, h, fn);
  }
  function closeButton(ctx, x, y, fn) { button(ctx, x, y, 40, 40, '✕', 'rgba(15,23,42,.6)', fn); }
  function fitTextLeft(ctx, text, x, y, maxW) {
    const w = ctx.measureText(text).width;
    if (w > maxW) { ctx.save(); ctx.translate(x, y); ctx.scale(maxW / w, 1); ctx.fillText(text, 0, 0); ctx.restore(); }
    else ctx.fillText(text, x, y);
  }

  function drawMap(ctx) {
    const X = 190, Y = 60, W = 900, H = 600;
    const page = Math.floor(S.mapSel / MAP_PAGE), pages = Math.ceil(SHOP_COUNT / MAP_PAGE);
    panel(ctx, X, Y, W, H, '🗺️ Mall Directory', '#7c3aed');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#cbd5e1'; ctx.font = '900 15px Nunito';
    const from = page * MAP_PAGE, to = Math.min(SHOP_COUNT, from + MAP_PAGE);
    const sec = shopInfo(from).section, icon = { Shops: '🛍️', Food: '🍔', Drinks: '🧋' }[sec];
    ctx.fillText(`${icon} ${sec} · shops ${(from + 1).toLocaleString()}–${to.toLocaleString()} of ${SHOP_COUNT.toLocaleString()} · page ${(page + 1).toLocaleString()} of ${pages.toLocaleString()}`, X + W / 2, Y + 84);
    for (let i = from; i < to; i++) {
      const k = i - from, col = k >= MAP_PAGE / 2 ? 1 : 0, row = k - col * MAP_PAGE / 2;
      const x = X + 30 + col * (W / 2 - 15), y = Y + 104 + row * 54, w = W / 2 - 45;
      const s = shopInfo(i), sel = i === S.mapSel;
      ctx.fillStyle = sel ? s.color : '#1e293b'; rrect(ctx, x, y, w, 46, 12); ctx.fill();
      if (sel) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; rrect(ctx, x, y, w, 46, 12); ctx.stroke(); }
      ctx.textAlign = 'left'; ctx.fillStyle = sel ? '#fff' : '#94a3b8'; ctx.font = '800 12px Nunito';
      ctx.fillText('#' + s.number.toLocaleString(), x + 12, y + 24);
      ctx.fillStyle = '#fff'; ctx.font = '900 17px Nunito';
      fitTextLeft(ctx, `${s.icon} ${s.name}`, x + 70, y + 24, w - 170);
      ctx.textAlign = 'right'; ctx.font = '800 12px Nunito'; ctx.fillStyle = sel ? '#fff' : '#94a3b8';
      ctx.fillText(s.count.toLocaleString() + ' items', x + w - 12, y + 24);
      hit(x, y, w, 46, () => goToShop(i));
    }
    closeButton(ctx, X + W - 52, Y + 13, () => { S.mode = 'walk'; audio.play('back'); });
    // page buttons: jump to a section, or move 100 / 1 pages
    const pageTo = i => () => { S.mapSel = clamp(i, 0, SHOP_COUNT - 1); audio.play('tick'); };
    const by = Y + 534, bw = 112, gap = 9, bx = X + (W - (7 * bw + 6 * gap)) / 2;
    [['🛍️ Shops', pageTo(SECTIONS[0].from), '#0ea5e9'], ['◀◀ 100', pageTo(S.mapSel - MAP_PAGE * 100), '#334155'], ['◀', pageTo(S.mapSel - MAP_PAGE), '#334155'],
      ['▶', pageTo(S.mapSel + MAP_PAGE), '#334155'], ['100 ▶▶', pageTo(S.mapSel + MAP_PAGE * 100), '#334155'], ['🍔 Food', pageTo(SECTIONS[1].from), '#ea580c'], ['🧋 Drinks', pageTo(SECTIONS[2].from), '#db2777']]
      .forEach(([label, fn, color], k) => button(ctx, bx + k * (bw + gap), by, bw, 40, label, color, fn));
    const owned = itemsOwned(prof());
    ctx.textAlign = 'center'; ctx.fillStyle = '#cbd5e1'; ctx.font = '800 13px Nunito';
    ctx.fillText(`🛍️ You own ${formatBig(owned)} item${owned === 1n ? '' : 's'} · tap a shop to go there${input.touchMode ? '' : ' · or ▲▼ ◀▶ and SPACE'}`, X + W / 2, Y + H - 14);
  }

  function drawReceipt(ctx) {
    const r = S.receipt, k = Math.min(1, S.receiptT / 0.25);
    ctx.save(); ctx.translate(640, 330); ctx.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k); ctx.globalAlpha = Math.min(1, (2.6 - S.receiptT) * 2);
    ctx.fillStyle = '#fffbeb'; ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 24; rrect(ctx, -190, -130, 380, 260, 18); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#0f172a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = "28px 'Lilita One'"; ctx.fillText('THANK YOU!', 0, -96);
    ctx.font = '56px sans-serif'; ctx.fillText(r.item.icon, 0, -40);
    ctx.font = '900 18px Nunito'; fitText(ctx, r.item.name, 0, 12, 340);
    ctx.font = '800 15px Nunito'; ctx.fillStyle = '#475569';
    ctx.fillText(`Price ${fmtCents(r.item.cents)} · Tax ${fmtCents(r.total - r.item.cents)}`, 0, 44);
    ctx.fillStyle = '#16a34a'; ctx.font = "22px 'Lilita One'";
    ctx.fillText(r.plan.money ? `PAID ${fmtCents(r.plan.money)}` : `PAID ${r.plan.coins.toLocaleString()} COINS`, 0, 84);
    if (r.deviceOnly) { ctx.fillStyle = '#b45309'; ctx.font = '800 12px Nunito'; ctx.fillText('Saved on this device (Firebase rules not published yet)', 0, 112); }
    ctx.restore();
  }
  function toastBar(ctx, text, color) {
    ctx.font = '800 17px Nunito'; const w = ctx.measureText(text).width + 40;
    ctx.fillStyle = 'rgba(127,29,29,.92)'; rrect(ctx, 640 - w / 2, 600, w, 40, 12); ctx.fill();
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 620);
  }
  function prompt(ctx, text, alpha, color = '#fff') {
    ctx.globalAlpha = alpha;
    ctx.font = '800 17px Nunito'; const w = ctx.measureText(text).width + 40;
    ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 664, w, 38, 12); ctx.fill();
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 683);
    ctx.globalAlpha = 1;
  }

  if (env.debug) env.debug({ S, me, buy });
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
const thumbPeople = [0, 1, 2, 3].map(i => ({ skin: SKINS[i + 1], hair: HAIRS[i], style: HAIR_STYLES[i], shirt: SHIRTS[i * 2] }));
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  const v = view || { ox: 0, oy: 0, W: 1280, H: 720 };
  const camX = X0 + 2 * SHOP_W + Math.sin(t * 0.2) * 300;
  drawMall(ctx, v, camX, t, 3);
  thumbPeople.forEach((look, i) => {
    const x = ((i * 330 + t * (60 + i * 15) * (i % 2 ? -1 : 1)) % 1500 + 1500) % 1500 - 100;
    drawHuman(ctx, x, FLOOR + 60 + i * 28, 0.85 + i * 0.05, { view: 'side', flip: i % 2 === 1, phase: t * 6 + i, moving: 1, pose: 'run', ...look, shorts: '#1e293b' });
  });
  ctx.restore();
}

export default {
  id: 'mall',
  title: 'Shopping Mall',
  tagline: '88,000 shops, food and drinks',
  desc: 'Walk the ROBLOC Mall: 10,000 shops (toys, pets, phones, cars, houses, jets…), 68,000 food places and 10,000 drink shops, with real prices and sales tax.',
  music: 'mall',
  noDifficulty: true,
  playLabel: 'ENTER MALL',
  labels: { a: 'ENTER', b: 'MAP' },
  options: [],
  howto: `<ul>
    <li><b>Walk</b> with the joystick or arrows. Stand at a shop door and press <b>ENTER</b> (<kbd>Space</kbd>).</li>
    <li><b>MAP</b> (<kbd>Shift</kbd>) opens the directory of all 88,000 shops: shops 1–10,000 sell all kinds of things, 10,001–78,000 are food and 78,001–88,000 are drinks. Flip pages left and right (hold to go faster) and jump to any shop.</li>
    <li>Every shop sells 7 to 1,000 things. Hold up or down in a shop to scroll faster.</li>
    <li>In a shop, pick an item and press <b>BUY</b>. Prices are real and ${Math.round(TAX_RATE * 100)}% sales tax is added at checkout.</li>
    <li>You pay with your money ($) first. If you don't have enough money, you can pay with coins: 1 coin = $1.</li>
    <li>Everything you buy is saved to your account. Earn more coins by playing the other games.</li>
  </ul>`,
  create,
  drawThumb,
};
