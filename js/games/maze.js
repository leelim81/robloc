// ROBLOC Maze: find your way through a maze to the flag.
// A new maze every game. Move with the arrows, the joystick, the
// on-screen D-pad, or by tapping the cell next to you. Collect coins
// on the way and reach the flag before the timer runs out.
import { rrect } from '../art.js';

const DIFF = {
  rookie: { cols: 11, rows: 9, time: 60 },
  pro: { cols: 13, rows: 11, time: 50 },
  legend: { cols: 15, rows: 13, time: 40 },
  boost: { cols: 11, rows: 9, time: 75 },   // win-chance matches
  tough: { cols: 15, rows: 13, time: 32 },  // others: hard game, so they win about 25%
};
const COINS = 8;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

// A perfect maze (exactly one path between any two cells) made by the
// recursive backtracker: walk, carve a passage, back up when stuck.
function genMaze(cols, rows) {
  const cells = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++)
    cells.push({ x, y, wall: { n: true, e: true, s: true, w: true }, seen: false });
  const at = (x, y) => cells[y * cols + x];
  const stack = [at(0, 0)];
  at(0, 0).seen = true;
  while (stack.length) {
    const c = stack[stack.length - 1];
    const next = [];
    if (c.y > 0 && !at(c.x, c.y - 1).seen) next.push(['n', at(c.x, c.y - 1)]);
    if (c.x < cols - 1 && !at(c.x + 1, c.y).seen) next.push(['e', at(c.x + 1, c.y)]);
    if (c.y < rows - 1 && !at(c.x, c.y + 1).seen) next.push(['s', at(c.x, c.y + 1)]);
    if (c.x > 0 && !at(c.x - 1, c.y).seen) next.push(['w', at(c.x - 1, c.y)]);
    if (!next.length) { stack.pop(); continue; }
    const [d, n] = next[Math.floor(Math.random() * next.length)];
    if (d === 'n') { c.wall.n = false; n.wall.s = false; }
    if (d === 'e') { c.wall.e = false; n.wall.w = false; }
    if (d === 's') { c.wall.s = false; n.wall.n = false; }
    if (d === 'w') { c.wall.w = false; n.wall.e = false; }
    n.seen = true;
    stack.push(n);
  }
  return cells;
}
const DIRS = { up: [0, -1, 'n'], down: [0, 1, 's'], left: [-1, 0, 'w'], right: [1, 0, 'e'] };
const OPP = { n: 's', e: 'w', s: 'n', w: 'e' };

function create(env) {
  const { input, audio, fx, options } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = move 50% faster, Power = break through walls.
  const SPD = options.power === 'speed' ? 1.5 : 1;
  const BREAK = options.power === 'power';
  const cells = genMaze(D.cols, D.rows);
  const at = (x, y) => cells[y * D.cols + x];
  const cell = Math.floor(Math.min(880 / D.cols, 540 / D.rows));
  const ox = Math.round(640 - (D.cols * cell) / 2);
  const oy = 110;
  const goal = { x: D.cols - 1, y: D.rows - 1 };
  // coins: random cells, never the start or the goal
  const coinCells = [];
  while (coinCells.length < COINS) {
    const x = Math.floor(rand(0, D.cols)), y = Math.floor(rand(0, D.rows));
    if ((x === 0 && y === 0) || (x === goal.x && y === goal.y)) continue;
    if (coinCells.some(c => c.x === x && c.y === y)) continue;
    coinCells.push({ x, y, taken: false });
  }
  const S = {
    phase: 'intro', t: 0, timeLeft: D.time, coins: 0, moves: 0,
    px: 0, py: 0, tx: 0, ty: 0, moving: false, broken: 0,
    msg: null, msgT: 0, tapDir: null, won: false,
  };
  let hits = [];
  const cx = x => ox + x * cell + cell / 2;
  const cy = y => oy + y * cell + cell / 2;
  const say = msg => { S.msg = msg; S.msgT = 0; };

  function canGo(x, y, dir) {
    const [dx, dy, w] = DIRS[dir];
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= D.cols || ny >= D.rows) return false;
    if (!at(x, y).wall[w]) return true;
    return BREAK;   // Power: break through the wall
  }
  function tryMove(dir) {
    if (S.phase !== 'go' || S.moving) return;
    const [dx, dy, w] = DIRS[dir];
    const nx = S.tx + dx, ny = S.ty + dy;
    if (nx < 0 || ny < 0 || nx >= D.cols || ny >= D.rows) return;
    if (at(S.tx, S.ty).wall[w] && !BREAK) { audio.play('thud', { power: 0.3 }); return; }
    if (at(S.tx, S.ty).wall[w] && BREAK) {
      at(S.tx, S.ty).wall[w] = false;
      at(nx, ny).wall[OPP[w]] = false;
      S.broken++;
      fx.sparks(cx(nx), cy(ny), 10, '#facc15');
      audio.play('thud', { power: 0.5 });
    }
    S.tx = nx; S.ty = ny; S.moving = true; S.moves++;
  }
  function endRun(win) {
    if (S.phase === 'end') return;
    S.phase = 'end'; S.t = 0; S.won = win;
    say(win ? 'YOU FOUND IT! 🎉' : "TIME'S UP!");
    if (win) { fx.rain(1280, 160); audio.cheer(1.5); }
    else audio.play('lose');
  }
  function report() {
    const win = S.won;
    const used = Math.round(D.time - S.timeLeft);
    env.end({
      outcome: win ? 'win' : 'lose',
      scoreline: `${win ? '🏁 ' : ''}${S.coins} coins · ${S.moves} moves · ${used}s`,
      stats: [`Coins: <b>${S.coins}</b>`, `Moves: <b>${S.moves}</b>`, `Time: <b>${used}s / ${D.time}s</b>`],
      match: { game: 'maze', difficulty: options.difficulty, won: win, coins: S.coins, timeLeft: Math.max(0, Math.round(S.timeLeft)), timeUsed: used, moves: S.moves },
    });
  }

  function update(dt) {
    S.t += dt; S.msgT += dt;
    input.setTapMode(true);
    if (S.labelKey !== 'maze') { S.labelKey = 'maze'; input.setLabels('▲ UP', '▼ DOWN'); }
    for (const t of input.taps) for (let k = hits.length - 1; k >= 0; k--) {
      const h = hits[k];
      if (t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h) { h.fn(t); break; }
    }
    if (S.phase === 'intro') { if (S.t > 1.2) { S.phase = 'go'; S.t = 0; say('GO! Find the flag! 🏁'); } return; }
    if (S.phase === 'end') { if (S.t > 2.4 && !S.reported) { S.reported = true; report(); } return; }

    // timer
    S.timeLeft -= dt;
    if (S.timeLeft <= 0) { S.timeLeft = 0; endRun(false); return; }

    // smooth move toward the target cell
    if (S.moving) {
      const speed = 6.5 * SPD;   // cells per second
      const dx = S.tx - S.px, dy = S.ty - S.py;
      const d = Math.hypot(dx, dy);
      const step = speed * dt;
      if (d <= step) {
        S.px = S.tx; S.py = S.ty; S.moving = false;
        // collect a coin on this cell
        const c = coinCells.find(c => !c.taken && c.x === S.tx && c.y === S.ty);
        if (c) { c.taken = true; S.coins++; audio.play('coin'); }
        // reached the goal?
        if (S.tx === goal.x && S.ty === goal.y) { endRun(true); return; }
      } else {
        S.px += (dx / d) * step; S.py += (dy / d) * step;
      }
    }

    // controls: joystick / arrows (hold to keep moving), D-pad tap, tap a
    // cell next to you, or A/B buttons (up / down).
    if (!S.moving) {
      if (input.my < -0.4 || input.a.pressed) tryMove('up');
      else if (input.my > 0.4 || input.b.pressed) tryMove('down');
      else if (input.mx < -0.4) tryMove('left');
      else if (input.mx > 0.4) tryMove('right');
      else if (S.tapDir) { const d = S.tapDir; S.tapDir = null; tryMove(d); }
    }
  }

  function draw(ctx, view) {
    hits = [];
    const t = S.t;
    // background
    const bg = ctx.createLinearGradient(0, 0, 0, view.H);
    bg.addColorStop(0, '#1e1b4b'); bg.addColorStop(1, '#312e81');
    ctx.fillStyle = bg; ctx.fillRect(-view.ox, -view.oy, view.W, view.H);
    // HUD: timer + coins + moves
    const low = S.timeLeft <= 10 && S.phase === 'go';
    ctx.fillStyle = 'rgba(15,23,42,.75)'; rrect(ctx, 40, 24, 460, 46, 12); ctx.fill();
    ctx.font = "900 24px Nunito"; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = low && Math.floor(t * 4) % 2 === 0 ? '#f87171' : '#fff';
    ctx.fillText(`⏱️ ${Math.ceil(S.timeLeft)}s`, 56, 47);
    ctx.fillStyle = '#fff';
    ctx.fillText(`🪙 ${S.coins} / ${COINS}`, 200, 47);
    ctx.fillText(`🚶 ${S.moves}`, 360, 47);
    ctx.textAlign = 'right';
    ctx.fillText(`🏁 ${goal.x + 1}×${goal.y + 1}`, 1240, 47);
    // maze floor
    ctx.fillStyle = '#e0e7ff'; rrect(ctx, ox - 8, oy - 8, D.cols * cell + 16, D.rows * cell + 16, 14); ctx.fill();
    // coins
    for (const c of coinCells) {
      if (c.taken) continue;
      ctx.font = `${Math.round(cell * 0.55)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🪙', cx(c.x), cy(c.y) + Math.sin(t * 3 + c.x) * 2);
    }
    // goal flag
    ctx.font = `${Math.round(cell * 0.7)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🏁', cx(goal.x), cy(goal.y));
    // walls
    ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (const c of cells) {
      const x0 = ox + c.x * cell, y0 = oy + c.y * cell;
      ctx.beginPath();
      if (c.wall.n) { ctx.moveTo(x0, y0); ctx.lineTo(x0 + cell, y0); }
      if (c.wall.e) { ctx.moveTo(x0 + cell, y0); ctx.lineTo(x0 + cell, y0 + cell); }
      if (c.wall.s) { ctx.moveTo(x0, y0 + cell); ctx.lineTo(x0 + cell, y0 + cell); }
      if (c.wall.w) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + cell); }
      ctx.stroke();
    }
    // player
    const bob = Math.sin(t * 5) * 2;
    ctx.font = `${Math.round(cell * 0.62)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🧒', cx(S.px), cy(S.py) + bob);
    fx.draw(ctx);
    // D-pad (right side): tap a direction to move one cell
    if (S.phase === 'go') {
      const bx = 1120, by = 400, s = 74, g = 10;
      const btn = (x, y, label, dir) => {
        ctx.fillStyle = 'rgba(255,255,255,.22)'; rrect(ctx, x, y, s, s, 14); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = "900 34px Nunito";
        ctx.fillText(label, x + s / 2, y + s / 2 + 2);
        hits.push({ x, y, w: s, h: s, fn: () => { S.tapDir = dir; audio.play('tick'); } });
      };
      btn(bx, by - s - g, '▲', 'up');
      btn(bx - s - g, by, '◀', 'left');
      btn(bx + s + g, by, '▶', 'right');
      btn(bx, by + s + g, '▼', 'down');
      // tap a cell next to you to move there
      hits.push({
        x: ox, y: oy, w: D.cols * cell, h: D.rows * cell,
        fn: t2 => {
          const gx = Math.floor((t2.x - ox) / cell), gy = Math.floor((t2.y - oy) / cell);
          if (gx < 0 || gy < 0 || gx >= D.cols || gy >= D.rows) return;
          const dx = gx - S.tx, dy = gy - S.ty;
          if (Math.abs(dx) + Math.abs(dy) !== 1) return;
          tryMove(dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up');
        },
      });
    }
    // intro / end banner
    if (S.phase === 'intro') {
      ctx.fillStyle = 'rgba(15,23,42,.55)'; ctx.fillRect(-view.ox, -view.oy, view.W, view.H);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = "900 54px 'Lilita One'"; ctx.fillText('🌀 MAZE!', 640, 300);
      ctx.font = "700 26px Nunito"; ctx.fillText('Find the 🏁 flag before the timer runs out. Collect 🪙 coins on the way!', 640, 360);
    }
    if (S.msg && S.msgT < 1.4) {
      ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 440, 120, 400, 52, 14); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.font = "900 28px Nunito"; ctx.textAlign = 'center'; ctx.fillText(S.msg, 640, 147);
    }
  }

  return { update, draw };
}

function drawThumb(ctx, w, h, t) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#312e81'); bg.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#e0e7ff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const n = 6, s = w / (n + 1);
  for (let i = 0; i <= n; i++) {
    ctx.beginPath(); ctx.moveTo(s * (i + 0.5), s * 0.7); ctx.lineTo(s * (i + 0.5), h - s * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.5, s * (0.7 + i)); ctx.lineTo(w - s * 0.5, s * (0.7 + i)); ctx.stroke();
  }
  ctx.font = `${Math.round(h * 0.3)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🧒', w * 0.3 + Math.sin(t * 2) * 8, h * 0.5);
  ctx.fillText('🏁', w * 0.75, h * 0.5);
  ctx.fillText('🪙', w * 0.55, h * 0.3);
}


export default {
  id: 'maze',
  title: 'Maze',
  tagline: 'Find the flag before time runs out',
  desc: 'A new maze every game. Move with the arrows, the joystick, the on-screen D-pad, or tap the cell next to you. Collect coins and reach the flag before the timer runs out!',
  music: 'menu',
  labels: { a: '▲ UP', b: '▼ DOWN' },
  howto: `<ul>
    <li><b>Move</b>: arrow keys / joystick, the on-screen D-pad on the right, or tap the cell next to you.</li>
    <li><b>Goal</b>: reach the 🏁 flag before the ⏱️ timer runs out.</li>
    <li><b>Coins</b>: collect the 🪙 coins hidden in the maze for extra points.</li>
    <li>💪 Power breaks through walls. ⚡ Speed moves you 50% faster.</li>
  </ul>`,
  create,
  drawThumb,
};
