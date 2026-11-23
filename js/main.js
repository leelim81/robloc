import { backend, validateName } from './backend.js';
import { audio } from './audio.js';
import { Input } from './input.js';
import { FX } from './fx.js';
import { OWNER_STATS, BADGES, BADGE_MAP, badgeSVG, badgeProgress, coinsOf, moneyOf, moneyCentsOf, formatBig, formatShort, levelInfo, playerLevel, normalizeProfile, totalPoints, careerOf, gameStats, itemsOwned } from './economy.js';
import { SKINS, HAIRS, SHIRTS, HAIR_STYLES, HAIR_STYLE_LABELS, DEFAULT_AVATAR, drawPortrait, drawAvatarFull } from './art.js';
import soccer from './games/soccer.js';
import pickleball from './games/pickleball.js';
import baseball from './games/baseball.js';
import mall from './games/mall.js';
import guessprice from './games/guessprice.js';
import prizemachine from './games/prizemachine.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const GAMES = [soccer, pickleball, baseball, guessprice, prizemachine, mall];
const COMING = [
  ['Transport Modes', '✈️', 'Fly planes, drive buses and run trains.'],
  ['Dream Store', '🌙', 'Explore a dreamy shop full of wonders.'],
  ['Brick Builder Shop', '🧱', 'Shop for building sets and create.'],
];

const state = { user: null, profile: null, view: 'games', lbKind: 'points', editing: false, avatar: { ...DEFAULT_AVATAR } };
const input = new Input();

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
function friendlyAuthError(e) {
  if (e.code === 'auth/unauthorized-domain') return 'This website is not yet allowed in Firebase sign-in settings (Authorized domains).';
  if (e.code === 'auth/network-request-failed') return 'Network problem. Check your connection and try again.';
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
  show('screen-hub');
  audio.music('menu');
  renderTopbar(false);
  renderGames();
  switchView(state.view);
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
  $('#career').innerHTML = `<span title="${formatBig(c.played)}">🎮 <b>${formatShort(c.played)}</b> played</span><span title="${formatBig(c.wins)}">🏆 <b>${formatShort(c.wins)}</b> won</span>`;
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
  const p = state.profile;
  GAMES.forEach((g, i) => {
    const card = document.createElement('button');
    card.className = 'game-card playable'; card.style.animationDelay = (i * 0.08) + 's';
    const st = gameStats(p, g.id);
    card.innerHTML = `<canvas data-thumb="${g.id}" width="520" height="325"></canvas>
      <span class="play-badge">PLAY</span>
      <div class="card-body"><h3 class="card-title">${g.title}</h3><p class="card-sub">${g.tagline}</p>
      <div class="card-meta">${g.id === 'mall'
        ? (itemsOwned(p) > 0n ? `<span class="meta-pill best" title="${formatBig(itemsOwned(p))}">🛍️ ${formatShort(itemsOwned(p))} items owned</span>` : '')
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
// The Overall board shows real players only. Everybody starts from zero, so
// nobody is given points: the owner always stays #1 (put in at #1 himself
// when his online player is not found), and everyone else earns their place.
// The board shows the top 10, then only the viewing player's own row last,
// with their estimated world rank. A plain player never appears in the top
// 10 list, even if they would rank there.
const OWNER_POINTS_FALLBACK = BigInt(OWNER_STATS.pointsBase);   // Trevor's points if his profile is not loaded
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
    rows = [...rows.filter(r => r.uid !== state.user.uid), { uid: state.user.uid, name: p.name, avatar: p.avatar, role: 'owner', value: totalPoints(p), points: totalPoints(p) }];
  }
  // If the owner's row is not in the list at all (his online player was not
  // found), put him in at #1 himself and push everyone else one rank down.
  if (!rows.some(r => r.role === 'owner')) {
    rows = [...rows, { uid: 'owner', name: 'Trevor', avatar: { ...DEFAULT_AVATAR }, role: 'owner', value: OWNER_POINTS_FALLBACK, points: OWNER_POINTS_FALLBACK, level: OWNER_STATS.levelBase }];
  }
  const owner = rows.find(r => r.role === 'owner');
  const anchor = owner ? BigInt(owner.value) : OWNER_POINTS_FALLBACK;
  const isOwnerViewer = state.user && state.profile?.role === 'owner';
  // The top 10 are the leaders. A plain player never appears in that list:
  // their own row always goes last, below the top 10, with their estimated
  // world rank. The owner is the exception: his row is #1 in the top 10.
  const pool = isOwnerViewer ? rows : rows.filter(r => r.uid !== state.user?.uid);
  const top = [...pool].sort(cmpBig).slice(0, 10);
  top.forEach((r, i) => { r.rank = i + 1; });
  // Below the top 10 only the signed-in player's own row is shown, with their estimated world rank.
  const rest = [];
  if (state.user && state.profile && !isOwnerViewer) {
    const p = state.profile;
    const mine = rows.find(r => r.uid === state.user.uid);
    rest.push(mine || { uid: state.user.uid, name: p.name, avatar: p.avatar, role: p.role, value: totalPoints(p), points: totalPoints(p) });
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
    // Wins tabs: top 10, then your own row at the bottom. A plain player
    // never appears in the top 10: their own row always goes last.
    // Trevor is always #1 here too: if his row is missing, put him in at #1
    // from his fixed per-game wins and push everyone else one rank down.
    if (!rows.some(r => r.role === 'owner')) {
      rows = [{ uid: 'owner', name: 'Trevor', avatar: { ...DEFAULT_AVATAR }, role: 'owner', value: OWNER_STATS.gamesBase[state.lbKind].wins, points: OWNER_POINTS_FALLBACK, level: OWNER_STATS.levelBase }, ...rows];
      rows.sort(cmpBig);
    }
    const isOwnerViewer = state.user && state.profile?.role === 'owner';
    const pool = isOwnerViewer ? rows : rows.filter(r => r.uid !== state.user?.uid);
    pool.forEach((r, i) => { r.rank = i + 1; });
    top = pool.slice(0, 10);
    if (state.user && state.profile && !isOwnerViewer) {
      const mine = rows.find(r => r.uid === state.user.uid);
      const p = state.profile, wins = gameStats(p, state.lbKind).wins;
      rest = [mine || { uid: state.user.uid, name: p.name, avatar: p.avatar, role: p.role, value: wins, points: totalPoints(p), level: playerLevel(p).level }];
      rest.forEach(r => { r.rank = pool.length + 1; });
    }
  }
  const unit = overall ? 'pts' : 'wins';
  const roleTag = r => r.role === 'owner' ? '<span class="role-tag owner">👑</span>' : '';
  // Only Trevor (owner) and Si Wei have a name on the board. Every other
  // player's name is hidden - their row shows only rank, picture and points.
  // Your own row shows YOU instead of your name.
  const showName = r => r.role === 'owner' || r.role === 'siwei';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  top.slice(0, 3).forEach((r, i) => {
    const d = document.createElement('div');
    d.className = `pod p${i + 1}`; d.style.animationDelay = (0.1 + (2 - i) * 0.12) + 's';
    d.innerHTML = `<canvas width="168" height="168"></canvas><div class="pod-name">${showName(r) ? esc(r.name) + ' ' : ''}${roleTag(r)}</div><div class="pod-val" title="${formatBig(r.value)}">${formatShort(r.value)} ${unit}</div><div class="pod-block">${i + 1}</div>`;
    drawPortrait(d.querySelector('canvas'), r.avatar, { bg: false });
    pod.appendChild(d);
  });
  const addRow = (r, i) => {
    const li = document.createElement('li');
    const isMe = r.uid === state.user?.uid;
    li.className = 'lb-row' + (isMe ? ' me' : ''); li.style.animationDelay = Math.min(i, 15) * 0.03 + 's';
    const rank = formatBig(r.rank);
    li.innerHTML = `<span class="lb-rank${rank.length > 3 ? ' long' : ''}">${rank}</span><canvas width="88" height="88"></canvas>
      <span class="lb-name">${showName(r) ? esc(r.name) + ' ' : ''}${roleTag(r)} ${!overall ? `<small>Lv ${formatShort(r.level ?? levelInfo(r.points).level)}</small>` : ''}${isMe ? '<span class="lb-you">YOU</span>' : ''}</span>
      <span class="lb-val" title="${formatBig(r.value)}">${formatShort(r.value)} ${unit}</span>`;
    drawPortrait(li.querySelector('canvas'), r.avatar);
    list.appendChild(li);
  };
  top.forEach(addRow);
  if (rest.length) {
    if (top.length) { const gap = document.createElement('li'); gap.className = 'lb-gap'; gap.textContent = '• • •'; list.appendChild(gap); }
    rest.forEach((r, i) => addRow(r, top.length + i));
  }
  if (!top.length) note.textContent = 'No rankings yet. Finish a match to get on the board!';
  else if (overall) note.textContent = count ? (count === 1 ? '1 player worldwide' : `${formatBig(count)} players worldwide`) : '';
  else if (backend.mode === 'demo') note.textContent = 'Demo mode shows only this device. Sign in online to compete with everyone.';
  else note.textContent = 'Top 10 players.';
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
    // Players with a win chance (set in roles/{uid}) get a weakened opponent in that share of matches.
    const chance = Number(state.profile?.winChance || 0);
    const boost = chance > 0 && Math.random() * 100 < chance;
    const shop = {
      profile: () => state.profile,
      buy: async (item, cents, tax = 0) => {
        const res = await backend.purchase(item.id, cents, state.profile, tax);
        state.profile = normalizeProfile(res.profile);
        return res;
      },
      bossTotal: () => backend.bossTotal(),
    };
    this.inst = this.game.create({ input, audio, fx: this.fx, options: { ...options, boost }, profile: state.profile, shop, end: r => this.finish(r), toast });
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
      const res = await backend.recordMatch(result.match);
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
        $('#results-save').textContent = backend.mode === 'demo' ? 'Saved on this device.' : 'Saved to your account ✓';
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
  $('#pregame-title').textContent = g.title;
  $('#pregame-desc').textContent = g.desc;
  $('#pregame-howto').innerHTML = g.howto;
  $('#diff-seg').parentElement.classList.toggle('hidden', !!g.noDifficulty);
  $('#btn-play').textContent = g.playLabel || 'PLAY';
  $$('#diff-seg button').forEach(b => b.classList.toggle('active', b.dataset.v === (host.lastDiff || 'rookie')));
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
$('#btn-play').addEventListener('click', () => {
  const opts = { difficulty: $('#diff-seg .active').dataset.v };
  host.lastDiff = opts.difficulty;
  $$('#extra-opt .seg').forEach(seg => opts[seg.dataset.opt] = seg.querySelector('.active').dataset.v);
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
