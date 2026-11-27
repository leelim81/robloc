// ROBLOC Cooking: search any food, get its recipe, buy the ingredients
// at the Shopping Mall, then cook it before it burns!
import { rrect } from '../art.js';
import { drawBanner } from '../fx.js';
import { moneyOf, payPlan, playerLevel, isOwnerName } from '../economy.js';

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
// Every food: what you need, and the steps to cook it.
// Ingredient prices are in cents; the Mall adds 8% tax (Trevor's cut).
// Trevor wanted 10,000 foods, not just 20! So there are 100 base
// dishes x 100 flavours = 10,000 foods. The first 20 bases are the
// original hand-written recipes; the other 80 bases get generated
// recipes (3 ingredients + 4 steps). Each flavour adds one extra
// ingredient to the recipe.
const BASE_FOODS = [
  { id: 'friedrice', name: 'Fried Rice', icon: '🍚', lv: 1, ingredients: [{ n: 'Rice', i: '🍚', c: 100 }, { n: 'Egg', i: '🥚', c: 80 }, { n: 'Peas', i: '🫛', c: 70 }, { n: 'Soy sauce', i: '🫙', c: 80 }], steps: ['Fry the egg', 'Add the rice', 'Add the peas', 'Pour on the soy sauce', 'Stir-fry it all!'] },
  { id: 'fries', name: 'Fries', icon: '🍟', lv: 2, ingredients: [{ n: 'Potato', i: '🥔', c: 80 }, { n: 'Salt', i: '🧂', c: 40 }, { n: 'Ketchup', i: '🍅', c: 60 }], steps: ['Cut the potato into sticks', 'Fry them till they are golden', 'Sprinkle on the salt', 'Add the ketchup', 'Crunchy and yummy!'] },
  { id: 'salad', name: 'Salad', icon: '🥗', lv: 2, ingredients: [{ n: 'Lettuce', i: '🥬', c: 70 }, { n: 'Tomato', i: '🍅', c: 70 }, { n: 'Cucumber', i: '🥒', c: 60 }, { n: 'Dressing', i: '🫙', c: 90 }], steps: ['Wash the lettuce', 'Chop the tomato', 'Slice the cucumber', 'Pour on the dressing', 'Toss it all together!'] },
  { id: 'sandwich', name: 'Sandwich', icon: '🥪', lv: 3, ingredients: [{ n: 'Bread', i: '🍞', c: 80 }, { n: 'Ham', i: '🍖', c: 150 }, { n: 'Cheese', i: '🧀', c: 120 }, { n: 'Lettuce', i: '🥬', c: 60 }], steps: ['Take two slices of bread', 'Add the ham', 'Add the cheese', 'Add the lettuce', 'Cut it in half!'] },
  { id: 'noodles', name: 'Noodles', icon: '🍜', lv: 3, ingredients: [{ n: 'Noodles', i: '🍝', c: 110 }, { n: 'Broth', i: '🍲', c: 130 }, { n: 'Egg', i: '🥚', c: 80 }, { n: 'Spring onion', i: '🧅', c: 50 }], steps: ['Boil the noodles', 'Heat the broth', 'Add the egg', 'Sprinkle the spring onion', 'Serve it hot!'] },
  { id: 'pancakes', name: 'Pancakes', icon: '🥞', lv: 4, ingredients: [{ n: 'Flour', i: '🌾', c: 90 }, { n: 'Egg', i: '🥚', c: 80 }, { n: 'Milk', i: '🥛', c: 70 }, { n: 'Syrup', i: '🍯', c: 110 }], steps: ['Mix the flour and egg', 'Pour in the milk', 'Fry the pancakes', 'Pour on the syrup', 'Stack them high!'] },
  { id: 'hotdog', name: 'Hot Dog', icon: '🌭', lv: 4, ingredients: [{ n: 'Bun', i: '🍞', c: 90 }, { n: 'Sausage', i: '🌭', c: 160 }, { n: 'Ketchup', i: '🍅', c: 60 }, { n: 'Mustard', i: '🟡', c: 60 }], steps: ['Toast the bun', 'Grill the sausage', 'Add the ketchup', 'Add the mustard', 'Eat it while it is hot!'] },
  { id: 'smoothie', name: 'Smoothie', icon: '🥤', lv: 5, ingredients: [{ n: 'Banana', i: '🍌', c: 80 }, { n: 'Milk', i: '🥛', c: 70 }, { n: 'Yogurt', i: '🍶', c: 100 }, { n: 'Honey', i: '🍯', c: 110 }], steps: ['Peel the banana', 'Pour in the milk', 'Add the yogurt and honey', 'Blend it all up', 'Pour it in a glass!'] },
  { id: 'soup', name: 'Soup', icon: '🍲', lv: 5, ingredients: [{ n: 'Broth', i: '🍲', c: 120 }, { n: 'Carrot', i: '🥕', c: 60 }, { n: 'Potato', i: '🥔', c: 70 }, { n: 'Noodles', i: '🍝', c: 100 }], steps: ['Heat the broth', 'Add the carrot', 'Add the potato', 'Add the noodles', 'Simmer till it is yummy!'] },
  { id: 'cookies', name: 'Cookies', icon: '🍪', lv: 6, ingredients: [{ n: 'Flour', i: '🌾', c: 90 }, { n: 'Butter', i: '🧈', c: 130 }, { n: 'Sugar', i: '🍬', c: 80 }, { n: 'Chocolate chips', i: '🍫', c: 140 }], steps: ['Mix the flour and sugar', 'Stir in the butter', 'Add the chocolate chips', 'Bake them in the oven', 'Let them cool — yummy!'] },
  { id: 'spaghetti', name: 'Spaghetti', icon: '🍝', lv: 6, ingredients: [{ n: 'Pasta', i: '🍝', c: 110 }, { n: 'Tomato sauce', i: '🍅', c: 90 }, { n: 'Meatballs', i: '🧆', c: 180 }, { n: 'Cheese', i: '🧀', c: 120 }], steps: ['Boil the pasta', 'Heat the tomato sauce', 'Add the meatballs', 'Sprinkle the cheese', 'Twirl it on your fork!'] },
  { id: 'tacos', name: 'Tacos', icon: '🌮', lv: 7, ingredients: [{ n: 'Tortilla', i: '🫓', c: 90 }, { n: 'Beef', i: '🥩', c: 190 }, { n: 'Cheese', i: '🧀', c: 120 }, { n: 'Lettuce', i: '🥬', c: 60 }, { n: 'Salsa', i: '🌶️', c: 80 }], steps: ['Warm the tortilla', 'Fry the beef', 'Add the cheese', 'Add the lettuce and salsa', 'Fold it up!'] },
  { id: 'dumplings', name: 'Dumplings', icon: '🥟', lv: 7, ingredients: [{ n: 'Wrapper', i: '🥟', c: 100 }, { n: 'Pork', i: '🥩', c: 180 }, { n: 'Cabbage', i: '🥬', c: 60 }, { n: 'Soy sauce', i: '🫙', c: 80 }], steps: ['Mix the pork and cabbage', 'Fill the wrappers', 'Pinch them closed', 'Steam the dumplings', 'Dip in soy sauce!'] },
  { id: 'sushi', name: 'Sushi', icon: '🍣', lv: 8, ingredients: [{ n: 'Rice', i: '🍚', c: 100 }, { n: 'Fish', i: '🐟', c: 220 }, { n: 'Seaweed', i: '🌿', c: 90 }], steps: ['Cook the rice', 'Slice the fish', 'Roll it in seaweed', 'Cut into pieces', 'Serve with soy sauce!'] },
  { id: 'burger', name: 'Burger', icon: '🍔', lv: 8, ingredients: [{ n: 'Bun', i: '🍞', c: 90 }, { n: 'Beef patty', i: '🥩', c: 200 }, { n: 'Lettuce', i: '🥬', c: 60 }, { n: 'Cheese', i: '🧀', c: 120 }, { n: 'Tomato', i: '🍅', c: 70 }], steps: ['Toast the bun', 'Fry the beef patty', 'Add the lettuce', 'Add the cheese and tomato', 'Put it all together!'] },
  { id: 'icecream', name: 'Ice Cream', icon: '🍦', lv: 9, ingredients: [{ n: 'Milk', i: '🥛', c: 80 }, { n: 'Sugar', i: '🍬', c: 80 }, { n: 'Vanilla', i: '🌸', c: 120 }, { n: 'Sprinkles', i: '✨', c: 90 }], steps: ['Mix the milk and sugar', 'Add the vanilla', 'Freeze it till it is cold', 'Add the sprinkles', 'Scoop it into a cone!'] },
  { id: 'donut', name: 'Donut', icon: '🍩', lv: 9, ingredients: [{ n: 'Dough', i: '🍞', c: 110 }, { n: 'Sugar', i: '🍬', c: 80 }, { n: 'Frosting', i: '🍦', c: 130 }, { n: 'Sprinkles', i: '✨', c: 90 }], steps: ['Shape the dough into a ring', 'Fry it till it is golden', 'Dip it in frosting', 'Add the sprinkles', 'Take a big bite!'] },
  { id: 'curry', name: 'Curry', icon: '🍛', lv: 10, ingredients: [{ n: 'Rice', i: '🍚', c: 100 }, { n: 'Curry sauce', i: '🍛', c: 150 }, { n: 'Chicken', i: '🍗', c: 200 }, { n: 'Potato', i: '🥔', c: 70 }], steps: ['Cook the rice', 'Fry the chicken', 'Add the potato', 'Pour on the curry sauce', 'Serve it with rice!'] },
  { id: 'pizza', name: 'Pizza', icon: '🍕', lv: 10, ingredients: [{ n: 'Dough', i: '🍞', c: 120 }, { n: 'Tomato sauce', i: '🍅', c: 80 }, { n: 'Cheese', i: '🧀', c: 150 }, { n: 'Pepperoni', i: '🍖', c: 180 }], steps: ['Roll the dough', 'Spread the tomato sauce', 'Add the cheese', 'Add the pepperoni', 'Bake it in the oven!'] },
  { id: 'cake', name: 'Cake', icon: '🎂', lv: 11, ingredients: [{ n: 'Flour', i: '🌾', c: 100 }, { n: 'Egg', i: '🥚', c: 80 }, { n: 'Sugar', i: '🍬', c: 90 }, { n: 'Butter', i: '🧈', c: 140 }, { n: 'Frosting', i: '🍦', c: 150 }], steps: ['Mix the flour, egg and sugar', 'Stir in the butter', 'Bake the cake', 'Spread the frosting', 'Put on the candles!'] },
];
// 80 more base dishes: [name, icon, level, main ingredient].
// Each gets 3 ingredients (the main + 2 from the pool) and 4 steps.
const EXTRA_BASES = [
  ['Pasta', '🍝', 3, 'Pasta'], ['Ramen', '🍜', 4, 'Noodles'], ['Pho', '🍲', 5, 'Noodles'],
  ['Udon', '🍜', 4, 'Noodles'], ['Pad Thai', '🍜', 6, 'Noodles'], ['Lasagne', '🍝', 7, 'Pasta'],
  ['Macaroni', '🧀', 2, 'Pasta'], ['Risotto', '🍚', 6, 'Rice'], ['Paella', '🥘', 7, 'Rice'],
  ['Biryani', '🍛', 7, 'Rice'], ['Spring Rolls', '🌯', 3, 'Wrapper'], ['Wonton', '🥟', 4, 'Wrapper'],
  ['Gyoza', '🥟', 4, 'Wrapper'], ['Bao', '🥟', 3, 'Bun'], ['Banh Mi', '🥖', 4, 'Bread'],
  ['Kebab', '🍢', 4, 'Meat'], ['Shawarma', '🌯', 5, 'Meat'], ['Falafel', '🧆', 4, 'Chickpeas'],
  ['Hummus', '🫙', 3, 'Chickpeas'], ['Nachos', '🧀', 3, 'Chips'], ['Quesadilla', '🫓', 4, 'Tortilla'],
  ['Burrito', '🌯', 5, 'Tortilla'], ['Enchilada', '🌮', 6, 'Tortilla'], ['Fajita', '🫓', 5, 'Chicken'],
  ['Chilli', '🌶️', 4, 'Beans'], ['Stew', '🍲', 5, 'Beef'], ['Roast Chicken', '🍗', 6, 'Chicken'],
  ['Grilled Fish', '🐟', 6, 'Fish'], ['Salmon', '🍣', 7, 'Fish'], ['Steak', '🥩', 7, 'Beef'],
  ['Meatballs', '🧆', 5, 'Beef'], ['Sausage', '🌭', 3, 'Sausage'], ['Omelette', '🍳', 2, 'Egg'],
  ['Scrambled Eggs', '🍳', 2, 'Egg'], ['French Toast', '🍞', 3, 'Bread'], ['Waffles', '🧇', 3, 'Flour'],
  ['Crepes', '🥞', 4, 'Flour'], ['Muffins', '🧁', 4, 'Flour'], ['Brownies', '🍫', 4, 'Chocolate'],
  ['Cheesecake', '🍰', 6, 'Cheese'], ['Pudding', '🍮', 4, 'Milk'], ['Custard', '🍮', 3, 'Milk'],
  ['Jelly', '🍧', 2, 'Sugar'], ['Fruit Salad', '🍓', 2, 'Fruit'], ['Yogurt', '🍦', 2, 'Milk'],
  ['Granola', '🥣', 3, 'Oats'], ['Cereal', '🥣', 1, 'Milk'], ['Porridge', '🥣', 2, 'Oats'],
  ['Congee', '🍚', 3, 'Rice'], ['Miso Soup', '🍲', 3, 'Broth'], ['Tomato Soup', '🍅', 2, 'Tomato'],
  ['Pumpkin Soup', '🎃', 4, 'Pumpkin'], ['Chicken Soup', '🍲', 3, 'Chicken'], ['Beef Stew', '🥩', 6, 'Beef'],
  ['Lamb Curry', '🍛', 7, 'Lamb'], ['Fish Curry', '🐟', 6, 'Fish'], ['Veg Curry', '🥦', 7, 'Veggies'],
  ['Butter Chicken', '🍗', 7, 'Chicken'], ['Tikka Masala', '🍛', 8, 'Chicken'], ['Naan', '🫓', 3, 'Flour'],
  ['Roti', '🫓', 2, 'Flour'], ['Samosa', '🥟', 4, 'Potato'], ['Pakora', '🧆', 4, 'Chickpeas'],
  ['Tempura', '🍤', 5, 'Shrimp'], ['Sushi Roll', '🍣', 6, 'Rice'], ['Sashimi', '🍣', 7, 'Fish'],
  ['Onigiri', '🍙', 3, 'Rice'], ['Bento', '🍱', 6, 'Rice'], ['Bibimbap', '🍚', 6, 'Rice'],
  ['Kimchi', '🥬', 4, 'Cabbage'], ['Bulgogi', '🥩', 7, 'Beef'], ['Teriyaki', '🍗', 6, 'Chicken'],
  ['Yakitori', '🍢', 5, 'Chicken'], ['Okonomiyaki', '🥞', 6, 'Flour'], ['Takoyaki', '🐙', 5, 'Octopus'],
  ['Laksa', '🍜', 6, 'Noodles'], ['Nasi Lemak', '🍚', 5, 'Rice'], ['Rendang', '🥩', 8, 'Beef'],
  ['Satay', '🍢', 5, 'Chicken'], ['Pho Bo', '🍜', 6, 'Beef'],
];
const INGREDIENT_POOL = [
  ['Rice', '🍚', 100], ['Chicken', '🍗', 200], ['Beef', '🥩', 250], ['Fish', '🐟', 180],
  ['Egg', '🥚', 80], ['Cheese', '🧀', 120], ['Tomato', '🍅', 70], ['Onion', '🧅', 40],
  ['Garlic', '🧄', 30], ['Chilli', '🌶️', 35], ['Potato', '🥔', 45], ['Carrot', '🥕', 40],
  ['Lettuce', '🥬', 50], ['Bread', '🍞', 80], ['Flour', '🌾', 60], ['Milk', '🥛', 90],
  ['Butter', '🧈', 110], ['Sugar', '🍬', 30], ['Salt', '🧂', 20], ['Pepper', '🌶️', 25],
  ['Mushroom', '🍄', 90], ['Corn', '🌽', 55], ['Peas', '🫛', 50], ['Beans', '🫘', 45],
  ['Noodles', '🍜', 70], ['Pasta', '🍝', 75], ['Sauce', '🥫', 85], ['Oil', '🫗', 40],
  ['Lemon', '🍋', 50], ['Apple', '🍎', 60],
];
function extraBaseFood(entry, i) {
  const [name, icon, lv, main] = entry;
  const id = name.toLowerCase().replace(/[^a-z]/g, '');
  const p1 = INGREDIENT_POOL[(i * 7 + 3) % INGREDIENT_POOL.length];
  const p2 = INGREDIENT_POOL[(i * 13 + 5) % INGREDIENT_POOL.length];
  return {
    id, name, icon, lv,
    ingredients: [{ n: main, i: icon, c: 120 }, { n: p1[0], i: p1[1], c: p1[2] }, { n: p2[0], i: p2[1], c: p2[2] }],
    steps: [`Chop the ${main.toLowerCase()}`, `Stir in the ${p1[0].toLowerCase()}`, `Cook the ${name} well`, `Serve the ${name}!`],
  };
}
const ALL_BASES = [...BASE_FOODS, ...EXTRA_BASES.map((e, i) => extraBaseFood(e, i))];
// 100 flavours (the empty one = the plain base dish).
const MODIFIERS = ['', 'Spicy', 'Cheesy', 'Crispy', 'Sweet', 'Sour', 'Salty', 'Hot', 'Mild', 'BBQ',
  'Honey', 'Garlic', 'Butter', 'Herb', 'Lemon', 'Tomato', 'Mushroom', 'Chicken', 'Beef', 'Pork',
  'Fish', 'Veggie', 'Golden', 'Rainbow', 'Giant', 'Tiny', 'Mega', 'Super', 'Double', 'Triple',
  'Deluxe', 'Special', 'Royal', 'Magic', 'Lucky', 'Happy', 'Sunny', 'Moon', 'Star', 'Fire',
  'Ice', 'Thunder', 'Ocean', 'Mountain', 'Forest', 'Desert', 'Jungle', 'Snow', 'Rain', 'Wind',
  'Cloud', 'Dream', 'Night', 'Morning', 'Evening', 'Summer', 'Winter', 'Spring', 'Autumn', 'Fresh',
  'Tasty', 'Yummy', 'Delicious', 'Crunchy', 'Soft', 'Fluffy', 'Creamy', 'Juicy', 'Smoky', 'Grilled',
  'Baked', 'Fried', 'Steamed', 'Roasted', 'Boiled', 'Chilled', 'Warm', 'Toasty', 'Spiced', 'Zesty',
  'Tangy', 'Savory', 'Rich', 'Light', 'Healthy', 'Fancy', 'Silly', 'Funny', 'Brave', 'Fast',
  'Slow', 'Big', 'Small', 'Red', 'Green', 'Blue', 'Pink', 'Purple', 'Orange', 'Yellow'];
// 100 bases x 100 flavours = 10,000 foods. Flavour-major order, so
// browsing shows different dishes on each page (page 1 = the 100
// plain dishes, then Spicy, Cheesy, ...).
const FOODS = [];
for (const mod of MODIFIERS) {
  for (const base of ALL_BASES) {
    if (!mod) { FOODS.push(base); continue; }
    FOODS.push({
      id: base.id + '_' + mod.toLowerCase(),
      name: mod + ' ' + base.name,
      icon: base.icon,
      lv: base.lv,
      ingredients: [...base.ingredients, { n: mod, i: '⭐', c: 30 }],
      steps: base.steps,
    });
  }
}
const fmtMoney = c => '$' + (c / 100).toFixed(2);

// Cooking Mama actions: every recipe step becomes something you DO
// with your hands. The action is read from the step's wording.
function actionFor(step) {
  const t = step.toLowerCase();
  if (/chop|slice|cut/.test(t)) return { type: 'chop', icon: '🔪', verb: 'CHOP', taps: 5 };
  if (/stir|mix|toss|blend/.test(t)) return { type: 'stir', icon: '🥄', verb: 'STIR', taps: 6 };
  if (/fry|grill|bake|boil|steam|heat|simmer|freeze|toast|warm/.test(t)) return { type: 'cook', icon: '🔥', verb: 'COOK', taps: 4 };
  if (/roll|shape|fold|pinch/.test(t)) return { type: 'shape', icon: '✋', verb: 'SHAPE', taps: 3 };
  return { type: 'add', icon: '👉', verb: 'ADD', taps: 1 };
}

// ---------- game ----------
function create(env) {
  const { input, audio, fx, options, profile, shop } = env;
  const D = options.boost ? DIFF.boost : options.tough ? DIFF.tough : (DIFF[options.difficulty] || DIFF.rookie);
  // Superpowers: Speed = 50% more time to cook, Power = wrong taps never
  // burn the food, and the timer runs a little slower too.
  const TIME = D.time * (options.power === 'speed' ? 1.5 : options.power === 'power' ? 1.2 : 1);
  const WRONG_COST = options.power === 'power' ? 0 : 5;
  const dishesTotal = +(options.dishes || 2);
  // Trevor can cook ANY food. Everyone else starts with only rice
  // (Fried Rice, lv 1) and unlocks more foods as they level up.
  const isOwner = isOwnerName(profile?.name);
  const myLevel = (() => { try { return playerLevel(profile || {}).level || 1; } catch (e) { return 1; } })();
  const canCook = f => isOwner || (f.lv || 1) <= myLevel;
  const S = { phase: 'pick', t: 0, q: '', qPrev: null, list: FOODS.slice(), page: 0, keysDown: null, food: null, dish: 0, done: 0, burned: 0, stepsDone: 0, step: 0, act: 0, timeLeft: TIME, msg: null, msgT: 0, msgColor: '#fff', bought: false, buying: false, labelKey: '', reported: false };

  function runSearch() {
    if (S.q === S.qPrev) return;
    S.qPrev = S.q;
    S.page = 0;
    const q = S.q.trim().toLowerCase();
    S.list = q ? FOODS.filter(f => f.name.toLowerCase().includes(q)) : FOODS.slice();
  }
  function searchKey(ch) {
    if (ch === '⌫') S.q = S.q.slice(0, -1);
    else if (ch === '✕') S.q = '';
    else if (S.q.length < 16) S.q += ch;
    audio.play('tick');
  }
  function pickFood(f) {
    if (!canCook(f)) { S.msg = `🔒 Reach level ${f.lv} to cook ${f.name}!`; S.msgT = 0; S.msgColor = '#fca5a5'; audio.play('fault'); return; }
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
    S.phase = 'cook'; S.t = 0; S.step = 0; S.act = 0; S.timeLeft = TIME; S.msg = null;
    audio.play('select');
  }
  // Do one tap of the current Cooking Mama action. When the action's
  // taps are done, the step is finished and the next one starts.
  function doAction() {
    const f = S.food, act = actionFor(f.steps[S.step]);
    S.act++;
    audio.play('click');
    fx.sparks(400, 420, 6);
    if (S.act >= act.taps) {
      S.step++; S.act = 0;
      audio.play('point');
      if (S.step >= f.steps.length) dishDone();
    }
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
    S.phase = 'pick'; S.t = 0; S.q = ''; S.qPrev = null; S.list = FOODS.slice(); S.food = null; S.msg = null;
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
        if (i >= 0) { const h = hits[i]; if (h.kind === 'key') searchKey(h.ch); else if (h.kind === 'food') pickFood(h.food); else if (h.kind === 'pageback' && S.page > 0) { S.page--; audio.play('tick'); } else if (h.kind === 'pagenext') { const pc = Math.max(1, Math.ceil(S.list.length / 20)); if (S.page < pc - 1) { S.page++; audio.play('tick'); } } break; }
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
          if (h.kind === 'action' || (h.kind === 'step' && h.step === S.step)) {
            doAction();
            if (S.phase !== 'cook') break;
          } else if (h.kind === 'step') {
            S.timeLeft -= WRONG_COST; S.msg = WRONG_COST ? 'Wrong step! Careful — it is burning!' : 'Wrong step!'; S.msgT = 0; S.msgColor = '#fca5a5'; audio.play('fault');
          }
          break;
        }
      }
      if (S.phase === 'cook' && S.timeLeft <= 0) dishBurned();
    } else if (S.phase === 'dishEnd') {
      if (S.t > 2.2) nextDish();
    } else if (S.phase === 'end') {
      // Save the reward RIGHT AWAY (no long wait). Trevor: "when I
      // earnsed $3 I have $7 it doesn't make $10" — the old 2.6s wait
      // meant the reward was not saved yet (or never, if he left the
      // game early), so $7 + $3 stayed $7 instead of becoming $10.
      if (!S.reported) { S.reported = true; report(); }
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
    ctx.fillText(`Dish ${Math.min(S.dish + 1, dishesTotal)} of ${dishesTotal} · Cooked ${S.done} · Burned ${S.burned} · You are level ${myLevel}${isOwner ? ' · Trevor can cook anything!' : ''}`, 640, 100);

    if (S.phase === 'pick') {
      drawPanel(ctx, 140, 120, 1000, 580, '🔍 Search a food', '#f59e0b');
      // search box
      ctx.fillStyle = '#1e293b'; rrect(ctx, 170, 168, 940, 48, 12); ctx.fill();
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; rrect(ctx, 170, 168, 940, 48, 12); ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillStyle = S.q ? '#fff' : '#64748b'; ctx.font = '900 26px Nunito';
      ctx.fillText(S.q ? S.q + '▌' : 'Tap letters to search…', 188, 193);
      ctx.textAlign = 'center'; ctx.fillStyle = '#cbd5e1'; ctx.font = '800 15px Nunito';
      const pageCount = Math.max(1, Math.ceil(S.list.length / 20));
      ctx.fillText(S.q ? (S.list.length ? `${S.list.length} food${S.list.length === 1 ? '' : 's'} found — tap one to cook it! · Page ${S.page + 1}/${pageCount}` : 'No food with those letters — try fewer letters') : `${FOODS.length} foods — tap one to cook it! · Page ${S.page + 1}/${pageCount}`, 640, 228);
      // letter keys (compact, so all 20 foods fit below)
      const key = (label, x, y, w) => drawBtn(ctx, x, y, w, 36, label, '#334155', 'key', { ch: label });
      const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
      rows.forEach((row, r) => {
        const n = r === 2 ? row.length + 1 : row.length, w = 62, gap = 7, total = n * w + (n - 1) * gap;
        let x = 640 - total / 2;
        const y = 238 + r * 42;
        for (const ch of row) { key(ch, x, y, w); x += w + gap; }
        if (r === 2) key('⌫', x, y, w);
      });
      drawBtn(ctx, 640 - 200, 238 + 3 * 42, 190, 36, 'SPACE', '#334155', 'key', { ch: ' ' });
      drawBtn(ctx, 640 + 18, 238 + 3 * 42, 190, 36, '✕ CLEAR', '#334155', 'key', { ch: '✕' });
      // matching foods — 20 per page, 5 across x 4 down, so they all
      // fit on the screen at once (no row is cut off). Tap Next to see
      // more foods — there are 10,000 of them!
      const pageFoods = S.list.slice(S.page * 20, S.page * 20 + 20);
      pageFoods.forEach((f, k) => {
        const col = k % 5, row = Math.floor(k / 5), x = 170 + col * 190, y = 402 + row * 68;
        const locked = !canCook(f);
        ctx.fillStyle = locked ? '#0f172a' : '#1e293b'; rrect(ctx, x, y, 182, 60, 12); ctx.fill();
        if (locked) { ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; rrect(ctx, x, y, 182, 60, 12); ctx.stroke(); }
        ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(locked ? '🔒' : f.icon, x + 91, y + 26);
        ctx.fillStyle = locked ? '#64748b' : '#fff'; ctx.font = "16px 'Lilita One'"; ctx.fillText(locked ? `Lv ${f.lv} · ${f.name}` : f.name, x + 91, y + 50);
        hits.push({ x, y, w: 182, h: 60, kind: 'food', food: f });
      });
      if (pageCount > 1) {
        drawBtn(ctx, 170, 670, 140, 26, S.page > 0 ? '◀ Back' : '◀ Back', S.page > 0 ? '#ea580c' : '#475569', 'pageback');
        drawBtn(ctx, 970, 670, 140, 26, S.page < pageCount - 1 ? 'Next ▶' : 'Next ▶', S.page < pageCount - 1 ? '#ea580c' : '#475569', 'pagenext');
      }
      if (S.msg && S.msgT < 3 && S.phase === 'pick') { ctx.fillStyle = S.msgColor; ctx.font = '800 18px Nunito'; ctx.textAlign = 'center'; ctx.fillText(S.msg, 640, 672); }
      if (!S.q) { ctx.fillStyle = '#94a3b8'; ctx.font = '800 15px Nunito'; ctx.textAlign = 'center'; ctx.fillText('Tap a food to see its recipe!', 640, 690); }
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
      const act = actionFor(f.steps[S.step] || '');
      drawPanel(ctx, 140, 120, 1000, 580, `${f.icon} Cooking ${f.name}!`, '#f59e0b');
      // timer / heat bar
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 180, 168, 920, 22, 11); ctx.fill();
      ctx.fillStyle = k > 0.65 ? '#ef4444' : k > 0.35 ? '#f59e0b' : '#4ade80'; rrect(ctx, 180, 168, 920 * (1 - k), 22, 11); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 20px Nunito'; ctx.textAlign = 'center';
      ctx.fillText(`⏱️ ${Math.max(0, Math.ceil(S.timeLeft))}s left`, 640, 212);
      if (k > 0.65) { ctx.fillStyle = '#fca5a5'; ctx.font = '900 18px Nunito'; ctx.fillText('🔥 It is getting hot — hurry before it burns!', 640, 238); }
      // The big plate: you SEE the food being made. It starts EMPTY
      // (the food is NOT already cooked!) — each step you finish puts
      // its ingredient on the plate, and the finished dish only
      // appears when every step is done.
      ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(400, 430, 210, 130, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.ellipse(400, 430, 170, 100, 0, 0, Math.PI * 2); ctx.fill();
      ctx.font = '110px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (S.step >= f.steps.length) ctx.fillText(f.icon, 400, 420);
      f.ingredients.forEach((g, i) => {
        if (i >= S.step) return;
        const a = -Math.PI / 2 + (i / Math.max(1, f.ingredients.length)) * Math.PI * 2;
        ctx.font = '44px sans-serif';
        ctx.fillText(g.i, 400 + Math.cos(a) * 150, 430 + Math.sin(a) * 88);
      });
      // The plate is the big tap target: tap it to do the action.
      hits.push({ x: 190, y: 300, w: 420, h: 260, kind: 'action' });
      // The current ingredient + what to do with it (Cooking Mama style).
      const curIng = f.ingredients[Math.min(S.step, f.ingredients.length - 1)];
      ctx.font = '64px sans-serif'; ctx.fillText(curIng.i, 400, 300 + Math.sin(S.t * 3) * 6);
      ctx.fillStyle = '#fff'; ctx.font = "30px 'Lilita One'";
      ctx.fillText(`${act.icon} ${act.verb}! ${f.steps[S.step]}`, 400, 596);
      ctx.fillStyle = '#cbd5e1'; ctx.font = '800 16px Nunito';
      ctx.fillText(`Tap the plate ${act.taps} time${act.taps === 1 ? '' : 's'}!`, 400, 624);
      // action progress bar
      ctx.fillStyle = 'rgba(255,255,255,.15)'; rrect(ctx, 250, 640, 300, 18, 9); ctx.fill();
      ctx.fillStyle = '#4ade80'; rrect(ctx, 250, 640, 300 * clamp(S.act / act.taps, 0, 1), 18, 9); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 16px Nunito'; ctx.textAlign = 'left';
      ctx.fillText(`${S.act}/${act.taps}`, 560, 650);
      // the recipe steps, on the right (tap the current one to do it too)
      f.steps.forEach((s, i) => {
        const y = 262 + i * 62, done = i < S.step, cur = i === S.step;
        const bg = done ? '#16a34a' : cur ? '#ea580c' : '#1e293b';
        ctx.fillStyle = bg; rrect(ctx, 660, y, 440, 50, 12); ctx.fill();
        if (cur) { ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3; rrect(ctx, 660, y, 440, 50, 12); ctx.stroke(); }
        ctx.fillStyle = '#fff'; ctx.font = "20px 'Lilita One'"; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const a2 = actionFor(s);
        ctx.fillText(`${done ? '✓' : cur ? `${a2.icon}` : `${i + 1}.`} ${s}`, 676, y + 26);
        hits.push({ x: 660, y, w: 440, h: 50, kind: 'step', step: i });
      });
      if (S.msg && S.msgT < 2.5) { ctx.fillStyle = S.msgColor; ctx.font = '800 18px Nunito'; ctx.textAlign = 'center'; ctx.fillText(S.msg, 640, 682); }
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
  // Test hook: lets a test read the game state (phase, picked food, timer, level gate).
  if (typeof window !== 'undefined') window.__cooking = { S, FOODS, ALL_BASES, MODIFIERS, canCook, myLevel, isOwner };
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
  desc: 'Cook like Cooking Mama! Search any of 10,000 foods and get its recipe. Trevor can cook anything! Everyone else starts with only rice and unlocks more foods as they level up. Buy the ingredients at the Shopping Mall first, then SEE the food on the plate and COOK it with your hands — chop, stir, fry and more — before it burns!',
  music: 'mall',
  labels: { a: 'PICK', b: 'COOK' },
  options: [
    { key: 'dishes', label: 'Dishes', default: 1, choices: [{ v: '1', label: '1 dish', sub: 'quick' }, { v: '2', label: '2 dishes', sub: 'standard' }, { v: '3', label: '3 dishes', sub: 'long' }, { v: '5', label: '5 dishes', sub: 'feast' }] },
  ],
  howto: `<ul>
    <li>Search any of <b>10,000 foods</b>: tap the letters (or type) and tap a food to see its recipe. Or tap <b>Next ▶</b> to flip through the pages — there are 500 pages of food! <b>Trevor can cook anything!</b> Everyone else starts with only <b>rice</b> and unlocks more foods as they level up — reach a higher level to cook more!</li>
    <li>Buy the ingredients at the <b>Shopping Mall</b> first — tap the orange Buy button. It costs money, and 8% goes to Trevor.</li>
    <li>Then tap <b>Start cooking!</b> — like Cooking Mama, you <b>SEE the food on the plate</b> and cook it with your hands: <b>tap the plate</b> to chop 🔪, stir 🥄, fry 🔥, shape ✋ and add 👉 each step, in order, before the timer runs out.</li>
    <li>Tapping the wrong step makes it burn faster. If the timer runs out — <b>🔥 oh no, your food is burned!</b></li>
    <li>Cook more dishes than you burn to win. Higher difficulty gives less time.</li>
  </ul>`,
  create,
  drawThumb,
};
