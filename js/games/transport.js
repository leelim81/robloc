// ROBLOC Transport Modes: fly a plane, drive a bus, run a train.
// A side-scrolling run: your vehicle rolls forward on its own, you switch
// between three lanes to collect coins and dodge obstacles, and you win by
// reaching the destination. Three hearts: hit an obstacle and you lose one.
import { rrect } from '../art.js';

const DIFF = {
  rookie: { speed: 260, gap: 0.95, route: 800, obs: 0.38 },
  pro: { speed: 320, gap: 0.8, route: 1100, obs: 0.46 },
  legend: { speed: 380, gap: 0.68, route: 1400, obs: 0.54 },
  boost: { speed: 230, gap: 1.05, route: 800, obs: 0.3 },   // win-chance matches
};
const VEHICLES = {
  plane: { name: 'Plane', icon: '✈️', color: '#38bdf8', sky: ['#7dd3fc', '#e0f2fe'], ground: '#fef3c7', obs: ['☁️', '🐦'], pick: '⭐', speed: 1.15 },
  bus: { name: 'Bus', icon: '🚌', color: '#f59e0b', sky: ['#bae6fd', '#dbeafe'], ground: '#4b5563', obs: ['🚧', '🚗'], pick: '🪙', speed: 1.0 },
  train: { name: 'Train', icon: '🚂', color: '#22c55e', sky: ['#a7f3d0', '#d1fae5'], ground: '#78350f', obs: ['🚧', '🚦'], pick: '🎫', speed: 0.9 },
};
const LANES = [280, 420, 560];
const VEH_X = 280;
const STOP_EVERY = 200;   // a stop every 200m
const PX_PER_M = 10;      // 10 pixels = 1 metre
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : (DIFF[options.difficulty] || DIFF.rookie);
  const V = VEHICLES[options.vehicle] || VEHICLES.bus;
  // Superpowers: Speed = 50% faster, Power = smash through obstacles.
  const SPD = options.power === 'speed' ? 1.5 : 1;
  const SMASH = options.power === 'power';
  const speed = D.speed * V.speed * SPD;
  const routeM = D.route;
  const S = {
    phase: 'intro', t: 0, dist: 0, lane: 1, y: LANES[1],
    hearts: 3, coins: 0, stops: 0, nextStop: STOP_EVERY,
    items: [], spawnT: 0, invT: 0, smashed: 0, msg: null, msgT: 0, flash: 0,
  };
  let hits = [];

  const say = msg => { S.msg = msg; S.msgT = 0; };
  const laneY = () => LANES[S.lane];
  function setLane(d) {
    const next = clamp(S.lane + d, 0, 2);
    if (next !== S.lane) { S.lane = next; audio.play('tick'); }
  }
  function spawn() {
    const lane = Math.floor(Math.random() * 3);
    const r = Math.random();
    if (r < D.obs) {
      S.items.push({ kind: 'obs', icon: pick(V.obs), lane, x: 1340, hit: false });
    } else if (r < D.obs + 0.12) {
      S.items.push({ kind: 'star', icon: '⭐', lane, x: 1340, hit: false });
    } else {
      S.items.push({ kind: 'coin', icon: V.pick, lane, x: 1340, hit: false });
    }
  }
  function hurt(item) {
    if (S.invT > 0) return;
    if (SMASH) {
      S.smashed++; item.hit = true;
      audio.play('thud', { power: 0.6 }); fx.sparks(item.x, LANES[item.lane], 14, '#facc15');
      say('SMASH! 💥');
      return;
    }
    S.hearts--; S.invT = 1.2; S.flash = 0.35;
    audio.play('thud', { power: 0.8 });
    say(S.hearts > 0 ? 'OUCH! 💥' : '');
    if (S.hearts <= 0) endRun(false);
  }
  function endRun(win) {
    if (S.phase === 'end') return;
    S.phase = 'end'; S.t = 0;
    say(win ? 'YOU ARRIVED! 🎉' : 'OUT OF HEARTS');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
    else audio.play('lose');
  }
  function report() {
    const win = S.phase === 'end' && S.dist >= routeM;
    const distM = Math.floor(S.dist);
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${win ? '🏁 ' : ''}${distM}m · ${S.coins} coins · ${S.stops} stops`,
      stats: [`Vehicle: <b>${V.icon} ${V.name}</b>`, `Distance: <b>${distM}m / ${routeM}m</b>`, `Coins: <b>${S.coins}</b>`, `Stops: <b>${S.stops}</b>`],
      match: { game: 'transport', difficulty: options.difficulty, won: win, coins: S.coins, stops: S.stops, distance: distM, vehicle: options.vehicle || 'bus' },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt;
    if (S.invT > 0) S.invT -= dt;
    if (S.flash > 0) S.flash -= dt;
    input.setTapMode(true);
    if (S.labelKey !== 'drive') { S.labelKey = 'drive'; input.setLabels('▲ UP', '▼ DOWN'); }
    // taps: upper half = up a lane, lower half = down a lane
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.2) { S.phase = 'go'; S.t = 0; say('GO! 🚦'); } return; }
    if (S.phase === 'end') { if (S.t > 2.4 && !S.reported) { S.reported = true; report(); } return; }

    // lane controls: joystick / arrows, A/B buttons, or tap top/bottom half
    if (input.my < -0.4 || input.a.pressed) setLane(-1);
    else if (input.my > 0.4 || input.b.pressed) setLane(1);
    // smooth lane move
    const target = laneY();
    S.y += clamp(target - S.y, -900 * dt, 900 * dt);

    // scroll forward
    S.dist += (speed * dt) / PX_PER_M;
    // stops: one every STOP_EVERY metres
    if (S.dist >= S.nextStop && S.dist < routeM) {
      S.stops++; S.nextStop += STOP_EVERY;
      audio.play('coin'); say(`STOP ${S.stops}! 🚏`);
    }
    if (S.dist >= routeM) { S.dist = routeM; endRun(true); return; }

    // spawn items ahead
    S.spawnT -= dt;
    if (S.spawnT <= 0) { spawn(); S.spawnT = D.gap * rand(0.85, 1.2); }
    // move items left, collect / hit
    for (const it of S.items) {
      it.x -= speed * dt;
      if (it.hit || it.x < -80) continue;
      const overlap = Math.abs(it.x - VEH_X) < 52 && it.lane === S.lane;
      if (!overlap) continue;
      if (it.kind === 'obs') { hurt(it); }
      else if (it.kind === 'coin') { it.hit = true; S.coins += 1; audio.play('coin'); }
      else if (it.kind === 'star') { it.hit = true; S.coins += 5; audio.play('coin'); say('STAR! +5 ⭐'); }
    }
    S.items = S.items.filter(it => it.x > -80 && !it.hit);
  }

  function drawVehicle(ctx, x, y, t) {
    const bob = Math.sin(t * 6) * 3;
    ctx.save();
    ctx.translate(x, y + bob);
    if (S.invT > 0 && Math.floor(t * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(0, 46, 52, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.font = '76px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(V.icon, 0, 0);
    ctx.restore();
  }
  function draw(ctx, view) {
    hits = [];
    const t = S.t;
    // sky + ground
    const bg = ctx.createLinearGradient(0, 0, 0, view.H);
    bg.addColorStop(0, V.sky[0]); bg.addColorStop(1, V.sky[1]);
    ctx.fillStyle = bg; ctx.fillRect(-view.ox, -view.oy, view.W, view.H);
    // sun + clouds
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(1120, 90, 44, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 340 + t * 12) % 1400) - 60;
      ctx.beginPath(); ctx.ellipse(cx, 80 + (i % 2) * 46, 62, 20, 0, 0, Math.PI * 2); ctx.fill();
    }
    // ground / road / track — fills the lane area so the bus and train sit
    // on it instead of floating in the sky (the plane flies, so it just
    // gets distant ground far below).
    if (V === VEHICLES.bus) {
      ctx.fillStyle = V.ground; ctx.fillRect(-view.ox, 200, view.W, 520);
      ctx.fillStyle = '#facc15';
      for (let x = -((S.dist * PX_PER_M) % 120); x < view.W + 120; x += 120) ctx.fillRect(x, 676, 60, 8);
    } else if (V === VEHICLES.train) {
      ctx.fillStyle = V.ground; ctx.fillRect(-view.ox, 200, view.W, 520);
      // rails under each lane
      ctx.fillStyle = '#a8a29e';
      for (const y of LANES) { ctx.fillRect(-view.ox, y + 34, view.W, 5); ctx.fillRect(-view.ox, y + 50, view.W, 5); }
    } else {
      ctx.fillStyle = '#86efac'; ctx.fillRect(-view.ox, 660, view.W, 60);
      ctx.fillStyle = '#4ade80'; ctx.fillRect(-view.ox, 660, view.W, 8);
    }
    // lanes
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4; ctx.setLineDash([18, 18]);
    for (const y of LANES) { ctx.beginPath(); ctx.moveTo(0, y + 58); ctx.lineTo(view.W, y + 58); ctx.stroke(); }
    ctx.setLineDash([]);
    // destination flag + progress
    const prog = clamp(S.dist / routeM, 0, 1);
    ctx.fillStyle = 'rgba(15,23,42,.75)'; rrect(ctx, 40, 24, 420, 46, 12); ctx.fill();
    ctx.fillStyle = '#22c55e'; rrect(ctx, 48, 32, 404 * prog, 30, 8); ctx.fill();
    ctx.font = "900 22px Nunito"; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText(`🏁 ${Math.floor(S.dist)}m / ${routeM}m`, 56, 47);
    ctx.fillText(`🚏 ${S.stops}`, 480, 47);
    // hearts + coins
    ctx.font = '30px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('❤️'.repeat(Math.max(0, S.hearts)) + '🖤'.repeat(Math.max(0, 3 - S.hearts)), 1240, 47);
    ctx.font = "900 24px Nunito"; ctx.fillStyle = '#fff';
    ctx.fillText(`🪙 ${S.coins}`, 1240, 92);
    // items
    for (const it of S.items) {
      const y = LANES[it.lane];
      ctx.font = it.kind === 'obs' ? '52px "Apple Color Emoji","Segoe UI Emoji",sans-serif' : '44px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(it.icon, it.x, y + (it.kind === 'obs' ? 6 : 0));
    }
    // destination flag at the end (drawn when close)
    if (S.dist > routeM - 120) {
      const fx = VEH_X + (routeM - S.dist) * PX_PER_M;
      ctx.font = '64px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
      ctx.textAlign = 'center'; ctx.fillText('🏁', fx, 420);
    }
    drawVehicle(ctx, VEH_X, S.y, t);
    fx.draw(ctx);
    // intro / end banner
    if (S.phase === 'intro') {
      ctx.fillStyle = 'rgba(15,23,42,.55)'; ctx.fillRect(-view.ox, -view.oy, view.W, view.H);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = "900 54px 'Lilita One'"; ctx.fillText(`${V.icon} ${V.name.toUpperCase()}!`, 640, 300);
      ctx.font = "700 26px Nunito"; ctx.fillText('Tap top to go up, bottom to go down — collect coins, dodge obstacles, reach the flag!', 640, 360);
    }
    if (S.msg && S.msgT < 1.4) {
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 440, 120, 400, 52, 14); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.font = "900 28px Nunito"; ctx.textAlign = 'center'; ctx.fillText(S.msg, 640, 147);
    }
    if (S.flash > 0) { ctx.fillStyle = `rgba(220,38,38,${S.flash * 0.9})`; ctx.fillRect(-view.ox, -view.oy, view.W, view.H); }
    // tap zones: top half up, bottom half down
    if (S.phase === 'go') {
      hit(0, 0, view.W, 300, () => setLane(-1));
      hit(0, 300, view.W, view.H - 300, () => setLane(1));
    }
    function hit(x, y, w, h, fn) { hits.push({ x, y, w, h, fn }); }
  }

  return { update, draw };
}

function drawThumb(ctx, w, h, t) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#7dd3fc'); bg.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fef3c7'; ctx.fillRect(0, h * 0.82, w, h * 0.18);
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.setLineDash([12, 12]);
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, h * (0.35 + i * 0.18)); ctx.lineTo(w, h * (0.35 + i * 0.18)); ctx.stroke(); }
  ctx.setLineDash([]);
  const bob = Math.sin(t * 3) * 6;
  ctx.font = `${Math.round(h * 0.42)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('✈️', w * 0.3, h * 0.45 + bob);
  ctx.fillText('🚌', w * 0.55, h * 0.55 - bob);
  ctx.fillText('🚂', w * 0.8, h * 0.45 + bob);
  ctx.font = `${Math.round(h * 0.12)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  ctx.fillText('🪙', w * 0.7, h * 0.3);
  ctx.fillText('🚏', w * 0.2, h * 0.7);
}


export default {
  id: 'transport',
  title: 'Transport Modes',
  tagline: 'Fly planes, drive buses and run trains',
  desc: 'Pick a plane, a bus or a train and ride it to the destination. Switch lanes to collect coins and dodge obstacles. Three hearts — reach the flag to win!',
  music: 'menu',
  labels: { a: '▲ UP', b: '▼ DOWN' },
  options: [
    { key: 'vehicle', label: 'Vehicle', default: 1, choices: [
      { v: 'plane', label: '✈️ Plane', sub: 'fastest' },
      { v: 'bus', label: '🚌 Bus', sub: 'steady' },
      { v: 'train', label: '🚂 Train', sub: 'smooth' },
    ] },
  ],
  howto: `<ul>
    <li><b>Move</b>: tap the top half to go up a lane, the bottom half to go down — or use ↑ ↓ / the joystick.</li>
    <li><b>Collect</b>: 🪙 coins and ⭐ stars in your lane. Stars are worth 5 coins.</li>
    <li><b>Dodge</b>: obstacles in your lane cost a heart. You have 3 hearts.</li>
    <li><b>Stops</b>: reach a 🚏 stop every 200m for a bonus. Reach the 🏁 flag at the end to win.</li>
    <li>💪 Power smashes through obstacles instead of losing a heart. ⚡ Speed makes you 50% faster.</li>
  </ul>`,
  create,
  drawThumb,
};
