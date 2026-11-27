// ROBLOC Ambulance: drive the ambulance down the road, switch lanes
// and pick up patients! Cones block lanes — dodge them, or they cost
// you $5. 10 patients per match, +10 points per rescue.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 5, speed: 130 },
  pro: { target: 6, speed: 150 },
  legend: { target: 7, speed: 170 },
  boost: { target: 4, speed: 115 },   // Trevor: easy game, slow traffic
  tough: { target: 8, speed: 195 },   // others: hard game, fast traffic
};
const LANES = [410, 640, 870];
const AMB_Y = 580;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function drawRoad(ctx, view, t) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#0f766e'); bg.addColorStop(1, '#134e4a');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  ctx.fillStyle = '#f8fafc'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🚑 AMBULANCE 🚑', 640, 70);
  // road
  ctx.fillStyle = '#334155'; rrect(ctx, 320, 100, 640, 600, 20); ctx.fill();
  // lane dashes (scrolling, so it feels like driving)
  ctx.fillStyle = '#facc15';
  const off = (t * 140) % 60;
  for (let y = 100 + off - 60; y < 700; y += 60) {
    ctx.fillRect(540 - 5, y, 10, 34);
    ctx.fillRect(740 - 5, y, 10, 34);
  }
  // grass + houses on the sides
  ctx.font = '44px serif'; ctx.textAlign = 'center';
  ctx.fillText('🏠', 200, 220); ctx.fillText('🌳', 200, 420); ctx.fillText('🏥', 1080, 300); ctx.fillText('🌳', 1080, 520);
}
function drawAmbulance(ctx, x, y, laneT) {
  ctx.save(); ctx.translate(x, y);
  ctx.rotate(Math.sin(laneT * 10) * 0.04);
  ctx.font = '72px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🚑', 0, 0);
  ctx.restore();
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = traffic moves slower, Power = cones cannot hurt you.
  const SPEED = D.speed * (options.power === 'speed' ? 0.7 : 1);
  const SHIELD = options.power === 'power';
  const S = { phase: 'intro', t: 0, swayT: 0, lane: 1, laneT: 0, items: [], queue: buildQueue(), spawnT: 0, rescued: 0, missed: 0, points: 0, conesHit: 0, mxPrev: 0, msg: null, msgT: 0, msgColor: '#fff', reported: false };
  let hits = [];

  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function buildQueue() {
    const q = [];
    for (let i = 0; i < 10; i++) q.push('patient');
    for (let i = 0; i < 7; i++) q.push('cone');
    // shuffle
    for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
    return q;
  }
  function moveLane(d) {
    const next = clamp(S.lane + d, 0, 2);
    if (next !== S.lane) { S.lane = next; S.laneT = 0; audio.play('tick'); }
  }
  function pickup() {
    if (S.phase !== 'aim') return;
    const p = S.items.find(it => it.kind === 'patient' && it.lane === S.lane && it.y > 480 && it.y < 680);
    if (p) {
      S.items = S.items.filter(it => it !== p);
      S.rescued++; S.points += 10;
      say('RESCUED! +10', '#a3e635'); audio.play('point'); fx.confetti(LANES[S.lane], AMB_Y, 40);
    } else {
      say('No patient here!', '#fca5a5'); audio.play('tick');
    }
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.rescued >= D.target;
    say(win ? 'HERO DRIVER!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.rescued >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.rescued} RESCUED · GOAL ${D.target}`,
      stats: [`Rescued: <b>${S.rescued}</b>`, `Points: <b>${S.points}</b>`, `Cones hit: <b>${S.conesHit}</b>`],
      match: { game: 'ambulance', difficulty: options.difficulty, won: win, rescued: S.rescued, points: S.points },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt; S.swayT += dt; S.laneT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'amb') { S.labelKey = 'amb'; input.setLabels('PICK UP!', 'PICK UP!'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') {
      if (S.t > 1.5) { S.phase = 'aim'; S.t = 0; S.spawnT = 0; }
      return;
    }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'aim') {
      // joystick left / right switches lanes (edge-triggered)
      if (input.mx < -0.6 && S.mxPrev >= -0.6) moveLane(-1);
      if (input.mx > 0.6 && S.mxPrev <= 0.6) moveLane(1);
      S.mxPrev = input.mx || 0;
      if (input.a.pressed || input.b.pressed) pickup();
      // spawn the next patient or cone
      S.spawnT += dt;
      if (S.spawnT > 1.4 && S.queue.length) {
        S.spawnT = 0;
        const kind = S.queue.shift();
        S.items.push({ kind, lane: Math.floor(Math.random() * 3), y: 110, hit: false });
      }
      // traffic drives down the road
      for (const it of S.items) it.y += SPEED * dt;
      for (const it of [...S.items]) {
        if (it.kind === 'cone' && !it.hit && it.y >= AMB_Y && it.lane === S.lane) {
          it.hit = true;
          if (SHIELD) { say('SHIELD! Cone blocked!', '#fde68a'); audio.play('badge'); }
          else { S.points = Math.max(0, S.points - 5); S.conesHit++; say('OUCH! CONE! -5', '#fca5a5'); audio.play('aww'); }
        }
        if (it.y > 720) {
          S.items = S.items.filter(x => x !== it);
          if (it.kind === 'patient') { S.missed++; say('Missed a patient!', '#fca5a5'); }
        }
      }
      if (S.rescued + S.missed >= 10) endGame();
    }
  }

  function draw(ctx, view) {
    hits = [];
    drawRoad(ctx, view, S.swayT);
    // pickup zone glow
    ctx.fillStyle = 'rgba(74,222,128,.18)';
    rrect(ctx, LANES[S.lane] - 95, 480, 190, 200, 16); ctx.fill();
    // patients and cones
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const it of S.items) {
      ctx.font = it.kind === 'patient' ? '56px serif' : '52px serif';
      ctx.fillText(it.kind === 'patient' ? '🤕' : '🚧', LANES[it.lane], it.y);
      if (it.kind === 'patient' && it.lane === S.lane && it.y > 480 && it.y < 680) {
        ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(LANES[it.lane], it.y, 42, 0, Math.PI * 2); ctx.stroke();
      }
    }
    drawAmbulance(ctx, LANES[S.lane], AMB_Y, S.laneT);
    // tap a lane to drive into it
    for (let l = 0; l < 3; l++) {
      hit(LANES[l] - 95, 100, 190, 600, () => { if (S.phase === 'aim' && S.lane !== l) { S.lane = l; S.laneT = 0; audio.play('tick'); } });
    }
    // LEFT / RIGHT arrows
    ctx.fillStyle = '#0ea5e9'; rrect(ctx, 180, 500, 110, 90, 18); ctx.fill();
    ctx.fillStyle = '#0ea5e9'; rrect(ctx, 990, 500, 110, 90, 18); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "48px 'Lilita One'";
    ctx.fillText('◀', 235, 546); ctx.fillText('▶', 1045, 546);
    hit(180, 500, 110, 90, () => moveLane(-1));
    hit(990, 500, 110, 90, () => moveLane(1));
    // PICK UP! button
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready ? '#16a34a' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "34px 'Lilita One'"; ctx.fillText('PICK UP!', 1110, 322);
    hit(990, 260, 240, 120, () => pickup());
    // HUD
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 40, 60, 260, 150, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Rescued: ${S.rescued} / 10`, 62, 92);
    ctx.fillText(`Points: ${S.points}  (goal ${D.target})`, 62, 122);
    ctx.fillText(`Cones hit: ${S.conesHit}`, 62, 152);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.rescued + S.missed === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = input.touchMode ? 'Tap a lane to drive · tap PICK UP! to rescue' : 'Use ← → to switch lanes · SPACE to pick up';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 480, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 480, S.t, { size: 100, sub: `${S.rescued} patients rescued`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'DRIVE THE AMBULANCE!', 640, 480, S.t, { size: 88, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__ambulance = { S, pickup };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  drawRoad(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t);
  ctx.font = '56px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🤕', 410, 300 + Math.sin(t * 2) * 10);
  ctx.fillText('🚧', 870, 420);
  drawAmbulance(ctx, 640, 580, t);
  ctx.restore();
}

export default {
  id: 'ambulance',
  title: 'Ambulance',
  tagline: 'Drive fast, rescue patients, dodge the cones',
  desc: 'The ambulance races down the road! Patients wait in the lanes — switch lanes and tap PICK UP! to rescue them. Cones block the way: hit one and you lose 5 points. Rescue 10 patients per match.',
  music: 'menu',
  labels: { a: 'PICK UP!', b: 'PICK UP!' },
  options: [],
  howto: `<ul>
    <li><b>Switch lanes</b>: tap ◀ ▶, tap a lane, or use ← → / the joystick.</li>
    <li><b>PICK UP!</b> (tap it or press <kbd>Space</kbd>): rescue the patient in your lane when they are in the green zone.</li>
    <li>Each rescue is +10 points. A cone in your lane costs −5 points — dodge it!</li>
    <li>10 patients per match. Rescue enough to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
