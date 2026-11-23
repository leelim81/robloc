// Shared progression: points, coins, levels and achievement badges.
// Every mini game reports a match result here; this file decides the rewards.

export const DIFF_MULT = { rookie: 1, pro: 1.5, legend: 2 };
export const MAX_POINTS_PER_MATCH = 600;   // keep in sync with firestore.rules (limit 1000)
export const MAX_COINS_PER_MATCH = 250;    // keep in sync with firestore.rules (limit 500)

// Superpowers: dollars AND coins buy a power for a match, like a real
// game. Every power has its own dollar price and its own coin price, and
// the two are the same number (1 coin = $1 in this game). Spend both
// before a match to get a power for that match.
// Shield = lose but still earn the draw reward. Speed = move 50% faster.
// Power = shots and hits 50% stronger. Double Points = earn double points.
// Double Coins = earn double coins.
export const SUPERPOWERS = [
  { id: 'none',   name: 'None',          icon: '🚫', cost: 0,   dollars: 0,   desc: 'No superpower.' },
  { id: 'shield', name: 'Shield',        icon: '🛡️', cost: 25,  dollars: 25,  desc: 'Lose a match but still earn the draw reward.' },
  { id: 'speed',  name: 'Speed',         icon: '⚡', cost: 50,  dollars: 50,  desc: 'Run and move 50% faster.' },
  { id: 'power',  name: 'Power',         icon: '💪', cost: 75,  dollars: 75,  desc: 'Shots and hits 50% stronger.' },
  { id: 'double', name: 'Double Points', icon: '⭐', cost: 100, dollars: 100, desc: 'Earn double points this match.' },
  { id: 'lucky',  name: 'Double Coins',  icon: '🍀', cost: 150, dollars: 150, desc: 'Earn double coins this match.' },
];

export const BADGES = [
  { id: 'welcome',         name: 'Welcome Aboard',     desc: 'Create your ROBLOC player.',                 icon: '👋', color: '#38bdf8' },
  { id: 'first_match',     name: 'Kickoff',            desc: 'Finish your first match in any game.',       icon: '🎮', color: '#818cf8' },
  { id: 'soccer_goal',     name: 'First Goal',         desc: 'Score a goal in Soccer.',                    icon: '⚽', color: '#22c55e' },
  { id: 'soccer_win',      name: 'Pitch Champion',     desc: 'Win a Soccer match.',                        icon: '🏆', color: '#16a34a' },
  { id: 'soccer_hattrick', name: 'Hat Trick Hero',     desc: 'Score 3 goals yourself in one Soccer match.', icon: '🎩', color: '#0d9488' },
  { id: 'soccer_clean',    name: 'Brick Wall',         desc: 'Win a Soccer match without conceding.',      icon: '🧱', color: '#b45309' },
  { id: 'soccer_legend',   name: 'Legend Slayer',      desc: 'Beat Legend difficulty in Soccer.',          icon: '🐉', color: '#dc2626' },
  { id: 'pb_win',          name: 'Paddle Pro',         desc: 'Win a Pickleball game.',                     icon: '🏓', color: '#2563eb' },
  { id: 'pb_ace',          name: 'Ace!',               desc: 'Win a point with a serve nobody returns.',   icon: '🎯', color: '#7c3aed' },
  { id: 'pb_rally',        name: 'Rally Master',       desc: 'Play a 12-shot rally in Pickleball.',        icon: '🔁', color: '#0891b2' },
  { id: 'pb_shutout',      name: 'Pickle Shutout',     desc: 'Win a Pickleball game without losing a point.', icon: '🥒', color: '#65a30d' },
  { id: 'pb_legend',       name: 'Kitchen King',       desc: 'Beat Legend difficulty in Pickleball.',      icon: '👑', color: '#ca8a04' },
  { id: 'bb_hit',          name: 'Base Hit',           desc: 'Get a hit in Baseball.',                     icon: '⚾', color: '#ea580c' },
  { id: 'bb_homer',        name: 'Out of the Park',    desc: 'Hit a home run in Baseball.',                icon: '🚀', color: '#f59e0b' },
  { id: 'bb_win',          name: 'Diamond Champ',      desc: 'Win a Baseball game.',                       icon: '💎', color: '#0284c7' },
  { id: 'bb_k',            name: 'Strikeout Artist',   desc: 'Strike out 3 batters in one Baseball game.', icon: '🔥', color: '#be123c' },
  { id: 'bb_legend',       name: 'Hall of Famer',      desc: 'Beat Legend difficulty in Baseball.',        icon: '🏛️', color: '#854d0e' },
  { id: 'gp_win',          name: 'Bargain Hunter',     desc: 'Win a Guess the Price game.',                icon: '🏷️', color: '#7c3aed' },
  { id: 'gp_perfect',      name: 'Sharp Shopper',      desc: 'Get every price right in a game of 5+ rounds.', icon: '🎯', color: '#c026d3' },
  { id: 'gp_legend',       name: 'Price Legend',       desc: 'Beat Legend difficulty in Guess the Price.', icon: '💸', color: '#0f766e' },
  { id: 'pm_first',        name: 'Claw Catch',         desc: 'Win a prize from the Prize Machine.',        icon: '🧸', color: '#db2777' },
  { id: 'pm_win',          name: 'Prize Pro',          desc: 'Reach the prize goal in the Prize Machine.', icon: '🎁', color: '#9333ea' },
  { id: 'pm_gold',         name: 'Golden Grab',        desc: 'Win the golden crown from the Prize Machine.', icon: '👑', color: '#ca8a04' },
  { id: 'mz_win',          name: 'Maze Runner',        desc: 'Win a Maze game.',                           icon: '🌀', color: '#7c3aed' },
  { id: 'mz_coins',        name: 'Coin Hunter',        desc: 'Collect 8 coins in one Maze game.',          icon: '🪙', color: '#d97706' },
  { id: 'mz_legend',       name: 'Maze Master',        desc: 'Beat Legend difficulty in Maze.',            icon: '🏆', color: '#dc2626' },
  { id: 'ht_win',          name: 'Sweet Survivor',     desc: 'Win a Hunted game.',                         icon: '👻', color: '#7c3aed' },
  { id: 'ht_sweets',       name: 'Sweet Tooth',        desc: 'Collect 15 sweets in one Hunted game.',      icon: '🍬', color: '#db2777' },
  { id: 'ht_boss',         name: 'Boss Beater',        desc: 'Beat the Candy Boss in Hunted.',             icon: '🍭', color: '#dc2626' },
  { id: 'all_rounder',     name: 'All-Rounder',        desc: 'Win at least once in Soccer and Pickleball.', icon: '🌟', color: '#db2777' },
  { id: 'coins_250',       name: 'Coin Collector',     desc: 'Earn 250 coins in total.',                   icon: '🪙', color: '#d97706' },
  { id: 'coins_2000',      name: 'Treasure Hunter',    desc: 'Earn 2,000 coins in total.',                 icon: '💰', color: '#b45309' },
  { id: 'pts_1000',        name: 'Rising Star',        desc: 'Reach 1,000 points.',                        icon: '⭐', color: '#9333ea' },
  { id: 'pts_5000',        name: 'Superstar',          desc: 'Reach 5,000 points.',                        icon: '🌠', color: '#c026d3' },
  { id: 'marathon',        name: 'Marathon',           desc: 'Finish 25 matches.',                         icon: '🏃', color: '#e11d48' },
];
export const BADGE_MAP = Object.fromEntries(BADGES.map(b => [b.id, b]));

// Hunted: Trevor starts with $8,788.37 in Hunted cash (878837 cents),
// everyone else starts from zero. Hunted cash only grows — you collect
// sweets and each one is worth $1–$5 — so it is set once, when it is 0.
export const HUNTED_TREVOR_START_CENTS = 878837;
// Hunted: Trevor starts with 3740 Hunted points, everyone else starts
// from 0. Hunted points only grow, so it is set once, when it is 0.
export const HUNTED_TREVOR_START_POINTS = 3740;

// Trevor's (the owner's) stats. These override whatever roles/{uid} says, so changing them only needs a code push.
export const OWNER_STATS = {
  moneyBase: '73573649729729638637737872', // $73,573,649,729,729,638,637,737,872
  coinsBase: '67243852825918',            // 67,243,852,825,918 coins
  pointsBase: '72673674787374873',        // 72,673,674,787,374,873 points
  playedBase: '87963845395',              // 87,963,845,395 games played
  winsBase: '75375285572',                // 75,375,285,572 games won
  winChance: '90',                        // wins about 90% of matches
  levelBase: 653763,                      // level 653,763 (set directly, not from points)
  // Per-game totals (they add up to playedBase and winsBase above).
  gamesBase: {
    soccer: { played: 19563432968, wins: 16924201697 },
    pickleball: { played: 22375846120, wins: 19219672481 },
    baseball: { played: 21105381372, wins: 18049218873 },
    price: { played: 20547358416, wins: 17463927584 },
    prize: { played: 4371826519, wins: 3718264937 },
  },
  ownedBase: '4826371592047',             // 4,826,371,592,047 mall items owned
};

// Uncle Si Wei's starting balance. He is NOT the owner: only money and
// coins are special. No points, level, wins, win chance, badges or #1 -
// he plays like everyone else, just starting with $700,000 and 10,000 coins.
// These amounts are set here in the code, so they win over whatever an old
// roles document says; the roles document only says that he is Si Wei.
export const SIWEI_STATS = {
  moneyBase: '700000',   // $700,000
  coinsBase: '10000',    // 10,000 coins
  pointsBase: '0', playedBase: '0', winsBase: '0', winChance: '0',
  levelBase: 0, ownedBase: '0', gamesBase: {},
};
export function gameStats(p, id) {
  const st = p.stats?.[id] || {}, b = p.gamesBase?.[id] || {};
  return { played: (st.played || 0) + (b.played || 0), wins: (st.wins || 0) + (b.wins || 0) };
}
// Number of mall items owned, including the owner's bonus.
export function itemsOwned(p) {
  return BigInt(p.ownedBase || '0') + BigInt(Object.values(p.inventory || {}).reduce((a, b) => a + b, 0));
}

export const OWNER_NAME = 'trevor';
export const isOwnerName = name => String(name || '').trim().toLowerCase() === OWNER_NAME;
// Uncle Si Wei, by name - like Trevor, he is recognized by his name, so
// his starting balance shows even when no roles document exists for him.
// Trevor calls him "Uncle Si Wei", so the name matches with a title in
// front too: "Si Wei", "siwei", "Uncle Si Wei".
// Only the first account named Si Wei can use that name (nameTaken).
export const isSiweiName = name => {
  const compact = String(name || '').toLowerCase().replace(/[^a-z]/g, '');
  if (compact === 'siwei' || compact.endsWith('siwei')) return true;
  const words = String(name || '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return words.some((w, i) => w === 'si' && words[i + 1] === 'wei');
};

export function emptyStats() {
  return {
    soccer: { played: 0, wins: 0, goals: 0, legendWins: 0 },
    pickleball: { played: 0, wins: 0, pointsWon: 0, longestRally: 0, aces: 0, legendWins: 0 },
    baseball: { played: 0, wins: 0, runs: 0, hits: 0, homers: 0, strikeouts: 0, legendWins: 0 },
    price: { played: 0, wins: 0, correct: 0, bestStreak: 0, legendWins: 0 },
    prize: { played: 0, wins: 0, prizes: 0, golden: 0, legendWins: 0 },
    maze: { played: 0, wins: 0, coins: 0, bestCoins: 0, bestTime: 0, legendWins: 0 },
    hunted: { played: 0, wins: 0, sweets: 0, cashCents: 0, points: 0, bestSweets: 0, bossWins: 0, legendWins: 0 },
    matches: 0,
  };
}

// True when a badge could have been earned from this profile's own stats.
// Every badge has a necessary condition on the saved numbers (a win, a
// goal, enough coins, ...). A badge that fails its condition was not earned
// here: it came from an old save when the rules were different, so it is
// dropped for plain players. The owner keeps every badge by design.
function badgePossible(id, p, st) {
  const so = st.soccer, pb = st.pickleball, bb = st.baseball, pr = st.price, pz = st.prize, mz = st.maze || {}, ht = st.hunted || {};
  switch (id) {
    case 'first_match': return st.matches > 0;
    case 'soccer_goal': return so.goals > 0;
    case 'soccer_win': return so.wins > 0;
    case 'soccer_hattrick': return so.goals >= 3;
    case 'soccer_clean': return so.wins > 0;
    case 'soccer_legend': return so.legendWins > 0;
    case 'pb_win': return pb.wins > 0;
    case 'pb_ace': return pb.aces > 0;
    case 'pb_rally': return pb.longestRally >= 12;
    case 'pb_shutout': return pb.wins > 0;
    case 'pb_legend': return pb.legendWins > 0;
    case 'bb_hit': return bb.hits > 0;
    case 'bb_homer': return bb.homers > 0;
    case 'bb_win': return bb.wins > 0;
    case 'bb_k': return bb.strikeouts >= 3;
    case 'bb_legend': return bb.legendWins > 0;
    case 'gp_win': return pr.wins > 0;
    case 'gp_perfect': return pr.bestStreak >= 5;
    case 'gp_legend': return pr.legendWins > 0;
    case 'pm_first': return pz.prizes > 0;
    case 'pm_win': return pz.wins > 0;
    case 'pm_gold': return pz.golden > 0;
    case 'mz_win': return mz.wins > 0;
    case 'mz_coins': return mz.bestCoins >= 8;
    case 'mz_legend': return mz.legendWins > 0;
    case 'ht_win': return ht.wins > 0;
    case 'ht_sweets': return ht.bestSweets >= 15;
    case 'ht_boss': return (ht.bossWins || 0) > 0;
    case 'all_rounder': return so.wins > 0 && pb.wins > 0;
    case 'coins_250': return (p.totalCoinsEarned || 0) >= 250;
    case 'coins_2000': return (p.totalCoinsEarned || 0) >= 2000;
    case 'pts_1000': return (p.points || 0) >= 1000;
    case 'pts_5000': return (p.points || 0) >= 5000;
    case 'marathon': return st.matches >= 25;
    default: return false;
  }
}

const big0 = v => { try { return BigInt(v ?? '0'); } catch { return 0n; } };

export function normalizeProfile(p) {
  const s = emptyStats();
  const st = p.stats || {};
  const stats = {
    soccer: { ...s.soccer, ...(st.soccer || {}) },
    pickleball: { ...s.pickleball, ...(st.pickleball || {}) },
    baseball: { ...s.baseball, ...(st.baseball || {}) },
    price: { ...s.price, ...(st.price || {}) },
    prize: { ...s.prize, ...(st.prize || {}) },
    maze: { ...s.maze, ...(st.maze || {}) },
    hunted: { ...s.hunted, ...(st.hunted || {}) },
    matches: st.matches || 0,
  };
  // Only Trevor is the owner, and only by NAME - never by a stored role.
  // A roles document (or an old save) that says role "owner" for anyone
  // else is ignored here: it gave that player Trevor's whole fortune
  // ($73.5Qa, 67.2T coins, 72.6Qa points) just for having the role
  // written down. The owner amounts come from OWNER_STATS in the code,
  // by the name "trevor" alone - the same way Si Wei's amounts come from
  // SIWEI_STATS by his name, so no document can ever hand them out.
  // Everyone else starts from the beginning, like real games — but not
  // at zero: every new player starts with 10 points, $10 and 10 coins,
  // so they have something to get going with. Everything else is still
  // zero at the start: no badges, no trophies, no wins, no games played,
  // no items, Lv 1. Any bonus numbers in a roles document for another
  // role are ignored here, and the role itself becomes a plain player.
  // Every owner bonus is zeroed for plain players, including level,
  // owned items and per-game wins.
  // The one exception is Uncle Si Wei (named "Si Wei", or role "siwei" in
  // roles/{uid}): he is not the owner, but he starts with $700,000 and
  // 10,000 coins. Nothing else is special for him - no points, level,
  // wins, win chance, badges or #1. The amounts come from SIWEI_STATS in
  // the code, not from the roles document, so an old document can never
  // under-pay him - and the name alone is enough, so he gets the balance
  // even when no roles document exists for him yet.
  if (isOwnerName(p.name)) p = { ...p, ...OWNER_STATS, role: 'owner' };
  else if (p.role === 'siwei' || isSiweiName(p.name)) p = { ...p, ...SIWEI_STATS, role: 'siwei' };
  else p = { ...p, moneyBase: '10', coinsBase: '10', pointsBase: '10', playedBase: '0', winsBase: '0', winChance: '0', ownedBase: '0', levelBase: 0, gamesBase: {}, role: 'player' };
  // Hunted: Trevor starts with $8,788.37 in Hunted cash, everyone else
  // starts from zero. Hunted cash only grows (sweets are worth $1–$5),
  // so setting it once when it is 0 is safe.
  if (isOwnerName(p.name) && !(stats.hunted.cashCents > 0)) stats.hunted.cashCents = HUNTED_TREVOR_START_CENTS;
  // Hunted: Trevor starts with 3740 Hunted points, everyone else from 0.
  if (isOwnerName(p.name) && !(stats.hunted.points > 0)) stats.hunted.points = HUNTED_TREVOR_START_POINTS;
  // A plain player cannot keep things bought with money they never earned.
  // Lifetime spending (money + coins at $1 each) can never pass lifetime
  // earnings; when it does, the items came from an old owner-era save, so
  // the inventory starts from zero again. Real players are never affected:
  // the game only lets you spend what you have. The starting balance counts
  // as money the player has: Si Wei's $700,000 and 10,000 coins are his to
  // spend, so what he buys with them stays bought.
  const spent = big0(p.moneySpentCents) + big0(p.coinsSpent) * 100n;
  const earned = big0(p.moneyBase) * 100n + big0(p.coinsBase) * 100n + big0(p.moneyEarnedCents) + big0(p.totalCoinsEarned) * 100n;
  const inventory = (p.role === 'owner' || spent <= earned)
    ? (p.inventory && typeof p.inventory === 'object' ? p.inventory : {})
    : {};
  return {
    ...p,
    levelBase: p.levelBase || 0,
    points: p.points || 0,
    coinsEarned: p.coinsEarned || 0,
    totalCoinsEarned: p.totalCoinsEarned || 0,
    moneyBase: p.moneyBase || '0',
    coinsBase: p.coinsBase || '0',
    pointsBase: p.pointsBase || '0',
    playedBase: p.playedBase || '0',
    winsBase: p.winsBase || '0',
    winChance: p.winChance || '0',
    inventory,
    moneySpentCents: p.moneySpentCents || '0',
    coinsSpent: p.coinsSpent || 0,
    // Sales tax this player has paid in the mall: it all goes to Trevor, the boss.
    bossPaidCents: p.bossPaidCents || '0',
    moneyEarnedCents: p.moneyEarnedCents || '0',
    role: p.role || 'player',
    // The owner (Trevor) has every badge unlocked. Everyone else starts with
    // no badges at all, keeps only badges their own play could have earned,
    // and the old Welcome badge is not kept for them.
    badges: p.role === 'owner' ? [...new Set([...(Array.isArray(p.badges) ? p.badges : []), ...BADGES.map(b => b.id)])]
      : (Array.isArray(p.badges) ? p.badges : []).filter(b => b !== 'welcome' && badgePossible(b, p, stats)),
    stats,
  };
}

export function coinsOf(p) { return BigInt(p.coinsBase || '0') + BigInt(p.coinsEarned || 0) - BigInt(p.coinsSpent || 0); }
export function moneyCentsOf(p) { return BigInt(p.moneyBase || '0') * 100n + BigInt(p.moneyEarnedCents || '0') - BigInt(p.moneySpentCents || '0'); }
export function moneyOf(p) { const c = moneyCentsOf(p); return c > 0n ? c / 100n : 0n; }
// How a shop purchase (in cents) is paid: money first, otherwise coins at 1 coin = $1. Null when it can't be afforded.
export function payPlan(p, cents) {
  if (moneyCentsOf(p) >= BigInt(cents)) return { money: cents, coins: 0 };
  const need = Math.ceil(cents / 100);
  if (coinsOf(p) >= BigInt(need)) return { money: 0, coins: need };
  return null;
}
// Points shown in the hub and the Overall leaderboard: earned points plus any role bonus.
export function totalPoints(p) { return BigInt(p.pointsBase || '0') + BigInt(p.points || 0); }
// Career totals across every game, plus any role bonus.
export function careerOf(p) {
  const s = p.stats || emptyStats();
  const played = BigInt(p.playedBase || '0') + BigInt(s.matches || 0);
  const wins = BigInt(p.winsBase || '0') + BigInt((s.soccer?.wins || 0) + (s.pickleball?.wins || 0) + (s.baseball?.wins || 0) + (s.price?.wins || 0) + (s.prize?.wins || 0));
  const chance = Number(p.winChance || 0);
  const rate = chance > 0 ? chance : played > 0n ? Number(wins * 100n / played) : 0;
  return { played, wins, rate };
}

export function formatBig(v) {
  const s = BigInt(v).toString();
  const neg = s.startsWith('-');
  const digits = neg ? s.slice(1) : s;
  return (neg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
export function formatShort(v) {
  const n = BigInt(v);
  if (n < 100000n) return formatBig(n);
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const s = n.toString();
  const groups = Math.floor((s.length - 1) / 3);
  if (groups - 1 >= units.length) return formatBig(n);
  const head = s.slice(0, s.length - groups * 3);
  const dec = s.slice(head.length, head.length + 1);
  return `${head}${dec !== '0' && head.length < 3 ? '.' + dec : ''}${units[groups - 1]}`;
}

// A player's level: from total points, or the owner's fixed level plus levels earned by playing.
export function playerLevel(p) {
  if (p.levelBase) {
    const li = levelInfo(p.points || 0);
    return { ...li, level: p.levelBase + li.level - 1 };
  }
  return levelInfo(totalPoints(p));
}

// Level curve: level n starts at 50·n·(n−1) points.
export function levelInfo(points) {
  points = Number(points);
  let n = Math.max(1, Math.floor((1 + Math.sqrt(1 + points / 12.5)) / 2));
  while (n > 1 && 50 * n * (n - 1) > points) n--;
  while (50 * (n + 1) * n <= points) n++;
  const start = 50 * n * (n - 1), next = 50 * (n + 1) * n;
  return { level: n, progress: (points - start) / (next - start), toNext: next - points };
}

export function computeRewards(match) {
  const m = DIFF_MULT[match.difficulty] || 1;
  // The Shield superpower: lose, but still earn the draw reward.
  const draw = match.draw || (match.shield && !match.won && !match.draw);
  let pts = 0, coins = 0;
  if (match.game === 'soccer') {
    pts = 50 + (match.won ? 120 : draw ? 50 : 0) + match.goalsFor * 25 + (match.won && match.goalsAgainst === 0 ? 40 : 0);
    coins = 10 + (match.won ? 35 : draw ? 12 : 0) + match.goalsFor * 6;
  } else if (match.game === 'pickleball') {
    pts = 50 + (match.won ? 130 : draw ? 50 : 0) + match.scoreFor * 6 + Math.min(match.longestRally, 30) * 2;
    coins = 10 + (match.won ? 40 : draw ? 12 : 0) + match.scoreFor * 2 + match.aces * 3;
  } else if (match.game === 'prize') {
    pts = 50 + (match.won ? 120 : draw ? 50 : 0) + match.prizes * 30 + match.golden * 100;
    coins = 10 + (match.won ? 30 : draw ? 12 : 0) + match.prizes * 6 + match.coinBags * 20 + match.golden * 50;
  } else if (match.game === 'price') {
    pts = 50 + (match.won ? 130 : draw ? 50 : 0) + match.correct * 15 + match.bestStreak * 5;
    coins = 10 + (match.won ? 40 : draw ? 12 : 0) + match.correct * 3;
  } else if (match.game === 'baseball') {
    pts = 50 + (match.won ? 130 : draw ? 50 : 0) + match.runsFor * 18 + match.homers * 30 + match.strikeouts * 8;
    coins = 10 + (match.won ? 40 : draw ? 12 : 0) + match.runsFor * 4 + match.homers * 8;
  } else if (match.game === 'maze') {
    pts = 50 + (match.won ? 130 : draw ? 50 : 0) + match.coins * 10 + (match.won ? Math.max(0, match.timeLeft || 0) * 2 : 0);
    coins = 10 + (match.won ? 40 : draw ? 12 : 0) + match.coins * 2;
  } else if (match.game === 'hunted') {
    pts = 50 + (match.won ? 130 : draw ? 50 : 0) + match.sweets * 8 + (match.won ? Math.max(0, match.timeLeft || 0) * 2 : 0);
    coins = 10 + (match.won ? 40 : draw ? 12 : 0) + match.sweets * 2;
  }
  pts = Math.min(MAX_POINTS_PER_MATCH, Math.round(pts * m));
  coins = Math.min(MAX_COINS_PER_MATCH, Math.round(coins * m));
  // The Double Points superpower doubles the points (up to twice the cap).
  if (match.doublePoints) pts = Math.min(MAX_POINTS_PER_MATCH * 2, pts * 2);
  // The Double Coins superpower doubles the coins (up to twice the cap).
  if (match.doubleCoins) coins = Math.min(MAX_COINS_PER_MATCH * 2, coins * 2);
  // Dollars: 75¢ for every coin, plus $5 for a win (or $2 for a draw), with a few random cents like a real paycheck.
  const cents = coins * 75 + (match.won ? 500 : draw ? 200 : 0) + Math.floor(Math.random() * 100);
  return { points: pts, coins, cents };
}

// Returns the new profile fields after a match, plus which badges were unlocked.
export function applyMatch(profile, match) {
  const p = normalizeProfile(profile);
  const reward = computeRewards(match);
  const stats = structuredClone(p.stats);
  stats.matches += 1;
  if (match.game === 'soccer') {
    const s = stats.soccer;
    s.played++; s.goals += match.goalsFor;
    if (match.won) s.wins++;
    if (match.won && match.difficulty === 'legend') s.legendWins++;
  } else if (match.game === 'prize') {
    const s = stats.prize;
    s.played++; s.prizes += match.prizes; s.golden += match.golden;
    if (match.won) s.wins++;
    if (match.won && match.difficulty === 'legend') s.legendWins++;
  } else if (match.game === 'price') {
    const s = stats.price;
    s.played++; s.correct += match.correct; s.bestStreak = Math.max(s.bestStreak, match.bestStreak);
    if (match.won) s.wins++;
    if (match.won && match.difficulty === 'legend') s.legendWins++;
  } else if (match.game === 'baseball') {
    const s = stats.baseball;
    s.played++; s.runs += match.runsFor; s.hits += match.hits || 0; s.homers += match.homers; s.strikeouts += match.strikeouts;
    if (match.won) s.wins++;
    if (match.won && match.difficulty === 'legend') s.legendWins++;
  } else if (match.game === 'maze') {
    const s = stats.maze;
    s.played++; s.coins += match.coins;
    s.bestCoins = Math.max(s.bestCoins, match.coins);
    if (match.won) {
      s.wins++;
      s.bestTime = s.bestTime ? Math.min(s.bestTime, match.timeUsed || 0) : (match.timeUsed || 0);
    }
    if (match.won && match.difficulty === 'legend') s.legendWins++;
  } else if (match.game === 'hunted') {
    const s = stats.hunted;
    s.played++; s.sweets += match.sweets;
    s.cashCents += match.cashEarned || 0;
    s.points += reward.points;
    s.bestSweets = Math.max(s.bestSweets, match.sweets);
    if (match.bossBeaten) s.bossWins = (s.bossWins || 0) + 1;
    if (match.won) s.wins++;
    if (match.won && match.difficulty === 'legend') s.legendWins++;
  } else {
    const s = stats.pickleball;
    s.played++; s.pointsWon += match.scoreFor; s.aces += match.aces;
    s.longestRally = Math.max(s.longestRally, match.longestRally);
    if (match.won) s.wins++;
    if (match.won && match.difficulty === 'legend') s.legendWins++;
  }
  const next = {
    points: p.points + reward.points,
    coinsEarned: p.coinsEarned + reward.coins,
    totalCoinsEarned: p.totalCoinsEarned + reward.coins,
    moneyEarnedCents: String(BigInt(p.moneyEarnedCents || '0') + BigInt(reward.cents)),
    stats,
  };
  const has = new Set(p.badges);
  const earn = [];
  const give = (id, cond) => { if (cond && !has.has(id)) { has.add(id); earn.push(id); } };
  give('first_match', true);
  if (match.game === 'soccer') {
    give('soccer_goal', match.goalsFor > 0);
    give('soccer_win', match.won);
    give('soccer_hattrick', match.playerGoals >= 3);
    give('soccer_clean', match.won && match.goalsAgainst === 0);
    give('soccer_legend', match.won && match.difficulty === 'legend');
  } else if (match.game === 'prize') {
    give('pm_first', match.prizes > 0);
    give('pm_win', match.won);
    give('pm_gold', match.golden > 0);
  } else if (match.game === 'price') {
    give('gp_win', match.won);
    give('gp_perfect', match.rounds >= 5 && match.correct === match.rounds);
    give('gp_legend', match.won && match.difficulty === 'legend');
  } else if (match.game === 'baseball') {
    give('bb_hit', (match.hits || 0) > 0);
    give('bb_homer', match.homers > 0);
    give('bb_win', match.won);
    give('bb_k', match.strikeouts >= 3);
    give('bb_legend', match.won && match.difficulty === 'legend');
  } else if (match.game === 'maze') {
    give('mz_win', match.won);
    give('mz_coins', match.coins >= 8);
    give('mz_legend', match.won && match.difficulty === 'legend');
  } else if (match.game === 'hunted') {
    give('ht_win', match.won);
    give('ht_sweets', match.sweets >= 15);
    give('ht_boss', match.bossBeaten);
  } else {
    give('pb_win', match.won);
    give('pb_ace', match.aces > 0);
    give('pb_rally', match.longestRally >= 12);
    give('pb_shutout', match.won && match.scoreAgainst === 0);
    give('pb_legend', match.won && match.difficulty === 'legend');
  }
  give('all_rounder', stats.soccer.wins > 0 && stats.pickleball.wins > 0);
  give('coins_250', next.totalCoinsEarned >= 250);
  give('coins_2000', next.totalCoinsEarned >= 2000);
  give('pts_1000', next.points >= 1000);
  give('pts_5000', next.points >= 5000);
  give('marathon', stats.matches >= 25);
  next.badges = [...has];
  return { next, reward, newBadges: earn };
}

export function badgeProgress(id, p) {
  const s = p.stats;
  switch (id) {
    case 'coins_250': return Math.min(1, p.totalCoinsEarned / 250);
    case 'coins_2000': return Math.min(1, p.totalCoinsEarned / 2000);
    case 'pts_1000': return Math.min(1, p.points / 1000);
    case 'pts_5000': return Math.min(1, p.points / 5000);
    case 'marathon': return Math.min(1, s.matches / 25);
    case 'pb_rally': return Math.min(1, s.pickleball.longestRally / 12);
    case 'all_rounder': return ((s.soccer.wins > 0) + (s.pickleball.wins > 0)) / 2;
    default: return null;
  }
}

let medalSeq = 0;
export function badgeSVG(b, unlocked = true) {
  const id = 'm' + (medalSeq++);
  const c = b.color;
  return `<svg viewBox="0 0 100 100" class="badge-medal" aria-hidden="true">
  <defs>
    <radialGradient id="${id}g" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="${c}"/><stop offset="1" stop-color="#0b1026"/></radialGradient>
    <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#b45309"/></linearGradient>
  </defs>
  <path d="M30 62 L22 96 L36 88 L44 98 L50 66 Z" fill="${c}" opacity=".85"/>
  <path d="M70 62 L78 96 L64 88 L56 98 L50 66 Z" fill="${c}" opacity=".65"/>
  <circle cx="50" cy="44" r="38" fill="url(#${id}r)"/>
  <circle cx="50" cy="44" r="32" fill="url(#${id}g)"/>
  <circle cx="50" cy="44" r="32" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-dasharray="3 4"/>
  <text x="50" y="56" text-anchor="middle" font-size="32">${unlocked ? b.icon : '🔒'}</text>
</svg>`;
}
