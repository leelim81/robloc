// ROBLOC Soccer: 3-a-side stadium match (striker, midfielder, goalkeeper per team).
import { drawHuman, drawShadow, shade, rrect, SKINS, HAIRS, HAIR_STYLES, SHIRTS } from '../art.js';
import { drawBanner } from '../fx.js';

const FX0 = 70, FX1 = 1210, FY0 = 165, FY1 = 690, CX = 640, CY = (FY0 + FY1) / 2;
const GOAL_HALF = 64, GY0 = CY - GOAL_HALF, GY1 = CY + GOAL_HALF, GOAL_DEPTH = 42, BAR = 48;
const PLAYER_SCALE = 0.64, BALL_R = 7.5, GRAV = 950;
const DIFF = {
  rookie: { speed: 0.8, tackle: 1.4, keeper: 0.5, shootSkill: 0.55, think: 0.45 },
  pro: { speed: 0.93, tackle: 2.0, keeper: 0.66, shootSkill: 0.75, think: 0.3 },
  legend: { speed: 1.04, tackle: 2.8, keeper: 0.8, shootSkill: 0.9, think: 0.18 },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const len = (x, y) => Math.hypot(x, y);
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- pre-rendered layers ----------
let pitchLayer = null, crowdLayers = null;
function makeLayer(w, h, k, draw) {
  const c = document.createElement('canvas'); c.width = w * k; c.height = h * k;
  const x = c.getContext('2d'); x.scale(k, k); draw(x); return c;
}
function getPitch() {
  if (pitchLayer) return pitchLayer;
  pitchLayer = makeLayer(1280, 720, 2, ctx => {
    // surrounding track
    ctx.fillStyle = '#1f5130'; ctx.fillRect(0, 150, 1280, 570);
    const stripes = 14, sw = (FX1 - FX0) / stripes;
    for (let i = 0; i < stripes; i++) {
      const g = ctx.createLinearGradient(0, FY0, 0, FY1);
      const base = i % 2 ? '#3f9b47' : '#368a3f';
      g.addColorStop(0, shade(base, -0.08)); g.addColorStop(1, shade(base, 0.06));
      ctx.fillStyle = g; ctx.fillRect(FX0 + i * sw, FY0 - 20, sw + 1, FY1 - FY0 + 40);
    }
    ctx.fillStyle = '#2f7a38'; ctx.fillRect(0, FY0 - 20, FX0, FY1 - FY0 + 40); ctx.fillRect(FX1, FY0 - 20, 1280 - FX1, FY1 - FY0 + 40);
    // grass grain
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)';
      ctx.fillRect(Math.random() * 1280, FY0 - 20 + Math.random() * (FY1 - FY0 + 40), 1.2, 2.5);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = 3;
    ctx.strokeRect(FX0, FY0, FX1 - FX0, FY1 - FY0);
    ctx.beginPath(); ctx.moveTo(CX, FY0); ctx.lineTo(CX, FY1); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(CX, CY, 78, 70, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(CX, CY, 4, 0, Math.PI * 2); ctx.fill();
    for (const side of [-1, 1]) {
      const gx = side < 0 ? FX0 : FX1;
      ctx.strokeRect(side < 0 ? gx : gx - 170, CY - 170, 170, 340);
      ctx.strokeRect(side < 0 ? gx : gx - 62, CY - 92, 62, 184);
      ctx.beginPath(); ctx.arc(gx - side * 118, CY, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(gx - side * 118, CY, 70, 64, 0, side < 0 ? -0.95 : Math.PI - 0.95 + 0, side < 0 ? 0.95 : Math.PI + 0.95); ctx.stroke();
      for (const cy of [FY0, FY1]) { ctx.beginPath(); ctx.arc(gx, cy, 14, 0, Math.PI * 2); ctx.stroke(); }
    }
    // floodlight vignette
    const v = ctx.createRadialGradient(CX, CY, 200, CX, CY, 800);
    v.addColorStop(0, 'rgba(255,255,230,.05)'); v.addColorStop(1, 'rgba(0,10,0,.35)');
    ctx.fillStyle = v; ctx.fillRect(0, 150, 1280, 570);
  });
  return pitchLayer;
}
function getCrowd() {
  if (crowdLayers) return crowdLayers;
  const fans = [];
  const palette = ['#e11d48', '#2563eb', '#fbbf24', '#f8fafc', '#16a34a', '#7c3aed', '#0ea5e9', '#f97316', '#111827'];
  for (let row = 0; row < 7; row++) {
    for (let x = -300; x < 1580; x += 13 + Math.random() * 5) {
      fans.push({ x: x + row * 4, y: 22 + row * 15 + Math.random() * 3, c: palette[(Math.random() * palette.length) | 0], s: SKINS[(Math.random() * SKINS.length) | 0], j: Math.random() });
    }
  }
  crowdLayers = [0, 1].map(frame => makeLayer(1880, 150, 2, ctx => {
    ctx.translate(300, 0);
    const g = ctx.createLinearGradient(0, 0, 0, 150);
    g.addColorStop(0, '#0b1230'); g.addColorStop(1, '#1e2a55');
    ctx.fillStyle = g; ctx.fillRect(-300, 0, 1880, 150);
    for (let r = 0; r < 7; r++) { ctx.fillStyle = r % 2 ? '#26305e' : '#2b3669'; ctx.fillRect(-300, 30 + r * 15, 1880, 9); }
    for (const f of fans) {
      const up = frame === 1 && f.j > 0.35 ? -4 : 0;
      ctx.fillStyle = shade(f.c, -0.2); ctx.fillRect(f.x - 4, f.y + 4 + up, 8, 10);
      if (frame === 1 && f.j > 0.6) { ctx.fillStyle = f.s; ctx.fillRect(f.x - 6, f.y - 6 + up, 2, 8); ctx.fillRect(f.x + 4, f.y - 6 + up, 2, 8); }
      ctx.fillStyle = f.s; ctx.beginPath(); ctx.arc(f.x, f.y + up, 3.6, 0, Math.PI * 2); ctx.fill();
    }
    const sh = ctx.createLinearGradient(0, 0, 0, 150); sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh; ctx.fillRect(-300, 0, 1880, 150);
  }));
  return crowdLayers;
}

function drawStadium(ctx, view, t, excite) {
  const x0 = -view.ox, y0 = -view.oy, W = view.W, H = view.H;
  const sky = ctx.createLinearGradient(0, y0, 0, 150);
  sky.addColorStop(0, '#050816'); sky.addColorStop(1, '#141c44');
  ctx.fillStyle = sky; ctx.fillRect(x0, y0, W, 150 - y0);
  ctx.fillStyle = '#1f5130'; ctx.fillRect(x0, 150, W, H - 150 + y0 + 10);
  const crowd = getCrowd();
  t = Math.max(0, t); // rAF timestamps can be slightly earlier than the start time
  const fr = excite > 0.5 ? (Math.floor(t * 6) % 2) : (Math.floor(t * 0.7) % 7 === 0 ? 1 : 0);
  ctx.drawImage(crowd[fr], -300, 0, 1880, 150);
  // floodlight flares
  for (const lx of [120, 640, 1160]) {
    const g = ctx.createRadialGradient(lx, 6, 0, lx, 6, 120);
    g.addColorStop(0, 'rgba(255,255,240,.55)'); g.addColorStop(0.15, 'rgba(255,255,220,.15)'); g.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = g; ctx.fillRect(lx - 120, -114, 240, 240);
  }
  ctx.drawImage(getPitch(), 0, 0, 1280, 720);
  // ad boards
  const boards = ['ROBLOC', 'PLAY FAIR', 'ROBLOC', 'GO TEAM!', 'ROBLOC', 'COINS & BADGES'];
  const off = (t * 40) % 220;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, 128, W, 26); ctx.clip();
  const bg = ctx.createLinearGradient(0, 128, 0, 154); bg.addColorStop(0, '#1e3a8a'); bg.addColorStop(1, '#172554');
  ctx.fillStyle = bg; ctx.fillRect(x0, 128, W, 26);
  ctx.font = "16px 'Lilita One', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = -2; i < 9; i++) {
    const bx = i * 220 - off;
    ctx.fillStyle = i % 2 ? '#fbbf24' : '#e0f2fe';
    ctx.fillText(boards[((i % 6) + 6) % 6], bx + 110, 142);
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(bx, 128, 2, 26);
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x0, 154, W, 4);
}

function drawGoalBack(ctx, side) {
  const gx = side < 0 ? FX0 : FX1, bx = gx - side * GOAL_DEPTH;
  ctx.save();
  // ground shadow inside goal
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(Math.min(gx, bx), GY0, GOAL_DEPTH, GY1 - GY0);
  // back net
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1;
  const topB = 36;
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.beginPath(); ctx.moveTo(bx, GY0 - topB); ctx.lineTo(bx, GY1 - topB); ctx.lineTo(bx, GY1); ctx.lineTo(bx, GY0); ctx.fill();
  for (let y = GY0; y <= GY1; y += 8) { ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx, y - topB); ctx.stroke(); }
  for (let h = 0; h <= topB; h += 8) { ctx.beginPath(); ctx.moveTo(bx, GY0 - h); ctx.lineTo(bx, GY1 - h); ctx.stroke(); }
  // roof net
  ctx.fillStyle = 'rgba(255,255,255,.1)';
  ctx.beginPath(); ctx.moveTo(gx, GY0 - BAR); ctx.lineTo(bx, GY0 - topB); ctx.lineTo(bx, GY1 - topB); ctx.lineTo(gx, GY1 - BAR); ctx.closePath(); ctx.fill();
  for (let y = GY0; y <= GY1; y += 10) { ctx.beginPath(); ctx.moveTo(gx, y - BAR); ctx.lineTo(bx, y - topB); ctx.stroke(); }
  // far side net + far post
  ctx.beginPath(); ctx.moveTo(gx, GY0 - BAR); ctx.lineTo(bx, GY0 - topB); ctx.lineTo(bx, GY0); ctx.lineTo(gx, GY0); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill(); ctx.stroke();
  post(ctx, gx, GY0);
  // crossbar
  ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(gx, GY0 - BAR); ctx.lineTo(gx, GY1 - BAR); ctx.stroke();
  ctx.restore();
}
function drawGoalFront(ctx, side, ripple) {
  const gx = side < 0 ? FX0 : FX1, bx = gx - side * GOAL_DEPTH;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(gx, GY1 - BAR); ctx.lineTo(bx, GY1 - 36); ctx.lineTo(bx, GY1); ctx.lineTo(gx, GY1); ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill(); ctx.stroke();
  if (ripple > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${ripple * 0.6})`; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(bx + side * 2, CY - 18, 4 + i * 6 * (1.2 - ripple), 10 + i * 12 * (1.2 - ripple), 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  post(ctx, gx, GY1);
  ctx.restore();
}
function post(ctx, x, y) {
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + 2, y - BAR); ctx.stroke();
  ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - BAR); ctx.stroke();
}

function drawBall(ctx, b) {
  const sc = 1 + b.z / 260;
  drawShadow(ctx, b.x + b.z * 0.25, b.y + 2, BALL_R * 1.4, BALL_R * 0.55, 0.45 / (1 + b.z / 80));
  const x = b.x, y = b.y - b.z - BALL_R * 0.8, r = BALL_R * sc;
  const sp = len(b.vx, b.vy);
  if (sp > 450 && !b.owner) {
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = r * 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - b.vx * 0.04, y - (b.vy - b.vz) * 0.04); ctx.stroke();
  }
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, '#fff'); g.addColorStop(0.7, '#e5e7eb'); g.addColorStop(1, '#9ca3af');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#1f2937';
  for (let i = 0; i < 5; i++) {
    const a = b.spin + i * 1.2566, px = x + Math.cos(a) * r * 0.62, py = y + Math.sin(a * 0.7 + b.spin * 0.3) * r * 0.55;
    ctx.beginPath(); ctx.arc(px, py, r * 0.28, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
}

function pickOppColor(mine) {
  const opts = ['#dc2626', '#f8fafc', '#2563eb', '#f59e0b', '#7c3aed', '#111827'];
  const hex = h => parseInt(h.slice(1), 16);
  const dist = (a, b) => { const x = hex(a), y = hex(b); return Math.abs(((x >> 16) & 255) - ((y >> 16) & 255)) + Math.abs(((x >> 8) & 255) - ((y >> 8) & 255)) + Math.abs((x & 255) - (y & 255)); };
  return opts.sort((a, b) => dist(b, mine) - dist(a, mine))[0];
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options, profile } = env;
  const D = DIFF[options.difficulty] || DIFF.rookie;
  const matchLen = +(options.length || 150);
  const av = profile?.avatar || {};
  const myColor = av.shirt || '#2563eb';
  const oppColor = pickOppColor(myColor);
  const kits = [
    { shirt: myColor, stripe: 'rgba(255,255,255,.35)', shorts: myColor === '#111827' ? '#f8fafc' : '#0f172a', socks: myColor },
    { shirt: oppColor, stripe: 'rgba(0,0,0,.25)', shorts: oppColor === '#f8fafc' ? '#111827' : '#f8fafc', socks: oppColor },
  ];
  const gkKits = [{ shirt: '#84cc16', shorts: '#14532d', socks: '#84cc16' }, { shirt: '#f97316', shorts: '#431407', socks: '#f97316' }];

  const mk = (team, role, number, human = false) => {
    const look = human ? { skin: av.skin, hair: av.hair, style: av.style } :
      { skin: SKINS[(Math.random() * SKINS.length) | 0], hair: HAIRS[(Math.random() * 5) | 0], style: HAIR_STYLES[(Math.random() * HAIR_STYLES.length) | 0] };
    return { team, role, number, human, x: 0, y: 0, vx: 0, vy: 0, fx: team ? -1 : 1, fy: 0, phase: Math.random() * 6, look,
      kit: role === 'gk' ? gkKits[team] : kits[team], cd: 0, stun: 0, tackleT: 0, kickT: 0, diveT: 0, diveDir: 0, hold: 0, think: 0,
      target: { x: 0, y: 0 }, celebrate: 0, stamina: 1, sprinting: false, wantPass: 0 };
  };
  const players = [
    mk(0, 'fw', 10, true), mk(0, 'mf', 8), mk(0, 'gk', 1),
    mk(1, 'fw', 9), mk(1, 'mf', 6), mk(1, 'gk', 1),
  ];
  const me = players[0];
  const mate = players[1];
  const teamOf = t => players.filter(p => p.team === t);
  const fieldOf = t => players.filter(p => p.team === t && p.role !== 'gk');
  const keeperOf = t => players.find(p => p.team === t && p.role === 'gk');
  const ball = { x: CX, y: CY, z: 0, vx: 0, vy: 0, vz: 0, owner: null, spin: 0, last: null, shotId: 0, shotBy: null, keeperRolled: -1, noTouch: null, noTouchT: 0, dribT: 0 };

  const S = { phase: 'countdown', t: 0, clock: 0, score: [0, 0], myGoals: 0, banner: null, bannerT: 0, slow: 1, ripple: [0, 0], excite: 0,
    kickoffTeam: 0, overTimer: 0, tip: options.difficulty === 'rookie' ? 6 : 0, labelKey: '', shots: [0, 0], tackles: 0, endT: 0 };

  function kickoff(team) {
    const L = [
      [me, CX - 34, CY], [mate, CX - 220, CY - 120], [keeperOf(0), FX0 + 24, CY],
      [players[3], CX + 140, CY], [players[4], CX + 260, CY + 110], [keeperOf(1), FX1 - 24, CY],
    ];
    for (const [p, x, y] of L) { p.x = x; p.y = y; p.vx = p.vy = 0; p.fx = p.team ? -1 : 1; p.fy = 0; p.stun = p.tackleT = p.diveT = p.hold = 0; p.cd = 0; p.celebrate = 0; }
    if (team === 1) { players[3].x = CX + 34; me.x = CX - 140; }
    Object.assign(ball, { x: CX, y: CY, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null });
    giveBall(team === 0 ? me : players[3]);
  }
  function giveBall(p) {
    ball.owner = p; ball.last = p; ball.z = 0; ball.vz = 0; p.hold = 0;
  }
  function release(p, cd = 0.25) { if (ball.owner === p) ball.owner = null; p.cd = cd; ball.noTouch = p; ball.noTouchT = 0.12; }

  function kick(p, dx, dy, speed, vz, kind = 'shot') {
    const d = len(dx, dy) || 1;
    release(p, 0.3);
    ball.vx = dx / d * speed; ball.vy = dy / d * speed; ball.vz = vz; ball.z = Math.max(ball.z, 1);
    ball.x = p.x + dx / d * 14; ball.y = p.y + dy / d * 10;
    ball.last = p;
    if (kind === 'shot') { ball.shotId++; ball.shotBy = p.team; S.shots[p.team]++; }
    p.kickT = 0.001; p.fx = dx / d; p.fy = dy / d;
    audio.play('kick', { power: clamp(speed / 1000, 0.2, 1) });
    fx.dust(p.x, p.y, 4);
  }

  function shoot(p, charge, aimX, aimY) {
    const gx = p.team === 0 ? FX1 + 4 : FX0 - 4;
    let tx, ty;
    if (aimX === null) { tx = gx; ty = CY + rand(-GOAL_HALF * 0.7, GOAL_HALF * 0.7); }
    else {
      const towardGoal = (gx - p.x) * aimX > 0;
      if (towardGoal) {
        const t = (gx - p.x) / (aimX || 1e-6);
        const hitY = p.y + aimY * t;
        const assist = p.human ? (options.difficulty === 'rookie' ? 0.65 : 0.4) : 0;
        const clampedY = clamp(hitY, GY0 + 8, GY1 - 8);
        tx = gx; ty = hitY + (clampedY - hitY) * assist;
      } else { tx = p.x + aimX * 400; ty = p.y + aimY * 400; }
    }
    const speed = 470 + 560 * charge;
    let vz = 70 + 300 * charge * charge;
    if (p.human && options.difficulty === 'rookie') vz = Math.min(vz, 250);
    kick(p, tx - p.x, ty - p.y, speed, vz, 'shot');
    if (charge > 0.8) { fx.sparks(p.x, p.y - 10, 10); fx.shake(4); }
  }

  function pass(p, to) {
    const lead = 0.35;
    const tx = to.x + to.vx * lead, ty = to.y + to.vy * lead;
    const d = len(tx - p.x, ty - p.y);
    const lob = d > 420;
    kick(p, tx - p.x, ty - p.y, clamp(d * 1.5 + 200, 320, 660), lob ? 260 : 40, 'pass');
  }

  function bestMate(p, dirX, dirY) {
    const mates = teamOf(p.team).filter(q => q !== p && q.role !== 'gk');
    if (!mates.length) return null;
    return mates[0];
  }

  // ---------- human ----------
  function updateHuman(dt) {
    const p = me;
    if (p.stun > 0) return;
    let mx = input.mx, my = input.my;
    const has = ball.owner === p;
    const mateHas = ball.owner === mate;
    if (has) S.tip = Math.max(S.tip, 0);
    // sprint on B when not holding ball and teammate doesn't have it
    p.sprinting = !has && !mateHas && input.b.down && p.stamina > 0.05 && (mx || my);
    if (p.sprinting) p.stamina = Math.max(0, p.stamina - dt * 0.45); else p.stamina = Math.min(1, p.stamina + dt * 0.2);
    let sp = 215 * (p.sprinting ? 1.38 : 1) * (has ? 0.82 : 1);
    if (p.tackleT > 0) { mx = p.fx; my = p.fy; sp = 430; }
    else if (p.tackleT < 0) sp *= 0.35;
    p.target.vx = mx * sp; p.target.vy = my * sp;
    if (mx || my) { const d = len(mx, my); p.fx = mx / d; p.fy = my / d; }

    if (has) {
      if (input.a.down) p.charge = Math.min(1, input.a.heldFor / 0.85);
      if (input.a.released) {
        const aim = (input.mx || input.my) ? [input.mx, input.my] : [null, null];
        shoot(p, Math.max(0.15, p.charge || 0), aim[0], aim[1]);
        p.charge = 0;
      }
      if (input.b.pressed) { pass(p, mate); p.charge = 0; }
    } else {
      p.charge = 0;
      if (input.a.pressed && p.tackleT === 0 && ball.owner !== keeperOf(1)) { p.tackleT = 0.32; audio.play('swoosh'); fx.dust(p.x, p.y, 5); }
      if (input.b.pressed && mateHas) { mate.wantPass = 0.25; fx.text('PASS!', p.x, p.y - 80, { size: 22, color: '#a5f3fc', life: 0.8, rise: 30 }); }
    }
    // dynamic labels
    const key = has ? 'has' : mateHas ? 'mate' : 'none';
    if (key !== S.labelKey) {
      S.labelKey = key;
      input.setLabels(has ? 'SHOOT' : 'TACKLE', has ? 'PASS' : mateHas ? 'CALL' : 'SPRINT');
    }
  }

  // ---------- AI ----------
  function nearestTo(list, x, y) { let best = null, bd = 1e9; for (const p of list) { const d = len(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } } return best; }

  function updateFieldAI(p, dt) {
    if (p.stun > 0) { p.target.vx = p.target.vy = 0; return; }
    const dir = p.team === 0 ? 1 : -1;
    const oppGoalX = p.team === 0 ? FX1 : FX0, ownGoalX = p.team === 0 ? FX0 : FX1;
    const skill = p.team === 0 ? DIFF.pro : D;
    const baseSpeed = 205 * skill.speed;
    let tx = p.x, ty = p.y, speed = baseSpeed;
    const owner = ball.owner;
    const opps = fieldOf(1 - p.team);
    p.think -= dt;

    if (owner === p) {
      const dGoal = len(oppGoalX - p.x, CY - p.y);
      const nearOpp = nearestTo(teamOf(1 - p.team), p.x + dir * 30, p.y);
      const pressure = nearOpp ? len(nearOpp.x - p.x, nearOpp.y - p.y) : 999;
      const m = teamOf(p.team).find(q => q !== p && q.role !== 'gk');
      if (p.wantPass > 0 && m) { p.wantPass -= dt; if (p.wantPass <= 0) { pass(p, m); return; } }
      if (p.think <= 0) {
        p.think = skill.think + rand(0, 0.2);
        const shootRange = 260 + skill.shootSkill * 120;
        if (dGoal < shootRange && (pressure > 50 || dGoal < 190) && Math.random() < 0.55 + skill.shootSkill * 0.3) {
          const charge = clamp(rand(0.35, 0.75) + (dGoal > 280 ? 0.15 : 0), 0, 0.95);
          const ty2 = CY + rand(-1, 1) * GOAL_HALF * (0.4 + skill.shootSkill * 0.45);
          const dx = oppGoalX - p.x, dy = ty2 - p.y, dd = len(dx, dy);
          shoot(p, charge, dx / dd, dy / dd);
          return;
        }
        if (m && pressure < 55 && Math.random() < 0.6) {
          const mAhead = (m.x - p.x) * dir > -60;
          const mFree = (nearestTo(opps, m.x, m.y) ? len(nearestTo(opps, m.x, m.y).x - m.x, nearestTo(opps, m.x, m.y).y - m.y) : 999) > 60;
          if (mAhead || mFree) { pass(p, m); return; }
        }
        if (m && m.human && (m.x - p.x) * dir > 40 && Math.random() < 0.35) { pass(p, m); return; }
      }
      // dribble toward goal, steering around defenders
      let sx = oppGoalX - p.x, sy = (CY - p.y) * 0.7;
      const sd = len(sx, sy) || 1; sx /= sd; sy /= sd;
      for (const o of teamOf(1 - p.team)) {
        const ox = p.x - o.x, oy = p.y - o.y, od = len(ox, oy);
        if (od < 110 && (o.x - p.x) * dir > -20) { sy += (oy / od) * (110 - od) / 60; sx -= 0.2 * (110 - od) / 110; }
      }
      if (p.y < FY0 + 50) sy += 0.6; if (p.y > FY1 - 50) sy -= 0.6;
      tx = p.x + sx * 100; ty = p.y + sy * 100; speed = baseSpeed * 0.9;
    } else if (owner && owner.team === p.team) {
      // support run
      const laneY = owner.y < CY ? CY + 120 : CY - 120;
      tx = clamp(owner.x + dir * 170, FX0 + 120, FX1 - 120); ty = laneY;
      speed = baseSpeed * 0.9;
    } else {
      const ownTeamField = fieldOf(p.team);
      // who chases? nearest field player of this team (humans count for team 0)
      const bx = ball.x + ball.vx * 0.25, by = ball.y + ball.vy * 0.25;
      const chaser = nearestTo(ownTeamField, bx, by);
      if (chaser === p) {
        if (owner) {
          tx = owner.x - dir * 12; ty = owner.y;
          const d = len(owner.x - p.x, owner.y - p.y);
          if (d < 24 && owner.role !== 'gk' && p.cd <= 0 && Math.random() < skill.tackle * dt) steal(p, owner);
        } else { tx = bx; ty = by; }
        speed = baseSpeed * 1.05;
      } else {
        // hold a defensive position between ball and own goal
        tx = ownGoalX + (ball.x - ownGoalX) * 0.45; ty = CY + (ball.y - CY) * 0.6;
        if (owner && owner.team !== p.team) { tx = ownGoalX + (ball.x - ownGoalX) * 0.55; }
        speed = baseSpeed * 0.85;
      }
    }
    const dx = tx - p.x, dy = ty - p.y, d = len(dx, dy);
    if (d > 6) { p.target.vx = dx / d * speed * Math.min(1, d / 40); p.target.vy = dy / d * speed * Math.min(1, d / 40); }
    else { p.target.vx = p.target.vy = 0; }
  }

  function steal(thief, victim) {
    release(victim, 0.6); victim.stun = 0.45;
    giveBall(thief); thief.cd = 0.2;
    audio.play('tackle'); fx.dust(victim.x, victim.y, 8);
    if (thief === me) { S.tackles++; fx.text('STOLEN!', thief.x, thief.y - 80, { size: 26, color: '#a3e635' }); }
    if (victim === me) fx.text('Tackled!', me.x, me.y - 80, { size: 22, color: '#fca5a5' });
  }

  function updateKeeper(k, dt) {
    const side = k.team === 0 ? -1 : 1;
    const gx = k.team === 0 ? FX0 + 22 : FX1 - 22;
    const skill = k.team === 0 ? DIFF.pro : D;
    if (ball.owner === k) {
      k.hold += dt;
      k.target.vx = (gx - side * 30 - k.x) * 3; k.target.vy = (CY - k.y) * 2;
      if (k.hold > 1.1) {
        const mates = fieldOf(k.team);
        const opps = fieldOf(1 - k.team);
        let best = mates[0], bs = -1e9;
        for (const m of mates) { const o = nearestTo(opps, m.x, m.y); const free = o ? len(o.x - m.x, o.y - m.y) : 300; const s = free + (m.human ? 40 : 0); if (s > bs) { bs = s; best = m; } }
        const d = len(best.x - k.x, best.y - k.y);
        kick(k, best.x + best.vx * 0.5 - k.x, best.y + best.vy * 0.5 - k.y, clamp(d * 1.3 + 180, 300, 620), d > 300 ? 300 : 120, 'pass');
      }
      return;
    }
    if (k.diveT > 0) { k.target.vx = 0; k.target.vy = k.diveDir * 380; return; }
    // Smother a dribbler who gets too close to goal.
    const o = ball.owner;
    if (o && o.team !== k.team && Math.abs(o.x - (side < 0 ? FX0 : FX1)) < 190 && Math.abs(o.y - CY) < 170) {
      const d0 = len(o.x - k.x, o.y - k.y);
      if (d0 < 24 && Math.random() < skill.keeper * 2.2 * dt) { steal(k, o); audio.play('catch'); fx.text('SMOTHERED!', k.x, k.y - 80, { size: 24, color: '#fef08a' }); return; }
      if (d0 < 140) { const tx2 = k.x + (o.x - k.x) * 0.5, ty2 = k.y + (o.y - k.y) * 0.5; const dd = len(tx2 - k.x, ty2 - k.y) || 1; k.target.vx = (tx2 - k.x) / dd * 200; k.target.vy = (ty2 - k.y) / dd * 200; return; }
    }
    let ty = CY + (ball.y - CY) * 0.55;
    let tx = gx;
    const towards = (side < 0 && ball.vx < -200) || (side > 0 && ball.vx > 200);
    if (!ball.owner && towards) {
      const t = (gx - ball.x) / ball.vx;
      if (t > 0 && t < 0.9) {
        const py = ball.y + ball.vy * t;
        ty = py;
        if (t < 0.42 && Math.abs(py - k.y) > 20 && Math.abs(py - CY) < GOAL_HALF + 30 && ball.z < BAR + 10) { k.diveT = 0.55; k.diveDir = Math.sign(py - k.y); audio.play('swoosh'); }
      }
    }
    // rush out for loose slow balls in the box
    const inBox = Math.abs(ball.x - (side < 0 ? FX0 : FX1)) < 150 && Math.abs(ball.y - CY) < 160;
    if (!ball.owner && inBox && len(ball.vx, ball.vy) < 260) {
      const myD = len(ball.x - k.x, ball.y - k.y);
      const oppD = Math.min(...fieldOf(1 - k.team).map(o => len(o.x - ball.x, o.y - ball.y)));
      if (myD < oppD + 30) { tx = ball.x; ty = ball.y; }
    }
    ty = clamp(ty, GY0 - 10, GY1 + 10);
    if (Math.abs(tx - gx) < 1) tx = gx;
    const dx = tx - k.x, dy = ty - k.y, d = len(dx, dy), sp = 190 * skill.speed * 1.05;
    if (d > 3) { k.target.vx = dx / d * sp * Math.min(1, d / 25); k.target.vy = dy / d * sp * Math.min(1, d / 25); } else k.target.vx = k.target.vy = 0;
  }

  // ---------- physics ----------
  function integratePlayers(dt) {
    for (const p of players) {
      p.cd = Math.max(0, p.cd - dt); p.stun = Math.max(0, p.stun - dt);
      if (p.tackleT > 0) { p.tackleT -= dt; if (p.tackleT <= 0) p.tackleT = -0.35; }
      else if (p.tackleT < 0) { p.tackleT = Math.min(0, p.tackleT + dt); }
      if (p.diveT > 0) { p.diveT -= dt; if (p.diveT <= 0) { p.diveT = 0; p.cd = 0.1; } }
      if (p.kickT > 0) { p.kickT += dt; if (p.kickT > 0.3) p.kickT = 0; }
      const acc = p.tackleT > 0 || p.diveT > 0 ? 30 : 9;
      const k = Math.min(1, dt * acc);
      p.vx += ((p.target.vx || 0) - p.vx) * k; p.vy += ((p.target.vy || 0) - p.vy) * k;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.x = clamp(p.x, FX0 - 24, FX1 + 24); p.y = clamp(p.y, FY0 + 6, FY1 - 4);
      // keep field players out of the goal nets
      if ((p.x < FX0 || p.x > FX1) && p.role !== 'gk') p.x = clamp(p.x, FX0 + 2, FX1 - 2);
      const sp = len(p.vx, p.vy);
      p.phase += sp * dt * 0.055;
      if (sp > 20 && p.tackleT <= 0) { const nx = p.vx / sp, ny = p.vy / sp; if (!p.human || !(input.mx || input.my)) { p.fx = nx; p.fy = ny; } }
    }
    // separation
    for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) {
      const a = players[i], b = players[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = len(dx, dy), min = 22;
      if (d > 0 && d < min) { const push = (min - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push; }
    }
  }

  function updateBall(dt) {
    ball.noTouchT = Math.max(0, ball.noTouchT - dt);
    if (ball.owner) {
      const p = ball.owner;
      const tx = p.x + p.fx * 15, ty = p.y + p.fy * 9 + 3;
      ball.x += (tx - ball.x) * Math.min(1, dt * 18); ball.y += (ty - ball.y) * Math.min(1, dt * 18);
      ball.z = Math.max(0, ball.z - dt * 200); ball.vx = p.vx; ball.vy = p.vy; ball.vz = 0;
      const sp = len(p.vx, p.vy);
      ball.spin += sp * dt * 0.06;
      ball.dribT += dt * sp / 200;
      if (ball.dribT > 1.1) { ball.dribT = 0; audio.play('dribble'); }
      return;
    }
    // airborne / rolling
    ball.vz -= GRAV * dt;
    ball.z += ball.vz * dt;
    if (ball.z <= 0) {
      ball.z = 0;
      if (ball.vz < -120) { ball.vz = -ball.vz * 0.48; audio.play('thud', { power: clamp(ball.vz / 300, 0.1, 1) }); }
      else ball.vz = 0;
    }
    const fr = ball.z > 0 ? 0.15 : 1.15;
    ball.vx *= Math.exp(-fr * dt); ball.vy *= Math.exp(-fr * dt);
    const px = ball.x;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    ball.spin += len(ball.vx, ball.vy) * dt * 0.06;

    // posts
    for (const gx of [FX0, FX1]) for (const gy of [GY0, GY1]) {
      if (ball.z < BAR) {
        const dx = ball.x - gx, dy = ball.y - gy, d = len(dx, dy);
        if (d < BALL_R + 3) {
          const nx = dx / d, ny = dy / d, dot = ball.vx * nx + ball.vy * ny;
          if (dot < 0) { ball.vx -= 1.7 * dot * nx; ball.vy -= 1.7 * dot * ny; ball.x = gx + nx * (BALL_R + 3); ball.y = gy + ny * (BALL_R + 3); audio.play('post'); fx.shake(5); audio.play('aww'); }
        }
      }
    }
    // goal line logic
    for (const side of [-1, 1]) {
      const gx = side < 0 ? FX0 : FX1;
      const crossed = side < 0 ? (px >= gx && ball.x < gx) : (px <= gx && ball.x > gx);
      if (!crossed) continue;
      const inMouth = ball.y > GY0 && ball.y < GY1;
      if (inMouth && ball.z < BAR - 3) {
        if (S.phase === 'play') goal(side < 0 ? 1 : 0, side);
      } else if (inMouth && ball.z < BAR + 6) {
        ball.vx = -ball.vx * 0.5; ball.vz = -Math.abs(ball.vz) * 0.3 + 120; ball.x = gx - side * 2; audio.play('post'); fx.shake(4);
      } else if (inMouth) {
        S.overTimer = 0.7; S.overSide = side; fx.text('Over the bar!', gx - side * 120, CY - 60, { size: 24, color: '#fde68a' }); audio.play('aww');
      } else {
        ball.vx = -ball.vx * 0.55; ball.x = gx - side * 1; // end boards
        audio.play('thud', { power: 0.6 });
      }
    }
    // inside the goal net
    for (const side of [-1, 1]) {
      const gx = side < 0 ? FX0 : FX1, bx = gx - side * GOAL_DEPTH;
      const inside = side < 0 ? ball.x < gx : ball.x > gx;
      if (inside && ball.y > GY0 - 2 && ball.y < GY1 + 2 && S.overTimer <= 0) {
        if ((side < 0 && ball.x < bx + BALL_R) || (side > 0 && ball.x > bx - BALL_R)) { ball.x = bx - side * BALL_R; ball.vx = -ball.vx * 0.15; ball.vy *= 0.5; S.ripple[side < 0 ? 0 : 1] = 1; }
        if (ball.y < GY0 + BALL_R) { ball.y = GY0 + BALL_R; ball.vy = Math.abs(ball.vy) * 0.3; }
        if (ball.y > GY1 - BALL_R) { ball.y = GY1 - BALL_R; ball.vy = -Math.abs(ball.vy) * 0.3; }
      }
    }
    // side boards
    if (ball.y < FY0 + BALL_R) { ball.y = FY0 + BALL_R; ball.vy = Math.abs(ball.vy) * 0.6; audio.play('thud', { power: 0.5 }); }
    if (ball.y > FY1 - BALL_R) { ball.y = FY1 - BALL_R; ball.vy = -Math.abs(ball.vy) * 0.6; audio.play('thud', { power: 0.5 }); }
    if (S.overTimer > 0) {
      S.overTimer -= dt;
      if (S.overTimer <= 0) { const k = keeperOf(S.overSide < 0 ? 0 : 1); Object.assign(ball, { vx: 0, vy: 0, vz: 0, z: 0, x: k.x, y: k.y }); giveBall(k); }
      return;
    }
    if (ball.x < FX0 - GOAL_DEPTH - 10 || ball.x > FX1 + GOAL_DEPTH + 10) { ball.x = clamp(ball.x, FX0 + 5, FX1 - 5); ball.vx *= -0.3; }

    // pick-ups
    if (S.phase !== 'play') return;
    const bs = len(ball.vx, ball.vy);
    for (const p of players) {
      if (p.cd > 0 || p.stun > 0) continue;
      if (ball.noTouch === p && ball.noTouchT > 0) continue;
      const isGK = p.role === 'gk';
      const reach = isGK ? (p.diveT > 0 ? 40 : 28) : 17;
      const zMax = isGK ? BAR + 8 : 24;
      const d = len(ball.x - p.x, ball.y - (p.y - (isGK && p.diveT > 0 ? 10 : 0)));
      if (d > reach || ball.z > zMax) continue;
      if (isGK) {
        const inArea = Math.abs(p.x - (p.team === 0 ? FX0 : FX1)) < 200;
        if (!inArea) { if (bs < 520) { giveBall(p); } continue; }
        if (bs > 330 && ball.shotBy !== p.team) {
          if (ball.keeperRolled === ball.shotId) continue;
          ball.keeperRolled = ball.shotId;
          const skill = p.team === 0 ? DIFF.pro : D;
          const chance = clamp(skill.keeper * (1.5 - bs / 1300) + (p.diveT > 0 ? 0.02 : 0.3), 0.1, 0.95);
          if (Math.random() < chance) {
            giveBall(p); audio.play('catch'); fx.text('SAVED!', p.x, p.y - 80, { size: 30, color: '#fef08a' }); audio.play('cheer', { amount: 0.5 });
          } else if (Math.random() < 0.45) {
            ball.vx = -ball.vx * 0.35; ball.vy = rand(-260, 260); ball.vz = 160; p.cd = 0.5; audio.play('catch'); fx.text('Parried!', p.x, p.y - 80, { size: 22, color: '#fde68a' });
          }
          continue;
        }
        giveBall(p); audio.play('catch');
        continue;
      }
      if (bs > 560 && ball.last && ball.last.team === p.team) continue; // teammates let fast passes/shots through
      if (bs > 560) { ball.vx *= -0.35; ball.vy = ball.vy * 0.3 + rand(-120, 120); ball.vz = 80; ball.last = p; p.cd = 0.25; audio.play('thud'); fx.dust(ball.x, ball.y, 4); continue; }
      if (ball.owner && ball.owner !== p) continue;
      giveBall(p);
      audio.play('dribble');
      break;
    }
  }

  function tackles() {
    if (me.tackleT > 0 && ball.owner && ball.owner.team === 1 && ball.owner.role !== 'gk') {
      const o = ball.owner;
      if (len(o.x - me.x, o.y - me.y) < 26) { steal(me, o); me.tackleT = -0.2; }
    }
    if (me.tackleT > 0 && !ball.owner && len(ball.x - me.x, ball.y - me.y) < 22 && ball.z < 20) { giveBall(me); me.tackleT = -0.2; }
  }

  function goal(team, side) {
    S.score[team]++;
    S.phase = 'goal'; S.t = 0; S.slow = 0.25;
    S.ripple[side < 0 ? 0 : 1] = 1;
    S.kickoffTeam = 1 - team;
    const scorer = ball.last && ball.last.team === team ? ball.last : null;
    if (scorer === me) S.myGoals++;
    S.banner = team === 0 ? 'GOAL!' : 'GOAL';
    S.bannerSub = scorer === me ? (S.myGoals === 3 ? 'HAT TRICK!' : 'What a strike!') : team === 0 ? 'Team goal!' : 'CPU scores…';
    for (const p of players) p.celebrate = p.team === team && p.role !== 'gk' ? 1 : 0;
    audio.play('whistle');
    if (team === 0) { audio.play('fanfare'); audio.cheer(1.5); fx.confetti(side < 0 ? FX0 + 60 : FX1 - 60, CY, 140); fx.flashScreen('#fff', 0.5); fx.shake(14); S.excite = 1; audio.duck(0.25, 3); }
    else { audio.play('aww'); audio.cheer(0.6); fx.shake(6); S.excite = 0.6; }
  }

  if (env.debug) env.debug({ me, mate, ball, S, players }); // test hook used by headless simulations
  kickoff(0);
  audio.setCrowd(0.6);

  // ---------- frame ----------
  function update(dtReal) {
    S.slow += (1 - S.slow) * Math.min(1, dtReal * 1.2);
    const dt = dtReal * (S.phase === 'goal' ? S.slow : 1);
    S.t += dtReal;
    S.excite = Math.max(0, S.excite - dtReal * 0.25);
    S.ripple = S.ripple.map(r => Math.max(0, r - dtReal * 1.2));
    if (S.tip > 0) S.tip -= dtReal;

    if (S.phase === 'countdown') {
      const n = 3 - Math.floor(S.t);
      if (n !== S.lastCount && n > 0) { S.lastCount = n; audio.play('beep'); }
      if (S.t >= 3) { S.phase = 'play'; S.t = 0; audio.play('whistle', { long: true }); audio.play('go'); audio.cheer(0.6); }
      for (const p of players) { p.phase += dtReal * 2; }
      return;
    }
    if (S.phase === 'goal') {
      for (const p of players) {
        if (p.celebrate) { const s = ball.last; if (s && p !== s) { p.target.vx = (s.x - p.x) * 1.5; p.target.vy = (s.y - p.y) * 1.5; } else { p.target.vx = p.target.vy = 0; } }
        else { p.target.vx = p.target.vy = 0; }
        p.phase += dt * 6;
      }
      integratePlayers(dt); updateBall(dt);
      if (S.t > 3) {
        S.banner = null;
        if (S.clock >= matchLen) return endMatch();
        kickoff(S.kickoffTeam); S.phase = 'restart'; S.t = 0;
      }
      return;
    }
    if (S.phase === 'restart') { if (S.t > 0.9) { S.phase = 'play'; S.t = 0; audio.play('whistle'); } return; }
    if (S.phase === 'end') {
      for (const p of players) { p.target.vx = p.target.vy = 0; p.celebrate = (p.team === 0) === (S.score[0] > S.score[1]) && S.score[0] !== S.score[1] ? 1 : 0; p.phase += dt * 6; }
      integratePlayers(dt);
      if (S.t > 1.6 && !S.reported) { S.reported = true; report(); }
      return;
    }

    // play
    S.clock += dt;
    if (S.clock >= matchLen) return endMatch();
    updateHuman(dt);
    updateFieldAI(mate, dt);
    updateFieldAI(players[3], dt); updateFieldAI(players[4], dt);
    updateKeeper(keeperOf(0), dt); updateKeeper(keeperOf(1), dt);
    integratePlayers(dt);
    tackles();
    updateBall(dt);
    // crowd energy rises when the ball nears a goal
    const near = 1 - Math.min(Math.abs(ball.x - FX0), Math.abs(ball.x - FX1)) / 560;
    audio.setCrowd(0.45 + near * 0.6, 1.5);
  }

  function endMatch() {
    S.phase = 'end'; S.t = 0;
    audio.play('whistle', { triple: true });
    const [a, b] = S.score;
    S.banner = a > b ? 'YOU WIN!' : a < b ? 'FULL TIME' : 'DRAW';
    S.bannerSub = `${a} – ${b}`;
    if (a > b) { fx.rain(1280, 160); audio.cheer(1.6); }
    audio.setCrowd(0.3);
  }
  function report() {
    const [a, b] = S.score;
    env.end({
      outcome: a > b ? 'win' : a < b ? 'lose' : 'draw',
      scoreline: `YOU ${a} – ${b} CPU`,
      stats: [`Your goals: <b>${S.myGoals}</b>`, `Shots: <b>${S.shots[0]}</b>`, `Steals: <b>${S.tackles}</b>`, `Difficulty: <b>${options.difficulty}</b>`],
      match: { game: 'soccer', difficulty: options.difficulty, won: a > b, draw: a === b, goalsFor: a, goalsAgainst: b, playerGoals: S.myGoals },
    });
  }

  // ---------- draw ----------
  function drawPlayer(ctx, p) {
    const sp = len(p.vx, p.vy);
    const sideView = Math.abs(p.fx) >= Math.abs(p.fy) * 0.8;
    let view = sideView ? 'side' : p.fy < 0 ? 'back' : 'front';
    let pose = 'run', poseT = 0;
    if (p.kickT > 0) { pose = 'kick'; poseT = p.kickT / 0.3; view = 'side'; }
    if (p.tackleT > 0) { pose = 'kick'; poseT = 0.5; view = 'side'; }
    if (p.diveT > 0) { pose = 'dive'; poseT = 1 - p.diveT / 0.55; view = 'side'; }
    if (p.celebrate && (S.phase === 'goal' || S.phase === 'end')) { pose = 'celebrate'; view = 'front'; }
    if (p.role === 'gk' && sp < 30 && pose === 'run') { pose = 'ready'; view = p.team === 0 ? 'side' : 'side'; }
    const flip = view === 'side' && (p.diveT > 0 ? (p.team === 0 ? p.diveDir < 0 : p.diveDir > 0) && false : p.fx < 0);
    let dy = 0;
    if (p.diveT > 0) dy = 0;
    if (p === me) {
      // selection ring
      const pulse = 0.5 + 0.5 * Math.sin(S.t * 6);
      ctx.strokeStyle = `rgba(34,211,238,${0.6 + pulse * 0.4})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 20, 8, 0, 0, Math.PI * 2); ctx.stroke();
    }
    drawHuman(ctx, p.x, p.y + dy, PLAYER_SCALE, {
      view, flip: p.diveT > 0 ? p.diveDir < 0 ^ p.team === 1 : flip, phase: p.phase, moving: clamp(sp / 180, 0, 1), pose, poseT,
      ...p.look, shirt: p.kit.shirt, shorts: p.kit.shorts, socks: p.kit.socks, stripe: p.kit.stripe, number: p.number,
      gloves: p.role === 'gk' ? '#f8fafc' : null, alpha: p.stun > 0 ? 0.75 : 1, face: p.celebrate ? 'happy' : undefined,
    });
    if (p === me) {
      const y = p.y - 100 * PLAYER_SCALE - 14 + Math.sin(S.t * 5) * 3;
      ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.moveTo(p.x - 8, y - 10); ctx.lineTo(p.x + 8, y - 10); ctx.lineTo(p.x, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#083344'; ctx.lineWidth = 2; ctx.stroke();
      if (p.charge > 0) {
        const w = 46, h = 8, bx = p.x - w / 2, by = y - 28;
        ctx.fillStyle = 'rgba(0,0,0,.6)'; rrect(ctx, bx - 2, by - 2, w + 4, h + 4, 5); ctx.fill();
        const g = ctx.createLinearGradient(bx, 0, bx + w, 0); g.addColorStop(0, '#a3e635'); g.addColorStop(0.6, '#fbbf24'); g.addColorStop(1, '#ef4444');
        ctx.fillStyle = g; rrect(ctx, bx, by, w * p.charge, h, 4); ctx.fill();
      }
      if (p.stamina < 0.98) {
        ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(p.x - 16, p.y + 12, 32, 4);
        ctx.fillStyle = p.stamina > 0.3 ? '#38bdf8' : '#f87171'; ctx.fillRect(p.x - 16, p.y + 12, 32 * p.stamina, 4);
      }
    } else if (p === mate) {
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '900 11px Nunito'; ctx.textAlign = 'center';
      ctx.fillText('MATE', p.x, p.y - 100 * PLAYER_SCALE - 8);
    }
  }

  function draw(ctx, view) {
    drawStadium(ctx, view, S.t + S.clock, S.excite);
    const ents = players.map(p => ({ y: p.y, d: () => drawPlayer(ctx, p) }));
    ents.push({ y: ball.y + 1, d: () => drawBall(ctx, ball) });
    ents.push({ y: GY0 - 1, d: () => { drawGoalBack(ctx, -1); drawGoalBack(ctx, 1); } });
    ents.push({ y: GY1 + 0.5, d: () => { drawGoalFront(ctx, -1, S.ripple[0]); drawGoalFront(ctx, 1, S.ripple[1]); } });
    ents.sort((a, b) => a.y - b.y).forEach(e => e.d());
    fx.draw(ctx);
    drawHUD(ctx);
  }

  function drawHUD(ctx) {
    // scoreboard
    const w = 380, h = 58, x = CX - w / 2, y = 10;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 16;
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(20,28,70,.95)'); g.addColorStop(1, 'rgba(10,14,40,.95)');
    ctx.fillStyle = g; rrect(ctx, x, y, w, h, 16); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = kits[0].shirt; rrect(ctx, x + 10, y + 12, 10, 34, 4); ctx.fill();
    ctx.fillStyle = kits[1].shirt; rrect(ctx, x + w - 20, y + 12, 10, 34, 4); ctx.fill();
    ctx.font = "900 18px Nunito"; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.textAlign = 'left'; ctx.fillText('YOU', x + 30, y + h / 2);
    ctx.textAlign = 'right'; ctx.fillText('CPU', x + w - 30, y + h / 2);
    ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center';
    ctx.fillText(`${S.score[0]}  -  ${S.score[1]}`, CX, y + h / 2 + 1);
    const mins = Math.min(90, (S.clock / matchLen) * 90);
    const mm = Math.floor(mins), ss = Math.floor((mins - mm) * 60);
    ctx.fillStyle = 'rgba(251,191,36,.95)'; rrect(ctx, CX - 40, y + h - 6, 80, 24, 8); ctx.fill();
    ctx.fillStyle = '#1c1300'; ctx.font = "900 15px Nunito";
    ctx.fillText(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, CX, y + h + 6);
    ctx.restore();

    if (S.phase === 'countdown') {
      const n = 3 - Math.floor(S.t);
      drawBanner(ctx, n > 0 ? String(n) : 'GO!', CX, CY - 40, S.t % 1, { size: 150, color: '#a5f3fc', glow: '#22d3ee' });
    }
    if (S.banner && (S.phase === 'goal' || S.phase === 'end')) {
      drawBanner(ctx, S.banner, CX, CY - 60, S.t, { size: S.phase === 'goal' && S.banner === 'GOAL!' ? 160 : 120, sub: S.bannerSub,
        color: S.banner === 'GOAL' ? '#cbd5e1' : '#fde68a', glow: S.banner === 'GOAL' ? '#64748b' : '#f59e0b' });
    }
    if (S.tip > 0 && S.phase === 'play') {
      ctx.globalAlpha = Math.min(1, S.tip);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; rrect(ctx, CX - 250, FY1 - 54, 500, 38, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '800 16px Nunito'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(input.touchMode ? 'Hold SHOOT to power up, release to fire. PASS to your mate.' : 'Hold SPACE to power a shot · SHIFT to pass · move with WASD', CX, FY1 - 35);
      ctx.globalAlpha = 1;
    }
  }

  return { update, draw };
}

// ---------- menu thumbnail ----------
const thumbCast = [
  { skin: SKINS[1], hair: HAIRS[0], style: 'short', shirt: '#2563eb', num: 10 },
  { skin: SKINS[3], hair: HAIRS[1], style: 'curly', shirt: '#dc2626', num: 4 },
  { skin: SKINS[4], hair: HAIRS[0], style: 'buzz', shirt: '#2563eb', num: 7 },
];
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2);
  ctx.scale(s, s);
  const v = view || { ox: 0, oy: 0, W: 1280, H: 720 };
  drawStadium(ctx, view ? v : { ox: 0, oy: 0, W: 1280, H: 720 }, t, 0.8);
  drawGoalBack(ctx, 1);
  // scripted attack: striker dribbles in and shoots, defender chases
  const cyc = t % 4;
  const k = Math.min(1, cyc / 2.4);
  const px = 620 + k * 420, py = 470 - k * 50;
  const ball = { x: px + 16, y: py + 3, z: 0, vx: 1, vy: 0, vz: 0, spin: t * 8, owner: true };
  let kickT = 0;
  if (cyc > 2.4) { const u = cyc - 2.4; ball.x = px + 16 + u * 700; ball.y = py + 3 - u * 40; ball.z = Math.max(0, 140 * u - 200 * u * u); ball.owner = false; ball.vx = 700; kickT = Math.min(1, u * 3); }
  if (ball.x > FX1 + GOAL_DEPTH - 8) ball.x = FX1 + GOAL_DEPTH - 8;
  const ents = [
    { y: py, d: () => drawHuman(ctx, px, py, PLAYER_SCALE * 1.4, { view: 'side', phase: t * 9, moving: cyc > 2.4 ? 0.2 : 1, pose: kickT ? 'kick' : 'run', poseT: kickT, ...thumbCast[0], number: 10 }) },
    { y: py - 70, d: () => drawHuman(ctx, px - 120 + k * 60, py - 70, PLAYER_SCALE * 1.4, { view: 'side', phase: t * 9 + 1, moving: 1, ...thumbCast[1], flip: false }) },
    { y: CY + 10, d: () => drawHuman(ctx, FX1 - 26, CY + 10 + Math.sin(t * 2) * 20, PLAYER_SCALE * 1.4, { view: 'side', flip: true, pose: 'ready', phase: 0, moving: 0, skin: SKINS[2], hair: HAIRS[2], style: 'short', shirt: '#f97316', shorts: '#431407', gloves: '#fff' }) },
    { y: ball.y, d: () => drawBall(ctx, ball) },
    { y: GY1, d: () => drawGoalFront(ctx, 1, cyc > 3 ? 1 - (cyc - 3) : 0) },
  ];
  ents.sort((a, b) => a.y - b.y).forEach(e => e.d());
  ctx.restore();
}

export default {
  id: 'soccer',
  title: 'Soccer',
  tagline: '3-a-side stadium showdown',
  desc: 'Team up with your AI midfielder and beat the CPU club under the floodlights.',
  music: 'soccer',
  labels: { a: 'SHOOT', b: 'PASS' },
  options: [{ key: 'length', label: 'Match length', default: 1, choices: [{ v: '90', label: 'Quick', sub: '1.5 min' }, { v: '150', label: 'Normal', sub: '2.5 min' }, { v: '240', label: 'Long', sub: '4 min' }] }],
  howto: `<ul>
    <li><b>Move</b>: joystick, or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrow keys.</li>
    <li><b>Shoot</b>: hold <b>SHOOT</b> (<kbd>Space</kbd>) to power up, release to fire. Aim with the joystick. Full power can sail over the bar!</li>
    <li><b>Pass</b>: <b>PASS</b> (<kbd>Shift</kbd>) sends the ball to your teammate.</li>
    <li><b>Defend</b>: without the ball, <b>TACKLE</b> slides in to steal it. <b>SPRINT</b> (hold) uses stamina.</li>
    <li>When your mate has the ball, press <b>CALL</b> to ask for a pass.</li>
    <li>Rewards: points and coins for playing, winning, each goal and clean sheets. Higher difficulty multiplies rewards.</li>
  </ul>`,
  create,
  drawThumb,
};
