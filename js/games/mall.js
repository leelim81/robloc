// ROBLOC Shopping Mall: walk a seven-floor mall (five shop floors plus B1 car parks and the R Roof), enter shops and buy things at real-world prices.
// Prices are in cents. Purchases are paid with money ($) first, or with coins at 1 coin = $1.
// The 8% sales tax on every purchase goes to Trevor, the boss.
import { drawHuman, shade, rrect, SKINS, HAIRS, HAIR_STYLES, SHIRTS } from '../art.js';
import { drawBanner } from '../fx.js';
import { payPlan as planFor, coinsOf, moneyCentsOf, formatShort } from '../economy.js';

import { SHOP_COUNT, SECTIONS, shopInfo, shopItems, withTax, fmtCents, TAX_RATE } from './shops.js';

const SHOP_W = 470, X0 = 260, FLOOR = 540;
// The mall has 7 floors: 1 = shops, 2 = food, 3 = drinks, 4 = clothes, 5 = makeup, B1 = car parks (no shops), R = Roof (no shops, open-air: 10 pools, 5 golf courses, playgrounds, gardens, sports, picnics).
const B1_FLOOR = 5, BAYS = 120, BAY_W = 230;
const ROOF_FLOOR = 6, ROOF_W = 14500;
const FLOORS = [
  { name: 'Shops', title: 'Floor 1 · Shops', icon: '🛍️', wall: ['#e0e7ff', '#f8fafc'], tile: ['#e7e5e4', '#d6d3d1'] },
  { name: 'Food', title: 'Floor 2 · Food Court', icon: '🍔', wall: ['#ffedd5', '#fff7ed'], tile: ['#fef3c7', '#fde68a'] },
  { name: 'Drinks', title: 'Floor 3 · Drinks', icon: '🧋', wall: ['#cffafe', '#f0fdfa'], tile: ['#ccfbf1', '#99f6e4'] },
  { name: 'Clothes', title: 'Floor 4 · Clothes & Shoes', icon: '👕', wall: ['#fce7f3', '#fdf2f8'], tile: ['#f5d0fe', '#e9d5ff'] },
  { name: 'Makeup', title: 'Floor 5 · Makeup', icon: '💄', wall: ['#fbcfe8', '#fff1f2'], tile: ['#f9a8d4', '#fda4af'] },
  { name: 'Car Parks', title: 'B1 · Car Parks', icon: '🅿️', wall: ['#94a3b8', '#e2e8f0'], tile: ['#78716c', '#a8a29e'] },
  { name: 'Roof', title: 'R · Roof', icon: '🏊', wall: ['#7dd3fc', '#e0f2fe'], tile: ['#fde68a', '#fef3c7'] },
];
const floorOf = i => SECTIONS.findIndex(s => i >= s.from && i < s.to);
const worldW = f => f === B1_FLOOR ? X0 * 2 + BAYS * BAY_W : f === ROOF_FLOOR ? X0 * 2 + ROOF_W : X0 * 2 + (SECTIONS[f].to - SECTIONS[f].from) * SHOP_W;
const ELEV_X = X0 - 130;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const MAP_PAGE = 16;

// ---------- scenery ----------
function drawMall(ctx, view, camX, t, nearShop, floor = 0) {
  const FL = FLOORS[floor], from = SECTIONS[floor].from, count = SECTIONS[floor].to - from, WORLD_W = worldW(floor);
  const x0 = -view.ox, y0 = -view.oy, W = view.W, H = view.H;
  // upper level and skylights
  const wall = ctx.createLinearGradient(0, y0, 0, FLOOR);
  wall.addColorStop(0, FL.wall[0]); wall.addColorStop(1, FL.wall[1]);
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
  fl.addColorStop(0, FL.tile[0]); fl.addColorStop(1, FL.tile[1]);
  ctx.fillStyle = fl; ctx.fillRect(x0, FLOOR, W, y0 + H - FLOOR);
  ctx.strokeStyle = 'rgba(120,113,108,.18)'; ctx.lineWidth = 1.5;
  for (let x = Math.floor((camX + x0) / 90) * 90 - camX; x < x0 + W + 200; x += 90) { ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x - 140, y0 + H); ctx.stroke(); }
  for (let y = FLOOR + 30; y < y0 + H; y += 40) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + W, y); ctx.stroke(); }

  ctx.save(); ctx.translate(-camX, 0);
  const vis0 = camX + x0 - SHOP_W, vis1 = camX + x0 + W + SHOP_W;
  // elevator at the start of every floor, mall exit at the end
  if (ELEV_X > vis0) drawElevator(ctx, ELEV_X, floor, t, nearShop === 'elevator');
  const ex = WORLD_W - X0 + 130;
  if (ex < vis1) {
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(ex - 110, 140, 220, FLOOR - 140);
    ctx.fillStyle = '#bae6fd'; ctx.fillRect(ex - 95, 190, 190, FLOOR - 190);
    ctx.fillStyle = '#0f172a'; ctx.font = "26px 'Lilita One'"; ctx.textAlign = 'center'; ctx.fillText('ROBLOC MALL', ex, 172);
  }
  if (floor === B1_FLOOR) drawBays(ctx, camX, x0, W);
  else if (floor === ROOF_FLOOR) drawRoof(ctx, camX, x0, W, t);
  else {
    const first = clamp(Math.floor((vis0 - X0) / SHOP_W), 0, count - 1), last = clamp(Math.ceil((vis1 - X0) / SHOP_W), 0, count - 1);
    for (let li = first; li <= last; li++) {
      const i = from + li, x = X0 + li * SHOP_W;
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
      if (li % 9 === 8) drawFountain(ctx, x + SHOP_W, t);
    }
  }
  ctx.restore();
}
// B1 car park: numbered bays along the hallway, most with a parked car (same car in the same bay every time).
function bayRand(i) { let s = (i * 2654435761 + 97) >>> 0; s ^= s >>> 15; s = (s * 2246822519) >>> 0; return ((s ^ (s >>> 13)) >>> 0) / 4294967296; }
const CAR_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#64748b', '#eab308'];
// The cars are bigger than their bays (Trevor: "make the cars bigger than
// the paper") - a parked car is 240 wide in a 230-wide bay, so it sticks
// out past the bay's painted lines on both sides.
const CAR_S = 2;
function drawCar(ctx, x, y, s, color) {
  ctx.fillStyle = color; rrect(ctx, x, y - 46 * s, 120 * s, 34 * s, 10); ctx.fill();
  ctx.fillStyle = shade(color, 0.25); rrect(ctx, x + 22 * s, y - 68 * s, 62 * s, 26 * s, 8); ctx.fill();
  ctx.fillStyle = '#bae6fd'; rrect(ctx, x + 30 * s, y - 62 * s, 20 * s, 18 * s, 4); ctx.fill(); rrect(ctx, x + 56 * s, y - 62 * s, 20 * s, 18 * s, 4); ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath(); ctx.arc(x + 28 * s, y - 8 * s, 13 * s, 0, Math.PI * 2); ctx.arc(x + 92 * s, y - 8 * s, 13 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath(); ctx.arc(x + 28 * s, y - 8 * s, 6 * s, 0, Math.PI * 2); ctx.arc(x + 92 * s, y - 8 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
}
// B1 car park: the bays are painted ON THE FLOOR, not on the wall.
// Each bay is a ground plot (a trapezoid following the floor's perspective),
// with its number painted on the floor and the car parked inside it.
function drawBays(ctx, camX, x0, W) {
  const first = clamp(Math.floor((camX + x0 - X0) / BAY_W), 0, BAYS - 1), last = clamp(Math.ceil((camX + x0 + W - X0) / BAY_W), 0, BAYS - 1);
  // The bay plot on the floor: from just below the wall base to 125px out,
  // slanting the same way as the floor tiles (-140 over the floor height).
  const TOP = FLOOR + 5, BOT = FLOOR + 125, SLANT = -93;
  const shiftAt = y => SLANT * (y - TOP) / (BOT - TOP);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = first; i <= last; i++) {
    const x = X0 + i * BAY_W;
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 6, TOP); ctx.lineTo(x + 6 + SLANT, BOT);
    ctx.moveTo(x + BAY_W - 6, TOP); ctx.lineTo(x + BAY_W - 6 + SLANT, BOT);
    ctx.moveTo(x + 6 + SLANT, BOT); ctx.lineTo(x + BAY_W - 6 + SLANT, BOT);
    ctx.stroke();
    // Bay number painted on the floor at the front of the bay.
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = "900 24px 'Lilita One'";
    ctx.fillText('B' + (i + 1), x + BAY_W / 2 + SLANT, BOT - 20);
    // The car parks inside its bay on the floor (wheels touch the ground),
    // but it is bigger than the bay - it sticks out past the bay's lines.
    const carY = FLOOR + 60;
    if (bayRand(i) < 0.75) drawCar(ctx, x + (BAY_W - 120 * CAR_S) / 2 + shiftAt(carY), carY, CAR_S, CAR_COLORS[Math.floor(bayRand(i + 1000) * CAR_COLORS.length)]);
    else { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '900 16px Nunito'; ctx.fillText('EMPTY', x + BAY_W / 2 + shiftAt((TOP + BOT) / 2), (TOP + BOT) / 2); }
  }
}
// R Roof: an open-air top floor with NO roof over it - just sky above.
// 10 swimming pools, 5 golf courses, 3 playgrounds, 3 gardens, 3 sports
// courts, 2 picnic areas and 2 sunbathing areas, plus sun chairs,
// umbrellas and palm trees. The name is R for Roof because it is the
// top floor, but there is no roof covering it - it is outdoors.
const POOL_COLORS = ['#38bdf8', '#0ea5e9', '#0284c7'];
const TOWEL_COLORS = ['#f43f5e', '#f59e0b', '#22c55e', '#a855f7', '#ec4899', '#0ea5e9'];
const FLOWER_COLORS = ['#f43f5e', '#facc15', '#ec4899', '#a855f7', '#f97316', '#fff'];
// 28 outdoor things along the roof: 10 pools, 5 golf courses, 3 playgrounds,
// 3 gardens, 3 sports courts, 2 picnic areas, 2 sunbathing areas.
const ROOF_FEATURES = [
  'pool', 'pool', 'golf', 'play', 'garden', 'sport',
  'pool', 'pool', 'golf', 'play', 'garden', 'sport',
  'pool', 'pool', 'golf', 'play', 'garden', 'sport',
  'pool', 'pool', 'golf', 'picnic', 'sun',
  'pool', 'pool', 'golf', 'picnic', 'sun',
];
const ROOF_SLOT = 500, ROOF_FEAT_W = 430;
function drawRoof(ctx, camX, x0, W, t) {
  // Open sky: sun, clouds and birds. No roof over this floor.
  ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(X0 + 200, 90, 46, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(X0 + 200, 90, 32, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (const [cx, cy, s] of [[X0 + 900, 70, 1], [X0 + 2500, 110, 1.3], [X0 + 4500, 60, 0.9], [X0 + 6500, 100, 1.1], [X0 + 8500, 70, 1], [X0 + 10500, 110, 1.2], [X0 + 12500, 70, 1], [X0 + 14000, 100, 1]]) {
    ctx.beginPath(); ctx.ellipse(cx, cy, 70 * s, 22 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 40 * s, cy + 8 * s, 50 * s, 18 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Birds flying in the open sky.
  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let b = 0; b < 6; b++) {
    const bx = X0 + 600 + b * 2200 + Math.sin(t * 0.5 + b * 2) * 60;
    const by = 200 + (b % 3) * 40 + Math.sin(t * 0.8 + b) * 8;
    const flap = Math.sin(t * 6 + b * 3) * 6;
    ctx.beginPath(); ctx.moveTo(bx - 14, by + flap); ctx.quadraticCurveTo(bx - 4, by - 6, bx, by); ctx.quadraticCurveTo(bx + 4, by - 6, bx + 14, by + flap); ctx.stroke();
  }
  // A "ROOF" sign on the back wall.
  ctx.fillStyle = '#0f172a'; ctx.font = "900 34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('☀️ ROOF · R ☀️', X0 + ROOF_W / 2, 180);
  let poolN = 0, golfN = 0, playN = 0, gardenN = 0, sportN = 0, picnicN = 0, sunN = 0;
  for (let k = 0; k < ROOF_FEATURES.length; k++) {
    const px = X0 + 50 + k * ROOF_SLOT, pw = ROOF_FEAT_W, top = FLOOR + 25, bot = FLOOR + 135;
    const kind = ROOF_FEATURES[k];
    ctx.font = "900 22px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (kind === 'pool') {
      poolN++;
      // deck edge around the pool
      ctx.fillStyle = '#fef9c3'; rrect(ctx, px - 14, top - 14, pw + 28, bot - top + 28, 18); ctx.fill();
      // water
      ctx.fillStyle = POOL_COLORS[(poolN - 1) % POOL_COLORS.length]; rrect(ctx, px, top, pw, bot - top, 14); ctx.fill();
      // waves
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3;
      for (let w = 0; w < 3; w++) {
        const wy = top + 28 + w * 32;
        ctx.beginPath();
        for (let x = px + 20; x <= px + pw - 20; x += 20) {
          const y = wy + Math.sin((x + t * 40 + k * 50) * 0.02) * 5;
          if (x === px + 20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // beach ball floating on the water
      const bx = px + 110 + Math.sin(t * 0.7 + k * 2) * 55, by = top + 55;
      ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(bx, by, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, 22, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.arc(bx, by, 22, Math.PI / 2, Math.PI); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText('POOL ' + poolN, px + pw / 2, bot - 20);
    } else if (kind === 'golf') {
      golfN++;
      // the green
      ctx.fillStyle = '#4ade80'; rrect(ctx, px, top + 5, pw, bot - top - 5, 14); ctx.fill();
      ctx.fillStyle = '#22c55e'; rrect(ctx, px + 10, top + 15, pw - 20, bot - top - 25, 10); ctx.fill();
      // sand bunker
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.ellipse(px + 80, bot - 28, 50, 13, 0, 0, Math.PI * 2); ctx.fill();
      // the hole
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(px + pw - 100, top + 65, 11, 0, Math.PI * 2); ctx.fill();
      // flag pole and flag by the hole
      const fx = px + pw - 100;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(fx, top + 65); ctx.lineTo(fx, top - 28); ctx.stroke();
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(fx, top - 28); ctx.lineTo(fx + 40, top - 16); ctx.lineTo(fx, top - 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText('GOLF ' + golfN, px + pw / 2, bot - 20);
    } else if (kind === 'play') {
      playN++;
      // soft play mat
      ctx.fillStyle = '#bbf7d0'; rrect(ctx, px, top + 5, pw, bot - top - 5, 14); ctx.fill();
      // swing set: posts, bar and two swaying swings
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(px + 45, bot); ctx.lineTo(px + 45, top + 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px + 195, bot); ctx.lineTo(px + 195, top + 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px + 40, top + 18); ctx.lineTo(px + 200, top + 18); ctx.stroke();
      for (let sw = 0; sw < 2; sw++) {
        const sx = px + 80 + sw * 80, sway = Math.sin(t * 1.4 + sw * 2 + k) * 8;
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sx, top + 18); ctx.lineTo(sx + sway, bot - 28); ctx.stroke();
        ctx.fillStyle = '#f59e0b'; rrect(ctx, sx + sway - 22, bot - 28, 44, 10, 4); ctx.fill();
      }
      // slide: ladder and slope
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(px + 260, bot); ctx.lineTo(px + 260, top + 35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px + 285, bot); ctx.lineTo(px + 285, top + 35); ctx.stroke();
      for (let r = 0; r < 4; r++) { ctx.beginPath(); ctx.moveTo(px + 260, top + 45 + r * 20); ctx.lineTo(px + 285, top + 45 + r * 20); ctx.stroke(); }
      ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.moveTo(px + 285, top + 35); ctx.lineTo(px + 395, bot - 8); ctx.lineTo(px + 395, bot + 2); ctx.lineTo(px + 285, top + 48); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText('PLAYGROUND ' + playN, px + pw / 2, bot - 20);
    } else if (kind === 'garden') {
      gardenN++;
      // grass
      ctx.fillStyle = '#86efac'; rrect(ctx, px, top + 5, pw, bot - top - 5, 14); ctx.fill();
      // flower beds: rows of flowers
      for (let f = 0; f < 10; f++) {
        const fx = px + 30 + (f % 5) * 70, fy = top + 45 + Math.floor(f / 5) * 35;
        ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(fx, fy + 12); ctx.lineTo(fx, fy - 6); ctx.stroke();
        ctx.fillStyle = FLOWER_COLORS[(f + k) % FLOWER_COLORS.length];
        ctx.beginPath(); ctx.arc(fx, fy - 8, 8, 0, Math.PI * 2); ctx.fill();
      }
      // bushes
      ctx.fillStyle = '#16a34a';
      ctx.beginPath(); ctx.arc(px + 40, bot - 22, 20, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + 75, bot - 16, 15, 0, Math.PI * 2); ctx.fill();
      // a small tree
      ctx.strokeStyle = '#92400e'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(px + 370, bot - 8); ctx.lineTo(px + 370, top + 45); ctx.stroke();
      ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(px + 370, top + 35, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText('GARDEN ' + gardenN, px + pw / 2, bot - 20);
    } else if (kind === 'sport') {
      sportN++;
      const sport = ['BASKETBALL', 'TENNIS', 'FOOTBALL'][(sportN - 1) % 3];
      if (sport === 'BASKETBALL') {
        // court
        ctx.fillStyle = '#fdba74'; rrect(ctx, px, top + 5, pw, bot - top - 5, 14); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + pw / 2, bot - 10, 55, Math.PI, 0); ctx.stroke();
        // hoop: pole, backboard, rim, net
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(px + pw - 45, bot); ctx.lineTo(px + pw - 45, top + 20); ctx.stroke();
        ctx.fillStyle = '#fff'; rrect(ctx, px + pw - 75, top + 12, 60, 42, 4); ctx.fill();
        ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px + pw - 45, top + 62, 14, 0, Math.PI * 2); ctx.stroke();
        // basketball
        ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(px + 90, bot - 22, 16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px + 90, bot - 22, 16, 0, Math.PI * 2); ctx.stroke();
      } else if (sport === 'TENNIS') {
        // court
        ctx.fillStyle = '#38bdf8'; rrect(ctx, px, top + 5, pw, bot - top - 5, 14); ctx.fill();
        ctx.fillStyle = '#4ade80'; rrect(ctx, px + 30, top + 20, pw - 60, bot - top - 35, 8); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(px + 30, top + 20, pw - 60, bot - top - 35);
        // net across the middle
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px + 30, top + 65); ctx.lineTo(px + pw - 30, top + 65); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + pw / 2, top + 20); ctx.lineTo(px + pw / 2, bot - 15); ctx.stroke();
        // tennis ball
        ctx.fillStyle = '#d9f99d'; ctx.beginPath(); ctx.arc(px + 90, bot - 22, 12, 0, Math.PI * 2); ctx.fill();
      } else {
        // football goal
        ctx.fillStyle = '#4ade80'; rrect(ctx, px, top + 5, pw, bot - top - 5, 14); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(px + 40, top + 30, pw - 80, bot - top - 45);
        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(px + pw / 2 - 70, bot - 5); ctx.lineTo(px + pw / 2 - 70, top + 30); ctx.lineTo(px + pw / 2 + 70, top + 30); ctx.lineTo(px + pw / 2 + 70, bot - 5); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
        for (let n = 0; n < 3; n++) { ctx.beginPath(); ctx.moveTo(px + pw / 2 - 70 + n * 35, top + 30); ctx.lineTo(px + pw / 2 - 70 + n * 35, bot - 5); ctx.stroke(); }
        // football
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px + 80, bot - 20, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(px + 80, bot - 20, 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#fff';
      ctx.fillText(sport, px + pw / 2, bot - 20);
    } else if (kind === 'picnic') {
      picnicN++;
      // grass + checkered blanket
      ctx.fillStyle = '#86efac'; rrect(ctx, px, top + 5, pw, bot - top - 5, 14); ctx.fill();
      ctx.fillStyle = '#fff'; rrect(ctx, px + 30, bot - 55, 130, 45, 6); ctx.fill();
      ctx.fillStyle = '#f43f5e';
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) ctx.fillRect(px + 30 + c * 44, bot - 55 + r * 23, 22, 23);
      // picnic table
      ctx.fillStyle = '#92400e'; rrect(ctx, px + 220, bot - 45, 150, 12, 4); ctx.fill();
      ctx.fillStyle = '#92400e'; rrect(ctx, px + 210, bot - 20, 170, 10, 4); ctx.fill();
      ctx.fillStyle = '#78350f'; rrect(ctx, px + 285, bot - 45, 10, 45, 3); ctx.fill();
      // BBQ grill with smoke
      ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(px + 390, bot - 30, 18, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px + 378, bot - 18); ctx.lineTo(px + 372, bot); ctx.moveTo(px + 402, bot - 18); ctx.lineTo(px + 408, bot); ctx.stroke();
      ctx.strokeStyle = 'rgba(148,163,184,.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px + 390, bot - 48); ctx.quadraticCurveTo(px + 382, bot - 62, px + 392, bot - 74); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText('PICNIC ' + picnicN, px + pw / 2, bot - 20);
    } else if (kind === 'sun') {
      sunN++;
      // two sun chairs and an umbrella
      ctx.strokeStyle = '#92400e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(px + pw / 2, bot); ctx.lineTo(px + pw / 2, top + 35); ctx.stroke();
      ctx.fillStyle = TOWEL_COLORS[(sunN + 1) % TOWEL_COLORS.length];
      ctx.beginPath(); ctx.moveTo(px + pw / 2 - 60, top + 45); ctx.quadraticCurveTo(px + pw / 2, top - 5, px + pw / 2 + 60, top + 45); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(px + pw / 2 - 20, top + 45); ctx.quadraticCurveTo(px + pw / 2, top + 8, px + pw / 2 + 20, top + 45); ctx.closePath(); ctx.fill();
      for (const cx of [px + 70, px + pw - 70]) {
        ctx.fillStyle = '#78716c'; rrect(ctx, cx - 50, bot - 12, 100, 12, 5); ctx.fill();
        ctx.fillStyle = '#78716c'; ctx.save(); ctx.translate(cx - 40, bot - 12); ctx.rotate(-0.5); rrect(ctx, -5, -30, 10, 32, 4); ctx.fill(); ctx.restore();
        ctx.fillStyle = TOWEL_COLORS[(sunN + 3) % TOWEL_COLORS.length]; rrect(ctx, cx - 40, bot - 16, 80, 7, 3); ctx.fill();
      }
      ctx.fillStyle = '#fff';
      ctx.fillText('SUN CHAIRS', px + pw / 2, bot - 20);
    }
  }
  // A sun chair and umbrella at the far end, past the last feature.
  const sx = X0 + 50 + ROOF_FEATURES.length * ROOF_SLOT + 140;
  ctx.strokeStyle = '#92400e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx, FLOOR + 150); ctx.lineTo(sx, FLOOR + 70); ctx.stroke();
  ctx.fillStyle = TOWEL_COLORS[0];
  ctx.beginPath(); ctx.moveTo(sx - 55, FLOOR + 78); ctx.quadraticCurveTo(sx, FLOOR + 18, sx + 55, FLOOR + 78); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(sx - 18, FLOOR + 78); ctx.quadraticCurveTo(sx, FLOOR + 30, sx + 18, FLOOR + 78); ctx.closePath(); ctx.fill();
  const cx = sx - 110;
  ctx.fillStyle = '#78716c'; rrect(ctx, cx - 55, FLOOR + 150, 110, 14, 6); ctx.fill();
  ctx.fillStyle = '#78716c'; ctx.save(); ctx.translate(cx - 45, FLOOR + 150); ctx.rotate(-0.5); rrect(ctx, -6, -34, 12, 36, 5); ctx.fill(); ctx.restore();
  ctx.fillStyle = TOWEL_COLORS[3]; rrect(ctx, cx - 45, FLOOR + 146, 90, 8, 4); ctx.fill();
  // Palm tree at the far end of the roof.
  const tx = X0 + ROOF_W - 120;
  ctx.strokeStyle = '#92400e'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(tx, FLOOR + 160); ctx.quadraticCurveTo(tx + 20, FLOOR + 80, tx + 55, FLOOR + 40); ctx.stroke();
  ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 8;
  for (let a = 0; a < 5; a++) {
    const ang = Math.PI * (0.15 + a * 0.18);
    ctx.beginPath(); ctx.moveTo(tx + 55, FLOOR + 40);
    ctx.quadraticCurveTo(tx + 55 + Math.cos(ang) * 50, FLOOR + 40 - Math.sin(ang) * 40, tx + 55 + Math.cos(ang) * 85, FLOOR + 40 - Math.sin(ang) * 20 + 22); ctx.stroke();
  }
  ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.arc(tx + 55, FLOOR + 44, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.arc(tx + 48, FLOOR + 50, 7, 0, Math.PI * 2); ctx.arc(tx + 62, FLOOR + 50, 7, 0, Math.PI * 2); ctx.fill();
}
function drawElevator(ctx, x, floor, t, near) {
  ctx.fillStyle = '#475569'; ctx.fillRect(x - 115, 130, 230, FLOOR - 130);
  ctx.fillStyle = '#0f172a'; ctx.fillRect(x - 70, 144, 140, 44);
  ctx.fillStyle = '#f87171'; ctx.font = "30px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${['▲▼', '▲▼', '▲▼', '▲▼', '▲▼', '▲', '▼'][floor]} ${['1', '2', '3', '4', '5', 'B1', 'R'][floor]}`, x, 168);
  const open = near ? 0.35 + Math.sin(t * 3) * 0.05 : 0;
  const dg = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
  dg.addColorStop(0, '#cbd5e1'); dg.addColorStop(0.5, '#f1f5f9'); dg.addColorStop(1, '#94a3b8');
  ctx.fillStyle = '#1e293b'; ctx.fillRect(x - 90, 210, 180, FLOOR - 210);
  ctx.fillStyle = dg;
  ctx.fillRect(x - 90, 210, 90 * (1 - open), FLOOR - 210); ctx.fillRect(x + 90 * open, 210, 90 * (1 - open), FLOOR - 210);
  ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 210); ctx.lineTo(x, FLOOR); ctx.stroke();
  ctx.fillStyle = near ? '#facc15' : '#e2e8f0'; ctx.font = '900 14px Nunito'; ctx.fillText('🛗 ELEVATOR', x, 200);
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
  const me = { x: X0 - 40, y: FLOOR + 90, vx: 0, phase: 0, flip: false };
  let floor = 0;
  const WW = () => worldW(floor);
  const doorX = i => X0 + (i - SECTIONS[floor].from) * SHOP_W + SHOP_W / 2;
  const nearElevator = () => Math.abs(me.x - ELEV_X) < 110;
  const npcs = Array.from({ length: 14 }, () => ({
    x: rand(X0, X0 + 6 * SHOP_W), y: rand(FLOOR + 40, FLOOR + 150), dir: Math.random() < 0.5 ? -1 : 1, speed: rand(50, 110), phase: rand(0, 6),
    look: { skin: SKINS[(Math.random() * SKINS.length) | 0], hair: HAIRS[(Math.random() * 7) | 0], style: HAIR_STYLES[(Math.random() * 5) | 0], shirt: SHIRTS[(Math.random() * SHIRTS.length) | 0] },
    bag: Math.random() < 0.6 ? shopInfo((Math.random() * 60) | 0).color : null, pause: 0,
  }));
  const S = { t: 0, mode: 'walk', shop: -1, sel: 0, navT: 0, navHeld: 0, lastNav: '', busy: false, receipt: null, receiptT: 0, error: null, mapSel: 0, labelKey: '', intro: 0, searchQ: '', searchList: [], searchCount: 0, searchQPrev: null, keysDown: null };
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
      const res = await shop.buy(item, total, total - item.cents);
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
    const li = Math.floor((me.x - X0) / SHOP_W), n = SECTIONS[floor].to - SECTIONS[floor].from, i = SECTIONS[floor].from + li;
    return li >= 0 && li < n && Math.abs(me.x - doorX(i)) < SHOP_W / 2 - 12 ? i : -1;
  }
  function openElevator() { S.mode = 'elevator'; S.walkTo = null; S.autoShop = -1; S.walkPrev = undefined; me.vx = 0; S.liftSel = floor; audio.play('select'); }
  function ride(f) {
    floor = f; me.x = X0 - 40; me.vx = 0; camX = 0; S.mode = 'walk'; S.walkTo = null; S.autoShop = -1; S.walkPrev = undefined;
    for (const n of npcs) n.x = rand(X0, X0 + 5 * SHOP_W);
    S.floorBanner = 0; audio.play('go'); fx.dust(640, FLOOR + 70, 8);
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
  const enterShop = i => { S.mode = 'shop'; S.shop = i; S.sel = 0; S.top = 0; S.walkTo = null; S.autoShop = -1; S.walkPrev = undefined; me.vx = 0; audio.play('select'); };
  const openMap = () => { S.mode = 'map'; S.walkTo = null; S.autoShop = -1; S.walkPrev = undefined; const ns = nearShop(); const sec = SECTIONS[floor]; S.mapSel = Math.max(0, ns >= 0 ? ns : floor === B1_FLOOR || floor === ROOF_FLOOR ? SHOP_COUNT - 1 : clamp(sec.from + Math.floor((me.x - X0) / SHOP_W), sec.from, sec.to - 1)); audio.play('select'); };
  const goToShop = i => {
    if (floorOf(i) !== floor) { floor = floorOf(i); S.floorBanner = 0; for (const n of npcs) n.x = doorX(i) + rand(-1200, 1200); }
    me.x = doorX(i); me.y = FLOOR + 70; me.vx = 0; camX = clamp(me.x - 640, 0, WW() - 1280); S.mode = 'walk'; S.walkTo = null; S.autoShop = -1; S.walkPrev = undefined; audio.play('whoosh'); fx.dust(640, FLOOR + 70, 8);
  };
  // Shop search: tap the letters and every shop with those letters shows up.
  const openSearch = () => { S.mode = 'search'; S.searchQ = ''; S.searchList = []; S.searchCount = 0; S.searchQPrev = null; audio.play('select'); };
  const searchKey = ch => {
    if (ch === '⌫') S.searchQ = S.searchQ.slice(0, -1);
    else if (ch === '✕') S.searchQ = '';
    else if (ch === ' ') { if (S.searchQ && !S.searchQ.endsWith(' ') && S.searchQ.length < 20) S.searchQ += ' '; }
    else if (S.searchQ.length < 20) S.searchQ += ch;
    audio.play('tick');
  };
  // Find every shop whose name has the typed letters (only when the text changed).
  const runSearch = () => {
    if (S.searchQ === S.searchQPrev) return;
    S.searchQPrev = S.searchQ;
    S.searchList = []; S.searchCount = 0;
    const q = S.searchQ.trim().toLowerCase();
    if (!q) return;
    for (let i = 0; i < SHOP_COUNT; i++) {
      if (shopInfo(i).name.toLowerCase().includes(q)) { S.searchCount++; if (S.searchList.length < 6) S.searchList.push(i); }
    }
  };

  function update(dt) {
    handleTaps();
    input.setTapMode(true);   // walk by tapping, so the joystick never blocks taps on shops or the elevator
    S.t += dt; S.intro += dt; S.navT -= dt; S.navHeld += dt; S.receiptT += dt; if (S.errorT !== undefined) S.errorT += dt;
    if (S.receipt && S.receiptT > 2.6) S.receipt = null;
    if (S.error && S.errorT > 2.6) S.error = null;
    const labelKey = S.mode;
    if (labelKey !== S.labelKey) {
      S.labelKey = labelKey;
      const L = { walk: ['ENTER', 'MAP'], shop: ['BUY', 'LEAVE'], map: ['GO', 'CLOSE'], elevator: ['GO', 'CLOSE'], search: ['OPEN', 'CLOSE'] }[labelKey];
      input.setLabels(L[0], L[1]);
    }
    // shoppers
    for (const n of npcs) {
      if (n.pause > 0) { n.pause -= dt; continue; }
      n.x += n.dir * n.speed * dt; n.phase += n.speed * dt * 0.06;
      if (n.x < X0 - 40 || n.x > WW() - X0 + 40) n.dir *= -1;
      if (Math.abs(n.x - me.x) > 1600) { n.x = me.x + (Math.random() < 0.5 ? -1 : 1) * rand(700, 1400); n.dir = n.x > me.x ? -1 : 1; }
      if (Math.random() < dt * 0.08) n.pause = rand(1, 3);
    }
    if (S.mode === 'walk') {
      const sp = 430;
      let mx = input.mx;
      if (mx || input.my) { S.walkTo = null; S.autoShop = -1; S.walkPrev = undefined; }
      else if (S.walkTo !== null && S.walkTo !== undefined) {
        // walking to where the player tapped; enter the shop if they tapped one.
        // Stop dead at the door: zero the speed so he never slides past it,
        // and count it as arrived if he walked past the door (a slow screen
        // can jump over the 18px window in one frame).
        const d = S.walkTo - me.x;
        if (Math.abs(d) < 18 || (S.walkPrev !== undefined && d !== 0 && Math.sign(d) !== Math.sign(S.walkPrev))) {
          S.walkTo = null; S.walkPrev = undefined; me.vx = 0;
          if (S.autoShop >= 0) { const i = S.autoShop; S.autoShop = -1; enterShop(i); return; }
          if (S.autoShop === 'elevator') { S.autoShop = -1; openElevator(); return; }
        }
        else { mx = clamp(d / 120, -1, 1); S.walkPrev = d; }
      }
      me.vx += (mx * sp - me.vx) * Math.min(1, dt * 10);
      me.x = clamp(me.x + me.vx * dt, ELEV_X - 60, WW() - X0 + 120);
      me.y = clamp(me.y + input.my * 160 * dt, FLOOR + 30, FLOOR + 160);
      if (Math.abs(me.vx) > 10) me.flip = me.vx < 0;
      me.phase += Math.abs(me.vx) * dt * 0.035 + Math.abs(input.my) * dt * 5;
      const ns = nearShop();
      if (input.a.pressed && ns >= 0) enterShop(ns);
      else if (input.a.pressed && nearElevator()) openElevator();
      else if (input.b.pressed) openMap();
    } else if (S.mode === 'shop') {
      const items = shopItems(S.shop), cols = 4;
      nav((dx, dy, mult) => { S.sel = clamp(S.sel + dx + dy * cols * mult, 0, items.length - 1); });
      if (input.a.pressed) buy(items[S.sel]);
      if (input.b.pressed) leaveShop();
    } else if (S.mode === 'elevator') {
      nav((dx, dy) => { S.liftSel = clamp(S.liftSel - dy, 0, FLOORS.length - 1); });
      if (input.a.pressed) ride(S.liftSel);
      if (input.b.pressed) { S.mode = 'walk'; audio.play('back'); }
    } else if (S.mode === 'map') {
      // up/down pick a shop, left/right flip pages of 16 (hold to fly through thousands)
      nav((dx, dy, mult) => { S.mapSel = clamp(S.mapSel + dy * mult + dx * MAP_PAGE * mult, 0, SHOP_COUNT - 1); });
      if (input.a.pressed) goToShop(S.mapSel);
      if (input.b.pressed) { S.mode = 'walk'; audio.play('back'); }
    } else if (S.mode === 'search') {
      // physical keyboard too: tap the on-screen letters, or type them
      if (!S.keysDown) S.keysDown = new Set();
      const now = input.keys || new Set();
      for (const code of now) {
        if (S.keysDown.has(code)) continue;
        if (/^Key[A-Z]$/.test(code)) searchKey(code.slice(3));
        else if (code === 'Backspace') searchKey('⌫');
        else if (code === 'Space') searchKey(' ');
      }
      S.keysDown = new Set(now);
      runSearch();
      if (input.a.pressed && S.searchList.length) { const i = S.searchList[0]; goToShop(i); enterShop(i); }
      if (input.b.pressed) { S.mode = 'walk'; audio.play('back'); }
    }
    camX += (clamp(me.x - 640, ELEV_X - 260, WW() - 1280) - camX) * Math.min(1, dt * 6);
    if (S.floorBanner !== undefined) S.floorBanner += dt;
  }

  function draw(ctx, view) {
    hits = [];
    const ns = S.mode === 'walk' ? nearShop() : -1;
    drawMall(ctx, view, camX, S.t, ns >= 0 ? ns : S.mode === 'walk' && nearElevator() ? 'elevator' : -1, floor);
    if (S.mode === 'walk') {
      // tap the floor to walk there, or a shop front to walk in
      hit(-view.ox, -view.oy, view.W, view.H, t => { S.walkTo = clamp(t.x + camX, ELEV_X - 60, WW() - X0 + 120); S.autoShop = -1; S.walkPrev = undefined; });
      const from = SECTIONS[floor].from, n = SECTIONS[floor].to - from;
      const first = Math.max(0, Math.floor((camX - view.ox - X0) / SHOP_W)), last = Math.min(n - 1, Math.ceil((camX - view.ox + view.W - X0) / SHOP_W));
      for (let li = first; li <= last; li++) { const i = from + li; hit(X0 + li * SHOP_W + 12 - camX, 122, SHOP_W - 24, FLOOR - 122, () => { S.walkTo = doorX(i); S.autoShop = i; S.walkPrev = undefined; audio.play('tick'); }); }
      hit(ELEV_X - 115 - camX, 130, 230, FLOOR - 130, () => { S.walkTo = ELEV_X; S.autoShop = 'elevator'; S.walkPrev = undefined; audio.play('tick'); });
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
      button(ctx, 158, 68, 250, 44, `🛗 ${FLOORS[floor].title}`, '#0f766e', openElevator);
      button(ctx, 418, 68, 150, 44, '🔍 SEARCH', '#0ea5e9', openSearch);
      if (ns < 0 && nearElevator()) prompt(ctx, `${input.touchMode ? 'Tap the elevator' : 'Press SPACE'} to change floors`, 1, '#fde68a');
      else if (ns >= 0) prompt(ctx, `${input.touchMode ? 'Tap the shop' : 'Press SPACE'} to go into ${shopInfo(ns).name}`, 1, '#fde68a');
      else prompt(ctx, input.touchMode ? 'Tap a shop to go in · MAP to jump to any shop' : 'Arrows to walk · SPACE enter a shop · SHIFT mall map · or click', 0.85);
      if (S.intro < 2) drawBanner(ctx, 'ROBLOC MALL', 640, 300, S.intro, { size: 96, color: '#fbcfe8', glow: '#db2777', sub: FLOORS[floor].title });
      else if (S.floorBanner !== undefined && S.floorBanner < 1.8) drawBanner(ctx, floor === B1_FLOOR ? 'B1' : floor === ROOF_FLOOR ? 'R' : `FLOOR ${floor + 1}`, 640, 300, S.floorBanner, { size: 96, color: '#a5f3fc', glow: '#0891b2', sub: `${FLOORS[floor].icon} ${FLOORS[floor].name}` });
    }
    if (S.mode === 'shop') drawShop(ctx);
    if (S.mode === 'map') drawMap(ctx);
    if (S.mode === 'search') drawSearch(ctx);
    if (S.mode === 'elevator') drawLift(ctx);
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
    // only scroll when the chosen item is off screen, so tapped items stay under your finger
    if (selRow < S.top) S.top = selRow;
    if (selRow >= S.top + rows) S.top = selRow - rows + 1;
    S.top = clamp(S.top, 0, Math.max(0, totalRows - rows));
    const top = S.top;
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '900 15px Nunito';
    ctx.fillText(`Item ${(S.sel + 1).toLocaleString()} of ${items.length.toLocaleString()}`, X + W - 68, Y + 34);
    items.slice(top * cols, (top + rows) * cols).forEach((it, k) => {
      const i = top * cols + k;
      const cx = ox + (k % cols) * (cw + gx), cy = oy + Math.floor(k / cols) * (ch + gy);
      const sel = i === S.sel;
      ctx.fillStyle = sel ? shade(s.color, -0.2) : '#1e293b'; rrect(ctx, cx, cy, cw, ch, 16); ctx.fill();
      if (sel) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4; rrect(ctx, cx, cy, cw, ch, 16); ctx.stroke(); }
      ctx.font = '48px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.icon, cx + 46, cy + 56);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 17px Nunito'; fitTextLeft(ctx, it.name, cx + 88, cy + 32, cw - 98);
      ctx.fillStyle = '#facc15'; ctx.font = "23px 'Lilita One'"; fitTextLeft(ctx, fmtCents(it.cents), cx + 88, cy + 62, cw - 98);
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
  function leaveShop() { if (!S.busy) { S.mode = 'walk'; me.vx = 0; S.walkPrev = undefined; audio.play('back'); } }
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
    const sec = shopInfo(from).section, icon = { Shops: '🛍️', Food: '🍔', Drinks: '🧋', Clothes: '👕', Makeup: '💄' }[sec];
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
    // page buttons: jump to a section, or move 100 / 1 pages; B1 rides down to the car parks
    const pageTo = i => () => { S.mapSel = clamp(i, 0, SHOP_COUNT - 1); audio.play('tick'); };
    const by = Y + 534, bw = 82, gap = 6, bx = X + (W - (10 * bw + 9 * gap)) / 2;
    [['🛍️ Shops', pageTo(SECTIONS[0].from), '#0ea5e9'], ['◀◀ 100', pageTo(S.mapSel - MAP_PAGE * 100), '#334155'], ['◀', pageTo(S.mapSel - MAP_PAGE), '#334155'],
      ['▶', pageTo(S.mapSel + MAP_PAGE), '#334155'], ['100 ▶▶', pageTo(S.mapSel + MAP_PAGE * 100), '#334155'], ['🍔 Food', pageTo(SECTIONS[1].from), '#ea580c'], ['🧋 Drinks', pageTo(SECTIONS[2].from), '#db2777'], ['👕 Clothes', pageTo(SECTIONS[3].from), '#7c3aed'], ['💄 Makeup', pageTo(SECTIONS[4].from), '#ec4899'], ['🅿️ B1', () => ride(B1_FLOOR), '#475569']]
      .forEach(([label, fn, color], k) => button(ctx, bx + k * (bw + gap), by, bw, 40, label, color, fn));
    ctx.textAlign = 'center'; ctx.fillStyle = '#cbd5e1'; ctx.font = '800 13px Nunito';
    ctx.fillText(`Tap a shop to go there${input.touchMode ? '' : ' · or ▲▼ ◀▶ and SPACE'}`, X + W / 2, Y + H - 14);
  }

  // Shop search: tap the letters, every shop with those letters shows up, tap one to open it.
  function drawSearch(ctx) {
    const X = 190, Y = 30, W = 900, H = 660;
    runSearch();
    panel(ctx, X, Y, W, H, '🔍 Search shops', '#0ea5e9');
    closeButton(ctx, X + W - 52, Y + 13, () => { S.mode = 'walk'; audio.play('back'); });
    // what was typed so far
    ctx.fillStyle = '#1e293b'; rrect(ctx, X + 30, Y + 86, W - 60, 46, 12); ctx.fill();
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; rrect(ctx, X + 30, Y + 86, W - 60, 46, 12); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = S.searchQ ? '#fff' : '#64748b'; ctx.font = "900 26px Nunito";
    ctx.fillText(S.searchQ ? S.searchQ + '▌' : 'Tap letters…', X + 48, Y + 110);
    // how many shops match
    ctx.textAlign = 'center'; ctx.fillStyle = '#cbd5e1'; ctx.font = '800 15px Nunito';
    if (S.searchQ) ctx.fillText(S.searchCount ? `${S.searchCount.toLocaleString()} shops found — showing ${S.searchList.length}` : 'No shops with those letters — try fewer letters', X + W / 2, Y + 152);
    // letter keys (tap them, or type on a keyboard)
    const key = (label, x, y, w, fn) => button(ctx, x, y, w, 50, label, '#334155', fn);
    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    rows.forEach((row, r) => {
      const n = r === 2 ? row.length + 1 : row.length, w = 76, gap = 8, total = n * w + (n - 1) * gap;
      let x = X + (W - total) / 2;
      const y = Y + 170 + r * 58;
      for (const ch of row) { key(ch, x, y, w, () => searchKey(ch)); x += w + gap; }
      if (r === 2) key('⌫', x, y, w, () => searchKey('⌫'));
    });
    const y4 = Y + 170 + 3 * 58;
    key('SPACE', X + (W - 458) / 2, y4, 300, () => searchKey(' '));
    key('✕ CLEAR', X + (W - 458) / 2 + 308, y4, 150, () => searchKey('✕'));
    // matching shops: tap one and the shop opens
    if (!S.searchQ) {
      ctx.fillStyle = '#94a3b8'; ctx.font = '800 16px Nunito'; ctx.textAlign = 'center';
      ctx.fillText('Tap the letters, then tap a shop to open it', X + W / 2, Y + 500);
    } else {
      S.searchList.forEach((i, k) => {
        const s = shopInfo(i), x = X + 30, y = Y + 406 + k * 40, w = W - 60;
        ctx.fillStyle = '#1e293b'; rrect(ctx, x, y, w, 36, 10); ctx.fill();
        ctx.textAlign = 'left'; ctx.fillStyle = '#94a3b8'; ctx.font = '800 12px Nunito';
        ctx.fillText('#' + s.number.toLocaleString(), x + 12, y + 19);
        ctx.fillStyle = '#fff'; ctx.font = '900 17px Nunito';
        fitTextLeft(ctx, `${s.icon} ${s.name}`, x + 90, y + 19, w - 260);
        ctx.textAlign = 'right'; ctx.font = '800 12px Nunito'; ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${s.section} · ${s.count.toLocaleString()} items`, x + w - 12, y + 19);
        hit(x, y, w, 36, () => { goToShop(i); enterShop(i); });
      });
    }
  }

  function drawLift(ctx) {
    const X = 390, Y = 30, W = 500, H = 660;
    panel(ctx, X, Y, W, H, '🛗 Elevator', '#0f766e');
    closeButton(ctx, X + W - 52, Y + 13, () => { S.mode = 'walk'; audio.play('back'); });
    // Floors top to bottom: R (the Roof), 5, 4, 3, 2, 1, then B1 at the bottom, below 1.
    [6, 4, 3, 2, 1, 0, 5].forEach((f, k) => {
      const y = Y + 80 + k * 80, sel = S.liftSel === f, here = f === floor, sec = SECTIONS[f];
      ctx.fillStyle = sel ? '#14b8a6' : '#1e293b'; rrect(ctx, X + 30, y, W - 60, 78, 18); ctx.fill();
      if (sel) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4; rrect(ctx, X + 30, y, W - 60, 78, 18); ctx.stroke(); }
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(X + 90, y + 39, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.font = "28px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(f === ROOF_FLOOR ? 'R' : f === B1_FLOOR ? 'B1' : String(f + 1), X + 90, y + 41);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = "24px 'Lilita One'"; ctx.fillText(`${FLOORS[f].icon} ${FLOORS[f].name}`, X + 146, y + 28);
      ctx.font = '800 12px Nunito'; ctx.fillStyle = '#cbd5e1';
      ctx.fillText(f === ROOF_FLOOR ? 'Roof · 10 pools · 5 golf · play · gardens' : f === B1_FLOOR ? 'B1 · 120 parking bays' : `Shops ${(sec.from + 1).toLocaleString()}–${sec.to.toLocaleString()} · ${(sec.to - sec.from).toLocaleString()} shops`, X + 146, y + 52);
      if (here) { ctx.fillStyle = '#facc15'; ctx.font = '900 11px Nunito'; ctx.fillText('YOU ARE HERE', X + 146, y + 68); }
      hit(X + 30, y, W - 60, 78, () => ride(f));
    });
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
    if (r.deviceOnly) { ctx.fillStyle = '#b45309'; ctx.font = '800 12px Nunito'; ctx.fillText('Saved on this device (Firebase did not answer)', 0, 112); }
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
  tagline: '7 floors: shops, food, drinks, clothes, makeup, B1 car parks, R roof',
  desc: 'Walk the ROBLOC Mall: 10,000 shops (toys, pets, phones, cars, houses, jets…), 68,000 food places, 10,000 drink shops, 2,780 clothes and shoe shops and 2,780 makeup shops on 5 floors, plus 120 car park bays on B1 and, on the open-air R Roof, 10 swimming pools, 5 golf courses, 3 playgrounds, 3 gardens, 3 sports courts, 2 picnic areas and 2 sunbathing areas, with real prices and sales tax.',
  music: 'mall',
  noDifficulty: true,
  playLabel: 'ENTER MALL',
  labels: { a: 'ENTER', b: 'MAP' },
  options: [],
  howto: `<ul>
    <li>The mall has <b>7 floors</b>: Floor 1 shops, Floor 2 food court, Floor 3 drinks, Floor 4 clothes &amp; shoes, Floor 5 makeup, <b>B1 car parks</b> with 120 parking bays, and the open-air <b>R Roof</b> at the very top with 10 swimming pools, 5 golf courses, 3 playgrounds, 3 gardens, 3 sports courts, 2 picnic areas, sun chairs and umbrellas - no roof over it, just sky. Ride the 🛗 elevator at the start of each floor, or tap the floor button at the top.</li>
    <li><b>Walk</b> by tapping where you want to go, or with the arrows. Tap a shop (or press <b>ENTER</b> / <kbd>Space</kbd> at its door) to go in.</li>
    <li><b>MAP</b> (<kbd>Shift</kbd>) opens the directory of all 93,560 shops: 1–10,000 sell all kinds of things, 10,001–78,000 are food, 78,001–88,000 are drinks, 88,001–90,780 are clothes and shoes and 90,781–93,560 are makeup. Flip pages left and right (hold to go faster) and jump to any shop. The 🅿️ B1 button takes you down to the car parks.</li>
    <li>Every shop sells 7 to 1,000 things. Hold up or down in a shop to scroll faster.</li>
    <li>In a shop, pick an item and press <b>BUY</b>. Prices are real and ${Math.round(TAX_RATE * 100)}% sales tax is added at checkout. The tax goes to Trevor, the boss.</li>
    <li>You pay with your money ($) first. If you don't have enough money, you can pay with coins: 1 coin = $1.</li>
    <li>Everything you buy is saved to your account. Earn more coins by playing the other games.</li>
  </ul>`,
  create,
  drawThumb,
};
