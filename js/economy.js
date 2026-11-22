// Shared progression: points, coins, levels and achievement badges.
// Every mini game reports a match result here; this file decides the rewards.

export const DIFF_MULT = { rookie: 1, pro: 1.5, legend: 2 };
export const MAX_POINTS_PER_MATCH = 600;   // keep in sync with firestore.rules (limit 1000)
export const MAX_COINS_PER_MATCH = 250;    // keep in sync with firestore.rules (limit 500)

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
  { id: 'all_rounder',     name: 'All-Rounder',        desc: 'Win at least once in Soccer and Pickleball.', icon: '🌟', color: '#db2777' },
  { id: 'coins_250',       name: 'Coin Collector',     desc: 'Earn 250 coins in total.',                   icon: '🪙', color: '#d97706' },
  { id: 'coins_2000',      name: 'Treasure Hunter',    desc: 'Earn 2,000 coins in total.',                 icon: '💰', color: '#b45309' },
  { id: 'pts_1000',        name: 'Rising Star',        desc: 'Reach 1,000 points.',                        icon: '⭐', color: '#9333ea' },
  { id: 'pts_5000',        name: 'Superstar',          desc: 'Reach 5,000 points.',                        icon: '🌠', color: '#c026d3' },
  { id: 'marathon',        name: 'Marathon',           desc: 'Finish 25 matches.',                         icon: '🏃', color: '#e11d48' },
];
export const BADGE_MAP = Object.fromEntries(BADGES.map(b => [b.id, b]));

// Trevor's (the owner's) stats. These override whatever roles/{uid} says, so changing them only needs a code push.
export const OWNER_STATS = {
  moneyBase: '634735251526437352826',     // $634,735,251,526,437,352,826
  coinsBase: '67243852825918',            // 67,243,852,825,918 coins
  pointsBase: '65375276637635180',        // 65,375,276,637,635,180 points
  playedBase: '87963845395',              // 87,963,845,395 games played
  winsBase: '75375285572',                // 75,375,285,572 games won
  winChance: '90',                        // wins about 90% of matches
  levelBase: 652853,                      // level 652,853 (set directly, not from points)
};

export function emptyStats() {
  return {
    soccer: { played: 0, wins: 0, goals: 0, legendWins: 0 },
    pickleball: { played: 0, wins: 0, pointsWon: 0, longestRally: 0, aces: 0, legendWins: 0 },
    baseball: { played: 0, wins: 0, runs: 0, hits: 0, homers: 0, strikeouts: 0, legendWins: 0 },
    matches: 0,
  };
}

export function normalizeProfile(p) {
  const s = emptyStats();
  const st = p.stats || {};
  if (p.role === 'owner') p = { ...p, ...OWNER_STATS };
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
    inventory: p.inventory && typeof p.inventory === 'object' ? p.inventory : {},
    moneySpentCents: p.moneySpentCents || '0',
    coinsSpent: p.coinsSpent || 0,
    role: p.role || 'player',
    // The owner (Trevor) has every badge unlocked.
    badges: p.role === 'owner' ? [...new Set([...(Array.isArray(p.badges) ? p.badges : []), ...BADGES.map(b => b.id)])]
      : Array.isArray(p.badges) ? p.badges : [],
    stats: {
      soccer: { ...s.soccer, ...(st.soccer || {}) },
      pickleball: { ...s.pickleball, ...(st.pickleball || {}) },
      baseball: { ...s.baseball, ...(st.baseball || {}) },
      matches: st.matches || 0,
    },
  };
}

export function coinsOf(p) { return BigInt(p.coinsBase || '0') + BigInt(p.coinsEarned || 0) - BigInt(p.coinsSpent || 0); }
export function moneyCentsOf(p) { return BigInt(p.moneyBase || '0') * 100n - BigInt(p.moneySpentCents || '0'); }
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
  const wins = BigInt(p.winsBase || '0') + BigInt((s.soccer?.wins || 0) + (s.pickleball?.wins || 0) + (s.baseball?.wins || 0));
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
  let pts = 0, coins = 0;
  if (match.game === 'soccer') {
    pts = 50 + (match.won ? 120 : match.draw ? 50 : 0) + match.goalsFor * 25 + (match.won && match.goalsAgainst === 0 ? 40 : 0);
    coins = 10 + (match.won ? 35 : match.draw ? 12 : 0) + match.goalsFor * 6;
  } else if (match.game === 'pickleball') {
    pts = 50 + (match.won ? 130 : 0) + match.scoreFor * 6 + Math.min(match.longestRally, 30) * 2;
    coins = 10 + (match.won ? 40 : 0) + match.scoreFor * 2 + match.aces * 3;
  } else if (match.game === 'baseball') {
    pts = 50 + (match.won ? 130 : match.draw ? 50 : 0) + match.runsFor * 18 + match.homers * 30 + match.strikeouts * 8;
    coins = 10 + (match.won ? 40 : match.draw ? 12 : 0) + match.runsFor * 4 + match.homers * 8;
  }
  pts = Math.min(MAX_POINTS_PER_MATCH, Math.round(pts * m));
  coins = Math.min(MAX_COINS_PER_MATCH, Math.round(coins * m));
  return { points: pts, coins };
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
  } else if (match.game === 'baseball') {
    const s = stats.baseball;
    s.played++; s.runs += match.runsFor; s.hits += match.hits || 0; s.homers += match.homers; s.strikeouts += match.strikeouts;
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
    stats,
  };
  const has = new Set(p.badges);
  const earn = [];
  const give = (id, cond) => { if (cond && !has.has(id)) { has.add(id); earn.push(id); } };
  give('welcome', true);
  give('first_match', true);
  if (match.game === 'soccer') {
    give('soccer_goal', match.goalsFor > 0);
    give('soccer_win', match.won);
    give('soccer_hattrick', match.playerGoals >= 3);
    give('soccer_clean', match.won && match.goalsAgainst === 0);
    give('soccer_legend', match.won && match.difficulty === 'legend');
  } else if (match.game === 'baseball') {
    give('bb_hit', (match.hits || 0) > 0);
    give('bb_homer', match.homers > 0);
    give('bb_win', match.won);
    give('bb_k', match.strikeouts >= 3);
    give('bb_legend', match.won && match.difficulty === 'legend');
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
