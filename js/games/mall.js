// ROBLOC Shopping Mall: walk a two-story mall, enter shops and buy things at real-world prices.
// Prices are in cents. Purchases are paid with money ($) first, or with coins at 1 coin = $1.
import { drawHuman, shade, rrect, SKINS, HAIRS, HAIR_STYLES, SHIRTS } from '../art.js';
import { drawBanner } from '../fx.js';
import { payPlan as planFor, coinsOf, moneyCentsOf } from '../economy.js';

export const TAX_RATE = 0.08;
const $c = d => Math.round(d * 100);
export const SHOPS = [
  { id: 'toys', name: 'Toy Galaxy', icon: '🧸', color: '#f43f5e', items: [
    ['teddy', 'Teddy Bear', '🧸', 24.99], ['racecar', 'Race Car Set', '🏎️', 39.99], ['robot', 'Robot Kit', '🤖', 79.99], ['dollhouse', 'Doll House', '🏠', 129.99],
    ['yoyo', 'Yo-Yo', '🪀', 6.99], ['kite', 'Rainbow Kite', '🪁', 19.99], ['puzzle', '1000-Piece Puzzle', '🧩', 17.99], ['boardgame', 'Board Game', '🎲', 29.99]] },
  { id: 'shoes', name: 'Sole Society', icon: '👟', color: '#0ea5e9', items: [
    ['sneakers', 'Running Sneakers', '👟', 89.99], ['boots', 'Hiking Boots', '🥾', 129.99], ['flipflops', 'Flip-Flops', '🩴', 14.99], ['flats', 'Ballet Flats', '🩰', 49.99],
    ['dressshoes', 'Dress Shoes', '👞', 119.99], ['heels', 'Party Heels', '👠', 79.99], ['socks', 'Socks 6-Pack', '🧦', 16.99]] },
  { id: 'bakery', name: 'Sweet Crumbs Bakery', icon: '🥐', color: '#d97706', items: [
    ['croissant', 'Croissant', '🥐', 3.49], ['cake', 'Birthday Cake', '🎂', 34.99], ['cupcake', 'Cupcake', '🧁', 3.99], ['donuts', 'Box of Donuts', '🍩', 12.99],
    ['bread', 'Bread Loaf', '🍞', 5.49], ['cookie', 'Giant Cookie', '🍪', 1.99], ['pie', 'Apple Pie', '🥧', 18.99]] },
  { id: 'electronics', name: 'Volt Electronics', icon: '📱', color: '#6366f1', items: [
    ['phone', 'Smartphone', '📱', 799], ['laptop', 'Laptop', '💻', 1199], ['headphones', 'Headphones', '🎧', 249.99], ['smartwatch', 'Smart Watch', '⌚', 399],
    ['tv', '65" 4K TV', '📺', 649.99], ['camera', 'Camera', '📷', 899], ['desktop', 'Gaming PC', '🖥️', 1499], ['speaker', 'Speaker', '🔊', 129.99]] },
  { id: 'pets', name: 'Paws & Claws Pets', icon: '🐶', color: '#16a34a', items: [
    ['puppy', 'Puppy', '🐶', 850], ['kitten', 'Kitten', '🐱', 350], ['goldfish', 'Goldfish', '🐠', 4.99], ['hamster', 'Hamster', '🐹', 19.99],
    ['parrot', 'Parrot', '🦜', 1200], ['bunny', 'Bunny', '🐰', 85], ['turtle', 'Turtle', '🐢', 39.99], ['petfood', 'Pet Food Bag', '🦴', 34.99]] },
  { id: 'icecream', name: 'Scoop Dreams', icon: '🍦', color: '#ec4899', items: [
    ['cone', 'Ice Cream Cone', '🍦', 4.5], ['sundae', 'Sundae', '🍨', 7.95], ['shake', 'Milkshake', '🥤', 6.49], ['shavedice', 'Shaved Ice', '🍧', 4.25], ['waffle', 'Waffle Bowl', '🧇', 5.75]] },
  { id: 'sports', name: 'Pro Sports Locker', icon: '⚽', color: '#22c55e', items: [
    ['soccerball', 'Soccer Ball', '⚽', 29.99], ['basketball', 'Basketball', '🏀', 34.99], ['glove', 'Baseball Glove', '🧤', 59.99], ['racket', 'Tennis Racket', '🎾', 89.99],
    ['skateboard', 'Skateboard', '🛹', 79.99], ['bike', 'Mountain Bike', '🚲', 349.99], ['football', 'Football', '🏈', 24.99], ['paddle', 'Pickleball Paddle', '🏓', 49.99]] },
  { id: 'books', name: 'Bookworm Books', icon: '📚', color: '#92400e', items: [
    ['comic', 'Comic Book', '📕', 4.99], ['novel', 'Adventure Novel', '📘', 14.99], ['encyclopedia', 'Encyclopedia Set', '📚', 89.99], ['coloring', 'Coloring Book', '🖍️', 7.99], ['atlas', 'World Atlas', '🗺️', 24.99]] },
  { id: 'fashion', name: 'Glow Up Fashion', icon: '👕', color: '#a855f7', items: [
    ['tshirt', 'T-Shirt', '👕', 19.99], ['jeans', 'Jeans', '👖', 49.99], ['coat', 'Winter Coat', '🧥', 129.99], ['dress', 'Dress', '👗', 59.99],
    ['cap', 'Baseball Cap', '🧢', 24.99], ['sunglasses', 'Sunglasses', '🕶️', 39.99], ['backpack', 'Backpack', '🎒', 54.99], ['scarf', 'Scarf', '🧣', 22.99]] },
  { id: 'games', name: 'Game Zone', icon: '🎮', color: '#0891b2', items: [
    ['videogame', 'Video Game', '💿', 69.99], ['console', 'Game Console', '🎮', 499.99], ['vr', 'VR Headset', '🥽', 499], ['giftcard', 'Gift Card', '🎁', 25], ['joystick', 'Arcade Stick', '🕹️', 149.99]] },
  { id: 'home', name: 'Home Nest', icon: '🛋️', color: '#78716c', items: [
    ['sofa', 'Sofa', '🛋️', 899], ['bed', 'Bed', '🛏️', 699], ['lamp', 'Lamp', '💡', 39.99], ['plant', 'House Plant', '🪴', 24.99],
    ['chair', 'Chair', '🪑', 89.99], ['clock', 'Wall Clock', '🕰️', 45], ['mirror', 'Mirror', '🪞', 79.99], ['bathtub', 'Bathtub', '🛁', 1299]] },
  { id: 'jewelry', name: 'Sparkle Jewelry', icon: '💍', color: '#eab308', items: [
    ['ring', 'Diamond Ring', '💍', 1299], ['necklace', 'Pearl Necklace', '📿', 349], ['diamond', 'Big Diamond', '💎', 9999], ['crown', 'Gold Crown', '👑', 25000], ['goldwatch', 'Gold Watch', '⌚', 2499]] },
  { id: 'market', name: 'Fresh Market', icon: '🍎', color: '#65a30d', items: [
    ['apple', 'Apple', '🍎', 0.99], ['bananas', 'Bananas', '🍌', 1.29], ['milk', 'Milk', '🥛', 3.79], ['eggs', 'Dozen Eggs', '🥚', 4.29],
    ['pizza', 'Frozen Pizza', '🍕', 8.99], ['cheese', 'Cheese', '🧀', 6.49], ['watermelon', 'Watermelon', '🍉', 5.99], ['carrots', 'Carrots', '🥕', 1.99]] },
  { id: 'music', name: 'Music Box', icon: '🎸', color: '#dc2626', items: [
    ['guitar', 'Guitar', '🎸', 299], ['keyboard', 'Keyboard', '🎹', 449], ['drums', 'Drum Kit', '🥁', 799], ['violin', 'Violin', '🎻', 399], ['trumpet', 'Trumpet', '🎺', 529], ['mic', 'Microphone', '🎤', 99.99]] },
  { id: 'cars', name: 'Turbo Motors', icon: '🚗', color: '#1d4ed8', items: [
    ['familycar', 'Family Car', '🚗', 27500], ['sportscar', 'Sports Car', '🏎️', 189000], ['pickup', 'Pickup Truck', '🛻', 42900], ['motorcycle', 'Motorcycle', '🏍️', 12499],
    ['escooter', 'Electric Scooter', '🛴', 599], ['camper', 'Camper Van', '🚐', 89000]] },
  { id: 'homes', name: 'Dream Homes Realty', icon: '🏡', color: '#0d9488', items: [
    ['house', 'Cozy House', '🏠', 385000], ['familyhome', 'Family Home', '🏡', 649000], ['apartment', 'City Apartment', '🏢', 725000], ['villa', 'Beach Villa', '🏖️', 4200000], ['castle', 'Castle', '🏰', 12500000]] },
  { id: 'aviation', name: 'SkyHigh Aviation', icon: '✈️', color: '#0284c7', items: [
    ['balloon', 'Hot Air Balloon', '🎈', 45000], ['smallplane', 'Small Plane', '🛩️', 350000], ['helicopter', 'Helicopter', '🚁', 2900000], ['jet', 'Private Jet', '✈️', 65000000], ['rocket', 'Rocket', '🚀', 90000000]] },
  { id: 'boats', name: 'Harbor Boats', icon: '⛵', color: '#0369a1', items: [
    ['kayak', 'Kayak', '🛶', 799], ['sailboat', 'Sailboat', '⛵', 85000], ['speedboat', 'Speedboat', '🚤', 129000], ['yacht', 'Yacht', '🛥️', 8500000], ['cruise', 'Cruise Ship', '🚢', 950000000]] },
].map(s => ({ ...s, items: s.items.map(([id, name, icon, d]) => ({ id: s.id + '.' + id, name, icon, cents: $c(d) })) }));
export const ITEMS = Object.fromEntries(SHOPS.flatMap(s => s.items.map(i => [i.id, { ...i, shop: s.name }])));
export const withTax = cents => Math.round(cents * (1 + TAX_RATE));

export function fmtCents(c) {
  const n = BigInt(c), neg = n < 0n, a = neg ? -n : n;
  const d = (a / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','), r = (a % 100n).toString().padStart(2, '0');
  return (neg ? '-$' : '$') + d + '.' + r;
}

const SHOP_W = 470, X0 = 260, FLOOR = 540;
const WORLD_W = X0 * 2 + SHOPS.length * SHOP_W;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const doorX = i => X0 + i * SHOP_W + SHOP_W / 2;

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
  SHOPS.forEach((s, i) => {
    const x = X0 + i * SHOP_W;
    if (x + SHOP_W < vis0 || x > vis1) return;
    drawStore(ctx, s, x, t, nearShop === i);
    // pillar + plant between stores
    ctx.fillStyle = '#f1f5f9'; ctx.fillRect(x - 12, 122, 24, FLOOR - 122);
    ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(x + 4, 122, 8, FLOOR - 122);
    if (i % 3 === 1) {
      ctx.fillStyle = '#a16207'; rrect(ctx, x - 22, FLOOR - 10, 44, 34, 6); ctx.fill();
      ctx.fillStyle = '#16a34a';
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + (k - 2) * 9, FLOOR - 26 - Math.abs(k - 2) * -4, 10, 22, (k - 2) * 0.35, 0, Math.PI * 2); ctx.fill(); }
    }
    // fountain in the middle of the mall
    if (i === 8) drawFountain(ctx, x + SHOP_W, t);
  });
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
  ctx.fillStyle = '#fff'; fitText(ctx, s.icon + ' ' + s.name, x + SHOP_W / 2, 173, SHOP_W - 110);
  ctx.shadowBlur = 0;
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
    x: rand(X0, WORLD_W - X0), y: rand(FLOOR + 40, FLOOR + 150), dir: Math.random() < 0.5 ? -1 : 1, speed: rand(50, 110), phase: rand(0, 6),
    look: { skin: SKINS[(Math.random() * SKINS.length) | 0], hair: HAIRS[(Math.random() * 7) | 0], style: HAIR_STYLES[(Math.random() * 5) | 0], shirt: SHIRTS[(Math.random() * SHIRTS.length) | 0] },
    bag: Math.random() < 0.6 ? SHOPS[(Math.random() * SHOPS.length) | 0].color : null, pause: 0,
  }));
  const S = { t: 0, mode: 'walk', shop: -1, sel: 0, navT: 0, lastNav: '', busy: false, receipt: null, receiptT: 0, error: null, mapSel: 0, labelKey: '', intro: 0 };
  let camX = 0;

  const prof = () => shop.profile() || profile;
  const balances = () => ({ moneyC: moneyCentsOf(prof()), coins: coinsOf(prof()) });
  const payPlan = total => planFor(prof(), total);

  function nav(onMove) {
    // joystick / arrows step the selection once per push, then repeat while held
    const dx = input.mx > 0.5 ? 1 : input.mx < -0.5 ? -1 : 0, dy = input.my > 0.5 ? 1 : input.my < -0.5 ? -1 : 0;
    const key = dx + ',' + dy;
    if (key === '0,0') { S.lastNav = key; return; }
    if (key !== S.lastNav || S.navT <= 0) { onMove(dx, dy); S.navT = key !== S.lastNav ? 0.35 : 0.12; S.lastNav = key; audio.play('tick'); }
  }

  async function buy(item) {
    if (S.busy) return;
    const total = withTax(item.cents), plan = payPlan(total);
    if (!plan) { S.error = 'Not enough money or coins for this.'; S.errorT = 0; audio.play('fault'); return; }
    S.busy = true;
    try {
      await shop.buy(item, total);
      S.receipt = { item, total, plan }; S.receiptT = 0;
      audio.play('coin'); fx.confetti(640, 360, 40);
    } catch (e) {
      console.error(e);
      S.error = e.code === 'not-enough' ? 'Not enough money or coins for this.' : 'Could not complete the purchase: ' + (e.code || e.message); S.errorT = 0;
      audio.play('fault');
    }
    S.busy = false;
  }

  function nearShop() {
    for (let i = 0; i < SHOPS.length; i++) if (Math.abs(me.x - doorX(i)) < SHOP_W / 2 - 12) return i;
    return -1;
  }

  function update(dt) {
    S.t += dt; S.intro += dt; S.navT -= dt; S.receiptT += dt; if (S.errorT !== undefined) S.errorT += dt;
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
      if (Math.random() < dt * 0.08) n.pause = rand(1, 3);
    }
    if (S.mode === 'walk') {
      const sp = 430;
      me.vx += (input.mx * sp - me.vx) * Math.min(1, dt * 10);
      me.x = clamp(me.x + me.vx * dt, X0 - 120, WORLD_W - X0 + 120);
      me.y = clamp(me.y + input.my * 160 * dt, FLOOR + 30, FLOOR + 160);
      if (Math.abs(me.vx) > 10) me.flip = me.vx < 0;
      me.phase += Math.abs(me.vx) * dt * 0.035 + Math.abs(input.my) * dt * 5;
      const ns = nearShop();
      if (input.a.pressed && ns >= 0) { S.mode = 'shop'; S.shop = ns; S.sel = 0; audio.play('select'); }
      else if (input.b.pressed) { S.mode = 'map'; S.mapSel = Math.max(0, ns); audio.play('select'); }
    } else if (S.mode === 'shop') {
      const items = SHOPS[S.shop].items, cols = 4;
      nav((dx, dy) => { S.sel = clamp(S.sel + dx + dy * cols, 0, items.length - 1); });
      if (input.a.pressed) buy(items[S.sel]);
      if (input.b.pressed && !S.busy) { S.mode = 'walk'; audio.play('back'); }
    } else if (S.mode === 'map') {
      const half = Math.ceil(SHOPS.length / 2);
      nav((dx, dy) => {
        let col = S.mapSel >= half ? 1 : 0, row = S.mapSel - col * half;
        col = clamp(col + dx, 0, 1); row = clamp(row + dy, 0, half - 1);
        S.mapSel = Math.min(SHOPS.length - 1, col * half + row);
      });
      if (input.a.pressed) { me.x = doorX(S.mapSel); me.y = FLOOR + 70; me.vx = 0; S.mode = 'walk'; audio.play('whoosh'); fx.dust(640, FLOOR + 70, 8); }
      if (input.b.pressed) { S.mode = 'walk'; audio.play('back'); }
    }
    camX += (clamp(me.x - 640, 0, WORLD_W - 1280) - camX) * Math.min(1, dt * 6);
  }

  function draw(ctx, view) {
    const ns = S.mode === 'walk' ? nearShop() : -1;
    drawMall(ctx, view, camX, S.t, ns);
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
      if (ns >= 0) prompt(ctx, `${input.touchMode ? 'Tap ENTER' : 'Press SPACE'} to go into ${SHOPS[ns].name}`, 1, '#fde68a');
      else prompt(ctx, input.touchMode ? 'Walk to a shop door · MAP to jump to any shop' : 'Arrows to walk · SPACE enter a shop · SHIFT mall map', 0.85);
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
    const s = SHOPS[S.shop], items = s.items, cols = 4;
    const X = 90, Y = 70, W = 1100, H = 580;
    panel(ctx, X, Y, W, H, s.icon + ' ' + s.name, s.color);
    const cw = 252, ch = 132, gx = 16, gy = 14, ox = X + (W - (cols * cw + (cols - 1) * gx)) / 2, oy = Y + 84;
    items.forEach((it, i) => {
      const cx = ox + (i % cols) * (cw + gx), cy = oy + Math.floor(i / cols) * (ch + gy);
      const sel = i === S.sel, owned = (prof().inventory || {})[it.id] || 0;
      ctx.fillStyle = sel ? shade(s.color, -0.2) : '#1e293b'; rrect(ctx, cx, cy, cw, ch, 16); ctx.fill();
      if (sel) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4; rrect(ctx, cx, cy, cw, ch, 16); ctx.stroke(); }
      ctx.font = '52px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(it.icon, cx + 50, cy + 66);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito'; fitTextLeft(ctx, it.name, cx + 96, cy + 42, cw - 106);
      ctx.fillStyle = '#facc15'; ctx.font = "24px 'Lilita One'"; fitTextLeft(ctx, fmtCents(it.cents), cx + 96, cy + 76, cw - 106);
      if (owned) { ctx.fillStyle = '#86efac'; ctx.font = '800 13px Nunito'; ctx.fillText(`You own ${owned}`, cx + 96, cy + 106); }
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
    ctx.textAlign = 'right'; ctx.fillStyle = '#cbd5e1'; ctx.font = '900 16px Nunito';
    ctx.fillText(S.busy ? 'Paying…' : input.touchMode ? 'BUY to pay · LEAVE to exit' : 'SPACE buy · SHIFT leave', X + W - 44, by + 42);
  }
  function fitTextLeft(ctx, text, x, y, maxW) {
    const w = ctx.measureText(text).width;
    if (w > maxW) { ctx.save(); ctx.translate(x, y); ctx.scale(maxW / w, 1); ctx.fillText(text, 0, 0); ctx.restore(); }
    else ctx.fillText(text, x, y);
  }

  function drawMap(ctx) {
    const X = 190, Y = 60, W = 900, H = 600, half = Math.ceil(SHOPS.length / 2);
    panel(ctx, X, Y, W, H, '🗺️ Mall Directory', '#7c3aed');
    SHOPS.forEach((s, i) => {
      const col = i >= half ? 1 : 0, row = i - col * half;
      const x = X + 30 + col * (W / 2 - 15), y = Y + 84 + row * 54, w = W / 2 - 45;
      const sel = i === S.mapSel;
      ctx.fillStyle = sel ? s.color : '#1e293b'; rrect(ctx, x, y, w, 46, 12); ctx.fill();
      if (sel) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; rrect(ctx, x, y, w, 46, 12); ctx.stroke(); }
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = '900 19px Nunito';
      ctx.fillText(`${s.icon}  ${s.name}`, x + 14, y + 24);
      const cheapest = Math.min(...s.items.map(i => i.cents));
      ctx.textAlign = 'right'; ctx.font = '800 13px Nunito'; ctx.fillStyle = sel ? '#fff' : '#94a3b8';
      ctx.fillText('from ' + fmtCents(cheapest), x + w - 14, y + 24);
    });
    const owned = Object.values(prof().inventory || {}).reduce((a, b) => a + b, 0);
    ctx.textAlign = 'center'; ctx.fillStyle = '#cbd5e1'; ctx.font = '800 15px Nunito';
    ctx.fillText(`🛍️ You own ${owned} item${owned === 1 ? '' : 's'} · ${input.touchMode ? 'GO to walk there · CLOSE' : 'SPACE go · SHIFT close'}`, X + W / 2, Y + H - 22);
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
  tagline: 'Shop 18 stores with real prices',
  desc: 'Walk the ROBLOC Mall and buy toys, food, pets, phones, cars, houses and even jets, with real prices and sales tax.',
  music: 'mall',
  noDifficulty: true,
  playLabel: 'ENTER MALL',
  labels: { a: 'ENTER', b: 'MAP' },
  options: [],
  howto: `<ul>
    <li><b>Walk</b> with the joystick or arrows. Stand at a shop door and press <b>ENTER</b> (<kbd>Space</kbd>).</li>
    <li><b>MAP</b> (<kbd>Shift</kbd>) opens the mall directory so you can jump to any of the 18 shops.</li>
    <li>In a shop, pick an item and press <b>BUY</b>. Prices are real and ${Math.round(TAX_RATE * 100)}% sales tax is added at checkout.</li>
    <li>You pay with your money ($) first. If you don't have enough money, you can pay with coins: 1 coin = $1.</li>
    <li>Everything you buy is saved to your account. Earn more coins by playing the other games.</li>
  </ul>`,
  create,
  drawThumb,
};
