// ROBLOC Cooking: search any food, get its recipe, buy the ingredients
// at the Shopping Mall, then cook it before it burns!
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';
import { moneyOf, payPlan } from '../economy.js';

const DIFF = {
  rookie: { time: 60 },
  pro: { time: 45 },
  legend: { time: 35 },
  boost: { time: 75 },   // Trevor: easy game, lots of time
  tough: { time: 28 },   // others: hard game, little time
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAX_RATE = 0.08;

// Every food: what you need, and the steps to cook it.
// Ingredient prices are in cents; the Mall adds 8% tax (Trevor's cut).
const FOODS = [
  { id: 'pizza', name: 'Pizza', icon: '🍕', ingredients: [{ n: 'Dough', i: '🍞', c: 120 }, { n: 'Tomato sauce', i: '🍅', c: 80 }, { n: 'Cheese', i: '🧀', c: 150 }, { n: 'Pepperoni', i: '🍖', c: 180 }], steps: ['Roll the dough', 'Spread the tomato sauce', 'Add the cheese', 'Add the pepperoni', 'Bake it in the oven!'] },
  { id: 'burger', name: 'Burger', icon: '🍔', ingredients: [{ n: 'Bun', i: '🍞', c: 90 }, { n: 'Beef patty', i: '🥩', c: 200 }, { n: 'Lettuce', i: '🥬', c: 60 }, { n: 'Cheese', i: '🧀', c: 120 }, { n: 'Tomato', i: '🍅', c: 70 }], steps: ['Toast the bun', 'Fry the beef patty', 'Add the lettuce', 'Add the cheese and tomato', 'Put it all together!'] },
  { id: 'noodles', name: 'Noodles', icon: '🍜', ingredients: [{ n: 'Noodles', i: '🍝', c: 110 }, { n: 'Broth', i: '🍲', c: 130 }, { n: 'Egg', i: '🥚', c: 80 }, { n: 'Spring onion', i: '🧅', c: 50 }], steps: ['Boil the noodles', 'Heat the broth', 'Add the egg', 'Sprinkle the spring onion', 'Serve it hot!'] },
  { id: 'pancakes', name: 'Pancakes', icon: '🥞', ingredients: [{ n: 'Flour', i: '🌾', c: 90 }, { n: 'Egg', i: '🥚', c: 80 }, { n: 'Milk', i: '🥛', c: 70 }, { n: 'Syrup', i: '🍯', c: 110 }], steps: ['Mix the flour and egg', 'Pour in the milk', 'Fry the pancakes', 'Pour on the syrup', 'Stack them high!'] },
  { id: 'cake', name: 'Cake', icon: '🎂', ingredients: [{ n: 'Flour', i: '🌾', c: 100 }, { n: 'Egg', i: '🥚', c: 80 }, { n: 'Sugar', i: '🍬', c: 90 }, { n: 'Butter', i: '🧈', c: 140 }, { n: 'Frosting', i: '🍦', c: 150 }], steps: ['Mix the flour, egg and sugar', 'Stir in the butter', 'Bake the cake', 'Spread the frosting', 'Put on the candles!'] },
  { id: 'salad', name: 'Salad', icon: '🥗', ingredients: [{ n: 'Lettuce', i: '🥬', c: 70 }, { n: 'Tomato', i: '🍅', c: 70 }, { n: 'Cucumber', i: '🥒', c: 60 }, { n: 'Dressing', i: '🫙', c: 90 }], steps: ['Wash the lettuce', 'Chop the tomato', 'Slice the cucumber', 'Pour on the dressing', 'Toss it all together!'] },
  { id: 'sushi', name: 'Sushi', icon: '🍣', ingredients: [{ n: 'Rice', i: '🍚', c: 100 }, { n: 'Fish', i: '🐟', c: 220 }, { n: 'Seaweed', i: '🌿', c: 90 }], steps: ['Cook the rice', 'Slice the fish', 'Roll it in seaweed', 'Cut into pieces', 'Serve with soy sauce!'] },
  { id: 'tacos', name: 'Tacos', icon: '🌮', ingredients: [{ n: 'Tortilla', i: '🫓', c: 90 }, { n: 'Beef', i: '🥩', c: 190 }, { n: 'Cheese', i: '🧀', c: 120 }, { n: 'Lettuce', i: '🥬', c: 60 }, { n: 'Salsa', i: '🌶️', c: 80 }], steps: ['Warm the tortilla', 'Fry the beef', 'Add the cheese', 'Add the lettuce and salsa', 'Fold it up!'] },
  { id: 'spaghetti', name: 'Spaghetti', icon: '🍝', ingredients: [{ n: 'Pasta', i: '🍝', c: 110 }, { n: 'Tomato sauce', i: '🍅', c: 90 }, { n: 'Meatballs', i: '🧆', c: 180 }, { n: 'Cheese', i: '🧀', c: 120 }], steps: ['Boil the pasta', 'Heat the tomato sauce', 'Add the meatballs', 'Sprinkle the cheese', 'Twirl it on your fork!'] },
  { id: 'icecream', name: 'Ice Cream', icon: '🍦', ingredients: [{ n: 'Milk', i: '🥛', c: 80 }, { n: 'Sugar', i: '🍬', c: 80 }, { n: 'Vanilla', i: '🌸', c: 120 }, { n: 'Sprinkles', i: '✨', c: 90 }], steps: ['Mix the milk and sugar', 'Add the vanilla', 'Freeze it till it is cold', 'Add the sprinkles', 'Scoop it into a cone!'] },
  { id: 'sandwich', name: 'Sandwich', icon: '🥪', ingredients: [{ n: 'Bread', i: '🍞', c: 80 }, { n: 'Ham', i: '🍖', c: 150 }, { n: 'Cheese', i: '🧀', c: 120 }, { n: 'Lettuce', i: '🥬', c: 60 }], steps: ['Take two slices of bread', 'Add the ham', 'Add the cheese', 'Add the lettuce', 'Cut it in half!'] },
  { id: 'cookies', name: 'Cookies', icon: '🍪', ingredients: [{ n: 'Flour', i: '🌾', c: 90 }, { n: 'Butter', i: '🧈', c: 130 }, { n: 'Sugar', i: '🍬', c: 80 }, { n: 'Chocolate chips', i: '🍫', c: 140 }], steps: ['Mix the flour and sugar', 'Stir in the butter', 'Add the chocolate chips', 'Bake them in the oven', 'Let them cool — yummy!'] },
  { id: 'friedrice', name: 'Fried Rice', icon: '🍚', ingredients: [{ n: 'Rice', i: '🍚', c: 100 }, { n: 'Egg', i: '🥚', c: 80 }, { n: 'Peas', i: '🫛', c: 70 }, { n: 'Soy sauce', i: '🫙', c: 80 }], steps: ['Fry the egg', 'Add the rice', 'Add the peas', 'Pour on the soy sauce', 'Stir-fry it all!'] },
  { id: 'soup', name: 'Soup', icon: '🍲', ingredients: [{ n: 'Broth', i: '🍲', c: 120 }, { n: 'Carrot', i: '🥕', c: 60 }, { n: 'Potato', i: '🥔', c: 70 }, { n: 'Noodles', i: '🍝', c: 100 }], steps: ['Heat the broth', 'Add the carrot', 'Add the potato', 'Add the noodles', 'Simmer till it is yummy!'] },
  { id: 'hotdog', name: 'Hot Dog', icon: '🌭', ingredients: [{ n: 'Bun', i: '🍞', c: 90 }, { n: 'Sausage', i: '🌭', c: 160 }, { n: 'Ketchup', i: '🍅', c: 60 }, { n: 'Mustard', i: '🟡', c: 60 }], steps: ['Toast the bun', 'Grill the sausage', 'Add the ketchup', 'Add the mustard', 'Eat it while it is hot!'] },
  { id: 'donut', name: 'Donut', icon: '🍩', ingredients: [{ n: 'Dough', i: '🍞', c: 110 }, { n: 'Sugar', i: '🍬', c: 80 }, { n: 'Frosting', i: '🍦', c: 130 }, { n: 'Sprinkles', i: '✨', c: 90 }], steps: ['Shape the dough into a ring', 'Fry it till it is golden', 'Dip it in frosting', 'Add the sprinkles', 'Take a big bite!'] },
  { id: 'curry', name: 'Curry', icon: '🍛', ingredients: [{ n: 'Rice', i: '🍚', c: 100 }, { n: 'Curry sauce', i: '🍛', c: 150 }, { n: 'Chicken', i: '🍗', c: 200 }, { n: 'Potato', i: '🥔', c: 70 }], steps: ['Cook the rice', 'Fry the chicken', 'Add the potato', 'Pour on the curry sauce', 'Serve it with rice!'] },
  { id: 'smoothie', name: 'Smoothie', icon: '🥤', ingredients: [{ n: 'Banana', i: '🍌', c: 80 }, { n: 'Milk', i: '🥛', c: 70 }, { n: 'Yogurt', i: '🍶', c: 100 }, { n: 'Honey', i: '🍯', c: 110 }], steps: ['Peel the banana', 'Pour in the milk', 'Add the yogurt and honey', 'Blend it all up', 'Pour it in a glass!'] },
  { id: 'fries', name: 'Fries', icon: '🍟', ingredients: [{ n: 'Potato', i: '🥔', c: 80 }, { n: 'Salt', i: '🧂', c: 40 }, { n: 'Ketchup', i: '🍅', c: 60 }], steps: ['Cut the potato into sticks', 'Fry them till they are golden', 'Sprinkle on the salt', 'Add the ketchup', 'Crunchy and yummy!'] },
  { id: 'dumplings', name: 'Dumplings', icon: '🥟', ingredients: [{ n: 'Wrapper', i: '🥟', c: 100 }, { n: 'Pork', i: '🥩', c: 180 }, { n: 'Cabbage', i: '🥬', c: 60 }, { n: 'Soy sauce', i: '🫙', c: 80 }], steps: ['Mix the pork and cabbage', 'Fill the wrappers', 'Pinch them closed', 'Steam the dumplings', 'Dip in soy sauce!'] },
];
const fmtMoney = c => '$' + (c / 100).toFixed(2);

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options, profile, shop } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = 50% more time to cook, Power = wrong taps never
  // burn the food, and the timer runs a little slower too.
  const TIME = D.time * (options.power === 'speed' ? 1.5 : options.power === 'power' ? 1.2 : 1);
  const WRONG_COST = options.power === 'power' ? 0 : 5;
  const dishesTotal = +(options.dishes || 2);
  const S = { phase: 'pick', t: 0, q: '', qPrev: null, list: FOODS.slice(0, 8), keysDown: null, food: null, dish: 0, done: 0, burned: 0, stepsDone: 0, step: 0, timeLeft: TIME, msg: null, msgT: 0, msgColor: '#fff', bought: false, buying: false, labelKey: '', reported: false };

  function runSearch() {
    if (S.q === S.qPrev) return;
    S.qPrev = S.q;
    const q = S.q.trim().toLowerCase();
    S.list = q ? FOODS.filter(f => f.name.toLowerCase().includes(q)).slice(0, 8) : FOODS.slice(0, 8);
  }
  function searchKey(ch) {
    if (ch === '⌫') S.q = S.q.slice(0, -1);
    else if (ch === '✕') S.q = '';
    else if (S.q.length < 16) S.q += ch;
    audio.play('tick');
  }
  function pickFood(f) {
    S.food = f; S.phase = 'recipe'; S.t = 0; S.bought = false; S.buying = false;
    audio.play('select');
  }
  function foodCost(f) {
    const sub = f.ingredients.reduce((a, g) => a + g.c, 0);
    const tax = Math.round(sub * TAX_RATE);
    return { sub, tax, total: sub + tax };
  }
  async function buyIngredients() {
    if (S.buying || S.bought) return;
    const f = S.food, cost = foodCost(f);
    const prof = shop.profile ? shop.profile() : profile;
    if (!payPlan(prof, cost.total)) { S.msg = 'Not enough money! Pick a cheaper food.'; S.msgT = 0; S.msgColor = '#fca5a5'; audio.play('fault'); return; }
    S.buying = true;
    try {
      await shop.buy({ id: 'ingredient_' + f.id, name: f.name + ' ingredients' }, cost.total, cost.tax);
      S.bought = true; S.msg = 'Ingredients from the Mall! 🛒'; S.msgT = 0; S.msgColor = '#a3e635'; audio.play('point');
    } catch (e) {
      S.msg = 'Could not buy — try again!'; S.msgT = 0; S.msgColor = '#fca5a5'; audio.play('fault');
    }
    S.buying = false;
  }
  function startCook() {
    S.phase = 'cook'; S.t = 0; S.step = 0; S.timeLeft = TIME; S.msg = null;
    audio.play('select');
  }
  function dishDone() {
    S.done++; S.stepsDone += S.food.steps.length;
    S.phase = 'dishEnd'; S.t = 0;
    S.msg = '😋 Yummy! Dish ready!'; S.msgColor = '#a3e635';
    audio.play('point'); audio.cheer(0.8); fx.confetti(640, 260, 50);
  }
  function dishBurned() {
    S.burned++;
    S.phase = 'dishEnd'; S.t = 0;
    S.msg = '🔥 Oh no! Your food is burned!'; S.msgColor = '#fca5a5';
    audio.play('fault');
  }
  function nextDish() {
    S.dish++;
    if (S.dish >= dishesTotal) { endGame(); return; }
    S.phase = 'pick'; S.t = 0; S.q = ''; S.qPrev = null; S.list = FOODS.slice(0, 8); S.food = null; S.msg = null;
  }
  function endGame() {
    S.phase = 'end'; S.t = 0;
    const won = S.done > S.burned, draw = S.done === S.burned && S.done > 0;
    S.msg = won ? 'MASTER CHEF!' : draw ? "IT'S A TIE" : 'BURNED OUT!';
    S.msgColor = won ? '#fde68a' : '#cbd5e1';
    if (won) { fx.rain(1280, 160); audio.cheer(1.6); }
  }
  function report() {
    const won = S.done > S.burned, draw = S.done === S.burned && S.done > 0;
    env.end({
      outcome: won ? 'win' : draw ? 'draw' : 'lose',
      scoreline: `DISHES ${S.done} – ${S.burned} BURNED`,
      stats: [`Dishes cooked: <b>${S.done} / ${dishesTotal}</b>`, `Burned: <b>${S.burned}</b>`, `Steps done: <b>${S.stepsDone}</b>`, `Difficulty: <b>${options.difficulty}</b>`],
      match: { game: 'cooking', difficulty: options.difficulty, won, draw, dishes: S.done, burned: S.burned, stepsDone: S.stepsDone, timeLeft: Math.max(0, Math.round(S.timeLeft)), timeUsed: Math.max(0, Math.round(TIME - S.timeLeft)) },
    });
  }

  let hits = [];
  function update(dt) {
    input.setTapMode(true);
    S.t += dt;
    if (S.msg) S.msgT += dt;
    if (S.labelKey !== S.phase) { S.labelKey = S.phase; input.setLabels(S.phase === 'pick' ? 'PICK' : S.phase === 'cook' ? 'COOK' : 'OK', S.phase === 'pick' ? 'PICK' : S.phase === 'cook' ? 'COOK' : 'OK'); }
    if (S.phase === 'pick') {
      // physical keyboard too: tap the on-screen letters, or type them
      if (!S.keysDown) S.keysDown = new Set();
      const now = input.keys || new Set();
      for (const code of now) {
        if (S.keysDown.has(code)) continue;
        if (/^Key[A-Z]$/.test(code)) searchKey(code.slice(3));
        else if (code === 'Backspace') searchKey('⌫');
        else if (code === 'Space') searchKey(' ');
      }
      S.keysDown = new Set(now);
      runSearch();
      for (const t of input.taps) {
        const i = hits.findIndex(h => t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h);
        if (i >= 0) { const h = hits[i]; if (h.kind === 'key') searchKey(h.ch); else if (h.kind === 'food') pickFood(h.food); break; }
      }
      if (input.a.pressed && S.list.length) pickFood(S.list[0]);
    } else if (S.phase === 'recipe') {
      for (const t of input.taps) {
        const i = hits.findIndex(h => t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h);
        if (i >= 0) {
          const h = hits[i];
          if (h.kind === 'back') { S.phase = 'pick'; S.t = 0; S.food = null; audio.play('back'); }
          else if (h.kind === 'buy') buyIngredients();
          else if (h.kind === 'cook' && S.bought) startCook();
          break;
        }
      }
    } else if (S.phase === 'cook') {
      S.timeLeft -= dt;
      for (const t of input.taps) {
        const i = hits.findIndex(h => t.x >= h.x && t.x <= h.x + h.w && t.y >= h.y && t.y <= h.y + h.h);
        if (i >= 0) {
          const h = hits[i];
          if (h.kind === 'step') {
            if (h.step === S.step) { S.step++; audio.play('click'); fx.sparks(640, 300, 8); if (S.step >= S.food.steps.length) { dishDone(); break; } }
            else { S.timeLeft -= WRONG_COST; S.msg = WRONG_COST ? 'Wrong step! Careful — it is burning!' : 'Wrong step!'; S.msgT = 0; S.msgColor = '#fca5a5'; audio.play('fault'); }
          }
          break;
        }
      }
      if (S.phase === 'cook' && S.timeLeft <= 0) dishBurned();
    } else if (S.phase === 'dishEnd') {
      if (S.t > 2.2) nextDish();
    } else if (S.phase === 'end') {
      if (S.t > 2.6 && !S.reported) { S.reported = true; report(); }
    }
  }

  function drawPanel(ctx, x, y, w, h, title, color) {
    ctx.fillStyle = '#0f172a'; rrect(ctx, x, y, w, h, 20); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3; rrect(ctx, x, y, w, h, 20); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = "30px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(title, x + w / 2, y + 32);
  }
  function drawBtn(ctx, x, y, w, h, label, color, kind, extra) {
    ctx.fillStyle = color; rrect(ctx, x, y, w, h, 16); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = "26px 'Lilita One'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    hits.push({ x, y, w, h, kind, ...(extra || {}) });
  }
  function draw(ctx, view) {
    hits = [];
    const x0 = -view.ox, y0 = -view.oy, W = view.W, H = view.H;
    // kitchen background
    const g = ctx.createLinearGradient(0, y0, 0, y0 + H);
    g.addColorStop(0, '#7c2d12'); g.addColorStop(0.55, '#b45309'); g.addColorStop(1, '#451a03');
    ctx.fillStyle = g; ctx.fillRect(x0, y0, W, H);
    ctx.fillStyle = '#78350f'; ctx.fillRect(x0, 600, W, y0 + H - 600);
    ctx.fillStyle = '#92400e'; ctx.fillRect(x0, 592, W, 8);
    ctx.font = '90px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🍳', 120, 90); ctx.fillText('🥘', 1160, 90);
    ctx.fillStyle = '#fff'; ctx.font = "44px 'Lilita One'";
    ctx.fillText('COOKING!', 640, 62);
    ctx.font = '800 16px Nunito'; ctx.fillStyle = '#fde68a';
    ctx.fillText(`Dish ${Math.min(S.dish + 1, dishesTotal)} of ${dishesTotal} · Cooked ${S.done} · Burned ${S.burned}`, 640, 100);

    if (S.phase === 'pick') {
      drawPanel(ctx, 140, 120, 1000, 580, '🔍 Search a food', '#f59e0b');
      // search box
      ctx.fillStyle = '#1e293b'; rrect(ctx, 170, 168, 940, 48, 12); ctx.fill();
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; rrect(ctx, 170, 168, 940, 48, 12); ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillStyle = S.q ? '#fff' : '#64748b'; ctx.font = '900 26px Nunito';
      ctx.fillText(S.q ? S.q + '▌' : 'Tap letters to search…', 188, 193);
      ctx.textAlign = 'center'; ctx.fillStyle = '#cbd5e1'; ctx.font = '800 15px Nunito';
      if (S.q) ctx.fillText(S.list.length ? `${S.list.length} food${S.list.length === 1 ? '' : 's'} found — tap one to cook it!` : 'No food with those letters — try fewer letters', 640, 238);
      // letter keys
      const key = (label, x, y, w) => drawBtn(ctx, x, y, w, 44, label, '#334155', 'key', { ch: label });
      const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
      rows.forEach((row, r) => {
        const n = r === 2 ? row.length + 1 : row.length, w = 62, gap = 7, total = n * w + (n - 1) * gap;
        let x = 640 - total / 2;
        const y = 258 + r * 52;
        for (const ch of row) { key(ch, x, y, w); x += w + gap; }
        if (r === 2) key('⌫', x, y, w);
      });
      drawBtn(ctx, 640 - 200, 258 + 3 * 52, 190, 44, 'SPACE', '#334155', 'key', { ch: ' ' });
      drawBtn(ctx, 640 + 18, 258 + 3 * 52, 190, 44, '✕ CLEAR', '#334155', 'key', { ch: '✕' });
      // matching foods
      S.list.forEach((f, k) => {
        const col = k % 4, row = Math.floor(k / 4), x = 170 + col * 238, y = 470 + row * 96;
        ctx.fillStyle = '#1e293b'; rrect(ctx, x, y, 222, 84, 14); ctx.fill();
        ctx.font = '44px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.icon, x + 111, y + 34);
        ctx.fillStyle = '#fff'; ctx.font = "20px 'Lilita One'"; ctx.fillText(f.name, x + 111, y + 68);
        hits.push({ x, y, w: 222, h: 84, kind: 'food', food: f });
      });
      if (!S.q) { ctx.fillStyle = '#94a3b8'; ctx.font = '800 15px Nunito'; ctx.textAlign = 'center'; ctx.fillText('Tap a food to see its recipe!', 640, 672); }
    } else if (S.phase === 'recipe' && S.food) {
      const f = S.food, cost = foodCost(f);
      drawPanel(ctx, 140, 120, 1000, 580, `${f.icon} ${f.name} — Recipe`, '#f59e0b');
      ctx.textAlign = 'left'; ctx.fillStyle = '#fde68a'; ctx.font = "24px 'Lilita One'";
      ctx.fillText('How to cook it:', 180, 196);
      ctx.fillStyle = '#fff'; ctx.font = '800 19px Nunito';
      f.steps.forEach((s, i) => ctx.fillText(`${i + 1}. ${s}`, 180, 228 + i * 30));
      ctx.fillStyle = '#fde68a'; ctx.font = "24px 'Lilita One'";
      ctx.fillText('Ingredients — buy them at the Shopping Mall first!', 180, 228 + f.steps.length * 30 + 18);
      ctx.fillStyle = '#fff'; ctx.font = '800 19px Nunito';
      f.ingredients.forEach((g, i) => ctx.fillText(`${g.i} ${g.n} — ${fmtMoney(g.c)}`, 180, 228 + f.steps.length * 30 + 52 + i * 30));
      const ingY = 228 + f.steps.length * 30 + 52 + f.ingredients.length * 30;
      ctx.fillStyle = '#cbd5e1'; ctx.font = '800 16px Nunito';
      ctx.fillText(`Ingredients ${fmtMoney(cost.sub)} + tax ${fmtMoney(cost.tax)} = ${fmtMoney(cost.total)}`, 180, ingY + 8);
      ctx.fillStyle = '#a3e635'; ctx.font = '800 16px Nunito';
      ctx.fillText(`You have ${fmtMoney(Number(moneyOf(shop.profile ? shop.profile() : profile)) * 100)}`, 180, ingY + 32);
      const prof = shop.profile ? shop.profile() : profile;
      const afford = !!payPlan(prof, cost.total);
      drawBtn(ctx, 180, 600, 300, 56, '← Back', '#334155', 'back');
      drawBtn(ctx, 500, 600, 320, 56, S.bought ? '✓ Ingredients bought!' : S.buying ? 'Buying…' : `🛒 Buy — ${fmtMoney(cost.total)}`, S.bought ? '#16a34a' : afford ? '#ea580c' : '#475569', 'buy');
      drawBtn(ctx, 840, 600, 260, 56, 'Start cooking! 👨‍🍳', S.bought ? '#16a34a' : '#475569', 'cook');
      if (S.msg && S.msgT < 3) { ctx.fillStyle = S.msgColor; ctx.font = '800 18px Nunito'; ctx.textAlign = 'center'; ctx.fillText(S.msg, 640, 578); }
    } else if (S.phase === 'cook' && S.food) {
      const f = S.food, k = clamp(1 - S.timeLeft / TIME, 0, 1);
      drawPanel(ctx, 140, 120, 1000, 580, `${f.icon} Cooking ${f.name}!`, '#f59e0b');
      // timer / heat bar
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 180, 168, 920, 22, 11); ctx.fill();
      ctx.fillStyle = k > 0.65 ? '#ef4444' : k > 0.35 ? '#f59e0b' : '#4ade80'; rrect(ctx, 180, 168, 920 * (1 - k), 22, 11); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 20px Nunito'; ctx.textAlign = 'center';
      ctx.fillText(`⏱️ ${Math.max(0, Math.ceil(S.timeLeft))}s left — tap the steps in order!`, 640, 216);
      if (k > 0.65) { ctx.fillStyle = '#fca5a5'; ctx.font = '900 18px Nunito'; ctx.fillText('🔥 It is getting hot — hurry before it burns!', 640, 242); }
      // steps as buttons
      f.steps.forEach((s, i) => {
        const y = 262 + i * 76, done = i < S.step, cur = i === S.step;
        const bg = done ? '#16a34a' : cur ? '#ea580c' : '#1e293b';
        ctx.fillStyle = bg; rrect(ctx, 180, y, 920, 62, 14); ctx.fill();
        if (cur) { ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 4; rrect(ctx, 180, y, 920, 62, 14); ctx.stroke(); }
        ctx.fillStyle = '#fff'; ctx.font = "24px 'Lilita One'"; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${done ? '✓' : cur ? '👉' : `${i + 1}.`} ${s}`, 204, y + 32);
        hits.push({ x: 180, y, w: 920, h: 62, kind: 'step', step: i });
      });
      if (S.msg && S.msgT < 2.5) { ctx.fillStyle = S.msgColor; ctx.font = '800 18px Nunito'; ctx.textAlign = 'center'; ctx.fillText(S.msg, 640, 668); }
    } else if (S.phase === 'dishEnd') {
      drawBanner(ctx, S.msg, 640, 300, S.t, { size: 72, color: S.msgColor, glow: S.msgColor === '#a3e635' ? '#16a34a' : '#ef4444' });
      ctx.fillStyle = '#fff'; ctx.font = '800 20px Nunito'; ctx.textAlign = 'center';
      ctx.fillText(`Cooked ${S.done} · Burned ${S.burned} · Dish ${Math.min(S.dish + 1, dishesTotal)} of ${dishesTotal}`, 640, 380);
    } else if (S.phase === 'end') {
      drawBanner(ctx, S.msg, 640, 300, S.t, { size: 96, color: S.msgColor, glow: '#f59e0b' });
      ctx.fillStyle = '#fff'; ctx.font = '800 20px Nunito'; ctx.textAlign = 'center';
      ctx.fillText(`Dishes ${S.done} – ${S.burned} burned · Steps done ${S.stepsDone}`, 640, 380);
    }
    fx.draw(ctx);
    if (S.phase === 'pick' && S.t < 5)
      prompt(ctx, input.touchMode ? 'Tap letters to search a food, then tap it!' : 'Type to search a food, or tap one!');
  }
  function prompt(ctx, text) {
    ctx.font = '800 17px Nunito'; const w = ctx.measureText(text).width + 40;
    ctx.fillStyle = 'rgba(15,23,42,.8)'; rrect(ctx, 640 - w / 2, 672, w, 36, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 640, 690);
  }

  if (env.debug) env.debug({ S });
  // Test hook: lets a test read the game state (phase, picked food, timer).
  if (typeof window !== 'undefined') window.__cooking = { S, FOODS };
  audio.setCrowd(0.15);
  return { update, draw };
}

// ---------- menu thumbnail ----------
function drawThumb(ctx, w, h, t, view) {
  ctx.save();
  const s = Math.max(w / 1280, h / 720);
  if (!view) { ctx.translate((w - 1280 * s) / 2, (h - 720 * s) / 2); ctx.scale(s, s); }
  const g = ctx.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, '#7c2d12'); g.addColorStop(1, '#451a03');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = '#78350f'; ctx.fillRect(0, 560, 1280, 160);
  ctx.font = '200px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const foods = ['🍕', '🍔', '🍜', '🎂', '🍩'];
  ctx.fillText(foods[Math.floor(t / 1.5) % foods.length], 640, 300 + Math.sin(t * 2) * 12);
  ctx.font = "64px 'Lilita One'"; ctx.fillStyle = '#fde68a';
  ctx.fillText('COOKING!', 640, 520);
  ctx.restore();
}

export default {
  id: 'cooking',
  title: 'Cooking',
  tagline: 'Search a food, get the recipe, cook it before it burns!',
  desc: 'Search any food and get its recipe. Buy the ingredients at the Shopping Mall first, then tap the steps in order — but hurry, or oh no, your food is burned!',
  music: 'mall',
  labels: { a: 'PICK', b: 'COOK' },
  options: [
    { key: 'dishes', label: 'Dishes', default: 1, choices: [{ v: '1', label: '1 dish', sub: 'quick' }, { v: '2', label: '2 dishes', sub: 'standard' }, { v: '3', label: '3 dishes', sub: 'long' }] },
  ],
  howto: `<ul>
    <li>Search any food: tap the letters (or type) and tap a food to see its recipe.</li>
    <li>Buy the ingredients at the <b>Shopping Mall</b> first — tap the orange Buy button. It costs money, and 8% goes to Trevor.</li>
    <li>Then tap <b>Start cooking!</b> and tap the recipe steps <b>in order</b> before the timer runs out.</li>
    <li>Tapping the wrong step makes it burn faster. If the timer runs out — <b>🔥 oh no, your food is burned!</b></li>
    <li>Cook more dishes than you burn to win. Higher difficulty gives less time.</li>
  </ul>`,
  create,
  drawThumb,
};
