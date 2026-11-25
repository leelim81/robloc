import { backend, validateName } from './backend.js';
import { audio } from './audio.js';
import { Input } from './input.js';
import { FX } from './fx.js';
import { OWNER_STATS, BADGES, BADGE_MAP, badgeSVG, badgeProgress, coinsOf, moneyOf, moneyCentsOf, formatBig, formatShort, levelInfo, playerLevel, normalizeProfile, totalPoints, careerOf, gameStats, itemsOwned, SUPERPOWERS, isOwnerName, OWNER_WIN_CHANCE, OTHER_WIN_CHANCE, fakeNamesFor, fakeAvatarSeed, fakePoints, fakeWins, fakeMoney, fakeCoins, fakeBadges, WORLD_PLAYERS } from './economy.js';
import { SKINS, HAIRS, SHIRTS, HAIR_STYLES, HAIR_STYLE_LABELS, DEFAULT_AVATAR, drawPortrait, drawAvatarFull } from './art.js';
import soccer from './games/soccer.js';
import pickleball from './games/pickleball.js';
import baseball from './games/baseball.js';
import mall from './games/mall.js';
import guessprice from './games/guessprice.js';
import prizemachine from './games/prizemachine.js';
import maze from './games/maze.js';
import hunted from './games/hunted.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const GAMES = [soccer, pickleball, baseball, guessprice, prizemachine, maze, mall];
// Hunted lives on its own now (Trevor: "delete the one in Robloc, put
// it in the new Robloc hunted"). It is NOT in the hub. Open it at
// ?hunted=1 (or hunted.html) — a standalone Hunted with only one game.
const HUNTED_MODE = new URLSearchParams(location.search).has('hunted');
const COMING = [['Prize Machine 2', '🧸', 'A brand-new claw machine — coming soon!']];   // Trevor: "Make a new game prize machine2" — "But write coming soon".

const state = { user: null, profile: null, view: 'games', lbKind: 'points', editing: false, avatar: { ...DEFAULT_AVATAR } };
const input = new Input();

// A superpower bought in the mall search is held for the next match.
// It lives on this device, keyed by the player's name, so it survives a reload.
const powerHeldKey = () => 'robloc_power_held_' + String(state.profile?.name || 'local').toLowerCase().replace(/[^a-z0-9]/g, '');
const getPowerHeld = () => { try { return localStorage.getItem(powerHeldKey()) || ''; } catch { return ''; } };
const setPowerHeld = id => { try { localStorage.setItem(powerHeldKey(), id); } catch {} };
const clearPowerHeld = () => { try { localStorage.removeItem(powerHeldKey()); } catch {} };

// ---------------- boot ----------------
function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  if (id === 'screen-hub') { startThumbs(); } else stopThumbs();
  if (id === 'screen-setup') startAvatarPreview(); else stopAvatarPreview();
}

function unlockAudio() { audio.unlock(); }
addEventListener('pointerdown', unlockAudio, { capture: true });
addEventListener('keydown', unlockAudio, { capture: true });

document.addEventListener('click', e => {
  const el = e.target.closest('.btn, .tab, .chip, .seg button, .swatch, .profile-chip, .icon-btn, .game-card.playable');
  if (!el) return;
  audio.play(el.classList.contains('btn-danger') || el.id?.includes('back') ? 'back' : 'click');
});

async function boot() {
  if (backend.mode === 'demo') {
    $('#demo-note').classList.remove('hidden');
    $('#btn-google span').textContent = 'Play (demo mode)';
    $('#btn-guest').classList.add('hidden');
  }
  try {
    await backend.init(onUser);
  } catch (e) {
    console.error(e);
    hideLoading();
    showError('#auth-error', 'Could not reach the game server. Check your connection and reload.');
  }
}

function hideLoading() { $('#loading').classList.add('done'); }

async function onUser(user) {
  state.user = user;
  if (!user) {
    state.profile = null;
    hideLoading(); show('screen-landing'); audio.music('menu');
    return;
  }
  try {
    const p = await backend.loadProfile();
    hideLoading();
    if (!p) { openSetup(false); return; }
    state.profile = p;
    enterHub();
  } catch (e) {
    console.error(e);
    hideLoading(); show('screen-landing');
    showError('#auth-error', 'Signed in, but your save could not be loaded: ' + (e.code || e.message));
  }
}

function showError(sel, msg) { const el = $(sel); el.textContent = msg; el.classList.remove('hidden'); }

$('#btn-google').addEventListener('click', async () => {
  $('#auth-error').classList.add('hidden');
  try { await backend.signIn(); }
  catch (e) { console.error(e); showError('#auth-error', friendlyAuthError(e)); }
});
// Play as guest — no account needed, so everyone can play. The guest
// still gets a real save and a place on the leaderboard.
$('#btn-guest').addEventListener('click', async () => {
  $('#auth-error').classList.add('hidden');
  try { await backend.signInGuest(); }
  catch (e) { console.error(e); showError('#auth-error', friendlyAuthError(e)); }
});
function friendlyAuthError(e) {
  if (e.code === 'auth/unauthorized-domain') return 'This website is not yet allowed in Firebase sign-in settings (Authorized domains).';
  if (e.code === 'auth/network-request-failed') return 'Network problem. Check your connection and try again.';
  if (e.code === 'auth/operation-not-allowed' || e.code === 'auth/admin-restricted-operation') return 'Guest play is not turned on yet. In the Firebase console, go to Authentication → Sign-in method → Anonymous → Enable.';
  return 'Sign-in failed: ' + (e.code || e.message);
}

// ---------------- profile setup ----------------
function buildSwatches() {
  const groups = { skin: SKINS, hair: HAIRS, shirt: SHIRTS, style: HAIR_STYLES };
  for (const [key, list] of Object.entries(groups)) {
    const wrap = $(`.swatches[data-key="${key}"]`); wrap.innerHTML = '';
    list.forEach(v => {
      const b = document.createElement('button');
      b.className = 'swatch'; b.type = 'button'; b.dataset.v = v;
      if (key === 'style') b.textContent = HAIR_STYLE_LABELS[v]; else b.style.background = v;
      b.setAttribute('aria-label', `${key} ${key === 'style' ? v : ''}`.trim());
      b.addEventListener('click', () => { state.avatar[key] = v; markSwatches(); });
      wrap.appendChild(b);
    });
  }
}
function markSwatches() {
  $$('.swatches').forEach(w => w.querySelectorAll('.swatch').forEach(b => b.classList.toggle('active', b.dataset.v === state.avatar[w.dataset.key])));
  // Show which shade is picked, so two shades are easy to tell apart:
  // "Skin 3 of 6" — tap another circle and the number (and your big
  // player on the left) changes right away.
  const groups = { skin: SKINS, hair: HAIRS, shirt: SHIRTS, style: HAIR_STYLES };
  for (const [key, list] of Object.entries(groups)) {
    const el = $('#pick-' + key);
    if (el) el.textContent = (list.indexOf(state.avatar[key]) + 1) + ' of ' + list.length;
  }
}
let previewRAF = 0;
function startAvatarPreview() {
  const cv = $('#avatar-preview');
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = cv.clientWidth * dpr || 480; cv.height = cv.clientHeight * dpr || 600;
  const t0 = performance.now();
  const loop = now => { drawAvatarFull(cv, state.avatar, (now - t0) / 1000); previewRAF = requestAnimationFrame(loop); };
  cancelAnimationFrame(previewRAF); previewRAF = requestAnimationFrame(loop);
}
function stopAvatarPreview() { cancelAnimationFrame(previewRAF); }

function openSetup(editing) {
  state.editing = editing;
  state.avatar = { ...DEFAULT_AVATAR, ...(state.profile?.avatar || {}) };
  $('#name-input').value = editing ? state.profile.name : '';
  $('#setup-title').textContent = editing ? 'Edit your player' : 'Create your player';
  $('#btn-setup-done').textContent = editing ? 'Save' : "Let's play!";
  $('#setup-error').classList.add('hidden');
  markSwatches(); show('screen-setup');
  setTimeout(() => $('#name-input').focus(), 300);
}
$('#name-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-setup-done').click(); });
$('#btn-setup-done').addEventListener('click', async () => {
  const v = validateName($('#name-input').value);
  if (!v.ok) { showError('#setup-error', v.error); audio.play('fault'); return; }
  const btn = $('#btn-setup-done'); btn.disabled = true;
  try {
    // The owner's name belongs to whoever took it first (Trevor).
    if (await backend.nameTaken(v.name)) { showError('#setup-error', 'That name is taken. Please choose another one.'); audio.play('fault'); return; }
    if (state.editing) {
      await backend.updateIdentity({ name: v.name, avatar: state.avatar });
      state.profile = normalizeProfile({ ...state.profile, name: v.name, avatar: { ...state.avatar } });
    } else {
      state.profile = await backend.createProfile({ name: v.name, avatar: { ...state.avatar } });
    }
    enterHub();
  } catch (e) {
    console.error(e);
    showError('#setup-error', e.code === 'permission-denied'
      ? 'Could not save: Firebase is still using old rules. Publish the new firestore.rules in the Firebase console, then try again.'
      : 'Could not save: ' + (e.code || e.message));
  } finally { btn.disabled = false; }
});

// ---------------- hub ----------------
function enterHub() {
  // In Hunted mode there is no big hub — just a chooser with ONE game
  // (Hunted), like the others: you pick your game, but there is only
  // one game to pick. Tapping its card opens the Hunted pregame.
  if (HUNTED_MODE) {
    show('screen-hub');
    audio.music('menu');
    renderTopbar(false);
    renderHuntedChooser();
    switchView('games');
    return;
  }
  show('screen-hub');
  audio.music('menu');
  renderTopbar(false);
  renderGames();
  switchView(state.view);
}

// Hunted chooser: the hub's games grid with only the Hunted card.
function renderHuntedChooser() {
  const grid = $('#games-grid'); grid.innerHTML = '';
  // Spooky line at the top, then the collect-sweets game below it
  // (Trevor: "write spooky stuff then put the collect sweets game below").
  // The line is a button: tap it to go back to the front page (the main
  // hub) — Trevor: "you press the spooky night again and you return to
  // the front page". Press once on the hub to come here, press again
  // here to go back.
  const spooky = document.createElement('button');
  spooky.className = 'hunted-spooky';
  spooky.innerHTML = `👻 SPOOKY NIGHT! 🎃<br><span>Collect sweets from the houses — but don't get caught by the ghost! Shh… when he's looking, FREEZE! When he turns away, RUN!<br>👆 Tap this line to go back to ROBLOC</span>`;
  spooky.addEventListener('click', () => { location.href = 'index.html'; });
  grid.appendChild(spooky);
  const p = state.profile;
  const g = hunted;
  const st = gameStats(p, g.id);
  const card = document.createElement('button');
  card.className = 'game-card playable';
  card.innerHTML = `<canvas data-thumb="${g.id}" width="520" height="325"></canvas>
      <span class="play-badge">PLAY</span>
      <div class="card-body"><h3 class="card-title">${g.title}</h3><p class="card-sub">${g.tagline}</p>
      <div class="card-meta"><span class="meta-pill" title="${formatBig(st.played)}">${formatShort(st.played)} played</span><span class="meta-pill best" title="${formatBig(st.wins)}">🏆 ${formatShort(st.wins)} wins</span></div></div>`;
  card.addEventListener('click', () => openPregame(g));
  grid.appendChild(card);
  startThumbs();
}

let shown = { points: 0n, coins: 0n };
function renderTopbar(animate = true) {
  const p = state.profile;
  $('#hub-name').textContent = p.name;
  drawPortrait($('#chip-avatar'), p.avatar);
  const tag = $('#role-tag');
  tag.className = 'role-tag' + (p.role === 'owner' ? ' owner' : ' hidden');
  tag.textContent = p.role === 'owner' ? '👑 OWNER' : '';
  const total = totalPoints(p);
  const li = playerLevel(p);
  $('#hub-level').textContent = 'Lv ' + formatShort(li.level);
  $('#hub-xp').style.width = (li.progress * 100).toFixed(1) + '%';
  $('#hub-level').title = `Level ${formatBig(li.level)} · ${formatBig(li.toNext)} points to level ${formatBig(li.level + 1)}`;
  const coins = coinsOf(p), pts = total;
  rollNumber('#hub-points', shown.points, pts, animate, v => formatShort(v));
  $('#hub-points').parentElement.title = formatBig(pts) + ' points';
  rollNumber('#hub-coins', shown.coins, coins, animate, v => formatShort(v));
  $('#hub-coins').parentElement.title = formatBig(coins) + ' coins';
  shown = { points: pts, coins };
  const money = moneyOf(p), cents = moneyCentsOf(p);
  $('#money-wrap').classList.toggle('hidden', cents <= 0n);
  // show dollars and cents for small amounts, short form for big ones
  $('#hub-money').textContent = money < 100000n ? formatBig(money) + '.' + String(cents % 100n).padStart(2, '0') : formatShort(money);
  $('#money-wrap').title = '$' + formatBig(money) + '.' + String(cents % 100n).padStart(2, '0');
  $('#badge-count').textContent = p.badges.length;
  const c = careerOf(p);
  // What you earned by playing: the big topbar totals barely move for the
  // owner (his starting fortune is huge), so show the match earnings
  // themselves — they go up every match and prove you are earning.
  const earnedPts = p.points || 0;
  const earnedCoins = p.coinsEarned || 0;
  const earnedCents = BigInt(p.moneyEarnedCents || '0');
  const earnedDollars = earnedCents / 100n;
  const earnedMoney = earnedDollars < 100000n
    ? '$' + formatBig(earnedDollars) + '.' + String(earnedCents % 100n).padStart(2, '0')
    : '$' + formatShort(earnedDollars);
  $('#career').innerHTML = `<span title="${formatBig(c.played)}">🎮 <b>${formatShort(c.played)}</b> played</span><span title="${formatBig(c.wins)}">🏆 <b>${formatShort(c.wins)}</b> won</span><span title="${formatBig(BigInt(earnedPts))} points earned from matches">⭐ <b>${formatShort(earnedPts)}</b> pts earned</span><span title="${formatBig(BigInt(earnedCoins))} coins earned from matches">🪙 <b>${formatShort(earnedCoins)}</b> coins earned</span><span title="${earnedMoney} earned from matches">💰 <b>${earnedMoney}</b> earned</span>`;
}
function rollNumber(sel, from, to, animate, fmt) {
  const el = $(sel);
  if (!animate || from === to) { el.textContent = fmt(to); return; }
  el.parentElement.classList.remove('bump'); void el.offsetWidth; el.parentElement.classList.add('bump');
  const t0 = performance.now(), dur = 1200, diff = Number(to - from);
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + BigInt(Math.round(diff * e)));
    if (k < 1) { if (Math.random() < 0.3) audio.play('tick'); requestAnimationFrame(step); }
  };
  requestAnimationFrame(step);
}

$$('.tab').forEach(t => t.addEventListener('click', () => switchView(t.dataset.view)));
function switchView(v) {
  state.view = v;
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === v));
  $$('.view').forEach(el => el.classList.toggle('active', el.id === 'view-' + v));
  if (v === 'leaderboard') renderLeaderboard();
  if (v === 'badges') renderBadges();
  if (v === 'games') startThumbs(); else stopThumbs();
}

function renderGames() {
  const grid = $('#games-grid'); grid.innerHTML = '';
  // Hunted lives on its own page (Trevor: Hunted is a separate game, not
  // in this hub), so put a spooky line at the top that takes you there —
  // Trevor: "where's the hunted game and put a line on top".
  const huntedLink = document.createElement('button');
  huntedLink.className = 'hunted-spooky';
  huntedLink.innerHTML = `👻 ROBLOC Hunted is here! 🎃<br><span>Tap to play the collect sweets game — don't get caught by the ghost!</span>`;
  huntedLink.addEventListener('click', () => { location.href = 'hunted.html'; });
  grid.appendChild(huntedLink);
  const p = state.profile;
  GAMES.forEach((g, i) => {
    const card = document.createElement('button');
    card.className = 'game-card playable'; card.style.animationDelay = (i * 0.08) + 's';
    const st = gameStats(p, g.id);
    const ownedPill = g.id === 'mall' ? itemsOwned(p) : 0n;
    card.innerHTML = `<canvas data-thumb="${g.id}" width="520" height="325"></canvas>
      <span class="play-badge">PLAY</span>
      <div class="card-body"><h3 class="card-title">${g.title}</h3><p class="card-sub">${g.tagline}</p>
      <div class="card-meta">${(g.id === 'mall')
        ? (ownedPill > 0n ? `<span class="meta-pill best" title="${formatBig(ownedPill)}">🛍️ ${formatShort(ownedPill)} items owned</span>` : '')
        : `<span class="meta-pill" title="${formatBig(st.played)}">${formatShort(st.played)} played</span><span class="meta-pill best" title="${formatBig(st.wins)}">🏆 ${formatShort(st.wins)} wins</span>`}</div></div>`;
    card.addEventListener('click', () => openPregame(g));
    grid.appendChild(card);
  });
  COMING.forEach(([name, icon, sub], i) => {
    const card = document.createElement('div');
    card.className = 'game-card locked'; card.style.animationDelay = ((i + 2) * 0.06) + 's';
    card.innerHTML = `<div class="soon-icon">${icon}</div><span class="lock-pill">COMING SOON</span>
      <div class="card-body"><h3 class="card-title">${name}</h3><p class="card-sub">${sub}</p></div>`;
    grid.appendChild(card);
  });
}

let thumbRAF = 0;
function startThumbs() {
  cancelAnimationFrame(thumbRAF);
  const t0 = performance.now();
  const loop = now => {
    const t = Math.max(0, now - t0) / 1000;
    $$('canvas[data-thumb]').forEach(cv => {
      const g = GAMES.find(x => x.id === cv.dataset.thumb);
      if (g && cv.offsetParent) g.drawThumb(cv.getContext('2d'), cv.width, cv.height, t);
    });
    thumbRAF = requestAnimationFrame(loop);
  };
  thumbRAF = requestAnimationFrame(loop);
}
function stopThumbs() { cancelAnimationFrame(thumbRAF); }

// ---------------- leaderboard ----------------
// The Overall board shows Trevor at #1 and 19 fake players filling the
// top 20 under him (Trevor: "put a lot of fake people, put top 20 just
// put fake people... close to my points"). The fakes' points sit just
// below Trevor's (99% down to 81%), so he stays #1 and the board always
// looks full. The board shows the top 20, then only the viewing player's
// own row last, with their estimated world rank. A plain player never
// appears in the top 20 list, even if they would rank there.
const OWNER_POINTS_FALLBACK = BigInt(OWNER_STATS.pointsBase);   // Trevor's points if his profile is not loaded
// A fake player's look: varied skin/hair/shirt so the portraits differ.
const fakeAvatar = name => { const s = fakeAvatarSeed(name); return { skin: SKINS[s % SKINS.length], hair: HAIRS[s % HAIRS.length], style: HAIR_STYLES[s % HAIR_STYLES.length], shirt: SHIRTS[s % SHIRTS.length] }; };
// The 19 fake rows for a board: value = points (Overall), money (Money tab) or wins (a wins tab).
// Each board has DIFFERENT fake people in a DIFFERENT order (see
// fakeNamesFor), so the tabs don't all show Willow #2, Mia #3...
function fakeRows(kind) {
  return fakeNamesFor(kind).map((name, i) => {
    const value = kind === 'points' ? fakePoints(i) : kind === 'money' ? fakeMoney(i) : fakeWins(kind, i);
    return { uid: 'fake-' + name.toLowerCase(), name, avatar: fakeAvatar(name), role: 'player', value, points: fakePoints(i), level: OWNER_STATS.levelBase, money: fakeMoney(i), coins: fakeCoins(i), badges: fakeBadges(i) };
  });
}
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
// Estimate a player's world rank from their points. `world` is the real
// number of players, so the rank never pretends the world is bigger than it is.
function estimateRank(points, anchor, floor, world) {
  const p = Number(points), top = Math.max(10, Number(anchor));
  const exp = 1 - Math.log10(p + 1) / Math.log10(top + 1);
  return Math.max(floor, Math.round(Math.pow(world, clamp01(exp)) * (1 + (p % 97) / 1000)));
}
const cmpBig = (a, b) => (BigInt(b.value) > BigInt(a.value) ? 1 : BigInt(b.value) < BigInt(a.value) ? -1 : 0);

function buildOverall(rows, world) {
  // If the signed-in player is the owner, use their own profile so they always show at #1.
  if (state.user && state.profile?.role === 'owner') {
    const p = state.profile;
    rows = [...rows.filter(r => r.uid !== state.user.uid), { uid: state.user.uid, name: p.name, avatar: p.avatar, role: 'owner', value: totalPoints(p), points: totalPoints(p), money: moneyOf(p), coins: coinsOf(p), badges: p.badges.length }];
  }
  // If the owner's row is not in the list at all (his online player was not
  // found), put him in at #1 himself and push everyone else one rank down.
  if (!rows.some(r => r.role === 'owner')) {
    rows = [...rows, { uid: 'owner', name: 'Trevor', avatar: { ...DEFAULT_AVATAR }, role: 'owner', value: OWNER_POINTS_FALLBACK, points: OWNER_POINTS_FALLBACK, level: OWNER_STATS.levelBase, money: moneyOf(OWNER_STATS), coins: coinsOf(OWNER_STATS), badges: BADGES.length }];
  }
  // Fill the top 20 with fake players under Trevor (their points sit just
  // below his). Real players keep their own place below the fakes.
  rows = [...rows.filter(r => !String(r.uid).startsWith('fake-')), ...fakeRows('points')];
  const owner = rows.find(r => r.role === 'owner');
  const anchor = owner ? BigInt(owner.value) : OWNER_POINTS_FALLBACK;
  const isOwnerViewer = state.user && state.profile?.role === 'owner';
  // The top 20 are the leaders. A plain player never appears in that list:
  // their own row always goes last, below the top 20, with their estimated
  // world rank. The owner is the exception: his row is #1 in the top 20.
  const pool = isOwnerViewer ? rows : rows.filter(r => r.uid !== state.user?.uid);
  const top = [...pool].sort(cmpBig).slice(0, 20);
  top.forEach((r, i) => { r.rank = i + 1; });
  // Below the top 20 only the signed-in player's own row is shown, with their estimated world rank.
  const rest = [];
  if (state.user && state.profile && !isOwnerViewer) {
    const p = state.profile;
    const mine = rows.find(r => r.uid === state.user.uid);
    rest.push(mine || { uid: state.user.uid, name: p.name, avatar: p.avatar, role: p.role, value: totalPoints(p), points: totalPoints(p), money: moneyOf(p), coins: coinsOf(p), badges: p.badges.length });
  }
  rest.sort(cmpBig);
  let last = top.length;
  rest.forEach(r => { r.rank = Math.max(last + 1, estimateRank(r.value, anchor, top.length + 1, world)); last = r.rank; });
  return { top, rest };
}

$$('#lb-tabs .chip').forEach(c => c.addEventListener('click', () => {
  state.lbKind = c.dataset.kind;
  $$('#lb-tabs .chip').forEach(x => x.classList.toggle('active', x === c));
  renderLeaderboard();
}));
async function renderLeaderboard() {
  const list = $('#lb-list'), pod = $('#podium'), note = $('#lb-note');
  list.innerHTML = '<li class="lb-note">Loading…</li>'; pod.innerHTML = ''; note.textContent = '';
  let rows, count = null;
  try {
    [rows, count] = await Promise.all([
      backend.leaderboard(state.lbKind),
      backend.playerCount ? backend.playerCount().catch(() => null) : Promise.resolve(null),
    ]);
  }
  catch (e) { console.error(e); list.innerHTML = ''; note.textContent = 'Could not load the leaderboard: ' + (e.code || e.message); return; }
  list.innerHTML = '';
  const overall = state.lbKind === 'points';
  let top = rows, rest = [];
  if (overall) ({ top, rest } = buildOverall(rows, count || rows.length || 1));
  else {
    // Wins and Money tabs: top 20, then your own row at the bottom. A
    // plain player never appears in the top 20: their own row always
    // goes last. Trevor is always #1 here too: if his row is missing,
    // put him in at #1 from his fixed per-game wins (or his money, on
    // the Money tab) and push everyone else one rank down.
    // Then fill the top 20 with fake players under him, like the Overall board.
    if (!rows.some(r => r.role === 'owner')) {
      const ownerValue = state.lbKind === 'money' ? moneyOf(OWNER_STATS) : OWNER_STATS.gamesBase[state.lbKind].wins;
      rows = [{ uid: 'owner', name: 'Trevor', avatar: { ...DEFAULT_AVATAR }, role: 'owner', value: ownerValue, points: OWNER_POINTS_FALLBACK, level: OWNER_STATS.levelBase, money: moneyOf(OWNER_STATS), coins: coinsOf(OWNER_STATS), badges: BADGES.length }, ...rows];
      rows.sort(cmpBig);
    }
    rows = [...rows.filter(r => !String(r.uid).startsWith('fake-')), ...fakeRows(state.lbKind)];
    const isOwnerViewer = state.user && state.profile?.role === 'owner';
    const pool = isOwnerViewer ? rows : rows.filter(r => r.uid !== state.user?.uid);
    pool.sort(cmpBig);
    pool.forEach((r, i) => { r.rank = i + 1; });
    top = pool.slice(0, 20);
    if (state.user && state.profile && !isOwnerViewer) {
      const mine = rows.find(r => r.uid === state.user.uid);
      const p = state.profile, wins = state.lbKind === 'money' ? moneyOf(p) : gameStats(p, state.lbKind).wins;
      rest = [mine || { uid: state.user.uid, name: p.name, avatar: p.avatar, role: p.role, value: wins, points: totalPoints(p), level: playerLevel(p).level, money: moneyOf(p), coins: coinsOf(p), badges: p.badges.length }];
      rest.forEach(r => { r.rank = pool.length + 1; });
    }
  }
  const unit = overall ? 'pts' : state.lbKind === 'money' ? '' : 'wins';
  // The big number on each row: money shows with a $ in front ($73.5Sp),
  // points show as "72.6Qa pts", wins as "16.9B wins".
  const fmtVal = r => state.lbKind === 'money' ? '$' + formatShort(r.value) : `${formatShort(r.value)} ${unit}`;
  const roleTag = r => r.role === 'owner' ? '<span class="role-tag owner">👑</span>' : '';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Every player on the board shows their dollars, points, coins and badges,
  // so nobody looks like they are missing any of them. Dollars show like the
  // hub ($10.00 when small, $73.5Sp when huge).
  const fmtDollars = m => { const v = BigInt(m ?? 0n); return v < 100000n ? '$' + formatBig(v) + '.00' : '$' + formatShort(v); };
  const rowStats = r => `${fmtDollars(r.money)} · 🪙 ${formatShort(r.coins ?? 0n)} · ⭐ ${formatShort(r.points ?? r.value ?? 0n)} pts · 🏅 ${(r.badges ?? 0)}/${BADGES.length}`;
  top.slice(0, 3).forEach((r, i) => {
    const d = document.createElement('div');
    d.className = `pod p${i + 1}`; d.style.animationDelay = (0.1 + (2 - i) * 0.12) + 's';
    d.innerHTML = `<canvas width="168" height="168"></canvas><div class="pod-name">${esc(r.name)} ${roleTag(r)}</div><div class="pod-val" title="${formatBig(r.value)}">${fmtVal(r)}</div><div class="pod-stats">${rowStats(r)}</div><div class="pod-block">${i + 1}</div>`;
    drawPortrait(d.querySelector('canvas'), r.avatar, { bg: false });
    pod.appendChild(d);
  });
  const addRow = (r, i) => {
    const li = document.createElement('li');
    const isMe = r.uid === state.user?.uid;
    li.className = 'lb-row' + (isMe ? ' me' : ''); li.style.animationDelay = Math.min(i, 15) * 0.03 + 's';
    const rank = formatBig(r.rank);
    li.innerHTML = `<span class="lb-rank${rank.length > 3 ? ' long' : ''}">${rank}</span><canvas width="88" height="88"></canvas>
      <span class="lb-main"><span class="lb-name">${esc(r.name)} ${roleTag(r)} ${!overall ? `<small>Lv ${formatShort(r.level ?? levelInfo(r.points).level)}</small>` : ''}${isMe ? '<span class="lb-you">YOU</span>' : ''}</span>
      <span class="lb-stats">${rowStats(r)}</span></span>
      <span class="lb-val" title="${formatBig(r.value)}">${fmtVal(r)}</span>`;
    drawPortrait(li.querySelector('canvas'), r.avatar);
    list.appendChild(li);
  };
  top.forEach(addRow);
  if (rest.length) {
    if (top.length) { const gap = document.createElement('li'); gap.className = 'lb-gap'; gap.textContent = '• • •'; list.appendChild(gap); }
    rest.forEach((r, i) => addRow(r, top.length + i));
  }
  if (!top.length) note.textContent = 'No rankings yet. Finish a match to get on the board!';
  else if (overall) note.textContent = `${WORLD_PLAYERS} players worldwide`;
  else if (backend.mode === 'demo') note.textContent = 'Demo mode shows only this device. Sign in online to compete with everyone.';
  else note.textContent = 'Top 20 players.';
}

function renderBadges() {
  const p = state.profile;
  const have = new Set(p.badges);
  $('#badge-summary').innerHTML = `<span class="big">${have.size} / ${BADGES.length}</span><div class="badge-progress"><div style="width:${(have.size / BADGES.length * 100).toFixed(1)}%"></div></div>`;
  const grid = $('#badge-grid'); grid.innerHTML = '';
  BADGES.forEach((b, i) => {
    const un = have.has(b.id);
    const prog = un ? null : badgeProgress(b.id, p);
    const d = document.createElement('div');
    d.className = 'badge-card ' + (un ? 'unlocked' : 'locked'); d.style.animationDelay = (i * 0.03) + 's';
    d.innerHTML = `${badgeSVG(b, un)}<div class="badge-name">${b.name}</div><div class="badge-desc">${b.desc}</div>
      ${prog !== null ? `<div class="badge-progress" style="margin-top:8px;height:6px"><div style="width:${(prog * 100).toFixed(0)}%"></div></div>` : ''}`;
    grid.appendChild(d);
  });
}

// ---------------- toasts ----------------
function badgeToast(b) {
  audio.play('badge');
  const t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = `${badgeSVG(b)}<div><b>Badge unlocked</b><span>${b.name}</span></div>`;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4200);
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast plain';
  t.innerHTML = `<div><span>${msg}</span></div>`;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4200);
}

// ---------------- settings ----------------
function syncVolumeInputs() {
  $$('.vol-music').forEach(i => i.value = Math.round(audio.vol.music * 100));
  $$('.vol-sfx').forEach(i => i.value = Math.round(audio.vol.sfx * 100));
}
$$('.vol-music').forEach(i => i.addEventListener('input', () => { audio.setVolume('music', i.value / 100); syncVolumeInputs(); }));
$$('.vol-sfx').forEach(i => { i.addEventListener('input', () => { audio.setVolume('sfx', i.value / 100); syncVolumeInputs(); }); i.addEventListener('change', () => audio.play('coin')); });
$('#btn-settings').addEventListener('click', () => {
  syncVolumeInputs();
  $('#settings-acct').textContent = backend.mode === 'demo' ? 'Demo mode: saved on this device only.' : `Signed in as ${state.user?.email || 'Google account'}`;
  // The owner never starts over: his numbers are the game's #1.
  $('#btn-start-over').classList.toggle('hidden', state.profile?.role === 'owner');
  disarmStartOver();
  $('#settings').classList.remove('hidden');
});
$('#btn-settings-close').addEventListener('click', () => { $('#settings').classList.add('hidden'); disarmStartOver(); });
$('#btn-edit-profile').addEventListener('click', () => { $('#settings').classList.add('hidden'); disarmStartOver(); openSetup(true); });
$('#profile-chip').addEventListener('click', () => openSetup(true));
$('#btn-signout').addEventListener('click', async () => { $('#settings').classList.add('hidden'); disarmStartOver(); await backend.signOut(); });
// Start over: erase everything and begin again from zero. Two taps, so a
// stray tap cannot wipe a player. The owner never sees this button.
let startOverArmed = false;
function disarmStartOver() {
  startOverArmed = false;
  const b = $('#btn-start-over');
  if (!b) return;
  b.textContent = 'Start over';
  b.classList.remove('btn-danger');
  b.classList.add('btn-ghost');
}
$('#btn-start-over').addEventListener('click', async () => {
  if (!state.profile || state.profile.role === 'owner') return;
  const b = $('#btn-start-over');
  if (!startOverArmed) {
    startOverArmed = true;
    b.textContent = 'Tap again to erase everything';
    b.classList.remove('btn-ghost');
    b.classList.add('btn-danger');
    return;
  }
  disarmStartOver();
  b.disabled = true;
  try {
    state.profile = await backend.resetProfile();
    $('#settings').classList.add('hidden');
    enterHub();
    toast('Starting from zero!');
  } catch (e) {
    console.error(e);
    toast('Could not start over: ' + (e.code || e.message));
  } finally { b.disabled = false; }
});

// ---------------- game host ----------------
const host = {
  game: null, inst: null, raf: 0, paused: false, ended: false, options: {},
  canvas: $('#game-canvas'), view: { W: 1280, H: 720, ox: 0, oy: 0, scale: 1 },

  resize() {
    const cw = innerWidth, ch = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    const scale = Math.min(cw / 1280, ch / 720);
    const W = Math.min(cw / scale, 1280 * 1.45), H = Math.min(ch / scale, 720 * 1.45);
    this.view = { W, H, ox: (W - 1280) / 2, oy: (H - 720) / 2, scale };
    this.canvas.style.width = (W * scale) + 'px'; this.canvas.style.height = (H * scale) + 'px';
    this.canvas.width = Math.round(W * scale * dpr); this.canvas.height = Math.round(H * scale * dpr);
    this.pxScale = scale * dpr;
  },

  open(game) {
    this.game = game;
    $('#game-layer').classList.remove('hidden');
    $('#pregame').classList.remove('hidden');
    $('#pause-menu').classList.add('hidden'); $('#results').classList.add('hidden');
    $('#touch-controls').classList.remove('on');
    this.resize();
    this.startIdle();
  },
  startIdle() {
    // Draws the game's attract scene behind the pre-game menu.
    cancelAnimationFrame(this.raf);
    const ctx = this.canvas.getContext('2d'), t0 = performance.now();
    const loop = now => {
      ctx.setTransform(this.pxScale, 0, 0, this.pxScale, 0, 0);
      ctx.translate(this.view.ox, this.view.oy);
      this.game.drawThumb(ctx, 1280, 720, Math.max(0, now - t0) / 1000, this.view);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },
  start(options) {
    this.options = options;
    $('#pregame').classList.add('hidden'); $('#results').classList.add('hidden'); $('#pause-menu').classList.add('hidden');
    $('#game-layer').classList.add('playing');
    $('#touch-controls').classList.toggle('on', input.touchMode);
    input.enabled = true; input.reset(); input.setTapMode(false); input.setLabels(this.game.labels.a, this.game.labels.b);
    this.fx = new FX();
    this.paused = false; this.ended = false;
    // Win rates (Trevor: "Trevor 90 present wins others 25 percent").
    // Trevor gets the easy game (boost) in about 90% of matches, so he
    // wins almost every match. Everyone else gets the hard game (tough)
    // in about 75% of matches, so they win about 25%. The numbers are
    // never shown in the game — no "90%" anywhere.
    const isOwner = isOwnerName(state.profile?.name);
    const chance = isOwner ? OWNER_WIN_CHANCE : 0;
    const boost = chance > 0 && Math.random() * 100 < chance;
    const tough = !isOwner && Math.random() * 100 >= OTHER_WIN_CHANCE;
    const shop = {
      profile: () => state.profile,
      buy: async (item, cents, tax = 0) => {
        const res = await backend.purchase(item.id, cents, state.profile, tax);
        state.profile = normalizeProfile(res.profile);
        return res;
      },
      bossTotal: () => backend.bossTotal(),
      // Superpowers: buy one with dollars AND coins in the mall search, hold it for the next match.
      buyPower: async power => {
        const res = await backend.spendPower(power);
        state.profile = normalizeProfile(res.profile);
        setPowerHeld(power.id);
        return res;
      },
      powerHeld: () => getPowerHeld(),
    };
    // Test hook: records the win-rate flags for the game that just started,
    // so a test can count how often Trevor gets the easy game and how
    // often everyone else gets the hard game.
    if (typeof window !== 'undefined') window.__lastGame = { game: this.game.id, boost, tough };
    this.inst = this.game.create({ input, audio, fx: this.fx, options: { ...options, boost, tough }, profile: state.profile, shop, end: r => this.finish(r), toast });
    audio.music(this.game.music);
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    const ctx = this.canvas.getContext('2d');
    const loop = now => {
      const dt = Math.min(1 / 30, (now - this.last) / 1000); this.last = now;
      if (input.pausePressed && !this.ended) this.paused ? this.resume() : this.pause();
      if (!this.paused) {
        input.update(dt);
        this.inst.update(dt);
        this.fx.update(dt);
      }
      input.endFrame();
      ctx.setTransform(this.pxScale, 0, 0, this.pxScale, 0, 0);
      ctx.translate(this.view.ox + this.fx.sx, this.view.oy + this.fx.sy);
      this.inst.draw(ctx, this.view);
      this.fx.drawFlash(ctx, this.view.W, this.view.H);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },
  pause() {
    if (!this.inst || this.ended) return;
    this.paused = true; input.reset(); syncVolumeInputs();
    $('#pause-menu').classList.remove('hidden'); audio.setCrowd(0.1);
  },
  resume() { this.paused = false; $('#pause-menu').classList.add('hidden'); input.reset(); },
  close() {
    cancelAnimationFrame(this.raf); this.inst = null; input.enabled = false; input.setTapMode(false); audio.setCrowd(0);
    $('#game-layer').classList.add('hidden'); $('#game-layer').classList.remove('playing');
    enterHub();
  },
  async finish(result) {
    // A game must never finish twice: a second finish would save the
    // match a second time and pay the reward twice.
    if (this.ended) return;
    this.ended = true; input.enabled = false; input.reset();
    $('#touch-controls').classList.remove('on'); $('#game-layer').classList.remove('playing');
    const banner = $('#results-banner');
    banner.textContent = result.outcome === 'win' ? 'VICTORY!' : result.outcome === 'draw' ? 'DRAW' : 'GOOD GAME';
    banner.className = 'results-banner' + (result.outcome === 'win' ? '' : ' lose');
    $('#results-score').textContent = result.scoreline;
    $('#results-stats').innerHTML = result.stats.join(' · ');
    $('#rw-points').textContent = '+0'; $('#rw-coins').textContent = '+0'; $('#rw-money').textContent = '+$0.00';
    $('#results-badges').innerHTML = '';
    $('#results-save').textContent = 'Saving your rewards…';
    setTimeout(() => $('#results').classList.remove('hidden'), 900);
    audio.play(result.outcome === 'win' ? 'win' : result.outcome === 'draw' ? 'draw' : 'lose');
    try {
      // Superpowers: Double Points doubles the points, Double Coins doubles
      // the coins, Shield pays the draw reward even when you lose.
      if (this.options.power === 'double') result.match.doublePoints = true;
      if (this.options.power === 'lucky') result.match.doubleCoins = true;
      if (this.options.power === 'shield') result.match.shield = true;
      // The power is only spent now that the match is done. A held power
      // (bought in the mall) is used up; a new power is charged now. If
      // the match was cancelled instead, this never runs, so the power
      // stays — cancelling or restarting a match never loses a superpower.
      if (this.options.power && this.options.power !== 'none') {
        const sp = SUPERPOWERS.find(p => p.id === this.options.power);
        if (sp && sp.cost > 0) {
          if (this.options.powerHeld) {
            clearPowerHeld();
          } else if (this.options.powerUnpaid) {
            try {
              const res = await backend.spendPower(sp);
              state.profile = normalizeProfile(res.profile);
            } catch (e) {
              console.warn('Could not charge for the superpower', e);
            }
          }
        }
        // The power was spent on this match only — the next match starts
        // without one, so "Play again" does not get it for free.
        delete this.options.power;
        delete this.options.powerHeld;
        delete this.options.powerUnpaid;
      }
      const res = await backend.recordMatch(result.match, state.profile);
      state.profile = normalizeProfile(res.profile);
      setTimeout(() => {
        countUp('#rw-points', res.reward.points); countUp('#rw-coins', res.reward.coins, true);
        countUp('#rw-money', res.reward.cents || 0, false, c => '+$' + (c / 100).toFixed(2));
        res.newBadges.forEach((id, i) => {
          const b = BADGE_MAP[id]; if (!b) return;
          const d = document.createElement('div'); d.className = 'mini-badge'; d.style.animationDelay = (0.8 + i * 0.25) + 's';
          d.innerHTML = badgeSVG(b) + b.name; $('#results-badges').appendChild(d);
          setTimeout(() => badgeToast(b), 1400 + i * 700);
        });
        // The rewards are saved — to the account when Firebase accepts
        // them, otherwise on this device (the cloud sync runs in the
        // background), so the player always keeps what they earned.
        $('#results-save').textContent = backend.mode === 'demo' ? 'Saved on this device.' : 'Saved ✓';
      }, 1200);
    } catch (e) {
      console.error(e);
      $('#results-save').textContent = e.code === 'permission-denied'
        ? 'Rewards not saved: the Firebase rules need to be published again (see README).'
        : 'Could not save rewards: ' + (e.code || e.message);
    }
  },
};
function countUp(sel, to, coin, fmt = v => '+' + v) {
  const el = $(sel), t0 = performance.now(), dur = 1100;
  const step = now => {
    const k = Math.min(1, (now - t0) / dur);
    el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3))));
    if (k < 1) { if (Math.random() < 0.4) audio.play('tick'); requestAnimationFrame(step); } else if (coin) audio.play('coin');
  };
  requestAnimationFrame(step);
}
addEventListener('resize', () => { if (!$('#game-layer').classList.contains('hidden')) host.resize(); });
// Taps and clicks on the game canvas go to the game in its 1280×720 coordinates.
host.canvas.addEventListener('pointerdown', e => {
  if (!host.inst || host.paused || host.ended) return;
  const r = host.canvas.getBoundingClientRect(), v = host.view;
  input.taps.push({ x: (e.clientX - r.left) / v.scale - v.ox, y: (e.clientY - r.top) / v.scale - v.oy });
});
document.addEventListener('visibilitychange', () => { if (document.hidden && host.inst && !host.ended) host.pause(); });

function openPregame(g) {
  // In Hunted mode there is no hub to go back to — hide the back button.
  $('#btn-pregame-back').classList.toggle('hidden', HUNTED_MODE && g.id === 'hunted');
  $('#pregame-title').textContent = g.title;
  $('#pregame-desc').textContent = g.desc;
  $('#pregame-howto').innerHTML = g.howto;
  $('#diff-seg').parentElement.classList.toggle('hidden', !!g.noDifficulty);
  $('#btn-play').textContent = g.playLabel || 'PLAY';
  $$('#diff-seg button').forEach(b => b.classList.toggle('active', b.dataset.v === (host.lastDiff || 'rookie')));
  // Superpowers: dollars AND coins buy a power for this match, like a real game. Hidden for the mall.
  const powerBlock = $('#power-block'), powerSeg = $('#power-seg');
  powerBlock.classList.toggle('hidden', !!g.noDifficulty);
  if (!g.noDifficulty) {
    const coins = Number(coinsOf(state.profile || {}));
    const dollars = Number(moneyOf(state.profile || {}));
    const held = getPowerHeld();
    $('#power-coins').textContent = `· you have $${formatShort(dollars)} · ${formatShort(coins)} 🪙`;
    powerSeg.innerHTML = SUPERPOWERS.map(p =>
      `<button data-v="${p.id}" class="${p.id === (held || 'none') ? 'active' : ''}" ${(p.cost > coins || p.dollars > dollars) && p.id !== held ? 'disabled' : ''}>${p.icon} ${p.name}<small>${p.id === held ? 'ready!' : p.cost === 0 ? 'free' : '$' + p.dollars + ' + ' + p.cost + ' coins'}</small></button>`).join('');
    const showDesc = id => { const p = SUPERPOWERS.find(x => x.id === id); $('#power-desc').textContent = (p?.desc || '') + (id === held && held ? ' Ready — already paid!' : ''); };
    showDesc(held || 'none');
    powerSeg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      if (b.disabled) return;
      powerSeg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      showDesc(b.dataset.v);
    }));
  }
  const extra = $('#extra-opt'); extra.innerHTML = '';
  (g.options || []).forEach(opt => {
    extra.innerHTML += `<span class="field-label">${opt.label}</span><div class="seg" data-opt="${opt.key}">${opt.choices.map((c, i) => `<button data-v="${c.v}" class="${i === (opt.default || 0) ? 'active' : ''}">${c.label}<small>${c.sub || ''}</small></button>`).join('')}</div>`;
  });
  extra.querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)))));
  stopThumbs();
  host.open(g);
}
$$('#diff-seg button').forEach(b => b.addEventListener('click', () => $$('#diff-seg button').forEach(x => x.classList.toggle('active', x === b))));
$('#btn-pregame-back').addEventListener('click', () => host.close());
$('#btn-play').addEventListener('click', async () => {
  const opts = { difficulty: $('#diff-seg .active').dataset.v };
  host.lastDiff = opts.difficulty;
  $$('#extra-opt .seg').forEach(seg => opts[seg.dataset.opt] = seg.querySelector('.active').dataset.v);
  // Superpower: the power is only spent when the match actually ends.
  // If the player cancels or restarts the match, the power is NOT lost —
  // a held power stays held, and a new power is only charged at the end.
  const powerBtn = $('#power-seg .active');
  const power = powerBtn ? powerBtn.dataset.v : 'none';
  if (power && power !== 'none') {
    const sp = SUPERPOWERS.find(p => p.id === power);
    if (sp && sp.cost > 0) {
      if (power === getPowerHeld()) {
        opts.power = power;
        opts.powerHeld = true;
      } else {
        // New power: check the player can afford it now, but only charge
        // when the match ends (so cancelling costs nothing).
        const coins = Number(coinsOf(state.profile || {}));
        const dollars = Number(moneyOf(state.profile || {}));
        if (sp.cost > coins || sp.dollars > dollars) {
          toast('Not enough money or coins for that superpower!');
          return;
        }
        opts.power = power;
        opts.powerUnpaid = true;
      }
    }
  }
  audio.play('whoosh');
  host.start(opts);
});
$('#btn-pause').addEventListener('click', () => host.paused ? host.resume() : host.pause());
$('#btn-resume').addEventListener('click', () => host.resume());
$('#btn-restart').addEventListener('click', () => host.start(host.options));
$('#btn-quit').addEventListener('click', () => host.close());
$('#btn-results-hub').addEventListener('click', () => host.close());
$('#btn-results-again').addEventListener('click', () => host.start(host.options));

// ---------------- animated background ----------------
(function bg() {
  const cv = $('#bg-canvas'), ctx = cv.getContext('2d');
  let w, h, dots = [], orbs = [];
  const resize = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = cv.width = innerWidth * dpr; h = cv.height = innerHeight * dpr;
    dots = Array.from({ length: 70 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: (Math.random() * 1.6 + 0.4) * dpr, p: Math.random() * 6 }));
    orbs = [['#22d3ee', 0.2], ['#f472b6', 0.15], ['#818cf8', 0.18]].map(([c, a], i) => ({ c, a, x: w * (0.2 + i * 0.3), y: h * (0.3 + (i % 2) * 0.4), r: Math.max(w, h) * 0.28, s: 0.1 + i * 0.05 }));
  };
  resize(); addEventListener('resize', resize);
  const loop = now => {
    const t = now / 1000;
    if ($('#game-layer').classList.contains('hidden')) {
      ctx.clearRect(0, 0, w, h);
      orbs.forEach((o, i) => {
        const x = o.x + Math.sin(t * o.s + i) * w * 0.1, y = o.y + Math.cos(t * o.s * 1.3 + i) * h * 0.08;
        const g = ctx.createRadialGradient(x, y, 0, x, y, o.r);
        g.addColorStop(0, o.c + '33'); g.addColorStop(1, o.c + '00');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      });
      dots.forEach(d => { ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.8 + d.p)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();

buildSwatches();
syncVolumeInputs();
boot();
