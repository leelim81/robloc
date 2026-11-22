// ROBLOC Guess the Price: a game show. Each round shows a real item from the mall; pick its price
// from four choices before time runs out, and score more than the CPU contestant.
import { drawHuman, shade, rrect, SKINS, HAIRS } from '../art.js';
import { drawBanner } from '../fx.js';
import { SECTIONS, shopInfo, shopItems, fmtCents, realPrice } from './shops.js';

const DIFF = {
  rookie: { spread: [0.45, 1.6], time: 12, cpu: 0.45 },
  pro: { spread: [0.25, 0.75], time: 9, cpu: 0.6 },
  legend: { spread: [0.1, 0.35], time: 7, cpu: 0.75 },
  boost: { spread: [0.6, 2], time: 14, cpu: 0.15 },   // win-chance matches
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const OPT = [[230, 470], [650, 470], [230, 572], [650, 572]];   // top-left corners of the 4 answer buttons
const OPT_W = 400, OPT_H = 86;

function pickItem() {
  // mostly general shops, then food, then drinks
  const r = Math.random(), sec = r < 0.45 ? SECTIONS[0] : r < 0.75 ? SECTIONS[1] : r < 0.88 ? SECTIONS[2] : SECTIONS[3];
  const shop = sec.from + Math.floor(Math.random() * (sec.to - sec.from));
  const items = shopItems(shop);
  return { item: items[Math.floor(Math.random() * items.length)], shop: shopInfo(shop) };
}
function makeChoices(cents, spread) {
  const out = new Set([cents]);
  let guard = 0;
  while (out.size < 4 && guard++ < 200) {
    const up = Math.random() < 0.5, k = rand(spread[0], spread[1]);
    const d = (cents / 100) * (up ? 1 + k : 1 / (1 + k));
    const c = realPrice(Math.max(0.3, d));
    if (c !== cents && Math.abs(c - cents) / cents > 0.04) out.add(c);
  }
  const arr = [...out];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// ---------- scenery ----------
function drawStage(ctx, view, t) {
  const x0 = -view.ox, y0 = -view.oy, W = view.W, H = view.H;
  const g = ctx.createLinearGradient(0, y0, 0, y0 + H);
  g.addColorStop(0, '#1e1b4b'); g.addColorStop(0.55, '#4c1d95'); g.addColorStop(1, '#170f33');
  ctx.fillStyle = g; ctx.fillRect(x0, y0, W, H);
  // spotlights
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const a = Math.sin(t * 0.7 + i * 1.7) * 0.35, sx = 160 + i * 320;
    const lg = ctx.createLinearGradient(sx, y0, sx, 460);
    lg.addColorStop(0, `hsla(${(i * 70 + t * 20) % 360},90%,70%,.28)`); lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(sx - 12, y0); ctx.lineTo(sx + 12, y0);
    ctx.lineTo(sx + 160 + a * 400, 460); ctx.lineTo(sx - 160 + a * 400, 460); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // curtains
  for (const side of [-1, 1]) {
    const cx = side < 0 ? x0 : x0 + W;
    const cg = ctx.createLinearGradient(cx, 0, cx - side * 160, 0);
    cg.addColorStop(0, '#7f1d1d'); cg.addColorStop(1, '#b91c1c');
    ctx.fillStyle = cg; ctx.fillRect(side < 0 ? x0 : x0 + W - 160, y0, 160, H);
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 3;
    for (let k = 1; k < 6; k++) { const xx = side < 0 ? x0 + k * 27 : x0 + W - k * 27; ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, y0 + H); ctx.stroke(); }
  }
  // stage floor
  const fg = ctx.createLinearGradient(0, 420, 0, y0 + H);
  fg.addColorStop(0, '#312e81'); fg.addColorStop(1, '#0f0a2a');
  ctx.fillStyle = fg; ctx.fillRect(x0, 440, W, y0 + H - 440);
  // marquee lights
  for (let i = 0; i < 40; i++) {
    const x = 140 + i * 25.6, on = (Math.floor(t * 6) + i) % 3 === 0;
    ctx.fillStyle = on ? '#fde68a' : '#92400e'; ctx.beginPath(); ctx.arc(x, 18, 5, 0, Math.PI * 2); ctx.fill();
  }
  // title sign
  ctx.fillStyle = '#0f172a'; rrect(ctx, 440, 34, 400, 52, 16); ctx.fill();
  ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; rrect(ctx, 440, 34, 400, 52, 16); ctx.stroke();
  ctx.font = "32px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fde68a';
  ctx.fillText('GUESS THE PRICE!', 640, 61);
}
function drawPodium(ctx, x, label, score, color, look, t, mood) {
  drawHuman(ctx, x, 330, 1.25, { view: 'front', pose: mood === 'happy' ? 'celebrate' : 'ready', phase: t * 4, face: mood === 'happy' ? 'happy' : undefined, ...look, shorts: '#1e293b' });
  ctx.fillStyle = color; rrect(ctx, x - 80, 300, 160, 120, 14); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.2)'; rrect(ctx, x - 80, 300, 160, 24, 14); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 17px Nunito'; ctx.fillText(label, x, 340);
  ctx.font = "38px 'Lilita One'"; ctx.fillText(String(score), x, 384);
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options, profile } = env;
  const D = options.boost ? DIFF.boost : (DIFF[options.difficulty] || DIFF.rookie);
  const rounds = +(options.rounds || 10);
  const av = profile?.avatar || {};
  const myLook = { skin: av.skin, hair: av.hair, style: av.style, shirt: av.shirt || '#2563eb' };
  const cpuLook = { skin: SKINS[3], hair: HAIRS[4], style: 'ponytail', shirt: '#f59e0b' };
  const S = { phase: 'intro', t: 0, round: 0, me: 0, cpu: 0, correct: 0, streak: 0, best: 0, sel: 0, lastNav: '', q: null, msg: null, msgSub: null, labelKey: '' };

  function nextRound() {
    S.round++;
    const { item, shop } = pickItem();
    S.q = { item, shop, choices: makeChoices(item.cents, D.spread), mine: -1, cpu: -1, cpuAt: rand(D.time * 0.25, D.time * 0.8), myTime: 0 };
    S.phase = 'ask'; S.t = 0; S.sel = 0; S.msg = null;
    audio.play('select');
  }
  function cpuPick() {
    const q = S.q, right = q.choices.indexOf(q.item.cents);
    q.cpu = Math.random() < D.cpu ? right : [0, 1, 2, 3].filter(i => i !== right)[Math.floor(Math.random() * 3)];
    q.cpuTime = S.t;
  }
  function reveal() {
    const q = S.q, right = q.choices.indexOf(q.item.cents);
    if (q.cpu < 0) cpuPick();
    const pts = time => 100 + Math.round(50 * clamp(1 - time / D.time, 0, 1));
    const meRight = q.mine === right, cpuRight = q.cpu === right;
    if (meRight) { S.me += pts(q.myTime); S.correct++; S.streak++; S.best = Math.max(S.best, S.streak); } else S.streak = 0;
    if (cpuRight) S.cpu += pts(q.cpuTime);
    S.msg = meRight ? (S.streak >= 3 ? `${S.streak} IN A ROW!` : 'CORRECT!') : q.mine < 0 ? "TIME'S UP!" : 'NOT QUITE!';
    S.msgSub = `It costs ${fmtCents(q.item.cents)}`;
    S.msgColor = meRight ? '#a3e635' : '#fca5a5';
    if (meRight) { audio.play('point'); audio.cheer(0.8); fx.confetti(640, 260, 50); } else audio.play('fault');
    S.phase = 'reveal'; S.t = 0;
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const won = S.me > S.cpu, draw = S.me === S.cpu;
    S.msg = won ? 'YOU WIN!' : draw ? "IT'S A TIE" : 'PENNY WINS';
    S.msgSub = `${S.me} – ${S.cpu}`; S.msgColor = won ? '#fde68a' : '#cbd5e1';
    if (won) { fx.rain(1280, 160); audio.cheer(1.6); }
  }
  function report() {
    const won = S.me > S.cpu, draw = S.me === S.cpu;
    env.end({
      outcome: won ? 'win' : draw ? 'draw' : 'lose',
      scoreline: `YOU ${S.me} – ${S.cpu} PENNY`,
      stats: [`Correct: <b>${S.correct} / ${rounds}</b>`, `Best streak: <b>${S.best}</b>`, `Difficulty: <b>${options.difficulty}</b>`],
      match: { game: 'price', difficulty: options.difficulty, won, draw, correct: S.correct, rounds, bestStreak: S.best },
    });
  }

  let hits = [];
  function update(dt) {
    input.setTapMode(true);
    // tap an answer to lock it in
    if (S.phase === 'ask' && S.t > 0.3) for (const t of input.taps) {
      const i = hits.findIndex(h => t.x >= h.x && t.x <= h.x + OPT_W && t.y >= h.y && t.y <= h.y + OPT_H);
      if (i >= 0) { S.sel = i; S.q.mine = i; S.q.myTime = S.t; audio.play('click'); reveal(); break; }
    }
    S.t += dt;
    if (S.labelKey !== 'pick') { S.labelKey = 'pick'; input.setLabels('PICK', 'PICK'); }
    if (S.phase === 'intro') { if (S.t > 1.6) nextRound(); return; }
    if (S.phase === 'end') { if (S.t > 2.6 && !S.reported) { S.reported = true; report(); } return; }
    if (S.phase === 'ask') {
      const dx = input.mx > 0.5 ? 1 : input.mx < -0.5 ? -1 : 0, dy = input.my > 0.5 ? 1 : input.my < -0.5 ? -1 : 0, key = dx + ',' + dy;
      if (key !== S.lastNav && key !== '0,0') {
        let col = S.sel % 2, row = Math.floor(S.sel / 2);
        col = clamp(col + dx, 0, 1); row = clamp(row + dy, 0, 1);
        S.sel = row * 2 + col; audio.play('tick');
      }
      S.lastNav = key;
      if (S.q.cpu < 0 && S.t >= S.q.cpuAt) cpuPick();
      if ((input.a.pressed || input.b.pressed) && S.t > 0.3) { S.q.mine = S.sel; S.q.myTime = S.t; audio.play('click'); reveal(); }
      else if (S.t >= D.time) reveal();
    } else if (S.phase === 'reveal') {
      if (S.t > 2.4) { if (S.round >= rounds) endGame(); else nextRound(); }
    }
  }

  function draw(ctx, view) {
    drawStage(ctx, view, S.t + S.round * 3);
    const q = S.q, reveal = S.phase === 'reveal' || S.phase === 'end';
    const right = q ? q.choices.indexOf(q.item.cents) : -1;
    const myMood = reveal && q && q.mine === right ? 'happy' : null, cpuMood = reveal && q && q.cpu === right ? 'happy' : null;
    drawPodium(ctx, 140, profile?.name || 'YOU', S.me, myLook.shirt, myLook, S.t, myMood);
    drawPodium(ctx, 1140, 'PENNY (CPU)', S.cpu, '#f59e0b', cpuLook, S.t, cpuMood);
    if (q && S.phase !== 'end') {
      // item on a spinning pedestal
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.ellipse(640, 330, 120, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a16207'; ctx.fillRect(520, 330, 240, 30); ctx.beginPath(); ctx.ellipse(640, 360, 120, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(640, 230 + Math.sin(S.t * 2.5) * 8); ctx.scale(1 + Math.sin(S.t * 1.7) * 0.04, 1);
      ctx.font = '130px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q.item.icon, 0, 0);
      ctx.restore();
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = "34px 'Lilita One'";
      fit(ctx, q.item.name, 640, 396, 680);
      ctx.font = '800 16px Nunito'; ctx.fillStyle = '#c4b5fd';
      fit(ctx, `from ${q.shop.icon} ${q.shop.name} · ${q.shop.section === 'Shops' ? 'shop' : q.shop.section.toLowerCase()} #${q.shop.number.toLocaleString()}`, 640, 428, 680);
      // answer buttons
      hits = OPT.map(([x, y]) => ({ x, y }));
      q.choices.forEach((c, i) => {
        const [x, y] = OPT[i], sel = S.phase === 'ask' && i === S.sel;
        let bg = '#1e293b';
        if (reveal) bg = i === right ? '#16a34a' : i === q.mine ? '#b91c1c' : '#1e293b';
        else if (sel) bg = '#7c3aed';
        ctx.fillStyle = bg; rrect(ctx, x, y, OPT_W, OPT_H, 18); ctx.fill();
        if (sel) { ctx.strokeStyle = '#facc15'; ctx.lineWidth = 4; rrect(ctx, x, y, OPT_W, OPT_H, 18); ctx.stroke(); }
        ctx.fillStyle = '#fff'; ctx.font = "34px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        fit(ctx, fmtCents(c), x + OPT_W / 2, y + OPT_H / 2 + 2, OPT_W - 90);
        ctx.font = '900 13px Nunito';
        if (reveal && i === q.mine) tag(ctx, x + 10, y + 8, 'YOU', '#22d3ee');
        if (reveal && i === q.cpu) tag(ctx, x + OPT_W - 72, y + 8, 'PENNY', '#f59e0b');
      });
      // timer
      if (S.phase === 'ask') {
        const k = clamp(1 - S.t / D.time, 0, 1);
        ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 230, 450, 820, 10, 5); ctx.fill();
        ctx.fillStyle = k > 0.35 ? '#4ade80' : '#f87171'; rrect(ctx, 230, 450, 820 * k, 10, 5); ctx.fill();
        if (q.cpu >= 0) { ctx.fillStyle = '#fde68a'; ctx.font = '800 14px Nunito'; ctx.textAlign = 'right'; ctx.fillText('Penny has answered!', 1050, 440); }
      }
    }
    // round counter
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '900 15px Nunito';
    ctx.fillText(`ROUND ${Math.max(1, S.round)} OF ${rounds}${S.streak >= 2 ? ` · 🔥 ${S.streak} streak` : ''}`, 640, 104);
    fx.draw(ctx);
    if (S.phase === 'ask' && S.round === 1 && S.t < 4)
      prompt(ctx, input.touchMode ? 'Tap the price you think is right' : 'Click a price, or use the arrows and SPACE');
    if (S.msg && S.phase === 'reveal') drawBanner(ctx, S.msg, 640, 160, S.t, { size: 64, sub: S.msgSub, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#f59e0b' });
    if (S.phase === 'end') drawBanner(ctx, S.msg, 640, 260, S.t, { size: 110, sub: S.msgSub, color: S.msgColor, glow: '#f59e0b' });
    if (S.phase === 'intro') drawBanner(ctx, 'COME ON DOWN!', 640, 260, S.t, { size: 96, color: '#fbcfe8', glow: '#db2777' });
  }
  function tag(ctx, x, y, text, color) {
    ctx.fillStyle = color; rrect(ctx, x, y, 62, 20, 8); ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.textAlign = 'center'; ctx.fillText(text, x + 31, y + 11);
  }
  function fit(ctx, text, x, y, maxW) {
    const w = ctx.measureText(text).width;
    if (w > maxW) { ctx.save(); ctx.translate(x, y); ctx.scale(maxW / w, 1); ctx.fillText(text, 0, 0); ctx.restore(); } else ctx.fillText(text, x, y);
  }
  function prompt(ctx, text) {
    ctx.font = '800 17px Nunito'; const w = ctx.measureText(text).width + 40;
    ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 672, w, 36, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 690);
  }

  if (env.debug) env.debug({ S });
  audio.setCrowd(0.18);
  return { update, draw };
}

// ---------- menu thumbnail ----------
const thumbItems = ['🎮', '🚲', '🍔', '🧋', '🏎️', '🧸'];
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  drawStage(ctx, view || { ox: 0, oy: 0, W: 1280, H: 720 }, t);
  ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.ellipse(640, 360, 150, 32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.font = '170px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(thumbItems[Math.floor(t / 1.5) % thumbItems.length], 640, 250 + Math.sin(t * 2.5) * 10);
  ['$19.99', '$49.99', '$89.99', '$129.99'].forEach((p, i) => {
    const [x, y] = OPT[i], lit = Math.floor(t * 2) % 4 === i;
    ctx.fillStyle = lit ? '#7c3aed' : '#1e293b'; rrect(ctx, x, y, OPT_W, OPT_H, 18); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "40px 'Lilita One'"; ctx.fillText(p, x + OPT_W / 2, y + OPT_H / 2);
  });
  ctx.restore();
}

export default {
  id: 'price',
  title: 'Guess the Price',
  tagline: 'Real items, real prices: can you guess them?',
  desc: 'A game show with items from the 88,000 mall shops. Pick the right price before time runs out and beat Penny.',
  music: 'mall',
  labels: { a: 'PICK', b: 'PICK' },
  options: [
    { key: 'rounds', label: 'Rounds', default: 1, choices: [{ v: '5', label: '5 rounds', sub: 'quick' }, { v: '10', label: '10 rounds', sub: 'standard' }, { v: '15', label: '15 rounds', sub: 'long' }] },
  ],
  howto: `<ul>
    <li>Each round shows a real item from the Shopping Mall. Choose its price from the four answers with the joystick or arrows, then press <b>PICK</b> (<kbd>Space</kbd>).</li>
    <li>Right answers score 100 points, plus up to 50 more for answering fast. Get several in a row for a streak.</li>
    <li>Penny, the CPU contestant, answers too. Score more than Penny to win.</li>
    <li>Higher difficulty gives less time and closer wrong answers.</li>
  </ul>`,
  create,
  drawThumb,
};
