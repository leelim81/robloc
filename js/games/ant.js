// ROBLOC Ant: crumbs fall from the sky! Move the little ant left and
// right, walk into crumbs — or tap COLLECT! to grab the nearest one.
// 10 crumbs per match, +10 points each.
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';

const DIFF = {
  rookie: { target: 5, fall: 120, speed: 280 },
  pro: { target: 6, fall: 135, speed: 280 },
  legend: { target: 7, fall: 150, speed: 280 },
  boost: { target: 4, fall: 100, speed: 340 },   // Trevor: easy game, slow crumbs, fast ant
  tough: { target: 8, fall: 170, speed: 230 },   // others: hard game, fast crumbs, slow ant
};
const GROUND_Y = 640;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function drawField(ctx, view, t) {
  const x0 = -view.ox, y0 = -view.oy;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + view.H);
  bg.addColorStop(0, '#fef9c3'); bg.addColorStop(1, '#fde68a');
  ctx.fillStyle = bg; ctx.fillRect(x0, y0, view.W, view.H);
  ctx.fillStyle = '#f8fafc'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🐜 ANT 🐜', 640, 70);
  // sun + clouds
  ctx.font = '56px serif'; ctx.fillText('☀️', 1120, 130);
  ctx.font = '44px serif'; ctx.fillText('☁️', 220 + Math.sin(t * 0.3) * 20, 140); ctx.fillText('☁️', 900 + Math.cos(t * 0.25) * 20, 110);
  // grass + dirt
  ctx.fillStyle = '#16a34a'; ctx.fillRect(x0, 620, view.W, 100);
  ctx.fillStyle = '#92400e'; ctx.fillRect(x0, 660, view.W, 60);
  // flowers
  ctx.font = '36px serif';
  ctx.fillText('🌼', 180, 640); ctx.fillText('🌸', 1080, 640); ctx.fillText('🌼', 700, 645);
  // ant hill
  ctx.fillStyle = '#78350f';
  ctx.beginPath(); ctx.moveTo(1200, 660); ctx.lineTo(1240, 620); ctx.lineTo(1280, 660); ctx.closePath(); ctx.fill();
}
function drawAnt(ctx, x, y, moving, t) {
  ctx.save(); ctx.translate(x, y);
  if (moving) ctx.rotate(Math.sin(t * 14) * 0.06);
  ctx.font = '60px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🐜', 0, 0);
  ctx.restore();
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = the ant runs 50% faster, Power = bigger grab.
  const ANT_SPEED = D.speed * (options.power === 'speed' ? 1.5 : 1);
  const GRAB_R = options.power === 'power' ? 210 : 150;
  const S = { phase: 'intro', t: 0, swayT: 0, antX: 640, antTarget: null, crumbs: [], spawnT: 0, spawned: 0, collected: 0, points: 0, moving: false, grabT: 0, msg: null, msgT: 0, msgColor: '#fff', reported: false };
  let hits = [];

  const say = (msg, color = '#fff') => { S.msg = msg; S.msgColor = color; S.msgT = 0; };
  function collectCrumb(c, how) {
    S.crumbs = S.crumbs.filter(x => x !== c);
    S.collected++; S.points += 10;
    say(how === 'grab' ? 'GRABBED! +10' : 'YUM! +10', '#a3e635');
    audio.play('point'); fx.confetti(c.x, c.y, 30);
  }
  function collect() {
    if (S.phase !== 'aim') return;
    S.grabT = 0;
    // grab the nearest crumb within reach
    let best = null, bestD = GRAB_R;
    for (const c of S.crumbs) {
      const d = Math.abs(c.x - S.antX);
      if (d < bestD) { best = c; bestD = d; }
    }
    if (best) collectCrumb(best, 'grab');
    else { say('Too far! Walk closer!', '#fca5a5'); audio.play('tick'); }
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const win = S.collected >= D.target;
    say(win ? 'CRUMB CHAMP!' : 'GAME OVER', win ? '#fde68a' : '#cbd5e1');
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
  }
  function report() {
    const win = S.collected >= D.target;
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${S.collected} CRUMBS · GOAL ${D.target}`,
      stats: [`Crumbs: <b>${S.collected}</b>`, `Points: <b>${S.points}</b>`, `Crumbs dropped: <b>10</b>`],
      match: { game: 'ant', difficulty: options.difficulty, won: win, crumbs: S.collected, points: S.points },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt; S.swayT += dt; S.grabT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'ant') { S.labelKey = 'ant'; input.setLabels('COLLECT!', 'COLLECT!'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.5) { S.phase = 'aim'; S.t = 0; S.spawnT = 0; } return; }
    if (S.phase === 'end') { if (!S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'aim') {
      // move the ant: joystick, or tap somewhere to walk there
      S.moving = false;
      if (input.mx) { S.antX = clamp(S.antX + input.mx * ANT_SPEED * dt, 90, 1190); S.antTarget = null; S.moving = true; }
      else if (S.antTarget !== null) {
        const dx = S.antTarget - S.antX;
        if (Math.abs(dx) > 6) { S.antX = clamp(S.antX + Math.sign(dx) * ANT_SPEED * dt, 90, 1190); S.moving = true; }
        else S.antTarget = null;
      }
      if (input.a.pressed || input.b.pressed) collect();
      // drop a new crumb every 1.7s, 10 per match
      S.spawnT += dt;
      if (S.spawnT > 1.7 && S.spawned < 10) {
        S.spawnT = 0; S.spawned++;
        S.crumbs.push({ x: 200 + Math.random() * 880, y: 110, vy: D.fall, drift: Math.random() * Math.PI * 2, landed: false, landT: 0 });
      }
      // crumbs fall, drift side to side, then sit on the ground
      for (const c of [...S.crumbs]) {
        if (!c.landed) {
          c.y += c.vy * dt;
          c.x = clamp(c.x + Math.sin(S.swayT * 1.5 + c.drift) * 40 * dt, 90, 1190);
          if (c.y >= GROUND_Y - 10) { c.y = GROUND_Y - 10; c.landed = true; c.landT = 0; }
        } else {
          c.landT += dt;
          if (c.landT > 3.5) { S.crumbs = S.crumbs.filter(x => x !== c); say('A crumb blew away!', '#fca5a5'); }
        }
        // walk into a crumb to pick it up
        if (Math.abs(c.x - S.antX) < 55 && Math.abs(c.y - (GROUND_Y - 10)) < 60) collectCrumb(c, 'walk');
      }
      if (S.spawned >= 10 && S.crumbs.length === 0) endGame();
    }
  }

  function draw(ctx, view) {
    hits = [];
    drawField(ctx, view, S.swayT);
    // crumbs
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const c of S.crumbs) {
      const alpha = c.landed ? Math.max(0.3, 1 - c.landT / 3.5) : 1;
      ctx.globalAlpha = alpha;
      ctx.font = '44px serif'; ctx.fillText('🍪', c.x, c.y);
      ctx.globalAlpha = 1;
    }
    drawAnt(ctx, S.antX, GROUND_Y - 10, S.moving, S.swayT);
    // grab flash
    if (S.grabT < 0.35) {
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(S.antX, GROUND_Y - 10, 40 + S.grabT * 120, 0, Math.PI * 2); ctx.stroke();
    }
    // tap the field to walk there
    hit(90, 100, 1100, 560, t => { if (S.phase === 'aim') { S.antTarget = clamp(t.x, 90, 1190); audio.play('tick'); } });
    // COLLECT! button
    const ready = S.phase === 'aim';
    ctx.fillStyle = ready ? '#16a34a' : '#475569'; rrect(ctx, 990, 260, 240, 120, 26); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, 990, 260, 240, 60, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "34px 'Lilita One'"; ctx.fillText('COLLECT!', 1110, 322);
    hit(990, 260, 240, 120, () => collect());
    // HUD
    ctx.fillStyle = 'rgba(15,23,42,.85)'; rrect(ctx, 40, 60, 260, 150, 18); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 18px Nunito';
    ctx.fillText(`Crumbs: ${S.collected} / 10`, 62, 92);
    ctx.fillText(`Points: ${S.points}  (goal ${D.target})`, 62, 122);
    ctx.fillText(`Dropped: ${S.spawned} / 10`, 62, 152);
    fx.draw(ctx);
    if (S.phase === 'aim' && S.spawned === 0 && S.t < 5) {
      ctx.font = '800 17px Nunito'; const text = input.touchMode ? 'Tap to walk · walk into a crumb to eat it!' : 'Use ← → to walk · SPACE to collect';
      const w = ctx.measureText(text).width + 40;
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 8, w, 34, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 25);
    }
    if (S.msg && S.msgT < 1.8 && S.phase !== 'end') drawBanner(ctx, S.msg, 640, 480, S.msgT, { size: 56, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 480, S.t, { size: 100, sub: `${S.collected} crumbs collected`, color: S.msgColor, glow: '#db2777' });
    if (S.phase === 'intro') drawBanner(ctx, 'CATCH THE CRUMBS!', 640, 480, S.t, { size: 96, color: '#fde68a', glow: '#b45309' });
  }
  const hit = (x, y, w, h, fn) => hits.push({ x, y, w, h, fn });

  if (typeof window !== 'undefined') window.__ant = { S, collect };
  audio.setCrowd(0.12);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  drawField(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t);
  ctx.font = '44px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🍪', 500, 220 + Math.sin(t * 2) * 12);
  ctx.fillText('🍪', 800, 320);
  drawAnt(ctx, 640, GROUND_Y - 10, true, t);
  ctx.restore();
}

export default {
  id: 'ant',
  title: 'Ant',
  tagline: 'Catch the falling crumbs',
  desc: 'Crumbs fall from the sky and drift side to side! Move the little ant left and right, walk into a crumb to eat it — or tap COLLECT! to grab the nearest one. 10 crumbs per match.',
  music: 'menu',
  labels: { a: 'COLLECT!', b: 'COLLECT!' },
  options: [],
  howto: `<ul>
    <li><b>Move</b>: use ← → / the joystick, or tap where you want the ant to walk.</li>
    <li><b>Walk into a crumb</b> to eat it — or tap <b>COLLECT!</b> to grab the nearest crumb.</li>
    <li>Each crumb is +10 points. Crumbs sitting on the ground blow away after a while!</li>
    <li>10 crumbs per match. Eat enough to reach the goal and win.</li>
  </ul>`,
  create,
  drawThumb,
};
