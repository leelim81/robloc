// ROBLOC Prize Machine 2: a candy claw machine. Aim the claw, drop it, and carry sweets to the chute.
// Candy, sweets, coin bags and a rare golden lollipop. Win by catching enough sweets before your tries run out.
import { rrect, shade } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { grab: 0.8, slip: 0.12, reach: 48, aimTime: 15 },
  pro: { grab: 0.6, slip: 0.22, reach: 40, aimTime: 12 },
  legend: { grab: 0.45, slip: 0.32, reach: 34, aimTime: 10 },
  boost: { grab: 0.95, slip: 0.03, reach: 58, aimTime: 18 },   // win-chance matches
  tough: { grab: 0.3, slip: 0.45, reach: 28, aimTime: 7 },  // others: hard game, so they win about 25%
};
const PRIZES = [
  ['🍬', 'Candy', 'candy'], ['🍭', 'Lollipop', 'candy'], ['🍫', 'Chocolate', 'candy'], ['🧁', 'Cupcake', 'candy'],
  ['🍩', 'Donut', 'candy'], ['🍪', 'Cookie', 'candy'], ['🍦', 'Ice Cream', 'candy'], ['🍰', 'Cake', 'candy'],
  ['🍮', 'Pudding', 'candy'], ['🍡', 'Dango', 'candy'], ['🍥', 'Swirl Candy', 'candy'], ['🍯', 'Honey Pot', 'candy'],
  ['🍬', 'Candy', 'candy'], ['🍭', 'Lollipop', 'candy'], ['🍫', 'Chocolate', 'candy'], ['🧁', 'Cupcake', 'candy'],
  ['💰', 'Coin Bag', 'coin'], ['💰', 'Coin Bag', 'coin'], ['💰', 'Coin Bag', 'coin'],
];
const GOLD = ['🍭', 'Golden Lollipop', 'gold'];
const GLASS = { x0: 360, x1: 920, y0: 110, y1: 560 };
const CHUTE = { x0: 372, x1: 470 };
const FLOOR = 548, RAIL = 132, HOME = (CHUTE.x0 + CHUTE.x1) / 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

function makePile() {
  const pile = [], r = 30;
  const pick = () => PRIZES[Math.floor(Math.random() * PRIZES.length)];
  // three loose layers of prizes; one golden prize somewhere in the top layer
  const goldAt = Math.floor(rand(2, 8));
  for (let layer = 0; layer < 3; layer++) {
    const n = 9 - layer * 2;
    for (let k = 0; k < n; k++) {
      const [icon, name, kind] = layer === 2 && k === goldAt % n ? GOLD : pick();
      const x = 500 + (k + (layer % 2) * 0.5) * (400 / 9) + rand(-6, 6);
      pile.push({ icon, name, kind, x: clamp(x, 495, 900), y: FLOOR - r - layer * 44 + rand(-4, 4), r, rot: rand(-0.3, 0.3), vy: 0, state: 'pile' });
    }
  }
  return pile;
}

function drawCabinet(ctx, view, t) {
  const x0 = -view.ox, y0 = -view.oy;
  // arcade room
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#0f0a2a'); bg.addColorStop(1, '#2e1065');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  for (let i = 0; i < 18; i++) {
    const x = x0 + ((i * 97 + t * 14) % (view.W + 100)) - 50, y = y0 + 40 + (i * 53) % 300;
    ctx.fillStyle = `hsla(${(i * 40 + t * 30) % 360},90%,65%,.12)`; ctx.beginPath(); ctx.arc(x, y, 30 + (i % 4) * 12, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#1e1b4b'; ctx.fillRect(x0, 640, view.W, y0 + view.H - 640);
  // cabinet body
  const cg = ctx.createLinearGradient(330, 0, 950, 0);
  cg.addColorStop(0, '#b45309'); cg.addColorStop(0.5, '#f59e0b'); cg.addColorStop(1, '#92400e');
  ctx.fillStyle = cg; rrect(ctx, 330, 30, 620, 680, 28); ctx.fill();
  // marquee
  ctx.fillStyle = '#0f172a'; rrect(ctx, 370, 44, 540, 54, 16); ctx.fill();
  for (let i = 0; i < 22; i++) {
    const on = (Math.floor(t * 7) + i) % 3 === 0;
    ctx.fillStyle = on ? '#fde68a' : '#7c2d12'; ctx.beginPath(); ctx.arc(382 + i * 24.5, 104, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 16; ctx.fillStyle = '#fff'; ctx.fillText('★ PRIZE MACHINE 2 ★', 640, 72); ctx.shadowBlur = 0;
  // glass box
  ctx.fillStyle = 'rgba(186,230,253,.16)'; ctx.fillRect(GLASS.x0, GLASS.y0, GLASS.x1 - GLASS.x0, GLASS.y1 - GLASS.y0);
  ctx.fillStyle = '#fbcfe8'; ctx.fillRect(GLASS.x0, FLOOR, GLASS.x1 - GLASS.x0, GLASS.y1 - FLOOR + 6);
  // chute
  ctx.fillStyle = '#0f172a'; ctx.fillRect(CHUTE.x0, FLOOR - 4, CHUTE.x1 - CHUTE.x0, GLASS.y1 - FLOOR + 10);
  ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4; ctx.strokeRect(CHUTE.x0, FLOOR - 70, CHUTE.x1 - CHUTE.x0, 70);
  ctx.fillStyle = '#facc15'; ctx.font = '900 13px Nunito'; ctx.fillText('PRIZE', HOME, FLOOR - 82);
  // rail
  ctx.fillStyle = '#475569'; ctx.fillRect(GLASS.x0, RAIL - 16, GLASS.x1 - GLASS.x0, 10);
  // control panel + prize door
  ctx.fillStyle = '#78350f'; rrect(ctx, 350, 580, 580, 112, 18); ctx.fill();
  ctx.fillStyle = '#0f172a'; rrect(ctx, 372, 600, 120, 72, 12); ctx.fill();
}
function drawGlassShine(ctx) {
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.beginPath(); ctx.moveTo(GLASS.x0 + 30, GLASS.y0); ctx.lineTo(GLASS.x0 + 120, GLASS.y0); ctx.lineTo(GLASS.x0 + 40, GLASS.y1); ctx.lineTo(GLASS.x0, GLASS.y1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.strokeRect(GLASS.x0, GLASS.y0, GLASS.x1 - GLASS.x0, GLASS.y1 - GLASS.y0);
}
function drawPrize(ctx, p, t) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
  if (p.kind === 'gold') { ctx.shadowColor = '#fde047'; ctx.shadowBlur = 20 + Math.sin(t * 5) * 8; }
  ctx.font = '54px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.icon, 0, 2);
  ctx.restore();
}
function drawClaw(ctx, x, y, open) {
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, RAIL - 6); ctx.lineTo(x, y - 14); ctx.stroke();
  ctx.fillStyle = '#94a3b8'; rrect(ctx, x - 26, RAIL - 20, 52, 16, 6); ctx.fill();
  ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(x, y - 10, 14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  const spread = 0.25 + open * 0.75;
  for (const s of [-1, 0, 1]) {
    const a = s * spread * 0.9;
    const mx = x + Math.sin(a) * 26, my = y + Math.cos(a) * 18;
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(mx, my); ctx.lineTo(mx - s * (8 + 8 * (1 - open)), my + 16); ctx.stroke();
  }
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = claw moves 50% faster, Power = claw grips 50% stronger.
  const SPD = options.power === 'speed' ? 1.5 : 1;
  const PWR = options.power === 'power' ? 1.5 : 1;
  const GRAB = Math.min(0.98, D.grab * PWR);
  const SLIP = D.slip / PWR;
  const tries = +(options.tries || 10), target = Math.max(1, Math.ceil(tries * 0.3));
  const pile = makePile();
  const claw = { x: HOME, y: RAIL + 24, tx: HOME, open: 1, held: null };
  const S = { phase: 'intro', t: 0, triesLeft: tries, won: [], coinBags: 0, golden: 0, msg: null, msgT: 0, labelKey: '' };
  let hits = [];

  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function drop() {
    if (S.phase !== 'aim') return;
    S.phase = 'down'; S.t = 0; audio.play('whoosh');
  }
  function topPrizeUnder(x) {
    let best = null;
    for (const p of pile) if (p.state === 'pile' && Math.abs(p.x - x) < D.reach && (!best || p.y < best.y)) best = p;
    return best;
  }
  // Prizes rest on the floor or on a prize below them; anything with nothing underneath falls.
  function restY(p) {
    let y = FLOOR - p.r;
    for (const q of pile) if (q !== p && q.state === 'pile' && q.y > p.y + 10 && Math.abs(q.x - p.x) < 40 && q.y - 40 < y) y = q.y - 40;
    return y;
  }
  function settle(dt) {
    for (const p of pile) {
      if (p.state === 'pile' && p.y < restY(p) - 3) { p.state = 'fall'; p.vy = 0; }
      if (p.state !== 'fall') continue;
      p.vy += 1400 * dt; p.y += p.vy * dt;
      const y = restY(p);
      if (p.y >= y) { p.y = y; p.vy = 0; p.state = 'pile'; audio.play('thud', { power: 0.4 }); }
    }
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.won.length >= target;
    say(win ? 'SWEET CHAMP!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const n = S.won.length, win = n >= target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${n} SWEET${n === 1 ? '' : 'S'} · GOAL ${target}`,
      stats: [`Sweets: <b>${S.won.map(p => p.icon).join(' ') || 'none'}</b>`, `Coin bags: <b>${S.coinBags}</b>`, `Tries: <b>${tries}</b>`],
      match: { game: 'prize2', difficulty: options.difficulty, won: win, prizes: n, coinBags: S.coinBags, golden: S.golden, tries },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'claw') { S.labelKey = 'claw'; input.setLabels('DROP', 'DROP'); }
    // taps: on the glass to aim, on DROP to drop
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    settle(dt);
    if (S.phase === 'intro') { if (S.t > 1.5) { S.phase = 'aim'; S.t = 0; } return; }
    if (S.phase === 'end') { if (S.t > 2.6 && !S.reported) { S.reported = true; report(); } return; }
    const sp = 300 * SPD;
    if (S.phase === 'aim') {
      if (input.mx) claw.tx = clamp(claw.x + input.mx * 60 * SPD, GLASS.x0 + 30, GLASS.x1 - 30);
      claw.x += clamp(claw.tx - claw.x, -sp * dt, sp * dt);
      if (input.a.pressed || input.b.pressed || S.t > D.aimTime) drop();
    } else if (S.phase === 'down') {
      const target = topPrizeUnder(claw.x);
      const stopY = target ? target.y - 28 : FLOOR - 24;
      claw.y = Math.min(stopY, claw.y + 320 * dt);
      if (claw.y >= stopY) { S.phase = 'grab'; S.t = 0; S.target = target; }
    } else if (S.phase === 'grab') {
      claw.open = Math.max(0, 1 - S.t / 0.45);
      if (S.t > 0.55) {
        const p = S.target;
        if (p) {
          const off = Math.abs(p.x - claw.x) / D.reach;
          const chance = GRAB * (1 - off * 0.55) * (p.kind === 'gold' ? 0.6 : 1);
          if (Math.random() < chance) { claw.held = p; p.state = 'held'; audio.play('catch'); }
          else { say('MISSED!', '#fca5a5'); audio.play('fault'); p.rot += rand(-0.3, 0.3); }
        } else say('NOTHING THERE', '#fca5a5');
        S.phase = 'up'; S.t = 0;
      }
    } else if (S.phase === 'up' || S.phase === 'carry') {
      if (S.phase === 'up') { claw.y = Math.max(RAIL + 24, claw.y - 240 * dt); if (claw.y <= RAIL + 24) { S.phase = 'carry'; S.t = 0; } }
      else { claw.x += clamp(HOME - claw.x, -sp * dt, sp * dt); if (Math.abs(claw.x - HOME) < 2) { S.phase = 'release'; S.t = 0; } }
      // a held prize can slip
      if (claw.held && Math.random() < SLIP * dt * 0.9) {
        const p = claw.held; claw.held = null; p.state = 'fall'; p.vy = 0;
        if (p.x > CHUTE.x1 + 10) { say('SO CLOSE!', '#fca5a5'); audio.play('aww'); } else { p.state = 'chute'; }
      }
    } else if (S.phase === 'release') {
      claw.open = Math.min(1, S.t / 0.3);
      if (claw.held && S.t > 0.2) { const p = claw.held; claw.held = null; p.state = 'chute'; p.vy = 0; }
      if (S.t > 0.9) {
        S.triesLeft--;
        if (S.triesLeft <= 0) endGame(); else { S.phase = 'aim'; S.t = 0; claw.tx = claw.x; }
      }
    }
    if (claw.held) { claw.held.x = claw.x; claw.held.y = claw.y + 30; }
    // prizes dropping into the chute are won
    for (const p of pile) {
      if (p.state !== 'chute') continue;
      p.vy += 1400 * dt; p.y += p.vy * dt;
      if (p.y > GLASS.y1 + 40) {
        p.state = 'gone'; S.won.push(p);
        if (p.kind === 'coin') S.coinBags++;
        if (p.kind === 'gold') S.golden++;
        say(p.kind === 'gold' ? 'GOLDEN LOLLIPOP!' : `YOU WON ${p.name.toUpperCase()}!`, '#a3e635');
        audio.play(p.kind === 'gold' ? 'badge' : 'point'); audio.cheer(p.kind === 'gold' ? 1.6 : 0.8);
        fx.confetti(HOME, 620, p.kind === 'gold' ? 90 : 40);
      }
    }
    if (claw.open < 1 && (S.phase === 'aim')) claw.open = Math.min(1, claw.open + dt * 3);
  }

  function draw(ctx, view) {
    hits = [];
    drawCabinet(ctx, view, S.t);
    for (const p of pile) if (p.state === 'pile' || p.state === 'fall') drawPrize(ctx, p, S.t);
    for (const p of pile) if (p.state === 'held' || p.state === 'chute') drawPrize(ctx, p, S.t);
    drawClaw(ctx, claw.x, claw.y, claw.open);
    drawGlassShine(ctx);
    // aim guide
    if (S.phase === 'aim') {
      ctx.strokeStyle = 'rgba(250,204,21,.45)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(claw.x, claw.y + 20); ctx.lineTo(claw.x, FLOOR); ctx.stroke(); ctx.setLineDash([]);
      hit(GLASS.x0, GLASS.y0, GLASS.x1 - GLASS.x0, GLASS.y1 - GLASS.y0, t => { claw.tx = clamp(t.x, GLASS.x0 + 30, GLASS.x1 - 30); audio.play('tick'); });
    }
    // DROP button
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready ? '#16a34a' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "44px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DROP!', 1110, 322);
    hit(990, 260, 240, 120, () => drop());
    if (ready) {
      const k = clamp(1 - S.t / D.aimTime, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 990, 392, 240, 10, 5); ctx.fill();
      ctx.fillStyle = k > 0.3 ? '#4ade80' : '#f87171'; rrect(ctx, 990, 392, 240 * k, 10, 5); ctx.fill();
    }
    // scoreboard
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 40, 60, 260, 150, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Tries left: ${S.triesLeft}`, 62, 92);
    ctx.fillText(`Sweets: ${S.won.length}  (goal ${target})`, 62, 122);
    ctx.font = '30px sans-serif'; ctx.fillText(S.won.slice(-6).map(p => p.icon).join(''), 62, 168);
    // prize door shows the last prize won
    const last = S.won[S.won.length - 1];
    if (last) { ctx.font = '48px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(last.icon, 432, 638); }
    fx.draw(ctx);
    if (S.phase === 'aim' && S.triesLeft === tries && S.t < 5) prompt(ctx, input.touchMode ? 'Tap the glass to move the claw · tap DROP!' : 'Click the glass or use ← → to aim · SPACE to drop');
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 260, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 280, S.t, { size: 100, sub: `${S.won.length} sweet${S.won.length === 1 ? '' : 's'}`, color: S.msgColor, glow: '#b45309' });
    if (S.phase === 'intro') drawBanner(ctx, 'GRAB A SWEET!', 640, 280, S.t, { size: 96, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });
  function prompt(ctx, text) {
    ctx.font = '800 17px Nunito'; const w = ctx.measureText(text).width + 40;
    ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
  }

  if (env.debug) env.debug({ S, claw, pile, drop });
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
let thumbPile = null;
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  drawCabinet(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t);
  if (!thumbPile) thumbPile = makePile();
  thumbPile.forEach(p => drawPrize(ctx, p, t));
  const cyc = t % 4, x = 520 + Math.abs(Math.sin(t * 0.6)) * 330, y = cyc < 2 ? RAIL + 24 + Math.sin(cyc / 2 * Math.PI) * 300 : RAIL + 24;
  drawClaw(ctx, x, y, cyc < 1 ? 1 : 0.3);
  drawGlassShine(ctx);
  ctx.restore();
}

export default {
  id: 'prize2',
  title: 'Prize Machine 2',
  tagline: 'A candy claw machine — grab sweets and treats',
  desc: 'A claw machine full of candy, sweets, coin bags and one golden lollipop. Catch enough sweets before your tries run out.',
  music: 'menu',
  labels: { a: 'DROP', b: 'DROP' },
  options: [
    { key: 'tries', label: 'Tries', default: 1, choices: [{ v: '5', label: '5 tries', sub: 'quick' }, { v: '10', label: '10 tries', sub: 'standard' }, { v: '15', label: '15 tries', sub: 'long' }] },
  ],
  howto: `<ul>
    <li><b>Aim</b>: tap the glass where you want the claw, or use ← → / the joystick.</li>
    <li><b>DROP!</b> (tap it or press <kbd>Space</kbd>): the claw goes down, grabs and carries the prize to the PRIZE chute.</li>
    <li>Aim at the middle of a sweet. Sweets can slip out on the way, just like a real claw machine.</li>
    <li>💰 Coin bags give bonus coins. The 🍭 Golden Lollipop is rare and hard to hold.</li>
    <li>Catch at least 3 in 10 sweets (about a third of your tries) to win.</li>
  </ul>`,
  create,
  drawThumb,
};
