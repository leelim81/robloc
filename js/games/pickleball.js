// ROBLOC Pickleball: singles with real rules (diagonal serve, two-bounce rule, kitchen, side-out scoring).
// World units are meters: x = across the court (0..CW), y = depth (0 = far baseline, CL = near baseline), z = height.
import { drawHuman, drawShadow, shade, rrect, SKINS, HAIRS, HAIR_STYLES } from '../art.js';
import { drawBanner } from '../fx.js';

const CW = 6.1, CL = 13.41, NY = CL / 2, KIT = 2.13, NET_H = 0.86, NET_POST_H = 0.91;
const D0 = 13, F = 1279, FH = 10881, H0 = -247, ZK = 0.5, G = 9.81;
const DIFF = {
  rookie: { speed: 3.5, react: 0.38, err: 1.4, q: 0.5, letOut: 0.35 },
  pro: { speed: 4.3, react: 0.26, err: 0.9, q: 0.72, letOut: 0.7 },
  legend: { speed: 5.0, react: 0.16, err: 0.55, q: 0.88, letOut: 0.92 },
  boost: { speed: 2.4, react: 0.7, err: 2.6, q: 0.25, letOut: 0.05 },  // win-chance matches
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
const hyp = Math.hypot;

export function P(x, y, z = 0) {
  const D = (CL - y) + D0, s = F / D;
  return [640 + (x - CW / 2) * s, H0 + FH / D - z * s * ZK, s];
}

// ---------- static background ----------
let bgLayer = null;
function getBG() {
  if (bgLayer) return bgLayer;
  // Covers x -300..1580 and y -200..920 so wide and tall screens never show an edge.
  const c = document.createElement('canvas'); c.width = 1880 * 1.5; c.height = 1120 * 1.5;
  const ctx = c.getContext('2d'); ctx.scale(1.5, 1.5); ctx.translate(300, 200);
  // sky
  const sky = ctx.createLinearGradient(0, -300, 0, 200);
  sky.addColorStop(0, '#3b82f6'); sky.addColorStop(0.7, '#93c5fd'); sky.addColorStop(1, '#dbeafe');
  ctx.fillStyle = sky; ctx.fillRect(-400, -400, 2400, 620);
  // distant hills and trees
  ctx.fillStyle = '#86b37a';
  ctx.beginPath(); ctx.moveTo(-400, 140);
  for (let x = -400; x <= 1680; x += 40) ctx.lineTo(x, 120 - Math.sin(x * 0.006) * 22 - Math.sin(x * 0.017) * 8);
  ctx.lineTo(1680, 220); ctx.lineTo(-400, 220); ctx.fill();
  for (let i = 0; i < 70; i++) {
    const x = -400 + i * 31 + Math.sin(i * 7.3) * 12, h = 30 + (Math.sin(i * 3.1) + 1) * 18, y = 132;
    ctx.fillStyle = i % 3 ? '#3f7d3a' : '#4d8c45';
    ctx.beginPath(); ctx.ellipse(x, y - h * 0.6, h * 0.42, h * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.ellipse(x - h * 0.12, y - h * 0.8, h * 0.18, h * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  }
  // ground
  const gnd = ctx.createLinearGradient(0, 120, 0, 900);
  gnd.addColorStop(0, '#4a8f4f'); gnd.addColorStop(1, '#2f6e3a');
  ctx.fillStyle = gnd; ctx.fillRect(-400, 128, 2080, 900);
  // surround (hard court apron)
  quad(ctx, [-3.2, -4.2], [CW + 3.2, -4.2], [CW + 3.2, CL + 3], [-3.2, CL + 3], '#2f7d4f');
  // fence at back
  const fl = P(-3.2, -4.2), fr = P(CW + 3.2, -4.2), ft = P(0, -4.2, 3.2);
  const fh = fl[1] - ft[1];
  ctx.fillStyle = 'rgba(20,40,30,.35)'; ctx.fillRect(fl[0] - 400, fl[1] - fh, fr[0] - fl[0] + 800, fh);
  ctx.strokeStyle = 'rgba(30,41,59,.55)'; ctx.lineWidth = 0.7;
  for (let x = fl[0] - 400; x < fr[0] + 400; x += 7) { ctx.beginPath(); ctx.moveTo(x, fl[1]); ctx.lineTo(x + fh * 0.5, fl[1] - fh); ctx.moveTo(x + fh * 0.5, fl[1]); ctx.lineTo(x, fl[1] - fh); ctx.stroke(); }
  ctx.fillStyle = '#334155'; ctx.fillRect(fl[0] - 400, fl[1] - fh - 3, fr[0] - fl[0] + 800, 4);
  for (let x = fl[0] - 400; x < fr[0] + 400; x += 90) ctx.fillRect(x, fl[1] - fh, 3, fh);
  // sponsor banner on fence
  ctx.fillStyle = '#1e3a8a'; rrect(ctx, 520, fl[1] - fh * 0.55, 240, 22, 4); ctx.fill();
  ctx.fillStyle = '#fbbf24'; ctx.font = "16px 'Lilita One', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('ROBLOC PICKLE CLUB', 640, fl[1] - fh * 0.55 + 11);
  // court
  quad(ctx, [0, 0], [CW, 0], [CW, CL], [0, CL], '#1f5fae');
  quad(ctx, [0, NY - KIT], [CW, NY - KIT], [CW, NY + KIT], [0, NY + KIT], '#2b74c9');
  // surface texture
  ctx.save();
  const c0 = P(0, 0), c1 = P(CW, 0), c2 = P(CW, CL), c3 = P(0, CL);
  ctx.beginPath(); ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(c3[0], c3[1]); ctx.closePath(); ctx.clip();
  for (let i = 0; i < 6000; i++) { ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.04)'; ctx.fillRect(c3[0] + Math.random() * (c2[0] - c3[0]), c0[1] + Math.random() * (c3[1] - c0[1]), 1.5, 1.5); }
  ctx.restore();
  // lines
  ctx.strokeStyle = '#f8fafc'; ctx.lineCap = 'round';
  const line = (a, b) => { const p1 = P(...a), p2 = P(...b); ctx.lineWidth = Math.max(1.2, 0.05 * (p1[2] + p2[2]) / 2); ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); };
  line([0, 0], [CW, 0]); line([0, CL], [CW, CL]); line([0, 0], [0, CL]); line([CW, 0], [CW, CL]);
  line([0, NY - KIT], [CW, NY - KIT]); line([0, NY + KIT], [CW, NY + KIT]);
  line([CW / 2, 0], [CW / 2, NY - KIT]); line([CW / 2, NY + KIT], [CW / 2, CL]);
  // sunlight vignette
  const v = ctx.createRadialGradient(640, 420, 100, 640, 420, 900);
  v.addColorStop(0, 'rgba(255,250,220,.08)'); v.addColorStop(1, 'rgba(0,20,10,.28)');
  ctx.fillStyle = v; ctx.fillRect(-400, 100, 2080, 800);
  bgLayer = c;
  return c;

  function quad(ctx, a, b, c2, d, col) {
    const p = [a, b, c2, d].map(q => P(q[0], q[1]));
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); p.slice(1).forEach(q => ctx.lineTo(q[0], q[1])); ctx.closePath(); ctx.fill();
  }
}

function drawScene(ctx, view, t) {
  const x0 = -view.ox, y0 = -view.oy;
  ctx.fillStyle = '#3b82f6'; ctx.fillRect(x0, y0, view.W, 140 - y0);
  ctx.fillStyle = '#2f6e3a'; ctx.fillRect(x0, 300, view.W, view.H);
  ctx.drawImage(getBG(), -300, -200, 1880, 1120);
  // drifting clouds
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 330 + t * (8 + i * 2)) % 1800) - 260, cy = -20 + i * 18 - view.oy * 0.3;
    if (cy < y0 - 40) continue;
    ctx.beginPath(); ctx.ellipse(cx, cy, 60, 18, 0, 0, Math.PI * 2); ctx.ellipse(cx + 40, cy - 8, 40, 16, 0, 0, Math.PI * 2); ctx.ellipse(cx - 40, cy - 4, 36, 12, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawNet(ctx) {
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const x = -0.3 + (CW + 0.6) * i / 20, sag = NET_POST_H - (NET_POST_H - NET_H) * (1 - Math.pow((x - CW / 2) / (CW / 2 + 0.3), 2));
    pts.push([x, sag]);
  }
  // mesh
  ctx.fillStyle = 'rgba(15,23,42,.35)';
  ctx.beginPath();
  pts.forEach(([x, h], i) => { const p = P(x, NY, h); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
  const br = P(CW + 0.3, NY, 0), bl = P(-0.3, NY, 0);
  ctx.lineTo(br[0], br[1]); ctx.lineTo(bl[0], bl[1]); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(15,23,42,.6)'; ctx.lineWidth = 0.8;
  for (let i = 0; i <= 60; i++) {
    const x = -0.3 + (CW + 0.6) * i / 60, h = NET_H + (NET_POST_H - NET_H) * Math.pow((x - CW / 2) / (CW / 2 + 0.3), 2);
    const a = P(x, NY, 0), b = P(x, NY, h); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  for (let k = 1; k < 6; k++) {
    ctx.beginPath();
    pts.forEach(([x, h], i) => { const p = P(x, NY, h * k / 6); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke();
  }
  // tape
  ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 4; ctx.beginPath();
  pts.forEach(([x, h], i) => { const p = P(x, NY, h); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke();
  // posts
  for (const x of [-0.3, CW + 0.3]) {
    const a = P(x, NY, 0), b = P(x, NY, NET_POST_H + 0.04);
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(b[0], b[1], 4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBallAt(ctx, b, t) {
  const g = P(b.x, b.y, 0);
  drawShadow(ctx, g[0] + b.z * g[2] * 0.12, g[1], Math.max(4, g[2] * 0.09), Math.max(2, g[2] * 0.035), 0.5 / (1 + b.z * 0.6));
  const p = P(b.x, b.y, b.z);
  const r = Math.max(4.5, p[2] * 0.06);
  if (b.trail) {
    ctx.lineCap = 'round';
    for (let i = 1; i < b.trail.length; i++) {
      const a = b.trail[i - 1], c = b.trail[i];
      ctx.strokeStyle = `rgba(254,240,138,${0.35 * i / b.trail.length})`; ctx.lineWidth = r * 1.4 * i / b.trail.length;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    }
  }
  const gr = ctx.createRadialGradient(p[0] - r * 0.3, p[1] - r * 0.35, r * 0.1, p[0], p[1], r);
  gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.5, '#facc15'); gr.addColorStop(1, '#ca8a04');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(161,98,7,.7)';
  for (let i = 0; i < 4; i++) { const a = (t || 0) * 9 + i * 1.57; ctx.beginPath(); ctx.arc(p[0] + Math.cos(a) * r * 0.5, p[1] + Math.sin(a) * r * 0.45, r * 0.18, 0, Math.PI * 2); ctx.fill(); }
}

function drawPlayerAt(ctx, pl, t) {
  const g = P(pl.x, pl.y, 0);
  const s = g[2] * ZK * 1.75 / 100;
  const sp = hyp(pl.vx, pl.vy);
  let pose = sp > 0.4 ? 'run' : 'ready', poseT = 0;
  if (pl.swingT > 0) { pose = 'swing'; poseT = 1 - pl.swingT / 0.32; }
  if (pl.celebrate) pose = 'celebrate';
  drawHuman(ctx, g[0], g[1], s, {
    view: pl.near ? 'back' : 'front', phase: pl.phase, moving: clamp(sp / 3.5, 0, 1), pose, poseT, swingDir: pl.swingDir,
    ...pl.look, shirt: pl.kit.shirt, shorts: pl.kit.shorts, socks: '#f8fafc', shoes: pl.kit.shoes, paddle: true, paddleColor: pl.kit.paddle,
    face: pl.celebrate ? 'happy' : pl.sad ? 'sad' : undefined, number: pl.near ? undefined : undefined,
  });
  return g;
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options, profile } = env;
  const D = options.boost ? DIFF.boost : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = move 50% faster, Power = hit 50% harder.
  const SPD = options.power === 'speed' ? 1.5 : 1;
  const PWR = options.power === 'power' ? 1.5 : 1;
  const target = +(options.target || 11);
  const autoSwing = (options.assist || 'auto') === 'auto';
  const av = profile?.avatar || {};
  const me = { near: true, x: CW * 0.75, y: CL + 0.4, vx: 0, vy: 0, phase: 0, swingT: 0, swingDir: 1, look: { skin: av.skin, hair: av.hair, style: av.style },
    kit: { shirt: av.shirt || '#e11d48', shorts: '#0f172a', shoes: '#f8fafc', paddle: '#22d3ee' }, buffer: 0, bufType: 'drive', celebrate: false, sad: false };
  const cpu = { near: false, x: CW * 0.25, y: -0.5, vx: 0, vy: 0, phase: 0, swingT: 0, swingDir: 1,
    look: { skin: SKINS[(Math.random() * SKINS.length) | 0], hair: HAIRS[(Math.random() * 6) | 0], style: HAIR_STYLES[(Math.random() * HAIR_STYLES.length) | 0] },
    kit: { shirt: av.shirt === '#f59e0b' ? '#7c3aed' : '#f59e0b', shorts: '#f8fafc', shoes: '#111827', paddle: '#f472b6' },
    plan: null, react: 0, celebrate: false, sad: false, mode: 'back' };

  const ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, live: false, trail: [], spin: 0 };
  const R = { hits: 0, lastHitter: null, bounced: false, bounceSide: null, netted: false, serve: true, minDist: 99 };
  const S = { phase: 'intro', t: 0, server: 'me', score: { me: 0, cpu: 0 }, msg: null, msgSub: null, msgColor: '#fff', aces: 0, longest: 0, myWinners: 0, tipT: 6, labelKey: '', marker: null, landing: null };

  const sideOf = y => (y > NY ? 'near' : 'far');
  const playerSide = who => (who === 'me' ? 'near' : 'far');

  function setupServe() {
    const srv = S.server, sc = S.score[srv];
    const even = sc % 2 === 0;
    // Near player's right is +x; far player's right is -x.
    if (srv === 'me') {
      me.x = even ? CW * 0.75 : CW * 0.25; me.y = CL + 0.35;
      cpu.x = even ? CW * 0.25 : CW * 0.75; cpu.y = -0.6;
    } else {
      cpu.x = even ? CW * 0.25 : CW * 0.75; cpu.y = -0.35;
      me.x = even ? CW * 0.75 : CW * 0.25; me.y = CL + 0.6;
    }
    me.vx = me.vy = cpu.vx = cpu.vy = 0;
    me.celebrate = cpu.celebrate = me.sad = cpu.sad = false;
    cpu.mode = 'back'; cpu.plan = null;
    const s = srv === 'me' ? me : cpu;
    Object.assign(ball, { x: s.x + (srv === 'me' ? 0.35 : -0.35), y: s.y + (srv === 'me' ? -0.25 : 0.25), z: 0.55, vx: 0, vy: 0, vz: 0, live: false, trail: [] });
    Object.assign(R, { hits: 0, lastHitter: null, bounced: false, bounceSide: null, netted: false, serve: true, box: null });
    S.phase = 'serve'; S.t = 0; S.landing = null;
  }

  function serveBox(receiver) {
    // Locked when the serve is struck, so the server moving afterwards can't change the target box.
    if (R.box && R.box.receiver === receiver) return R.box;
    const srvX = (S.server === 'me' ? me : cpu).x;
    const left = srvX > CW / 2; // diagonal: target opposite half in x
    const x0 = left ? 0 : CW / 2, x1 = left ? CW / 2 : CW;
    return receiver === 'far' ? { x0, x1, y0: 0, y1: NY - KIT } : { x0, x1, y0: NY + KIT, y1: CL };
  }

  function launch(hitter, tx, ty, T, z0, minClear) {
    // Solve a ballistic arc that lands at (tx, ty) after T seconds; raise the arc until it clears the net.
    const x0 = ball.x, y0 = ball.y;
    let vx, vy, vz;
    for (let k = 0; k < 30; k++) {
      vx = (tx - x0) / T; vy = (ty - y0) / T; vz = (0.5 * G * T * T - z0) / T;
      const tn = (NY - y0) / vy;
      const zn = z0 + vz * tn - 0.5 * G * tn * tn;
      if (tn <= 0 || zn >= NET_H + minClear) break;
      T += 0.06;
    }
    Object.assign(ball, { vx, vy, vz, z: z0, live: true });
  }

  function hit(who, type, aimX, quality) {
    const h = who === 'me' ? me : cpu;
    const toFar = who === 'me';
    const sk = who === 'me' ? { err: options.difficulty === 'rookie' ? 0.7 : 0.9 } : D;
    const netY = NY;
    let tx, ty, T, minClear = 0.1;
    const errK = sk.err * (1.15 - quality);
    const z0 = clamp(ball.z, 0.15, 2.2);
    const aimXw = CW / 2 + clamp(aimX, -1, 1) * (CW / 2 - 0.55);
    if (type === 'serve') {
      R.box = null;
      const box = { ...serveBox(toFar ? 'far' : 'near'), receiver: toFar ? 'far' : 'near' };
      tx = clamp((box.x0 + box.x1) / 2 + aimX * 1.0, box.x0 + 0.3, box.x1 - 0.3);
      const depth = 4.6;
      ty = toFar ? netY - depth : netY + depth;
      T = 1.25;
      tx += gauss() * 0.8 * errK; ty += gauss() * 1.0 * errK;
    } else if (type === 'dink') {
      const depth = rand(0.7, 1.7);
      tx = aimXw; ty = toFar ? netY - depth : netY + depth;
      T = clamp(hyp(tx - ball.x, ty - ball.y) / 3.2, 0.85, 1.35);
      tx += gauss() * 1.1 * errK; ty += gauss() * 1.0 * errK; minClear = 0.06;
    } else if (type === 'lob') {
      const depth = rand(5.4, 6.3);
      tx = aimXw; ty = toFar ? netY - depth : netY + depth;
      T = rand(1.75, 2.05);
      tx += gauss() * 1.3 * errK; ty += gauss() * 1.6 * errK; minClear = 0.6;
    } else { // drive
      const depth = rand(5.0, 6.4);
      tx = aimXw; ty = toFar ? netY - depth : netY + depth;
      const speed = (11 + quality * 5) * (who === 'me' ? PWR : 1);
      T = hyp(tx - ball.x, ty - ball.y) / speed;
      tx += gauss() * 1.7 * errK; ty += gauss() * 2.0 * errK; minClear = 0.12;
      if (Math.random() < (1 - quality) * 0.22) minClear = -0.35; // mishit into the net
    }
    launch(who, tx, ty, T, z0, minClear);
    if (type === 'serve') R.box = { ...serveBox(toFar ? 'far' : 'near'), receiver: toFar ? 'far' : 'near' };
    R.hits++; R.lastHitter = who; R.bounced = false; R.bounceSide = null; R.netted = false;
    if (type !== 'serve') R.serve = false;
    h.swingT = 0.32; h.swingDir = (ball.x - h.x) * (h.near ? 1 : -1) >= 0 ? 1 : -1;
    audio.play('paddle', { power: type === 'drive' ? 1 : type === 'serve' ? 0.6 : 0.35 });
    const p = P(ball.x, ball.y, ball.z);
    fx.sparks(p[0], p[1], type === 'drive' ? 10 : 5, '#fef08a');
    if (type === 'drive' && quality > 0.85) fx.shake(3);
    S.longest = Math.max(S.longest, R.hits);
    if (who === 'cpu') computeLanding(); else { S.landing = null; cpu.react = D.react; }
    cpu.plan = null;
    if (R.hits >= 6 && R.hits % 3 === 0) audio.cheer(0.25 + Math.min(0.6, R.hits / 25));
  }

  function simulate(b, maxT = 3.2) {
    // Predict the ball path (with bounces, ignoring the net) for AI planning and the landing marker.
    const out = []; let { x, y, z, vx, vy, vz } = b; let bounces = 0; const dt = 1 / 60;
    for (let t = 0; t < maxT; t += dt) {
      vz -= G * dt; x += vx * dt; y += vy * dt; z += vz * dt;
      if (z <= 0 && vz < 0) { z = 0; vz = -vz * 0.58; vx *= 0.78; vy *= 0.78; bounces++; out.push({ t, x, y, z, bounces, bounce: true }); continue; }
      out.push({ t, x, y, z, bounces });
      if (bounces >= 2) break;
    }
    return out;
  }
  function computeLanding() {
    const path = simulate(ball);
    const b = path.find(p => p.bounce);
    S.landing = b ? { x: b.x, y: b.y } : null;
  }

  function inCourt(x, y, side) {
    const e = 0.04;
    if (x < -e || x > CW + e) return false;
    return side === 'far' ? y >= -e && y <= NY : y >= NY && y <= CL + e;
  }
  function inBox(x, y, box) { const e = 0.04; return x >= box.x0 - e && x <= box.x1 + e && y >= box.y0 - e && y <= box.y1 + e && !(y > NY - KIT && y < NY + KIT); }

  function pointTo(winner, reason, color) {
    if (S.phase !== 'rally' && S.phase !== 'serve') return;
    ball.live = false;
    S.phase = 'point'; S.t = 0;
    const serverWon = winner === S.server;
    let sideOut = false;
    if (serverWon) S.score[winner]++;
    else { S.server = winner; sideOut = true; }
    if (winner === 'me' && R.hits === 1 && R.lastHitter === 'me') S.aces++;
    if (winner === 'me' && R.lastHitter === 'me' && R.hits > 1) S.myWinners++;
    S.msg = reason; S.msgColor = color || (winner === 'me' ? '#a3e635' : '#fca5a5');
    S.msgSub = sideOut ? 'Side out' : serverWon ? 'Point' : '';
    (winner === 'me' ? me : cpu).celebrate = true;
    (winner === 'me' ? cpu : me).sad = true;
    if (winner === 'me') { audio.play('point'); audio.cheer(0.4 + Math.min(0.8, R.hits / 15)); }
    else { audio.play('aww'); }
    const a = S.score.me, b = S.score.cpu;
    if ((a >= target || b >= target) && Math.abs(a - b) >= 2) { S.over = true; }
  }

  function onBounce() {
    const side = sideOf(ball.y);
    const hitterSide = R.lastHitter ? playerSide(R.lastHitter) : null;
    audio.play('pbBounce', { power: clamp(-ball.vz / 6, 0.2, 1) });
    const g = P(ball.x, ball.y, 0); fx.ring(g[0], g[1], 'rgba(255,255,255,.6)', g[2] * 0.25);
    if (!R.lastHitter) return;
    const opp = R.lastHitter === 'me' ? 'cpu' : 'me';
    if (side === hitterSide) { pointTo(opp, R.netted ? 'NET!' : 'FAULT'); return; }
    if (!R.bounced) {
      const ok = R.serve ? inBox(ball.x, ball.y, serveBox(side)) : inCourt(ball.x, ball.y, side);
      if (!ok) {
        const inKitchen = R.serve && Math.abs(ball.y - NY) < KIT && ball.x > -0.05 && ball.x < CW + 0.05;
        pointTo(opp, inKitchen ? 'FAULT' : 'OUT!', '#fde68a');
        if (inKitchen) S.msgSub2 = 'Serves must clear the kitchen';
        return;
      }
      R.bounced = true; R.bounceSide = side;
    } else {
      pointTo(R.lastHitter, R.lastHitter === 'me' ? 'WINNER!' : 'POINT CPU');
    }
  }

  function legalToHit(who) {
    const h = who === 'me' ? me : cpu;
    const mustBounce = R.hits === 1 || R.hits === 2; // the return and the third shot must bounce
    if (mustBounce && !R.bounced) return { ok: false, why: 'bounce' };
    const inKitchen = who === 'me' ? h.y < NY + KIT : h.y > NY - KIT;
    if (!R.bounced && inKitchen) return { ok: false, why: 'kitchen' };
    return { ok: true };
  }
  function inReach(h, reach) {
    const sideOk = h.near ? ball.y > NY : ball.y < NY;
    const toward = h.near ? (ball.vy > 0 || R.bounced) : (ball.vy < 0 || R.bounced);
    const d = hyp(ball.x - h.x, ball.y - h.y);
    return sideOk && toward && d < reach && ball.z < 2.1 && ball.z > 0.05 ? d : null;
  }

  // ---------- update ----------
  function update(dt) {
    S.t += dt;
    if (S.tipT > 0) S.tipT -= dt;
    me.swingT = Math.max(0, me.swingT - dt); cpu.swingT = Math.max(0, cpu.swingT - dt);
    me.buffer = Math.max(0, me.buffer - dt);

    if (S.phase === 'intro') { if (S.t > 1.2) setupServe(); return; }

    // human movement
    const canMove = !(S.phase === 'serve' && S.server === 'me') && S.phase !== 'point' && S.phase !== 'end';
    const spd = 4.6 * SPD;
    const tvx = canMove ? input.mx * spd : 0, tvy = canMove ? input.my * spd * 0.9 : 0;
    me.vx += (tvx - me.vx) * Math.min(1, dt * 9); me.vy += (tvy - me.vy) * Math.min(1, dt * 9);
    if (S.phase === 'serve' && S.server === 'me') { me.vx = input.mx * 1.2; me.vy = 0; }
    me.x = clamp(me.x + me.vx * dt, -1.8, CW + 1.8); me.y = clamp(me.y + me.vy * dt, NY + 0.3, CL + 1.6);
    if (S.phase === 'serve' && S.server === 'me') me.x = clamp(me.x, S.score.me % 2 === 0 ? CW / 2 + 0.2 : 0.2, S.score.me % 2 === 0 ? CW - 0.2 : CW / 2 - 0.2);
    me.phase += hyp(me.vx, me.vy) * dt * 2.6;

    const labelKey = S.phase === 'serve' && S.server === 'me' ? 'serve' : 'rally';
    if (labelKey !== S.labelKey) { S.labelKey = labelKey; input.setLabels(labelKey === 'serve' ? 'SERVE' : 'DRIVE', labelKey === 'serve' ? 'SERVE' : 'SOFT'); }

    if (S.phase === 'serve') {
      const srv = S.server === 'me' ? me : cpu;
      ball.x = srv.x + (srv.near ? 0.35 : -0.35); ball.y = srv.y + (srv.near ? -0.25 : 0.25); ball.z = 0.55 + Math.sin(S.t * 4) * 0.03;
      if (S.server === 'me') {
        if ((input.a.pressed || input.b.pressed) && S.t > 0.35) { hit('me', 'serve', input.mx, 0.9); S.phase = 'rally'; S.t = 0; }
      } else if (S.t > 1.3) {
        hit('cpu', 'serve', rand(-0.6, 0.6), D.q + 0.1); S.phase = 'rally'; S.t = 0;
      }
      updateCPU(dt);
      return;
    }

    if (S.phase === 'point') {
      ballPhysics(dt, true);
      updateCPU(dt);
      if (S.t > 1.9) {
        S.msg = null; S.msgSub2 = null;
        if (S.over) return endGame();
        setupServe();
      }
      return;
    }
    if (S.phase === 'end') {
      me.phase += dt * 6; cpu.phase += dt * 6;
      if (S.t > 1.8 && !S.reported) { S.reported = true; report(); }
      return;
    }

    // rally
    if (input.a.pressed) { me.buffer = 0.3; me.bufType = 'drive'; if (me.swingT <= 0) { me.swingT = 0.32; me.swingDir = ball.x >= me.x ? 1 : -1; audio.play('swoosh'); } }
    if (input.b.pressed) { me.buffer = 0.3; me.bufType = me.y < NY + 4.0 ? 'dink' : 'lob'; if (me.swingT <= 0) { me.swingT = 0.32; me.swingDir = ball.x >= me.x ? 1 : -1; audio.play('swoosh'); } }

    ballPhysics(dt, false);
    if (S.phase !== 'rally') return;

    // human hitting
    if (ball.live && R.lastHitter === 'cpu') {
      const reach = options.difficulty === 'rookie' ? 1.25 : 1.0;
      const d = inReach(me, reach);
      const leg = legalToHit('me');
      S.hint = null;
      if (d !== null && !leg.ok) {
        if (leg.why === 'bounce') S.hint = 'Let it bounce!';
        else if (leg.why === 'kitchen') S.hint = 'No volleys in the kitchen!';
      }
      if (d !== null && leg.ok) {
        const qual = clamp(1 - Math.abs(d - 0.55) / 0.9 - (ball.z > 1.5 ? 0.25 : 0), 0.3, 1);
        if (me.buffer > 0) {
          hit('me', me.bufType, input.mx || (cpu.x < CW / 2 ? 0.6 : -0.6) * 0.5, qual); me.buffer = 0;
        } else if (autoSwing) {
          const closing = d < R.minDist - 0.005;
          R.minDist = d;
          if (!closing || ball.z < 0.28 || d < 0.45) {
            const type = me.y < NY + 3.2 && ball.z < 1.0 ? 'dink' : 'drive';
            hit('me', type, input.mx || (cpu.x < CW / 2 ? 0.5 : -0.5), qual * 0.85);
          }
        }
      } else R.minDist = 99;
      // manual-mode kitchen fault if the player volleys from inside the kitchen
      if (d !== null && !leg.ok && leg.why === 'kitchen' && me.buffer > 0 && options.difficulty !== 'rookie') {
        me.buffer = 0; pointTo('cpu', 'KITCHEN!', '#fca5a5'); S.msgSub2 = 'You volleyed inside the kitchen';
      }
    } else S.hint = null;

    updateCPU(dt);
  }

  function ballPhysics(dt, dead) {
    if (!ball.live && !dead) return;
    if (!ball.live && dead && ball.z <= 0 && Math.abs(ball.vz) < 0.1) { ball.vx *= 0.95; ball.vy *= 0.95; }
    const steps = 3, h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const py = ball.y;
      ball.vz -= G * h; ball.x += ball.vx * h; ball.y += ball.vy * h; ball.z += ball.vz * h;
      // net collision
      if ((py - NY) * (ball.y - NY) < 0 && ball.x > -0.3 && ball.x < CW + 0.3) {
        const nh = NET_H + (NET_POST_H - NET_H) * Math.pow((ball.x - CW / 2) / (CW / 2), 2);
        if (ball.z < nh) {
          ball.y = py; ball.vy = -ball.vy * 0.15; ball.vx *= 0.4; ball.vz = Math.min(ball.vz, 0.5);
          R.netted = true; audio.play('net');
        } else if (ball.z < nh + 0.08) { audio.play('net'); }
      }
      if (ball.z <= 0 && ball.vz < 0) {
        ball.z = 0;
        if (ball.vz < -0.6) { ball.vz = -ball.vz * 0.58; ball.vx *= 0.78; ball.vy *= 0.78; if (!dead && ball.live) onBounce(); }
        else { ball.vz = 0; ball.vx *= 0.9; ball.vy *= 0.9; }
      }
    }
    ball.spin += dt;
    const p = P(ball.x, ball.y, ball.z);
    ball.trail.push([p[0], p[1]]); if (ball.trail.length > 8) ball.trail.shift();
    // ball rolled far away without a second bounce resolving (safety net)
    if (!dead && ball.live && (ball.y < -8 || ball.y > CL + 8 || ball.x < -8 || ball.x > CW + 8)) {
      const opp = R.lastHitter === 'me' ? 'cpu' : 'me';
      pointTo(R.bounced ? R.lastHitter : opp, R.bounced ? 'WINNER!' : 'OUT!');
    }
  }

  // ---------- CPU ----------
  function updateCPU(dt) {
    let tx = cpu.x, ty = cpu.y;
    const speed = D.speed;
    if (S.phase === 'serve') { tx = cpu.x; ty = cpu.y; }
    else if (S.phase === 'point' || S.phase === 'end') { tx = cpu.x; ty = cpu.y; }
    else if (ball.live && R.lastHitter === 'me') {
      cpu.react -= dt;
      if (cpu.react <= 0 && (!cpu.plan || S.t - cpu.plan.at > 0.25)) planIntercept();
      if (cpu.plan) { tx = cpu.plan.x; ty = cpu.plan.y; }
      // hit when in reach
      const d = inReach(cpu, 1.0);
      const leg = legalToHit('cpu');
      if (d !== null && leg.ok && cpu.plan && !cpu.plan.leave) {
        const closing = d < (cpu.lastD ?? 99) - 0.005; cpu.lastD = d;
        if (!closing || d < 0.5 || ball.z < 0.3) { cpuShot(); cpu.lastD = 99; }
      }
    } else {
      // recover to a ready position
      const toNet = (R.lastHitter === 'cpu' && R.hits >= 2) || cpu.mode === 'net';
      if (R.hits >= 2) cpu.mode = 'net';
      ty = toNet ? NY - KIT - 0.35 : 0.2;
      tx = CW / 2 + (ball.x - CW / 2) * 0.35;
    }
    const dx = tx - cpu.x, dy = ty - cpu.y, d = hyp(dx, dy);
    const tvx = d > 0.05 ? dx / d * speed * Math.min(1, d / 0.6) : 0, tvy = d > 0.05 ? dy / d * speed * Math.min(1, d / 0.6) : 0;
    cpu.vx += (tvx - cpu.vx) * Math.min(1, dt * 8); cpu.vy += (tvy - cpu.vy) * Math.min(1, dt * 8);
    cpu.x = clamp(cpu.x + cpu.vx * dt, -1.8, CW + 1.8); cpu.y = clamp(cpu.y + cpu.vy * dt, -1.8, NY - 0.3);
    cpu.phase += hyp(cpu.vx, cpu.vy) * dt * 2.6;
  }

  function planIntercept() {
    const path = simulate(ball);
    const mustBounce = R.hits === 1 || R.hits === 2;
    const firstBounce = path.find(p => p.bounce);
    // Let balls that are clearly going out drop.
    if (firstBounce && !inCourt(firstBounce.x, firstBounce.y, 'far') && firstBounce.y < NY && Math.random() < D.letOut) {
      cpu.plan = { x: cpu.x, y: cpu.y, at: S.t, leave: true }; return;
    }
    let best = null;
    for (const p of path) {
      if (p.y > NY - 0.15 || p.z < 0.2 || p.z > 1.5) continue;
      if (p.bounces === 0 && mustBounce) continue;
      if (p.bounces >= 2) break;
      const volleyFromKitchen = p.bounces === 0 && p.y > NY - KIT - 0.05;
      if (volleyFromKitchen) continue;
      const sx = p.x - 0.35, sy = p.y - 0.15;
      const need = Math.max(0, hyp(sx - cpu.x, sy - cpu.y) - 0.5) / D.speed;
      if (need <= p.t) { best = { x: sx, y: sy, at: S.t }; break; }
      if (!best || need - p.t < best.late) best = { x: sx, y: sy, at: S.t, late: need - p.t };
    }
    cpu.plan = best || { x: cpu.x, y: cpu.y, at: S.t };
  }

  function cpuShot() {
    const mustBounceShot = R.hits === 1 || R.hits === 2;
    let type = 'drive';
    const nearNet = cpu.y > NY - KIT - 1.0;
    const meAtNet = me.y < NY + KIT + 1.0;
    if (R.hits === 2 && options.difficulty !== 'rookie' && Math.random() < 0.5) type = 'dink'; // third-shot drop
    else if (nearNet && ball.z < 0.95 && Math.random() < 0.7) type = 'dink';
    else if (!nearNet && meAtNet && Math.random() < 0.22) type = 'lob';
    if (mustBounceShot && R.hits === 1) type = Math.random() < 0.8 ? 'drive' : 'lob';
    const away = me.x < CW / 2 ? rand(0.25, 0.95) : rand(-0.95, -0.25);
    const q = clamp(D.q + rand(-0.15, 0.1), 0.3, 1);
    hit('cpu', type, away, q);
    if (R.hits >= 3) cpu.mode = 'net';
  }

  function endGame() {
    S.phase = 'end'; S.t = 0;
    const won = S.score.me > S.score.cpu;
    me.celebrate = won; cpu.celebrate = !won; me.sad = !won; cpu.sad = won;
    S.msg = won ? 'YOU WIN!' : 'GAME CPU'; S.msgSub = `${S.score.me} – ${S.score.cpu}`;
    S.msgColor = won ? '#fde68a' : '#cbd5e1';
    if (won) { fx.rain(1280, 160); audio.cheer(1.4); }
    audio.play('whistle');
  }
  function report() {
    const a = S.score.me, b = S.score.cpu;
    env.end({
      outcome: a > b ? 'win' : 'lose',
      scoreline: `YOU ${a} – ${b} CPU`,
      stats: [`Longest rally: <b>${S.longest}</b>`, `Aces: <b>${S.aces}</b>`, `Winners: <b>${S.myWinners}</b>`, `Game to <b>${target}</b>`],
      match: { game: 'pickleball', difficulty: options.difficulty, won: a > b, scoreFor: a, scoreAgainst: b, aces: S.aces, longestRally: S.longest },
    });
  }

  // ---------- draw ----------
  function draw(ctx, view) {
    drawScene(ctx, view, S.t);
    // landing marker (rookie assist)
    if (S.landing && options.difficulty === 'rookie' && ball.live && R.lastHitter === 'cpu' && !R.bounced) {
      const g = P(S.landing.x, S.landing.y, 0);
      ctx.strokeStyle = 'rgba(250,204,21,.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(g[0], g[1], g[2] * 0.22, g[2] * 0.08, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // kitchen warning tint when the player stands inside it and a volley is coming
    if (ball.live && R.lastHitter === 'cpu' && !R.bounced && me.y < NY + KIT) {
      const a = P(0, NY, 0), b = P(CW, NY, 0), c = P(CW, NY + KIT, 0), d = P(0, NY + KIT, 0);
      ctx.fillStyle = `rgba(248,113,113,${0.18 + 0.1 * Math.sin(S.t * 10)})`;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
    }
    const farBall = ball.y < NY;
    drawPlayerAt(ctx, cpu, S.t);
    if (farBall) drawBallAt(ctx, ball, ball.spin);
    drawNet(ctx);
    if (!farBall && ball.y < me.y) drawBallAt(ctx, ball, ball.spin);
    const g = drawPlayerAt(ctx, me, S.t);
    if (!farBall && ball.y >= me.y) drawBallAt(ctx, ball, ball.spin);
    // player marker
    ctx.strokeStyle = 'rgba(34,211,238,.8)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(g[0], g[1] + 2, g[2] * 0.3, g[2] * 0.1, 0, 0, Math.PI * 2); ctx.stroke();
    fx.draw(ctx);
    drawHUD(ctx);
  }

  function drawHUD(ctx) {
    const x = 18, y = 14, w = 250, h = 86;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(15,23,42,.88)'; rrect(ctx, x, y, w, h, 16); ctx.fill(); ctx.shadowBlur = 0;
    ctx.font = '900 18px Nunito'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const row = (label, val, yy, col, serving) => {
      ctx.fillStyle = col; rrect(ctx, x + 12, yy - 11, 8, 22, 3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(label, x + 30, yy);
      if (serving) { ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(x + 150, yy, 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.font = "30px 'Lilita One'"; ctx.textAlign = 'right'; ctx.fillText(val, x + w - 16, yy + 1);
      ctx.font = '900 18px Nunito'; ctx.textAlign = 'left';
    };
    row('YOU', S.score.me, y + 26, me.kit.shirt, S.server === 'me');
    row('CPU', S.score.cpu, y + 60, cpu.kit.shirt, S.server === 'cpu');
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '800 12px Nunito'; ctx.textAlign = 'center';
    ctx.fillText(`GAME TO ${target} · WIN BY 2`, x + w / 2, y + h + 14);
    if (S.phase === 'serve' || S.phase === 'rally') {
      const srvScore = S.score[S.server], rcv = S.score[S.server === 'me' ? 'cpu' : 'me'];
      ctx.fillStyle = 'rgba(15,23,42,.75)'; rrect(ctx, 1280 - 190, 14, 172, 40, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 16px Nunito';
      ctx.fillText(R.hits > 1 ? `Rally ${R.hits}` : `Score ${srvScore}–${rcv}`, 1280 - 104, 34);
    }
    ctx.restore();

    if (S.phase === 'serve' && S.server === 'me') {
      prompt(ctx, input.touchMode ? 'Tap SERVE · joystick to aim' : 'Press SPACE to serve · ← → to aim', 0.6 + 0.4 * Math.sin(S.t * 5));
    } else if (S.hint) {
      prompt(ctx, S.hint, 1, '#fde68a');
    } else if (S.tipT > 0 && S.phase === 'rally') {
      prompt(ctx, autoSwing ? 'Auto swing is on · press DRIVE or SOFT to choose your shot' : 'Press DRIVE or SOFT as the ball reaches you', Math.min(1, S.tipT));
    }
    if (S.msg && (S.phase === 'point' || S.phase === 'end')) {
      drawBanner(ctx, S.msg, 640, 300, S.t, { size: S.phase === 'end' ? 120 : 92, sub: S.msgSub || null, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
      if (S.msgSub2) { ctx.font = '800 18px Nunito'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 4; ctx.strokeText(S.msgSub2, 640, 400); ctx.fillText(S.msgSub2, 640, 400); }
    }
    if (S.phase === 'intro') drawBanner(ctx, 'READY?', 640, 300, S.t, { size: 110, color: '#a5f3fc', glow: '#0891b2' });
  }
  function prompt(ctx, text, alpha, color = '#fff') {
    ctx.globalAlpha = alpha;
    ctx.font = '800 17px Nunito'; const w = ctx.measureText(text).width + 40;
    ctx.fillStyle = 'rgba(15,23,42,.75)'; rrect(ctx, 640 - w / 2, 640, w, 38, 12); ctx.fill();
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 659);
    ctx.globalAlpha = 1;
  }

  if (env.debug) env.debug({ me, cpu, ball, R, S }); // test hook used by headless simulations
  audio.setCrowd(0.18);
  return { update, draw };
}

// ---------- menu thumbnail ----------
const thumbA = { near: true, x: 0, y: 0, vx: 0, vy: 0, phase: 0, swingT: 0, swingDir: 1, look: { skin: SKINS[1], hair: HAIRS[3], style: 'ponytail' }, kit: { shirt: '#e11d48', shorts: '#0f172a', shoes: '#fff', paddle: '#22d3ee' } };
const thumbB = { near: false, x: 0, y: 0, vx: 0, vy: 0, phase: 0, swingT: 0, swingDir: 1, look: { skin: SKINS[3], hair: HAIRS[0], style: 'short' }, kit: { shirt: '#f59e0b', shorts: '#fff', shoes: '#111', paddle: '#f472b6' } };
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2 - 60 * s); ctx.scale(s * 1.12, s * 1.12); ctx.translate(-70, 0); }
  drawScene(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t);
  const cyc = (t % 2.4) / 1.2; // 0..2: 0-1 near->far, 1-2 far->near
  const k = cyc % 1, toFar = cyc < 1;
  const ax = CW * 0.6 + Math.sin(t) * 0.8, bx = CW * 0.4 + Math.cos(t * 0.8) * 0.8;
  thumbA.x = ax; thumbA.y = CL - 1.5; thumbB.x = bx; thumbB.y = 1.6;
  thumbA.phase = t * 4; thumbB.phase = t * 4; thumbA.vx = Math.cos(t) * 0.8; thumbB.vx = -Math.sin(t * 0.8) * 0.6;
  const from = toFar ? [ax, CL - 1.7] : [bx, 1.8], to = toFar ? [bx, 1.8] : [ax, CL - 1.7];
  const ball = { x: from[0] + (to[0] - from[0]) * k, y: from[1] + (to[1] - from[1]) * k, z: 0.9 + Math.sin(k * Math.PI) * 1.6, trail: null };
  thumbA.swingT = toFar && k < 0.25 ? 0.32 * (1 - k * 4) : 0; thumbB.swingT = !toFar && k < 0.25 ? 0.32 * (1 - k * 4) : 0;
  drawPlayerAt(ctx, thumbB, t);
  if (ball.y < NY) drawBallAt(ctx, ball, t);
  drawNet(ctx);
  if (ball.y >= NY) drawBallAt(ctx, ball, t);
  drawPlayerAt(ctx, thumbA, t);
  ctx.restore();
}

export default {
  id: 'pickleball',
  title: 'Pickleball',
  tagline: 'Dink, drive and lob to victory',
  desc: 'A singles match on a sunny park court with real pickleball rules.',
  music: 'pickleball',
  labels: { a: 'DRIVE', b: 'SOFT' },
  options: [
    { key: 'target', label: 'Game to', default: 0, choices: [{ v: '7', label: '7 points', sub: 'quick' }, { v: '11', label: '11 points', sub: 'standard' }, { v: '15', label: '15 points', sub: 'long' }] },
    { key: 'assist', label: 'Swing', default: 0, choices: [{ v: 'auto', label: 'Auto swing', sub: 'you aim & move' }, { v: 'manual', label: 'Manual', sub: 'time every hit' }] },
  ],
  howto: `<ul>
    <li><b>Move</b>: joystick, or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows. Aim left or right with the joystick as you hit.</li>
    <li><b>DRIVE</b> (<kbd>Space</kbd>): a fast, deep shot. <b>SOFT</b> (<kbd>Shift</kbd>): a dink into the kitchen near the net, or a lob from the back.</li>
    <li><b>Serve</b> diagonally past the kitchen (the zone next to the net).</li>
    <li><b>Two-bounce rule</b>: the return of serve and the next shot must bounce first.</li>
    <li><b>Kitchen</b>: you can't volley (hit before the bounce) while standing in the kitchen.</li>
    <li>Only the server scores. Win by 2. Long rallies, aces and wins earn extra rewards.</li>
  </ul>`,
  create,
  drawThumb,
};
