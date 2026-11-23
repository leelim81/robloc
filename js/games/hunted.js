// ROBLOC Hunted: go to people's houses and collect sweets — don't get
// caught! Trevor's notes: Trevor starts from $8,788.37 in Hunted cash
// and 3740 Hunted points, everyone else starts from zero; only one game
// — collect sweets. How to play: go to people's houses and collect
// sweets, don't get caught, and beat the Candy Boss. SNEAK: you need to
// sneak in — when the ghost is LOOKING at you, FREEZE (don't move!),
// when he turns away, RUN. If you move while he's looking, he catches
// you. Shh!
import { rrect } from '../art.js';

const LOOK_TIME = 2.0;   // the ghost watches you for 2s — FREEZE!
const TURN_TIME = 3.0;   // the ghost turns away for 3s — RUN!

const DIFF = {
  rookie: { time: 60, target: 8, ghost: 150, boss: 200 },
  pro: { time: 50, target: 12, ghost: 175, boss: 225 },
  legend: { time: 40, target: 16, ghost: 200, boss: 250 },
  boost: { time: 75, target: 8, ghost: 140, boss: 190 },   // win-chance matches
};
const SWEET_KINDS = [
  { icon: '🍬', value: 100 },   // $1.00
  { icon: '🍭', value: 200 },   // $2.00
  { icon: '🍫', value: 300 },   // $3.00
  { icon: '🧁', value: 500 },   // $5.00
  { icon: '🍩', value: 400 },   // $4.00
];
const HOUSES = [
  { x: 180, y: 200, w: 120, h: 90 },
  { x: 980, y: 200, w: 120, h: 90 },
  { x: 180, y: 520, w: 120, h: 90 },
  { x: 980, y: 520, w: 120, h: 90 },
];
const MAX_SWEETS = 6;
const BOSS_SPAWN_SWEETS = 4;   // the Candy Boss appears after 4 sweets
const BOSS_HP = 100;
const BOSS_HIT = 25;           // each sweet you grab hurts the boss
const PLAYER_SPEED = 280;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const money = cents => '$' + (cents / 100).toFixed(2);

function create(env) {
  const { input, audio, fx, options, profile } = env;
  const D = options.boost ? DIFF.boost : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = move 50% faster, Power = the ghost runs away
  // from you (you scare it!) instead of chasing you.
  const SPD = options.power === 'speed' ? 1.5 : 1;
  const SCARE = options.power === 'power';
  const hunted = (profile && profile.stats && profile.stats.hunted) || {};
  const startCash = hunted.cashCents || 0;
  const startPoints = hunted.points || 0;
  const S = {
    phase: 'intro', t: 0, timeLeft: D.time,
    px: 640, py: 360, tx: null, ty: null,
    gx: 120, gy: 120, hearts: 3, invT: 0,
    // sneak: the ghost watches, then turns away. When he's LOOKING and
    // you move, he catches you. When he's turned away, run!
    looking: false, lookT: TURN_TIME, lookAge: 0,
    sweets: 0, cashEarned: 0, cash: startCash,
    boss: { active: false, beaten: false, x: 640, y: 140, hp: BOSS_HP },
    msg: null, msgT: 0, won: false, reported: false,
  };
  let hits = [];
  let sweets = [];
  const say = msg => { S.msg = msg; S.msgT = 0; };
  function spawnSweet() {
    const kind = SWEET_KINDS[Math.floor(Math.random() * SWEET_KINDS.length)];
    // sweets appear at a house — go to people's houses to collect them
    const house = HOUSES[Math.floor(Math.random() * HOUSES.length)];
    let x, y, tries = 0;
    do {
      x = clamp(house.x + rand(-70, house.w + 70), 70, 1210);
      y = clamp(house.y + rand(-40, house.h + 60), 130, 660);
      tries++;
    } while (tries < 20 && (dist(x, y, S.px, S.py) < 110 || dist(x, y, S.gx, S.gy) < 110));
    sweets.push({ x, y, kind, bob: rand(0, 6) });
  }
  for (let i = 0; i < MAX_SWEETS; i++) spawnSweet();
  // Test hook: lets a Playwright test read the live sweet positions so
  // it can tap on them (a test cannot see the canvas the way a player
  // can). Harmless in the real game.
  if (typeof window !== 'undefined') window.__hunted = { S, sweets: () => sweets };

  function endRun(win) {
    if (S.phase === 'end') return;
    S.phase = 'end'; S.t = 0; S.won = win;
    say(win ? 'YOU DID IT! 🎉' : (S.hearts <= 0 ? 'THE GHOST GOT YOU! 👻' : "TIME'S UP!"));
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
    else audio.play('lose');
  }
  function report() {
    const win = S.won;
    const used = Math.round(D.time - S.timeLeft);
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${win ? '🍬 ' : ''}${S.sweets} sweets · ${money(S.cashEarned)}${S.boss.beaten ? ' · 👑 Boss beaten!' : ''} · ${used}s`,
      stats: [`Sweets: <b>${S.sweets}</b>`, `Hunted cash: <b>${money(S.cash)}</b>`, `Candy Boss: <b>${S.boss.beaten ? 'Beaten! 👑' : 'Not beaten'}</b>`, `Time: <b>${used}s / ${D.time}s</b>`],
      match: { game: 'hunted', difficulty: options.difficulty, won: win, sweets: S.sweets, cashEarned: S.cashEarned, cashCents: S.cash, bossBeaten: S.boss.beaten, timeLeft: Math.max(0, Math.round(S.timeLeft)), timeUsed: used },
    });
  }

  function hurtPlayer(fromX, fromY) {
    if (S.invT > 0) return;
    S.hearts--;
    S.invT = 2;
    audio.play('thud', { power: 0.7 });
    fx.shake(8);
    say(S.hearts > 0 ? 'Caught! 👻' : 'Caught!');
    if (S.hearts <= 0) { endRun(false); return; }
  }

  function update(dt) {
    S.t += dt; S.msgT += dt;
    if (S.invT > 0) S.invT -= dt;
    input.setTapMode(true);
    if (S.labelKey !== 'hunted') { S.labelKey = 'hunted'; input.setLabels('▲ UP', '▼ DOWN'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.2) { S.phase = 'go'; S.t = 0; say('GO! Visit the houses! 🍬'); } return; }
    if (S.phase === 'end') { if (S.t > 2.4 && !S.reported) { S.reported = true; report(); } return; }

    S.timeLeft -= dt;
    if (S.timeLeft <= 0) { S.timeLeft = 0; endRun(S.sweets >= D.target); return; }

    // --- player movement: joystick/arrows, tap-to-move, or the D-pad.
    // When the ghost is LOOKING you freeze — no moving at all. (With
    // Power the ghost runs away and isn't watching, so you move freely.)
    let mx = 0, my = 0;
    if (!S.looking || SCARE) {
      mx = input.mx; my = input.my;
      if (input.a.pressed) { my = -1; mx = 0; }
      if (input.b.pressed) { my = 1; mx = 0; }
      if (S.padDir) { const d = S.padDir; S.padDir = null; mx = d[0]; my = d[1]; S.tx = null; S.ty = null; }
    } else {
      S.padDir = null;
    }
    if (mx || my) {
      const len = Math.hypot(mx, my) || 1;
      S.px = clamp(S.px + (mx / len) * PLAYER_SPEED * SPD * dt, 50, 1230);
      S.py = clamp(S.py + (my / len) * PLAYER_SPEED * SPD * dt, 110, 680);
      S.tx = null; S.ty = null;
    } else if (S.tx != null) {
      const dx = S.tx - S.px, dy = S.ty - S.py;
      const d = Math.hypot(dx, dy);
      const step = PLAYER_SPEED * SPD * dt;
      if (d <= step) { S.px = S.tx; S.py = S.ty; S.tx = null; S.ty = null; }
      else { S.px += (dx / d) * step; S.py += (dy / d) * step; }
    }

    // --- collect sweets (they appear at the houses) ---
    for (const sw of sweets) {
      if (sw.taken) continue;
      if (dist(S.px, S.py, sw.x, sw.y) < 55) {
        sw.taken = true;
        S.sweets++;
        S.cashEarned += sw.kind.value;
        S.cash += sw.kind.value;
        audio.play('coin');
        fx.text('+' + money(sw.kind.value), sw.x, sw.y - 20, { color: '#fde68a', size: 26 });
        fx.sparks(sw.x, sw.y, 10, '#fbbf24');
        setTimeout(() => { sweets = sweets.filter(s => s !== sw); if (S.phase === 'go') spawnSweet(); }, 400);
        // every sweet hurts the Candy Boss
        const B = S.boss;
        if (B.active && !B.beaten) {
          B.hp -= BOSS_HIT;
          if (B.hp <= 0) {
            B.hp = 0; B.beaten = true; B.active = false;
            S.cashEarned += 1000; S.cash += 1000;
            audio.cheer(1.2);
            fx.sparks(B.x, B.y, 24, '#f472b6');
            fx.text('BOSS BEATEN! +$10.00 👑', B.x, B.y - 50, { color: '#f9a8d4', size: 30 });
            say('You beat the Candy Boss! 👑');
          }
        }
        // the Candy Boss appears after 4 sweets
        if (!B.active && !B.beaten && S.sweets >= BOSS_SPAWN_SWEETS) {
          B.active = true; B.x = 640; B.y = 140; B.hp = BOSS_HP;
          say('The Candy Boss is here! 🍭');
          audio.play('thud', { power: 0.9 });
        }
        if (S.sweets >= D.target) { endRun(true); return; }
      }
    }

    // --- SNEAK: the ghost watches, then turns away. When he's LOOKING
    // he has a TRIANGLE (his view) in front of him — if you are inside
    // that triangle, he catches you. When he turns away, RUN! (Shh!) ---
    S.lookT -= dt;
    if (S.lookT <= 0) {
      S.looking = !S.looking;
      S.lookT = S.looking ? LOOK_TIME : TURN_TIME;
      S.lookAge = 0;
      if (S.looking) say('👀 He\'s looking! FREEZE! Shh!');
      else say('He turned away — RUN! 🏃');
    }
    S.lookAge += dt;
    // While he's LOOKING you freeze in place (no moving at all).
    if (S.looking && !SCARE) { S.tx = null; S.ty = null; S.padDir = null; }
    // The triangle: apex at the ghost, spread in the direction he faces
    // (toward you when he's looking). If you are inside it while he's
    // looking, he catches you.
    if (S.looking && !SCARE && S.invT <= 0) {
      const gAng = Math.atan2(S.py - S.gy, S.px - S.gx);
      const R = 260, A = 0.5;
      const ax = S.gx, ay = S.gy;
      const bx = S.gx + Math.cos(gAng - A) * R, by = S.gy + Math.sin(gAng - A) * R;
      const cx = S.gx + Math.cos(gAng + A) * R, cy = S.gy + Math.sin(gAng + A) * R;
      // point-in-triangle (barycentric): is the player inside the view?
      const v0x = cx - ax, v0y = cy - ay;
      const v1x = bx - ax, v1y = by - ay;
      const v2x = S.px - ax, v2y = S.py - ay;
      const d00 = v0x * v0x + v0y * v0y, d01 = v0x * v1x + v0y * v1y;
      const d02 = v0x * v2x + v0y * v2y, d11 = v1x * v1x + v1y * v1y;
      const d12 = v1x * v2x + v1y * v2y;
      const den = d00 * d11 - d01 * d01 || 1;
      const u = (d11 * d02 - d01 * d12) / den;
      const v = (d00 * d12 - d01 * d02) / den;
      const inTri = u >= 0 && v >= 0 && (u + v) <= 1;
      if (inTri) {
        hurtPlayer(S.gx, S.gy);
        if (S.phase !== 'end') {
          S.gx = S.px > 640 ? 90 : 1190;
          S.gy = S.py > 400 ? 140 : 640;
        }
        if (S.phase === 'end') return;
      }
    }

    // --- the ghost chases you when he's turned away (or runs away
    // when you have Power). When he's LOOKING he stands and watches.
    const gdx = S.px - S.gx, gdy = S.py - S.gy;
    const gd = Math.hypot(gdx, gdy) || 1;
    const dir = SCARE ? -1 : 1;
    const gs = D.ghost * (SCARE ? 0.9 : 1);
    if (!S.looking || SCARE) {
      S.gx = clamp(S.gx + (gdx / gd) * dir * gs * dt, 50, 1230);
      S.gy = clamp(S.gy + (gdy / gd) * dir * gs * dt, 110, 680);
    }
    if (!SCARE && S.invT <= 0 && dist(S.px, S.py, S.gx, S.gy) < 46) {
      hurtPlayer(S.gx, S.gy);
      if (S.phase !== 'end') {
        // the ghost vanishes to a far corner and hunts again
        S.gx = S.px > 640 ? 90 : 1190;
        S.gy = S.py > 400 ? 140 : 640;
      }
      if (S.phase === 'end') return;
    }

    // --- the Candy Boss chases you too (faster!) ---
    const B = S.boss;
    if (B.active && !B.beaten) {
      const bdx = S.px - B.x, bdy = S.py - B.y;
      const bd = Math.hypot(bdx, bdy) || 1;
      const bs = D.boss * (SCARE ? 0.9 : 1);
      B.x = clamp(B.x + (bdx / bd) * (SCARE ? -1 : 1) * bs * dt, 50, 1230);
      B.y = clamp(B.y + (bdy / bd) * (SCARE ? -1 : 1) * bs * dt, 110, 680);
      if (!SCARE && S.invT <= 0 && dist(S.px, S.py, B.x, B.y) < 58) {
        hurtPlayer(B.x, B.y);
        if (S.phase !== 'end') { B.x = S.px > 640 ? 90 : 1190; B.y = S.py > 400 ? 140 : 640; }
        if (S.phase === 'end') return;
      }
    }
  }

  function drawHouse(ctx, h) {
    // a little house: walls, roof, door, window
    ctx.fillStyle = '#b45309'; rrect(ctx, h.x, h.y, h.w, h.h, 6); ctx.fill();
    ctx.fillStyle = '#7c2d12';
    ctx.beginPath();
    ctx.moveTo(h.x - 10, h.y); ctx.lineTo(h.x + h.w / 2, h.y - 44); ctx.lineTo(h.x + h.w + 10, h.y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#451a03'; rrect(ctx, h.x + h.w / 2 - 14, h.y + h.h - 42, 28, 42, 4); ctx.fill();
    ctx.fillStyle = '#fef08a'; rrect(ctx, h.x + 14, h.y + 16, 26, 26, 4); ctx.fill();
    ctx.fillStyle = '#fef08a'; rrect(ctx, h.x + h.w - 40, h.y + 16, 26, 26, 4); ctx.fill();
  }

  function draw(ctx, view) {
    hits = [];
    const t = S.t;
    // night sky background with stars
    const bg = ctx.createLinearGradient(0, 0, 0, view.H);
    bg.addColorStop(0, '#0f172a'); bg.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bg; ctx.fillRect(-view.ox, -view.oy, view.W, view.H);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 173) % 1280, sy = (i * 97) % 110;
      ctx.fillRect(sx, sy, 2, 2);
    }
    // moon
    ctx.fillStyle = '#fef9c3'; ctx.beginPath(); ctx.arc(1180, 60, 26, 0, Math.PI * 2); ctx.fill();
    // houses
    for (const h of HOUSES) drawHouse(ctx, h);
    // HUD: timer + sweets/target + hearts + Hunted cash
    const low = S.timeLeft <= 10 && S.phase === 'go';
    ctx.fillStyle = 'rgba(15,23,42,.75)'; rrect(ctx, 40, 24, 700, 46, 12); ctx.fill();
    ctx.font = "900 24px Nunito"; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = low && Math.floor(t * 4) % 2 === 0 ? '#f87171' : '#fff';
    ctx.fillText(`⏱️ ${Math.ceil(S.timeLeft)}s`, 56, 47);
    ctx.fillStyle = '#fff';
    ctx.fillText(`🍬 ${S.sweets} / ${D.target}`, 200, 47);
    ctx.fillText('❤️'.repeat(Math.max(0, S.hearts)) + '🖤'.repeat(Math.max(0, 3 - S.hearts)), 370, 47);
    ctx.textAlign = 'right';
    ctx.fillText(`💰 ${money(S.cash)}`, 724, 47);
    // Hunted points (Trevor starts at 3740, everyone else at 0)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fde68a';
    ctx.font = "900 20px Nunito";
    ctx.fillText(`⭐ Hunted points: ${startPoints + S.sweets * 8}`, 56, 92);
    if (S.boss.active && !S.boss.beaten) {
      ctx.fillStyle = '#f9a8d4';
      ctx.fillText(`🍭 Candy Boss: ${S.boss.hp} HP`, 340, 92);
    }
    // sweets
    for (const sw of sweets) {
      if (sw.taken) continue;
      ctx.font = '38px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(sw.kind.icon, sw.x, sw.y + Math.sin(t * 3 + sw.bob) * 3);
    }
    // ghost — when he's LOOKING he has a TRIANGLE (his view) in front
    // of him. If you are inside the triangle, he catches you. When
    // he's turned away he faces away. With Power he runs from you.
    const gAng = Math.atan2(S.py - S.gy, S.px - S.gx);
    if (S.looking && !SCARE) {
      // the triangle: apex at the ghost, base 260px out, spread ±0.5
      const R = 260, A = 0.5;
      const bx = S.gx + Math.cos(gAng - A) * R, by = S.gy + Math.sin(gAng - A) * R;
      const cx = S.gx + Math.cos(gAng + A) * R, cy = S.gy + Math.sin(gAng + A) * R;
      ctx.fillStyle = 'rgba(248,113,113,.22)';
      ctx.beginPath();
      ctx.moveTo(S.gx, S.gy); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(248,113,113,.8)'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(S.gx, S.gy); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = 'rgba(248,113,113,.9)';
      ctx.font = "900 26px Nunito"; ctx.textAlign = 'center';
      ctx.fillText('👀 FREEZE! Shh! (don\'t be in the triangle!)', 640, 130);
    } else if (S.phase === 'go') {
      ctx.fillStyle = 'rgba(74,222,128,.9)';
      ctx.font = "900 26px Nunito"; ctx.textAlign = 'center';
      ctx.fillText('🏃 GO! He turned away!', 640, 130);
    }
    ctx.font = '52px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(SCARE ? '😱' : (S.looking ? '👀' : '👻'), S.gx, S.gy + Math.sin(t * 4) * 4);
    // Candy Boss
    const B = S.boss;
    if (B.active && !B.beaten) {
      ctx.font = '68px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
      ctx.fillText(SCARE ? '😱' : '🍭', B.x, B.y + Math.sin(t * 3) * 4);
      // boss HP bar
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, B.x - 40, B.y - 58, 80, 10, 5); ctx.fill();
      ctx.fillStyle = '#ec4899'; rrect(ctx, B.x - 40, B.y - 58, 80 * (B.hp / BOSS_HP), 10, 5); ctx.fill();
    }
    // player (blinks while invincible)
    if (!(S.invT > 0 && Math.floor(t * 8) % 2 === 0)) {
      ctx.font = '44px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
      ctx.fillText('🧒', S.px, S.py + Math.sin(t * 5) * 2);
    }
    fx.draw(ctx);
    // D-pad (right side): tap a direction to run that way.
    // Push the tap-to-move area FIRST so the D-pad (pushed after it) is
    // checked first — hits are read in reverse, and the big tap area
    // would otherwise swallow every D-pad tap.
    if (S.phase === 'go') {
      hits.push({
        x: 0, y: 100, w: 1280, h: 620,
        fn: t2 => { S.tx = clamp(t2.x, 50, 1230); S.ty = clamp(t2.y, 110, 680); },
      });
      const bx = 1120, by = 400, s = 74, g = 10;
      const btn = (x, y, label, dir) => {
        ctx.fillStyle = 'rgba(255,255,255,.22)'; rrect(ctx, x, y, s, s, 14); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = "900 34px Nunito";
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, x + s / 2, y + s / 2 + 2);
        hits.push({ x, y, w: s, h: s, fn: () => { S.padDir = dir; audio.play('tick'); } });
      };
      btn(bx, by - s - g, '▲', [0, -1]);
      btn(bx - s - g, by, '◀', [-1, 0]);
      btn(bx + s + g, by, '▶', [1, 0]);
      btn(bx, by + s + g, '▼', [0, 1]);
    }
    // intro / end banner
    if (S.phase === 'intro') {
      ctx.fillStyle = 'rgba(15,23,42,.55)'; ctx.fillRect(-view.ox, -view.oy, view.W, view.H);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = "900 54px 'Lilita One'"; ctx.fillText('👻 HUNTED!', 640, 300);
      ctx.font = "700 26px Nunito";
      ctx.fillText(`Go to the houses and grab ${D.target} sweets — don't get caught by the ghost!`, 640, 360);
      ctx.fillText('SNEAK: when he\'s LOOKING, FREEZE! When he turns away, RUN!', 640, 396);
      ctx.fillText('The Candy Boss appears after 4 sweets. Beat it for a bonus!', 640, 432);
    }
    if (S.msg && S.msgT < 1.4) {
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 440, 120, 400, 52, 14); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.font = "900 28px Nunito"; ctx.textAlign = 'center'; ctx.fillText(S.msg, 640, 147);
    }
  }

  return { update, draw };
}

// drawThumb MUST live at module level: defining it inside create() breaks
// the export ("drawThumb is not defined") and the whole hub fails to load.
function drawThumb(ctx, w, h, t) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#1e1b4b'); bg.addColorStop(1, '#0f172a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fef9c3'; ctx.beginPath(); ctx.arc(w * 0.85, h * 0.2, h * 0.12, 0, Math.PI * 2); ctx.fill();
  // a little house
  ctx.fillStyle = '#b45309'; ctx.fillRect(w * 0.08, h * 0.55, w * 0.2, h * 0.3);
  ctx.fillStyle = '#7c2d12';
  ctx.beginPath();
  ctx.moveTo(w * 0.05, h * 0.55); ctx.lineTo(w * 0.18, h * 0.38); ctx.lineTo(w * 0.31, h * 0.55); ctx.closePath(); ctx.fill();
  ctx.font = `${Math.round(h * 0.34)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('👻', w * 0.68 + Math.sin(t * 2) * 6, h * 0.55);
  ctx.fillText('🧒', w * 0.42 + Math.sin(t * 2 + 1) * 6, h * 0.55);
  ctx.fillText('🍬', w * 0.55, h * 0.3);
  ctx.fillText('🍭', w * 0.78, h * 0.78);
}

export default {
  id: 'hunted',
  title: 'Hunted',
  tagline: 'Go to houses, grab sweets, don\'t get caught',
  desc: 'Go to people\'s houses and collect sweets — and don\'t get caught by the ghost! SNEAK: when the ghost is looking at you, FREEZE (don\'t move!) — when he turns away, RUN. The Candy Boss appears after 4 sweets. Trevor starts with $8,788.37 in Hunted cash and 3740 Hunted points, everyone else starts from zero.',
  music: 'menu',
  labels: { a: '▲ UP', b: '▼ DOWN' },
  howto: `<ul>
    <li><b>Move</b>: arrow keys / joystick, the on-screen D-pad, or tap anywhere to run there.</li>
    <li><b>Goal</b>: go to the 🏠 houses and grab the target sweets (🍬🍭🍫🧁🍩) before the ⏱️ timer runs out. Each sweet is worth $1–$5 in Hunted cash and hurts the Candy Boss.</li>
    <li><b>SNEAK</b>: the 👻 ghost watches, then turns away. When he's <b>LOOKING</b> at you, he has a red <b>TRIANGLE</b> in front of him — if you are <b>inside the triangle, you lose</b> (he catches you!). <b>FREEZE</b> outside the triangle (Shh!) — when he <b>turns away</b>, <b>RUN</b>! If he catches you, you lose a ❤️ heart. Lose all 3 and the game is over.</li>
    <li><b>Candy Boss</b>: a big 🍭 appears after 4 sweets. It is faster! Grab sweets to wear it down — beat it for +$10.00 and a badge.</li>
    <li>💪 Power scares the ghost and the boss away — they run from you! ⚡ Speed makes you run 50% faster.</li>
  </ul>`,
  create,
  drawThumb,
};
