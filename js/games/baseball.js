// ROBLOC Baseball: bat and pitch through innings against a CPU team.
// World units are feet: x = toward first base (+) / third base (−), y = from home plate toward center field, z = height.
import { drawHuman, drawShadow, shade, rrect, SKINS, HAIRS, HAIR_STYLES } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { pitchT: 0.68, zoneRate: 0.78, mix: 0.25, window: 0.15, radius: 0.85, fieldSpd: 15, contact: 0.5, power: 0.7, eye: 0.55 },
  pro: { pitchT: 0.55, zoneRate: 0.64, mix: 0.45, window: 0.11, radius: 0.66, fieldSpd: 19, contact: 0.64, power: 0.85, eye: 0.72 },
  legend: { pitchT: 0.47, zoneRate: 0.56, mix: 0.6, window: 0.09, radius: 0.55, fieldSpd: 23, contact: 0.76, power: 1, eye: 0.86 },
  boost: { pitchT: 0.78, zoneRate: 0.92, mix: 0.1, window: 0.18, radius: 0.95, fieldSpd: 10, contact: 0.2, power: 0.55, eye: 0.25 },  // win-chance matches
};
const G = 32.2, DRAG = 0.002;
const ZONE = { x0: -0.83, x1: 0.83, z0: 1.5, z1: 3.5 };
const BASES = [[0, 0], [63.6, 63.6], [0, 127.3], [-63.6, 63.6]];
const RELEASE = { x: 0.9, y: 54, z: 5.6 };
const MERCY = 6;           // runs that end a half-inning
const SWING_LAG = 0.11;    // seconds from pressing swing until the bat crosses the plate
const fence = spray => 290 + 55 * Math.cos(spray * 2);    // spray in radians, 0 = center field
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const rand = (a, b) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
const hyp = Math.hypot;
const rad = d => d * Math.PI / 180;

// ---------- cameras ----------
const BAT_CAM = { D: 20, h: 5.2, f: 1300, H0: 255, x: 0 };
const FIELD_CAM = { D: 120, h: 58, f: 1180, H0: 128, x: 0 };
function mixCam(a, b, k) { return { D: lerp(a.D, b.D, k), h: lerp(a.h, b.h, k), f: lerp(a.f, b.f, k), H0: lerp(a.H0, b.H0, k), x: lerp(a.x, b.x, k) }; }
function project(cam, x, y, z) {
  const d = Math.max(2, y + cam.D), s = cam.f / d;
  return [640 + (x - cam.x) * s, cam.H0 + (cam.h - z) * s, s];
}

// ---------- scenery ----------
let crowdSeed = null;
function crowd() {
  if (crowdSeed) return crowdSeed;
  let s = 7; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const cols = ['#f87171', '#60a5fa', '#fbbf24', '#f8fafc', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#1e293b'];
  crowdSeed = Array.from({ length: 1400 }, () => ({ a: rand0(r, -0.9, 0.9), row: r(), c: cols[(r() * cols.length) | 0], ph: r() * 6 }));
  return crowdSeed;
}
function rand0(r, a, b) { return a + r() * (b - a); }

function polyPts(ctx, cam, pts) {
  ctx.beginPath();
  pts.forEach(([x, y, z = 0], i) => { const p = project(cam, x, y, z); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
  ctx.closePath();
}
function arcPts(cx, cy, r, a0, a1, n = 24, z = 0) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); out.push([cx + Math.sin(a) * r, cy + Math.cos(a) * r, z]); }
  return out;
}

function drawField(ctx, cam, view, t) {
  const x0 = -view.ox, y0 = -view.oy, W = view.W, H = view.H;
  // sky
  const sky = ctx.createLinearGradient(0, y0, 0, cam.H0 + 40);
  sky.addColorStop(0, '#1e3a8a'); sky.addColorStop(0.6, '#3b82f6'); sky.addColorStop(1, '#93c5fd');
  ctx.fillStyle = sky; ctx.fillRect(x0, y0, W, H);
  // grass base
  ctx.fillStyle = '#2f7d3a'; ctx.fillRect(x0, cam.H0 - 10, W, H);
  // stands behind the outfield fence
  const A = 1.25;
  const back = arcPts(0, 0, 520, -A, A, 40, 95), front = arcPts(0, 0, 320, -A, A, 40, 14);
  ctx.fillStyle = '#334155'; polyPts(ctx, cam, [...front, ...back.reverse()]); ctx.fill();
  ctx.save(); polyPts(ctx, cam, [...arcPts(0, 0, 320, -A, A, 40, 14), ...arcPts(0, 0, 520, -A, A, 40, 95).reverse()]); ctx.clip();
  for (const c of crowd()) {
    const r = lerp(325, 515, c.row), z = lerp(16, 92, c.row) + Math.max(0, Math.sin(t * 5 + c.ph)) * 3;
    const p = project(cam, Math.sin(c.a) * r, Math.cos(c.a) * r, z);
    ctx.fillStyle = c.c; ctx.fillRect(p[0] - p[2] * 0.9, p[1] - p[2] * 2.2, p[2] * 1.8, p[2] * 2.2);
    ctx.fillStyle = '#f1c9a5'; ctx.fillRect(p[0] - p[2] * 0.55, p[1] - p[2] * 3.2, p[2] * 1.1, p[2] * 1);
  }
  ctx.restore();
  // light towers
  for (const a of [-0.95, 0.95]) {
    const b = project(cam, Math.sin(a) * 470, Math.cos(a) * 470, 80), tp = project(cam, Math.sin(a) * 470, Math.cos(a) * 470, 170);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = Math.max(1, b[2] * 3); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke();
    ctx.fillStyle = '#fef9c3'; ctx.shadowColor = '#fef08a'; ctx.shadowBlur = 20;
    rrect(ctx, tp[0] - tp[2] * 18, tp[1] - tp[2] * 12, tp[2] * 36, tp[2] * 12, 2); ctx.fill(); ctx.shadowBlur = 0;
  }
  // outfield wall
  const wallTop = [], wallBot = [];
  for (let i = 0; i <= 40; i++) {
    const a = lerp(-Math.PI / 4 - 0.05, Math.PI / 4 + 0.05, i / 40), r = fence(clamp(a, -Math.PI / 4, Math.PI / 4));
    wallTop.push([Math.sin(a) * r, Math.cos(a) * r, 9]); wallBot.push([Math.sin(a) * r, Math.cos(a) * r, 0]);
  }
  // grass with mowing stripes
  ctx.save(); polyPts(ctx, cam, [[0, -30], ...wallBot, [0, -30]]); ctx.clip();
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = i % 2 ? '#3a9a45' : '#338a3e';
    polyPts(ctx, cam, [...arcPts(0, -10, i * 30, -1.2, 1.2, 20), ...arcPts(0, -10, (i + 1) * 30, -1.2, 1.2, 20).reverse()]); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#1f5130'; polyPts(ctx, cam, [...wallBot, ...wallTop.slice().reverse()]); ctx.fill();
  ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.beginPath();
  wallTop.forEach(([x, y, z], i) => { const p = project(cam, x, y, z); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke();
  // infield dirt and grass
  ctx.fillStyle = '#c08552'; polyPts(ctx, cam, [[0, -6], ...arcPts(0, 0, 150, -Math.PI / 4 - 0.06, Math.PI / 4 + 0.06, 30)]); ctx.fill();
  ctx.fillStyle = '#3a9a45'; polyPts(ctx, cam, [[0, 12], [52, 63.6], [0, 115], [-52, 63.6]]); ctx.fill();
  ctx.fillStyle = '#c08552'; polyPts(ctx, cam, arcPts(0, 60.5, 9, 0, Math.PI * 2, 24)); ctx.fill();
  polyPts(ctx, cam, arcPts(0, 0, 13, 0, Math.PI * 2, 28)); ctx.fill();
  ctx.fillStyle = '#d4a373'; polyPts(ctx, cam, [[-0.6, 59.5], [0.6, 59.5], [0.6, 60], [-0.6, 60]]); ctx.fill();
  // foul lines
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2;
  for (const sgn of [-1, 1]) {
    const a = project(cam, 0, 0, 0), r = fence(Math.PI / 4) / Math.SQRT2, b = project(cam, sgn * r, r, 0);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  // batter's boxes
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.75)';
  for (const sgn of [-1, 1]) { polyPts(ctx, cam, [[sgn * 1.2, -3], [sgn * 5.2, -3], [sgn * 5.2, 3], [sgn * 1.2, 3]]); ctx.stroke(); }
  // bases and plate
  ctx.fillStyle = '#fff';
  for (const [bx, by] of BASES.slice(1)) { polyPts(ctx, cam, [[bx - 1.1, by], [bx, by + 1.1], [bx + 1.1, by], [bx, by - 1.1]]); ctx.fill(); }
  polyPts(ctx, cam, [[-0.71, 0.71], [0.71, 0.71], [0.71, 0], [0, -0.71], [-0.71, 0]]); ctx.fill();
}

// Bat drawn on top of a side-view human (same transform as drawHuman: feet at 0,0, scale s, facing +x).
function drawBat(ctx, x, y, s, swing, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const k = swing < 0 ? 0 : Math.min(1, swing);
  const e = 1 - Math.pow(1 - k, 2);
  const handA = lerp(3.7, 1.2, e), batA = lerp(3.45, -1.75, e);
  const sx = 2, sy = -80;
  const hx = sx + Math.sin(handA) * 20, hy = sy + Math.cos(handA) * 20;
  const tx = hx + Math.sin(batA) * 58, ty = hy + Math.cos(batA) * 58;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(15,18,35,.6)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
  const g = ctx.createLinearGradient(hx, hy, tx, ty); g.addColorStop(0, '#78350f'); g.addColorStop(0.35, '#b45309'); g.addColorStop(1, '#f59e0b');
  ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(lerp(hx, tx, 0.4), lerp(hy, ty, 0.4)); ctx.stroke();
  ctx.lineWidth = 9.5; ctx.beginPath(); ctx.moveTo(lerp(hx, tx, 0.45), lerp(hy, ty, 0.45)); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(lerp(hx, tx, 0.12), lerp(hy, ty, 0.12)); ctx.stroke();
  ctx.restore();
}

// ---------- batted-ball flight ----------
function simulateFlight(ev, la, spray) {
  const v = ev * 1.467;
  let vy = v * Math.cos(rad(la)), vz = v * Math.sin(rad(la));
  let vx = vy * Math.sin(spray); vy = vy * Math.cos(spray);
  let x = 0, y = 1.5, z = 3, t = 0;
  const pts = [{ t, x, y, z }], dt = 1 / 60;
  let land = null, hr = false, bounces = 0;
  while (t < 9) {
    const s = hyp(vx, vy, vz);
    vx -= DRAG * s * vx * dt; vy -= DRAG * s * vy * dt; vz -= (G + DRAG * s * vz) * dt;
    x += vx * dt; y += vy * dt; z += vz * dt; t += dt;
    const r = hyp(x, y), a = Math.atan2(x, y);
    if (!land && !hr && Math.abs(a) <= Math.PI / 4 + 0.02 && r >= fence(clamp(a, -Math.PI / 4, Math.PI / 4))) {
      if (z > 9) hr = true; else { vx *= -0.3; vy *= -0.3; }
    }
    if (z <= 0) {
      z = 0;
      if (!land) land = { x, y, t };
      bounces++;
      vz = -vz * 0.4; vx *= 0.72; vy *= 0.72;
      if (Math.abs(vz) < 4) { vz = 0; }
    }
    if (land && vz === 0) { vx *= 1 - 1.6 * dt; vy *= 1 - 1.6 * dt; }
    pts.push({ t, x, y, z });
    if (land && hyp(vx, vy) < 3) break;
    if (hr && t > 1 && z < 40) break;
  }
  return { pts, land: land || { x, y, t }, hr };
}
function samplePath(pts, t) {
  if (t <= 0) return pts[0];
  if (t >= pts[pts.length - 1].t) return pts[pts.length - 1];
  const i = Math.min(pts.length - 2, Math.floor(t * 60));
  const a = pts[i], b = pts[i + 1], k = (t - a.t) / (b.t - a.t || 1);
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options, profile } = env;
  const D = options.boost ? DIFF.boost : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = aim 50% faster, Power = hit 50% further.
  const SPD = options.power === 'speed' ? 1.5 : 1;
  const PWR = options.power === 'power' ? 1.5 : 1;
  const innings = +(options.innings || 3);
  const rookie = options.difficulty === 'rookie' || options.boost;
  const av = profile?.avatar || {};
  const myShirt = av.shirt || '#2563eb';
  const oppShirt = ['#e11d48', '#f59e0b'].includes(myShirt) ? '#0891b2' : '#e11d48';
  const randomLook = () => ({ skin: SKINS[(Math.random() * SKINS.length) | 0], hair: HAIRS[(Math.random() * 6) | 0], style: HAIR_STYLES[(Math.random() * HAIR_STYLES.length) | 0] });
  const myLook = { skin: av.skin, hair: av.hair, style: av.style };
  const teams = {
    me: { shirt: myShirt, pants: '#f8fafc', looks: Array.from({ length: 9 }, randomLook) },
    cpu: { shirt: oppShirt, pants: '#e2e8f0', looks: Array.from({ length: 9 }, randomLook) },
  };
  const POS = { P: [0, 60.5], C: [0, -4.5], '1B': [64, 80], '2B': [28, 122], SS: [-28, 122], '3B': [-64, 80], LF: [-140, 235], CF: [0, 285], RF: [140, 235] };
  const fielders = Object.entries(POS).map(([pos, [x, y]], i) => ({ pos, hx: x, hy: y, x, y, phase: 0, moving: 0, idx: i }));

  const S = {
    phase: 'intro', t: 0, inning: 1, half: 'top', score: { me: 0, cpu: 0 }, line: { me: [], cpu: [] },
    balls: 0, strikes: 0, outs: 0, halfRuns: 0, bases: [null, null, null],
    msg: null, msgSub: null, msgColor: '#fff', hint: null, tipT: 5,
    homers: 0, strikeouts: 0, hits: 0, camK: 0, labelKey: '',
  };
  const batting = () => (S.half === 'top' ? 'me' : 'cpu');
  const ret = { x: 0, z: 2.5 };      // batting: bat aim · pitching: target
  const pitch = { live: false, t: 0, T: 0.6, type: 'fast', from: { ...RELEASE }, to: { x: 0, z: 2.5 }, brk: { x: 0, z: 0 }, swungAt: null, power: false, cpuSwing: null, done: false };
  const swing = { t: -1, power: false };
  let play = null;            // ball in play
  let runners = [];           // animated runners { look, at, target, scored }
  let pitcherAnim = 0, pitcherLook = randomLook(), batterLook = myLook, batterIdx = { me: 0, cpu: 0 };

  function setHalf() {
    S.balls = 0; S.strikes = 0; S.outs = 0; S.halfRuns = 0; S.bases = [null, null, null]; runners = [];
    S.line[batting()][S.inning - 1] = 0;
    const field = batting() === 'me' ? 'cpu' : 'me';
    pitcherLook = field === 'me' ? myLook : teams.cpu.looks[0];
    fielders.forEach(f => { f.x = f.hx; f.y = f.hy; f.moving = 0; });
    newBatter();
  }
  function newBatter() {
    S.balls = 0; S.strikes = 0;
    const team = batting();
    batterLook = team === 'me' ? (batterIdx.me % 3 === 0 ? myLook : teams.me.looks[batterIdx.me % 9]) : teams.cpu.looks[1 + batterIdx.cpu % 8];
    batterIdx[team]++;
    readyPitch();
  }
  function readyPitch() {
    pitch.live = false; pitch.done = false; pitch.swungAt = null; pitch.cpuSwing = null;
    swing.t = -1; play = null; pitcherAnim = 0;
    if (batting() === 'me') { ret.x = 0; ret.z = 2.5; S.phase = 'windup'; S.t = 0; }
    else { ret.x = 0; ret.z = 2.5; S.phase = 'aim'; S.t = 0; }
  }

  function throwPitch(type, target) {
    pitch.live = true; pitch.t = 0; pitch.type = type;
    const base = batting() === 'me' ? D.pitchT : 0.5;
    pitch.T = type === 'fast' ? base : type === 'curve' ? base * 1.25 : base * 1.2;
    pitch.brk = type === 'curve' ? { x: -1.1, z: -1.4 } : type === 'change' ? { x: 0.2, z: -0.6 } : { x: 0, z: 0.15 };
    pitch.to = { x: target.x, z: target.z };
    pitch.from = { ...RELEASE };
    audio.play('swoosh');
  }
  function ballAt(u) {
    const e = u * u;
    return {
      x: lerp(pitch.from.x, pitch.to.x - pitch.brk.x, u) + pitch.brk.x * e,
      y: lerp(pitch.from.y, 0, u),
      z: lerp(pitch.from.z, pitch.to.z - pitch.brk.z, u) + pitch.brk.z * e + Math.sin(u * Math.PI) * (pitch.type === 'curve' ? 1.2 : 0.5),
    };
  }
  const inZone = (x, z) => x >= ZONE.x0 - 0.12 && x <= ZONE.x1 + 0.12 && z >= ZONE.z0 - 0.12 && z <= ZONE.z1 + 0.12;

  function cpuPitchChoice() {
    const r = Math.random();
    const type = r < D.mix * 0.6 ? 'curve' : r < D.mix ? 'change' : 'fast';
    let x, z;
    if (Math.random() < D.zoneRate) {
      const edge = options.boost ? 0.3 : 0.85;
      x = rand(ZONE.x0, ZONE.x1) * edge; z = lerp(ZONE.z0, ZONE.z1, 0.5 + rand(-0.5, 0.5) * edge);
    } else {
      const side = Math.random() < 0.5 ? -1 : 1;
      if (Math.random() < 0.5) { x = side * rand(1.05, 1.5); z = rand(1.3, 3.7); } else { x = rand(-0.9, 0.9); z = side > 0 ? rand(3.75, 4.3) : rand(0.8, 1.25); }
    }
    // breaking balls arrive where aimed, so remove the vertical drop the pitch adds
    return { type, target: { x, z } };
  }

  // ---------- contact ----------
  function resolveContact(ev, la, spray, team) {
    const sprayR = rad(spray);
    if (Math.abs(spray) > 45) return startPlay({ kind: 'foul', flight: simulateFlight(ev, la, sprayR) });
    const flight = simulateFlight(ev, la, sprayR);
    const L = flight.land;
    if (flight.hr) return startPlay({ kind: 'hr', flight });
    const spd = team === 'me' ? D.fieldSpd : 20;
    if (la >= 10) {
      // fly ball or line drive: the nearest fielder tries to get under it
      let best = null;
      for (const f of fielders) {
        if (f.pos === 'C' || f.pos === 'P') continue;
        const d = hyp(L.x - f.hx, L.y - f.hy), reach = spd * 0.8 * Math.max(0, L.t - 0.8) + 4;
        if (!best || d - reach < best.m) best = { f, m: d - reach };
      }
      if (best.m <= 0) return startPlay({ kind: 'flyout', flight, fielder: best.f, catchT: L.t });
      return startPlay({ kind: 'hit', flight, bases: hitBases(L), fielder: best.f });
    }
    // ground ball: an infielder may cut it off
    const dirx = Math.sin(sprayR), diry = Math.cos(sprayR), v = ev * 1.467 * 0.62;
    for (const f of fielders) {
      if (!['1B', '2B', 'SS', '3B', 'P'].includes(f.pos)) continue;
      const along = f.hx * dirx + f.hy * diry, perp = Math.abs(f.hx * diry - f.hy * dirx);
      if (along < 5) continue;
      const tb = along / v;
      if (perp <= 3 + spd * tb * 0.75) {
        const infieldHit = ev > 92 && Math.random() < 0.3;
        return startPlay({ kind: infieldHit ? 'hit' : 'groundout', flight, bases: 1, fielder: f, catchT: tb, ix: dirx * along, iy: diry * along });
      }
    }
    return startPlay({ kind: 'hit', flight, bases: hyp(L.x, L.y) > 200 ? 2 : 1, fielder: nearestOF(L) });
  }
  function hitBases(L) {
    const d = hyp(L.x, L.y);
    if (d < 160) return 1;
    if (d < 255) return 2;
    return Math.random() < 0.15 ? 3 : 2;
  }
  function nearestOF(L) {
    return fielders.filter(f => ['LF', 'CF', 'RF'].includes(f.pos)).sort((a, b) => hyp(a.hx - L.x, a.hy - L.y) - hyp(b.hx - L.x, b.hy - L.y))[0];
  }

  function startPlay(p) {
    play = { ...p, t: 0, resolved: false };
    pitch.live = false;
    S.phase = 'inplay'; S.t = 0;
    audio.play('bat');
    if (p.kind !== 'foul') { audio.cheer(p.kind === 'hr' ? 1.6 : 0.6); fx.shake(p.kind === 'hr' ? 10 : 4); }
    if (p.kind === 'groundout' || p.kind === 'flyout' || p.kind === 'hit') p.fielder.chasing = true;
  }

  // ---------- outcomes ----------
  function addRun(n = 1) {
    S.score[batting()] += n; S.halfRuns += n; S.line[batting()][S.inning - 1] += n;
  }
  function advance(nBases, batterToo, forcedOnly = false) {
    const team = batting();
    const look = batterLook;
    const occ = S.bases.slice();
    const moves = [];
    if (forcedOnly) {
      // walk: only forced runners move up one base
      const newOcc = occ.slice();
      if (occ[0]) { if (occ[1]) { if (occ[2]) moves.push({ look: occ[2], from: 3, to: 4 }); newOcc[2] = occ[1]; moves.push({ look: occ[1], from: 2, to: 3 }); } newOcc[1] = occ[0]; moves.push({ look: occ[0], from: 1, to: 2 }); }
      newOcc[0] = look; moves.push({ look, from: 0, to: 1 });
      S.bases = newOcc;
    } else {
      const newOcc = [null, null, null];
      for (let b = 3; b >= 1; b--) {
        if (!occ[b - 1]) continue;
        const extra = nBases === 1 && b === 2 ? 1 : 0;     // runners on second score on a single
        const to = Math.min(4, b + nBases + extra);
        moves.push({ look: occ[b - 1], from: b, to });
        if (to < 4) newOcc[to - 1] = occ[b - 1];
      }
      if (batterToo) { const to = Math.min(4, nBases); moves.push({ look, from: 0, to }); if (to < 4) newOcc[to - 1] = look; }
      S.bases = newOcc;
    }
    runners = moves.map(m => ({ ...m, at: m.from === 0 ? Math.min(m.to, S.batterAt || 0) : m.from, team }));
    const scored = moves.filter(m => m.to >= 4).length;
    return scored;
  }
  function recordOut(text, sub) {
    S.outs++;
    if (batting() === 'cpu' && text === 'STRIKEOUT!') S.strikeouts++;
    showMsg(text, sub || `${S.outs} out${S.outs === 1 ? '' : 's'}`, batting() === 'me' ? '#fca5a5' : '#a3e635');
    if (batting() === 'cpu') audio.cheer(0.5); else audio.play('aww');
  }
  function showMsg(msg, sub, color = '#fff') { S.msg = msg; S.msgSub = sub; S.msgColor = color; S.msgT = 0; }

  function callPitch(swungMissed) {
    const b = ballAt(1);
    const strike = swungMissed || inZone(b.x, b.z);
    audio.play('catch');
    if (strike) {
      S.strikes++;
      if (S.strikes >= 3) { recordOut('STRIKEOUT!'); return afterPA('out'); }
      showMsg(swungMissed ? 'SWING & MISS' : 'STRIKE!', `${S.balls}–${S.strikes}`, '#fde68a');
    } else {
      S.balls++;
      if (S.balls >= 4) {
        const scored = advance(1, true, true);
        showMsg('WALK', scored ? 'Run scores!' : 'Take your base', '#a5f3fc');
        S.pendingRuns = scored;
        return afterPA('walk');
      }
      showMsg('BALL', `${S.balls}–${S.strikes}`, '#e2e8f0');
    }
    S.phase = 'called'; S.t = 0;
  }
  function afterPA() { S.phase = 'result'; S.t = 0; S.resultT = play && play.kind === 'hr' ? 3.3 : 2.4; }

  function resolvePlay() {
    const p = play;
    p.resolved = true;
    if (p.kind === 'foul') {
      if (S.strikes < 2) S.strikes++;
      showMsg('FOUL BALL', `${S.balls}–${S.strikes}`, '#e2e8f0');
      S.phase = 'called'; S.t = -0.6; return;
    }
    if (p.kind === 'flyout') { recordOut('FLY OUT!'); return afterPA(); }
    if (p.kind === 'groundout') {
      const scored = S.outs < 2 ? advanceForced() : 0;
      recordOut('OUT AT FIRST!');
      if (S.outs < 3) S.pendingRuns = scored;
      return afterPA();
    }
    if (p.kind === 'hr') {
      const scored = advance(4, true);
      S.pendingRuns = scored;
      if (batting() === 'me') { S.homers++; S.hits++; }
      showMsg('HOME RUN!', scored > 1 ? `${scored} runs score!` : 'Out of the park!', '#fde68a');
      fx.rain(1280, 160); audio.cheer(2); fx.flashScreen('#fff', 0.4);
      return afterPA();
    }
    const n = p.bases;
    const scored = advance(n, true);
    S.pendingRuns = scored;
    if (batting() === 'me') S.hits++;
    showMsg(['SINGLE!', 'DOUBLE!', 'TRIPLE!'][n - 1], scored ? `${scored} run${scored > 1 ? 's' : ''} score!` : null, batting() === 'me' ? '#a3e635' : '#fca5a5');
    if (batting() === 'me') audio.cheer(1);
    afterPA();
  }
  function advanceForced() {
    // ground out at first: runners move up only when forced
    const occ = S.bases, moves = [], newOcc = [null, null, null];
    let forced = true;
    for (let b = 1; b <= 3; b++) {
      if (!occ[b - 1]) { forced = false; continue; }
      if (forced) { moves.push({ look: occ[b - 1], from: b, to: b + 1 }); if (b + 1 < 4) newOcc[b] = occ[b - 1]; }
      else newOcc[b - 1] = occ[b - 1];
    }
    S.bases = newOcc;
    runners = moves.map(m => ({ ...m, at: m.from, team: batting() }));
    return moves.filter(m => m.to >= 4).length;
  }

  function nextAfterResult() {
    if (S.pendingRuns) { addRun(S.pendingRuns); S.pendingRuns = 0; }
    runners = [];
    if (checkWalkOff()) return;
    if (S.outs >= 3 || S.halfRuns >= MERCY) return endHalf();
    newBatter();
  }
  function checkWalkOff() {
    if (S.half === 'bottom' && S.inning >= innings && S.score.cpu > S.score.me) { endGame(); return true; }
    return false;
  }
  function endHalf() {
    const mercy = S.outs < 3;
    if (S.half === 'top') {
      if (S.inning >= innings && S.score.cpu > S.score.me) return endGame();
      S.half = 'bottom';
    } else {
      if (S.inning >= innings && S.score.me !== S.score.cpu) return endGame();
      if (S.inning >= innings + 2) return endGame();
      S.inning++; S.half = 'top';
    }
    S.phase = 'switch'; S.t = 0;
    showMsg(S.half === 'top' ? `INNING ${S.inning}` : 'SWITCH SIDES', mercy ? `${MERCY}-run limit reached` : (batting() === 'me' ? 'You bat' : 'You pitch'), '#a5f3fc');
    audio.play('whistle');
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const a = S.score.me, b = S.score.cpu;
    showMsg(a > b ? 'YOU WIN!' : a === b ? 'TIE GAME' : 'CPU WINS', `${a} – ${b}`, a > b ? '#fde68a' : '#cbd5e1');
    if (a > b) { fx.rain(1280, 160); audio.cheer(1.6); }
  }
  function report() {
    const a = S.score.me, b = S.score.cpu;
    env.end({
      outcome: a > b ? 'win' : a === b ? 'draw' : 'lose',
      scoreline: `YOU ${a} – ${b} CPU`,
      stats: [`Hits: <b>${S.hits}</b>`, `Home runs: <b>${S.homers}</b>`, `Strikeouts thrown: <b>${S.strikeouts}</b>`, `Innings: <b>${S.inning}</b>`],
      match: { game: 'baseball', difficulty: options.difficulty, won: a > b, draw: a === b, runsFor: a, runsAgainst: b, homers: S.homers, strikeouts: S.strikeouts, hits: S.hits },
    });
  }

  // ---------- update ----------
  function update(dt) {
    S.t += dt; if (S.msgT !== undefined) S.msgT += dt;
    if (S.tipT > 0 && (S.phase === 'pitch' || S.phase === 'aim')) S.tipT -= dt;
    pitcherAnim += dt;
    if (swing.t >= 0) swing.t += dt;

    const labelKey = batting() === 'me' ? 'bat' : 'pitch';
    if (labelKey !== S.labelKey) { S.labelKey = labelKey; input.setLabels(labelKey === 'bat' ? 'SWING' : 'FAST', labelKey === 'bat' ? 'POWER' : 'CURVE'); }

    if (S.phase === 'intro') { if (S.t > 1.6) { S.msg = null; setHalf(); } return; }
    if (S.phase === 'switch') { if (S.t > 2.2) { S.msg = null; setHalf(); } return; }
    if (S.phase === 'end') { if (S.t > 2.6 && !S.reported) { S.reported = true; report(); } return; }

    // reticle movement (bat aim or pitch target)
    if (S.phase === 'windup' || S.phase === 'pitch' || S.phase === 'aim') {
      const sp = 3.6 * SPD;
      ret.x = clamp(ret.x + input.mx * sp * dt, -1.6, 1.6);
      ret.z = clamp(ret.z - input.my * sp * dt, 0.9, 4.2);
    }

    if (S.phase === 'windup') {
      if (S.t > 1.0) { const c = cpuPitchChoice(); throwPitch(c.type, c.target); S.phase = 'pitch'; S.t = 0; }
    } else if (S.phase === 'aim') {
      if (S.t > 0.3 && (input.a.pressed || input.b.pressed)) {
        const type = input.a.pressed ? 'fast' : 'curve';
        const target = { x: ret.x + gauss() * 0.3, z: ret.z + gauss() * 0.3 };
        S.queued = { type, target }; S.phase = 'windup2'; S.t = 0; pitcherAnim = 0;
      }
    } else if (S.phase === 'windup2') {
      if (S.t > 0.55) { throwPitch(S.queued.type, S.queued.target); S.phase = 'pitch'; S.t = 0; planCpuSwing(); }
    } else if (S.phase === 'pitch') {
      pitch.t += dt;
      const u = pitch.t / pitch.T;
      if (batting() === 'me') {
        if (rookie && u > 0.2 && swing.t < 0) {
          const b = ballAt(1); const k = Math.min(1, dt * (options.boost ? 6 : 3.2));
          ret.x += (b.x - ret.x) * k; ret.z += (b.z - ret.z) * k;
        }
        if (swing.t < 0 && (input.a.pressed || input.b.pressed) && u > 0.05 && u < 1.02) {
          swing.t = 0; swing.power = input.b.pressed; audio.play('swoosh');
          pitch.swungAt = pitch.t + SWING_LAG;
        }
        if (pitch.swungAt !== null && !pitch.done && pitch.t >= Math.min(pitch.swungAt, pitch.T)) {
          pitch.done = true;
          const err = pitch.swungAt - pitch.T;
          const W = D.window * (swing.power ? 0.8 : 1), R = D.radius * (swing.power ? 0.78 : 1);
          const b = ballAt(1), dist = hyp(b.x - ret.x, (b.z - ret.z) * 0.9);
          if (Math.abs(err) < W && dist < R) {
            const q = (1 - dist / R) * 0.6 + (1 - Math.abs(err) / W) * 0.4;
            const ev = (62 + 50 * q + (swing.power ? 10 : 0) + rand(-3, 3)) * PWR;
            const la = clamp(21 + (b.z - ret.z) * 48 + rand(-7, 7), -25, 65);
            const spray = (err / W) * 52 + (b.x - ret.x) * 12 + rand(-6, 6);
            if (q < 0.12) resolveContact(ev * 0.7, la, Math.sign(spray || 1) * rand(46, 70), 'me');
            else resolveContact(ev, la, spray, 'me');
            fx.sparks(640, 420, 14);
            return;
          }
        }
      } else if (pitch.cpuSwing && !pitch.done) {
        const c = pitch.cpuSwing;
        if (!c.started && pitch.t >= c.at) { c.started = true; swing.t = 0; audio.play('swoosh'); }
        if (pitch.t >= pitch.T) { pitch.done = true; if (c.hit) { resolveContact(c.ev, c.la, c.spray, 'cpu'); return; } }
      }
      if (u >= 1.25) {
        const swungMissed = (batting() === 'me' && pitch.swungAt !== null) || (batting() === 'cpu' && !!pitch.cpuSwing);
        pitch.live = false;
        callPitch(swungMissed);
      }
    } else if (S.phase === 'called') {
      if (S.t > 1.0) { S.msg = null; readyPitch(); }
    } else if (S.phase === 'inplay') {
      updatePlay(dt);
    } else if (S.phase === 'result') {
      if (play || runners.length) S.camK = Math.min(1, S.camK + dt * 2);
      updateRunners(dt);
      updateFielders(dt);
      if (S.t > S.resultT) { S.msg = null; nextAfterResult(); }
    }
    if (S.phase !== 'inplay' && S.phase !== 'result') {
      S.camK = Math.max(0, S.camK - dt * 2.5);
      fielders.forEach(f => { f.chasing = false; f.x += (f.hx - f.x) * Math.min(1, dt * 3); f.y += (f.hy - f.y) * Math.min(1, dt * 3); f.moving = 0; });
    }
  }

  function planCpuSwing() {
    const b = ballAt(1), zoneIn = inZone(b.x, b.z);
    const swingP = zoneIn ? 0.55 + D.eye * 0.3 : 0.55 - D.eye * 0.5;
    if (Math.random() > swingP) return;
    const edge = Math.max(Math.abs(b.x) / 0.83, Math.abs(b.z - 2.5) / 1.0);
    let p = D.contact * (1 - 0.3 * clamp(edge - 0.4, 0, 1)) * (pitch.type === 'curve' ? 0.82 : 1) * (zoneIn ? 1 : 0.55);
    const hit = Math.random() < p;
    const q = Math.random() * D.power;
    // the bat starts SWING_LAG before the pitch arrives so it crosses the plate on time
    pitch.cpuSwing = { at: pitch.T - SWING_LAG, hit, ev: 55 + 55 * q, la: rand(-12, 48), spray: rand(-58, 58), started: false };
  }

  function updatePlay(dt) {
    const p = play;
    p.t += dt;
    S.camK = Math.min(1, S.camK + dt * 2.2);
    const end = p.flight.pts[p.flight.pts.length - 1].t;
    if (p.kind === 'flyout' && p.t >= p.catchT) {
      if (!p.caught) { p.caught = true; audio.play('catch'); const f = p.fielder; fx.text('CAUGHT!', 640, 300, { size: 30, color: '#fef08a' }); f.x = p.flight.land.x; f.y = p.flight.land.y; }
    }
    if (p.kind === 'groundout' && p.t >= p.catchT && !p.fielded) { p.fielded = true; audio.play('catch'); p.throwT = p.t; }
    updateFielders(dt);
    // batter starts running on anything fair
    if (p.kind !== 'foul' && !runners.length) runners = [{ look: batterLook, from: 0, to: 1, at: 0, team: batting(), live: true }];
    updateRunners(dt);
    const doneT = p.kind === 'flyout' ? p.catchT + 0.6 : p.kind === 'groundout' ? p.catchT + 0.9 : p.kind === 'foul' ? Math.min(end, 1.6) : p.kind === 'hr' ? Math.min(end, 3.2) : Math.min(end, 3.4);
    if (p.t >= doneT && !p.resolved) { S.batterAt = runners[0]?.at || 0; runners = []; resolvePlay(); S.batterAt = 0; }
  }
  function updateFielders(dt) {
    if (!play) return;
    const spd = batting() === 'me' ? D.fieldSpd : 20;
    for (const f of fielders) {
      if (!f.chasing) continue;
      let tx, ty;
      if (play.kind === 'groundout') { tx = play.ix; ty = play.iy; }
      else { const L = play.flight.land; tx = L.x; ty = L.y; if (play.kind === 'hit' && play.t > play.flight.land.t) { const b = samplePath(play.flight.pts, play.t); tx = b.x; ty = b.y; } }
      const dx = tx - f.x, dy = ty - f.y, d = hyp(dx, dy);
      if (d > 1) { const s = Math.min(d, spd * 1.1 * dt); f.x += dx / d * s; f.y += dy / d * s; f.moving = 1; f.phase += dt * 12; } else f.moving = 0;
    }
  }
  function updateRunners(dt) {
    for (const r of runners) {
      if (r.at < r.to) { r.at = Math.min(r.to, r.at + dt * 1.3); r.phase = (r.phase || 0) + dt * 14; }
    }
  }
  function runnerPos(r) {
    const a = Math.min(3.999, r.at), i = Math.floor(a), k = a - i;
    const A = BASES[i % 4], B = BASES[(i + 1) % 4];
    return [lerp(A[0], B[0], k), lerp(A[1], B[1], k)];
  }

  // ---------- draw ----------
  function draw(ctx, view) {
    const cam = mixCam(BAT_CAM, FIELD_CAM, easeInOut(S.camK));
    drawField(ctx, cam, view, S.t);
    const fieldTeam = batting() === 'me' ? teams.cpu : teams.me;
    const batTeam = batting() === 'me' ? teams.me : teams.cpu;
    const items = [];
    // fielders
    fielders.forEach(f => {
      if (f.pos === 'C' && S.camK < 0.5) return;
      const look = f.pos === 'P' ? pitcherLook : fieldTeam.looks[f.idx];
      items.push({ y: f.y, d: () => {
        const p = project(cam, f.x, f.y, 0), s = p[2] * 0.056;
        let pose = f.moving ? 'run' : 'ready', poseT = 0, phase = f.phase;
        if (f.pos === 'P') {
          const t = S.phase === 'windup' ? S.t / 1.0 : S.phase === 'windup2' ? S.t / 0.55 : S.phase === 'pitch' ? 1 + pitch.t * 2 : 2;
          if (t < 1) { pose = 'kick'; poseT = t; } else if (t < 1.6) { pose = 'celebrate'; phase = 0.3; } else pose = 'ready';
          if (S.phase === 'aim') pose = 'ready';
        }
        if (f.pos === 'C') pose = 'ready';
        drawHuman(ctx, p[0], p[1], s, { view: f.pos === 'C' ? 'back' : 'front', pose, poseT, phase, moving: f.moving, ...look, shirt: fieldTeam.shirt, shorts: fieldTeam.pants, gloves: '#7c2d12' });
      } });
    });
    // runners
    for (const r of runners) {
      const [x, y] = runnerPos(r);
      if (r.at <= 0.02 && S.camK < 0.5) continue;
      items.push({ y, d: () => {
        const p = project(cam, x, y, 0);
        const mv = r.at < r.to ? 1 : 0;
        drawHuman(ctx, p[0], p[1], p[2] * 0.056, { view: 'side', flip: r.at >= 1 && r.at < 3, phase: r.phase || 0, moving: mv, pose: mv ? 'run' : 'ready', ...r.look, shirt: batTeam.shirt, shorts: batTeam.pants });
      } });
    }
    // runners standing on base between pitches
    if (!runners.length) S.bases.forEach((look, i) => {
      if (!look) return;
      const [x, y] = BASES[i + 1];
      items.push({ y, d: () => { const p = project(cam, x + 2, y - 2, 0); drawHuman(ctx, p[0], p[1], p[2] * 0.056, { view: 'front', pose: 'ready', ...look, shirt: batTeam.shirt, shorts: batTeam.pants }); } });
    });
    // batter
    const batterHere = !(play && play.kind !== 'foul') && !runners.some(r => r.from === 0);
    if (batterHere) items.push({ y: 0, d: () => {
      const p = project(cam, -3.4, 0.4, 0), s = p[2] * 0.056;
      drawHuman(ctx, p[0], p[1], s, { view: 'side', pose: 'ready', ...batterLook, shirt: batTeam.shirt, shorts: batTeam.pants });
      drawBat(ctx, p[0], p[1], s, swing.t >= 0 ? swing.t / 0.5 : -1, false);
      ctx.fillStyle = shade(batTeam.shirt, -0.3);
      ctx.beginPath(); ctx.ellipse(p[0] + 2 * s, p[1] - 106 * s, 15 * s, 9 * s, 0, Math.PI, 0); ctx.fill();   // helmet
    } });
    items.sort((a, b) => b.y - a.y).forEach(i => i.d());

    // pitched ball
    if (pitch.live) {
      const u = pitch.t / pitch.T, b = ballAt(u);
      drawBall(ctx, cam, b.x, b.y, b.z);
    }
    if (play) {
      let b;
      if (play.kind === 'flyout' && play.caught) b = { x: play.flight.land.x, y: play.flight.land.y, z: 5 };
      else if (play.kind === 'groundout' && play.fielded) {
        const k = clamp((play.t - play.throwT) / 0.5, 0, 1);
        b = { x: lerp(play.ix, BASES[1][0], k), y: lerp(play.iy, BASES[1][1], k), z: 4 + Math.sin(k * Math.PI) * 4 };
      } else b = samplePath(play.flight.pts, play.t);
      drawBall(ctx, cam, b.x, b.y, b.z, true);
    }
    // strike zone + reticle
    if (S.camK < 0.3 && (S.phase === 'windup' || S.phase === 'pitch' || S.phase === 'aim' || S.phase === 'windup2' || S.phase === 'called')) drawZone(ctx, cam);
    fx.draw(ctx);
    drawHUD(ctx, view);
  }
  function drawBall(ctx, cam, x, y, z, trail) {
    const g = project(cam, x, y, 0), p = project(cam, x, y, z);
    drawShadow(ctx, g[0], g[1], Math.max(2, g[2] * 0.5), Math.max(1, g[2] * 0.18), 0.4);
    const r = Math.max(4, p[2] * 0.2);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (r > 5) { ctx.strokeStyle = '#dc2626'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath(); ctx.arc(p[0] - r * 0.9, p[1], r * 0.7, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(p[0] + r * 0.9, p[1], r * 0.7, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke(); }
  }
  function drawZone(ctx, cam) {
    const a = project(cam, ZONE.x0, 0, ZONE.z1), b = project(cam, ZONE.x1, 0, ZONE.z0);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const x = lerp(a[0], b[0], i / 3), y = lerp(a[1], b[1], i / 3);
      ctx.beginPath(); ctx.moveTo(x, a[1]); ctx.lineTo(x, b[1]); ctx.moveTo(a[0], y); ctx.lineTo(b[0], y); ctx.stroke();
    }
    // reticle
    const r = project(cam, ret.x, 0, ret.z), bat = batting() === 'me';
    const R = (bat ? D.radius : 0.35) * r[2];
    ctx.strokeStyle = bat ? '#facc15' : '#22d3ee'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r[0], r[1], R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r[0] - R - 6, r[1]); ctx.lineTo(r[0] - R + 6, r[1]); ctx.moveTo(r[0] + R - 6, r[1]); ctx.lineTo(r[0] + R + 6, r[1]);
    ctx.moveTo(r[0], r[1] - R - 6); ctx.lineTo(r[0], r[1] - R + 6); ctx.moveTo(r[0], r[1] + R - 6); ctx.lineTo(r[0], r[1] + R + 6); ctx.stroke();
    // rookie: show where the pitch will cross
    if (bat && rookie && pitch.live && pitch.t / pitch.T > 0.35) {
      const e = ballAt(1), q = project(cam, e.x, 0, e.z);
      ctx.fillStyle = 'rgba(250,204,21,.25)'; ctx.beginPath(); ctx.arc(q[0], q[1], 0.12 * q[2] * 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawHUD(ctx, view) {
    const x = 18, y = 14, w = 300, h = 96;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(15,23,42,.9)'; rrect(ctx, x, y, w, h, 16); ctx.fill(); ctx.shadowBlur = 0;
    ctx.textBaseline = 'middle';
    const row = (label, val, yy, col, up) => {
      ctx.fillStyle = col; rrect(ctx, x + 12, yy - 11, 8, 22, 3); ctx.fill();
      ctx.font = '900 18px Nunito'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(label, x + 28, yy);
      if (up) { ctx.fillStyle = '#facc15'; ctx.font = '900 12px Nunito'; ctx.fillText('AT BAT', x + 72, yy + 1); }
      ctx.font = "30px 'Lilita One'"; ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(val, x + 172, yy + 1);
    };
    row('YOU', S.score.me, y + 28, teams.me.shirt, batting() === 'me');
    row('CPU', S.score.cpu, y + 66, teams.cpu.shirt, batting() === 'cpu');
    // inning
    ctx.textAlign = 'center'; ctx.fillStyle = '#facc15'; ctx.font = '900 14px Nunito';
    ctx.fillText((S.half === 'top' ? '▲ ' : '▼ ') + S.inning, x + 202, y + 22);
    // mini diamond
    const dx = x + 202, dy = y + 58;
    [[0, -12], [12, 0], [0, 12], [-12, 0]].slice(0, 3).forEach(([ox, oy], i) => {
      const occ = i === 0 ? S.bases[1] : i === 1 ? S.bases[0] : S.bases[2];
      const bx = i === 0 ? dx : i === 1 ? dx + 12 : dx - 12, by = i === 0 ? dy - 12 : dy;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = occ ? '#facc15' : 'rgba(255,255,255,.18)'; ctx.fillRect(-6, -6, 12, 12); ctx.restore();
    });
    // count
    const dots = (label, n, max, col, yy) => {
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '900 12px Nunito'; ctx.textAlign = 'left'; ctx.fillText(label, x + 236, yy);
      for (let i = 0; i < max; i++) { ctx.fillStyle = i < n ? col : 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(x + 254 + i * 13, yy, 5, 0, Math.PI * 2); ctx.fill(); }
    };
    dots('B', S.balls, 3, '#4ade80', y + 26); dots('S', S.strikes, 2, '#facc15', y + 48); dots('O', S.outs, 2, '#f87171', y + 70);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '800 12px Nunito'; ctx.textAlign = 'center';
    ctx.fillText(`${innings} INNING${innings > 1 ? 'S' : ''}`, x + w / 2, y + h + 14);
    ctx.restore();

    if (S.phase === 'aim') prompt(ctx, input.touchMode ? 'Joystick to aim · FAST or CURVE to pitch' : 'Arrows to aim · SPACE fastball · SHIFT curveball', 0.6 + 0.4 * Math.sin(S.t * 5));
    else if (batting() === 'me' && (S.phase === 'windup' || S.phase === 'pitch') && S.tipT > 0)
      prompt(ctx, input.touchMode ? 'Move the yellow circle onto the ball · tap SWING as it arrives' : 'Arrows move the circle · SPACE swing · SHIFT power swing', Math.min(1, S.tipT));
    if (S.msg && ['called', 'result', 'switch', 'end'].includes(S.phase)) {
      const big = S.phase === 'end' || S.msg === 'HOME RUN!';
      drawBanner(ctx, S.msg, 640, 300, S.msgT || 0, { size: big ? 110 : 78, sub: S.msgSub || null, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    }
    if (S.phase === 'intro') drawBanner(ctx, 'PLAY BALL!', 640, 300, S.t, { size: 110, color: '#a5f3fc', glow: '#0891b2' });
  }
  function prompt(ctx, text, alpha) {
    ctx.globalAlpha = alpha;
    ctx.font = '800 17px Nunito'; const w = ctx.measureText(text).width + 40;
    ctx.fillStyle = 'rgba(15,23,42,.75)'; rrect(ctx, 640 - w / 2, 660, w, 38, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 679);
    ctx.globalAlpha = 1;
  }

  if (env.debug) env.debug({ S, pitch, ret, swing, get play() { return play; }, resolveContact }); // test hook used by headless simulations
  audio.setCrowd(0.2);
  return { update, draw };
}
const easeInOut = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

// ---------- menu thumbnail ----------
const thumbLook = { skin: SKINS[2], hair: HAIRS[0], style: 'short' };
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  const v = view || { ox: 0, oy: 0, W: 1280, H: 720 };
  const cyc = t % 4;
  const camK = cyc < 1.6 ? 0 : cyc < 2.1 ? easeInOut((cyc - 1.6) / 0.5) : cyc < 3.6 ? 1 : 1 - (cyc - 3.6) / 0.4;
  const cam = mixCam(BAT_CAM, FIELD_CAM, camK);
  drawField(ctx, cam, v, t);
  const pp = project(cam, 0, 60.5, 0);
  const wind = cyc < 0.8 ? cyc / 0.8 : 1;
  drawHuman(ctx, pp[0], pp[1], pp[2] * 0.056, { view: 'front', pose: wind < 1 ? 'kick' : 'ready', poseT: wind, ...thumbLook, shirt: '#e11d48', shorts: '#f8fafc', gloves: '#7c2d12' });
  if (camK < 0.5) {
    const bp = project(cam, -3.4, 0.4, 0), sc = bp[2] * 0.056;
    drawHuman(ctx, bp[0], bp[1], sc, { view: 'side', pose: 'ready', skin: SKINS[1], hair: HAIRS[3], style: 'short', shirt: '#2563eb', shorts: '#f8fafc' });
    drawBat(ctx, bp[0], bp[1], sc, cyc > 1.25 ? (cyc - 1.25) / 0.3 : -1, false);
  }
  let b;
  if (cyc > 0.8 && cyc < 1.4) { const u = (cyc - 0.8) / 0.55; b = { x: lerp(0.9, 0, u), y: lerp(54, 0, u), z: lerp(5.6, 2.6, u) }; }
  else if (cyc >= 1.4) { const u = cyc - 1.4; b = { x: -u * 30, y: u * 150, z: 3 + u * 70 - 16 * u * u }; }
  if (b && b.z > 0) {
    const p = project(cam, b.x, b.y, b.z);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(3.5, p[2] * 0.16), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export default {
  id: 'baseball',
  title: 'Baseball',
  tagline: 'Step up to the plate and swing for the fences',
  desc: 'Bat and pitch through the innings against a CPU team in a packed ballpark.',
  music: 'baseball',
  labels: { a: 'SWING', b: 'POWER' },
  options: [
    { key: 'innings', label: 'Innings', default: 1, choices: [{ v: '1', label: '1 inning', sub: 'quick' }, { v: '3', label: '3 innings', sub: 'standard' }, { v: '5', label: '5 innings', sub: 'long' }] },
  ],
  howto: `<ul>
    <li><b>Batting</b>: move the yellow circle onto the pitch with the joystick or arrows. Press <b>SWING</b> (<kbd>Space</kbd>) just as the ball reaches the plate. <b>POWER</b> (<kbd>Shift</kbd>) hits farther but is harder to time.</li>
    <li>Swing early to pull the ball to left field, late to hit it to right. Aim under the ball for fly balls, over it for grounders.</li>
    <li><b>Pitching</b>: aim the blue circle, then throw a <b>FAST</b> ball (<kbd>Space</kbd>) or a <b>CURVE</b> (<kbd>Shift</kbd>) that drops and bends. Pitches outside the dashed box are balls.</li>
    <li>3 strikes is an out, 4 balls is a walk, 3 outs switches sides. A half-inning also ends after ${MERCY} runs.</li>
    <li>Rewards: runs, home runs, strikeouts and wins. Rookie shows where the pitch will cross and helps aim your circle.</li>
  </ul>`,
  create,
  drawThumb,
};
