// Persistence layer. Uses Firebase (Google sign-in + Firestore) when configured,
// otherwise falls back to a local demo mode backed by localStorage.
import { firebaseConfig } from './firebase-config.js';
import { applyMatch, normalizeProfile, totalPoints, payPlan, playerLevel, isOwnerName, gameStats } from './economy.js';

const OWNER_NAME_SPELLINGS = ['trevor', 'Trevor', 'TREVOR', 'trevor ', 'Trevor '];

const FB_VERSION = '10.12.2';
// Add ?demo to the URL to force local demo mode (handy for offline testing).
const forceDemo = new URLSearchParams(location.search).has('demo');
const configured = !forceDemo && !!(firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('YOUR_'));

const BAD_WORDS = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'nigg', 'fag', 'slut', 'whore', 'rape', 'porn', 'sex'];
export function validateName(raw) {
  const name = (raw || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 16) return { ok: false, error: 'Use 2–16 characters.' };
  if (!/^[A-Za-z0-9 _.\-]+$/.test(name)) return { ok: false, error: 'Use letters, numbers, spaces, - _ or . only.' };
  const flat = name.toLowerCase().replace(/[^a-z]/g, '');
  if (BAD_WORDS.some(w => flat.includes(w))) return { ok: false, error: 'Please choose a friendlier name.' };
  return { ok: true, name };
}

const LB_FIELD = { points: 'points', soccer: 'stats.soccer.wins', pickleball: 'stats.pickleball.wins', baseball: 'stats.baseball.wins' };

function lbValue(p, kind) {
  if (kind === 'soccer' || kind === 'pickleball' || kind === 'baseball') return gameStats(p, kind).wins;
  return totalPoints(p);
}
const ROLE_FIELDS = ['role', 'moneyBase', 'coinsBase', 'pointsBase', 'playedBase', 'winsBase', 'winChance'];
// Role values should be typed as strings in the console. Numbers still work, but very big ones lose digits.
function roleValue(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? BigInt(Math.round(v)).toString() : '0';
  const s = String(v ?? '0').replace(/[,\s$]/g, '');
  return /^\d+$/.test(s) ? s : '0';
}
const PLAYER_ROLE = { role: 'player', moneyBase: '0', coinsBase: '0', pointsBase: '0', playedBase: '0', winsBase: '0', winChance: '0' };

class FirebaseBackend {
  mode = 'firebase';
  async init(onUser) {
    const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}/`;
    const [app, auth, fs] = await Promise.all([
      import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js'),
    ]);
    this.A = auth; this.F = fs;
    this.app = app.initializeApp(firebaseConfig);
    this.auth = auth.getAuth(this.app);
    this.db = fs.getFirestore(this.app);
    try { await auth.getRedirectResult(this.auth); } catch (e) { this.redirectError = e; }
    auth.onAuthStateChanged(this.auth, u => {
      this.user = u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null;
      onUser(this.user);
    });
  }
  async signIn() {
    const provider = new this.A.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await this.A.signInWithPopup(this.auth, provider);
    } catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
        await this.A.signInWithRedirect(this.auth, provider);
      } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        throw e;
      }
    }
  }
  signOut() { return this.A.signOut(this.auth); }
  userRef(uid = this.user.uid) { return this.F.doc(this.db, 'users', uid); }

  async readRole() {
    try {
      const snap = await this.F.getDoc(this.F.doc(this.db, 'roles', this.user.uid));
      if (snap.exists()) {
        const r = snap.data();
        const out = { role: String(r.role || 'player') };
        for (const k of ROLE_FIELDS.slice(1)) out[k] = roleValue(r[k]);
        return out;
      }
    } catch (e) { console.warn('role read failed', e); }
    return { ...PLAYER_ROLE };
  }

  async loadProfile() {
    const snap = await this.F.getDoc(this.userRef());
    if (!snap.exists()) return null;
    const p = normalizeProfile(snap.data());
    const r = await this.readRole();
    await this.syncRole({ ...PLAYER_ROLE, ...snap.data() }, r);
    // Show the role bonuses locally even if saving them to the profile was refused.
    return mergeLocal(this.user.uid, { ...p, ...r });
  }
  // Copies roles/{uid} into the player's profile so others see it on the leaderboard. Never blocks play.
  async syncRole(p, r) {
    // Trevor is recognized by name, so his saved profile only needs plain-player values.
    if (isOwnerName(p.name)) r = PLAYER_ROLE;
    if (!ROLE_FIELDS.some(k => r[k] !== p[k])) return;
    try { await this.F.updateDoc(this.userRef(), r); }
    catch (e) {
      console.warn('Role bonuses could not be saved to the profile (check that roles fields are strings)', e);
      await this.resetRole();
    }
  }
  // Old role values that no longer match roles/{uid} make Firebase refuse every save. Plain-player values are always allowed.
  async resetRole() {
    try { await this.F.updateDoc(this.userRef(), PLAYER_ROLE); return true; }
    catch (e) { console.warn('Could not reset role fields', e); return false; }
  }
  // Runs a save; if Firebase refuses it, resets the role fields and tries once more.
  async withRepair(fn) {
    try { return await fn(); }
    catch (e) {
      if (e.code !== 'permission-denied' || !(await this.resetRole())) throw e;
      return fn();
    }
  }

  // True when the name is the owner's and another account already uses it.
  async nameTaken(name) {
    if (!isOwnerName(name)) return false;
    try {
      const { collection, query, where, getDocs } = this.F;
      const snaps = await getDocs(query(collection(this.db, 'users'), where('name', 'in', OWNER_NAME_SPELLINGS)));
      return snaps.docs.some(d => d.id !== this.user.uid);
    } catch (e) { console.warn('name check failed', e); return false; }
  }
  async createProfile({ name, avatar }) {
    const r = await this.readRole();
    const { serverTimestamp, setDoc } = this.F;
    // Always create as a plain player first, so sign-up works no matter how the roles document is set up.
    const data = {
      name, avatar, ...PLAYER_ROLE,
      points: 0, coinsEarned: 0, totalCoinsEarned: 0,
      badges: [], stats: {},
      inventory: {}, moneySpentCents: '0', coinsSpent: 0, moneyEarnedCents: '0',
      createdAt: serverTimestamp(), lastAward: serverTimestamp(),
    };
    await setDoc(this.userRef(), data);
    const p = normalizeProfile({ ...data, createdAt: null, lastAward: null });
    if (r.role !== 'player') await this.syncRole(p, r);
    return normalizeProfile({ ...p, ...r });
  }

  async updateIdentity({ name, avatar }) {
    await this.withRepair(() => this.F.updateDoc(this.userRef(), { name, avatar }));
  }
  async recordMatch(match) {
    const { runTransaction, serverTimestamp } = this.F;
    return this.withRepair(() => runTransaction(this.db, async tx => {
      const snap = await tx.get(this.userRef());
      if (!snap.exists()) throw new Error('Profile missing');
      const p = normalizeProfile(snap.data());
      const { next, reward, newBadges } = applyMatch(p, match);
      tx.update(this.userRef(), { ...next, lastAward: serverTimestamp() });
      return { profile: mergeLocal(this.user.uid, { ...p, ...next }), reward, newBadges };
    }));
  }

  // Buys one shop item for `cents` (tax included). Throws { code: 'not-enough' } when it can't be afforded.
  // Buying is instant: the item is saved on this device right away, then saved to Firebase in the
  // background. When Firebase confirms, the device copy is removed (Firebase has it now).
  // current: the profile the player sees now (already including device-only purchases).
  async purchase(itemId, cents, current) {
    const { runTransaction } = this.F;
    const uid = this.user.uid;
    const cur = normalizeProfile(current || {});
    const plan = payPlan(cur, cents);
    if (!plan) { const err = new Error('Not enough money or coins'); err.code = 'not-enough'; throw err; }
    const local = sign => {
      const l = readLocal(uid);
      l.inventory[itemId] = (l.inventory[itemId] || 0) + sign;
      if (l.inventory[itemId] <= 0) delete l.inventory[itemId];
      l.moneySpentCents = String(BigInt(l.moneySpentCents || '0') + BigInt(sign * plan.money));
      l.coinsSpent = (l.coinsSpent || 0) + sign * plan.coins;
      writeLocal(uid, l);
    };
    local(1);
    this.withRepair(() => runTransaction(this.db, async tx => {
      const snap = await tx.get(this.userRef());
      if (!snap.exists()) throw new Error('Profile missing');
      const raw = normalizeProfile(snap.data());
      tx.update(this.userRef(), spend(raw, itemId, cents, true));
    })).then(() => local(-1)).catch(e => console.warn('Purchase kept on this device only', e));
    const inv = { ...cur.inventory, [itemId]: (cur.inventory[itemId] || 0) + 1 };
    return { profile: { ...cur, inventory: inv, moneySpentCents: String(BigInt(cur.moneySpentCents) + BigInt(plan.money)), coinsSpent: cur.coinsSpent + plan.coins } };
  }

  // The boss's cut: the sales tax from a mall purchase goes to Trevor.
  // One shared counter in boss/earnings (cents). It only ever goes up, and
  // adding to it never blocks or fails a purchase: callers catch errors.
  async bossEarn(cutCents) {
    const { doc, runTransaction } = this.F;
    const ref = doc(this.db, 'boss', 'earnings');
    await runTransaction(this.db, async tx => {
      const snap = await tx.get(ref);
      const now = snap.exists() ? (snap.data().cents || 0) : 0;
      tx.set(ref, { cents: now + Math.round(cutCents) });
    });
  }
  async bossTotal() {
    const { doc, getDoc } = this.F;
    try {
      const snap = await getDoc(doc(this.db, 'boss', 'earnings'));
      return snap.exists() ? (snap.data().cents || 0) : 0;
    } catch { return 0; }
  }

  async leaderboard(kind) {
    const { collection, query, orderBy, limit, getDocs, where } = this.F;
    const field = LB_FIELD[kind];
    const q = query(collection(this.db, 'users'), where(field, '>', 0), orderBy(field, 'desc'), limit(50));
    // Role holders can have bonus points that the points query does not see, so fetch them too.
    const [snaps, special, named] = await Promise.all([
      getDocs(q),
      kind === 'points' ? getDocs(query(collection(this.db, 'users'), where('role', 'in', ['owner', 'siwei']))) : null,
      // the player named Trevor is the owner even without a roles document
      getDocs(query(collection(this.db, 'users'), where('name', 'in', OWNER_NAME_SPELLINGS))),
    ]);
    const byId = new Map();
    for (const d of [...snaps.docs, ...(special ? special.docs : []), ...(named ? named.docs : [])]) {
      const p = normalizeProfile(d.data());
      const value = lbValue(p, kind);
      if (value > 0) byId.set(d.id, { uid: d.id, name: p.name, avatar: p.avatar, role: p.role, value, points: totalPoints(p), level: playerLevel(p).level });
    }
    return [...byId.values()].sort((a, b) => (BigInt(b.value) > BigInt(a.value) ? 1 : BigInt(b.value) < BigInt(a.value) ? -1 : 0)).slice(0, 50);
  }
}

// Purchases Firebase refused (usually because new rules weren't published yet) are kept on this device
// so shopping still works; they're added to the profile whenever it loads.
const localKey = uid => 'robloc_local_shop_' + uid;
function readLocal(uid) {
  try { return JSON.parse(localStorage.getItem(localKey(uid)) || 'null') || { inventory: {}, moneySpentCents: '0', coinsSpent: 0 }; }
  catch { return { inventory: {}, moneySpentCents: '0', coinsSpent: 0 }; }
}
function writeLocal(uid, l) { try { localStorage.setItem(localKey(uid), JSON.stringify(l)); } catch {} }
function mergeLocal(uid, p) {
  const l = readLocal(uid), inv = { ...(p.inventory || {}) };
  for (const [k, n] of Object.entries(l.inventory)) inv[k] = (inv[k] || 0) + n;
  return normalizeProfile({
    ...p, inventory: inv,
    moneySpentCents: String(BigInt(p.moneySpentCents || '0') + BigInt(l.moneySpentCents || '0')),
    coinsSpent: (p.coinsSpent || 0) + (l.coinsSpent || 0),
  });
}

function spend(p, itemId, cents, skipCheck = false) {
  // skipCheck: affordability was already checked including device-only purchases; pay with money if it covers it
  const plan = payPlan(p, cents) || (skipCheck ? { money: 0, coins: Math.ceil(cents / 100) } : null);
  if (!plan) { const e = new Error('Not enough money or coins'); e.code = 'not-enough'; throw e; }
  return {
    inventory: { ...p.inventory, [itemId]: (p.inventory[itemId] || 0) + 1 },
    moneySpentCents: String(BigInt(p.moneySpentCents || '0') + BigInt(plan.money)),
    coinsSpent: (p.coinsSpent || 0) + plan.coins,
  };
}

class DemoBackend {
  mode = 'demo';
  KEY = 'robloc_demo_v1';
  async init(onUser) {
    this.onUser = onUser;
    let signed = false;
    try { signed = localStorage.getItem(this.KEY + '_signed') === '1'; } catch {}
    this.user = signed ? { uid: 'demo-player', email: null, displayName: 'Demo player' } : null;
    setTimeout(() => onUser(this.user), 0);
  }
  async signIn() {
    try { localStorage.setItem(this.KEY + '_signed', '1'); } catch {}
    this.user = { uid: 'demo-player', email: null, displayName: 'Demo player' };
    this.onUser(this.user);
  }
  async signOut() {
    try { localStorage.removeItem(this.KEY + '_signed'); } catch {}
    this.user = null; this.onUser(null);
  }
  read() { try { const s = localStorage.getItem(this.KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
  write(p) { try { localStorage.setItem(this.KEY, JSON.stringify(p)); } catch {} }
  async loadProfile() { const p = this.read(); return p ? normalizeProfile(p) : null; }
  async nameTaken() { return false; }
  async createProfile({ name, avatar }) {
    const p = normalizeProfile({ name, avatar, ...PLAYER_ROLE, badges: [] });
    this.write(p); return p;
  }
  async updateIdentity({ name, avatar }) { const p = this.read(); this.write({ ...p, name, avatar }); }
  async recordMatch(match) {
    const p = normalizeProfile(this.read());
    const { next, reward, newBadges } = applyMatch(p, match);
    const profile = { ...p, ...next };
    this.write(profile);
    return { profile, reward, newBadges };
  }
  async purchase(itemId, cents) {
    const p = normalizeProfile(this.read());
    const profile = { ...p, ...spend(p, itemId, cents) };
    this.write(profile);
    return { profile };
  }
  // Demo mode: the boss's cut lives on this device only.
  async bossEarn(cutCents) {
    try { localStorage.setItem('robloc_demo_boss_cents', String(Number(localStorage.getItem('robloc_demo_boss_cents') || '0') + Math.round(cutCents))); } catch {}
  }
  async bossTotal() {
    try { return Number(localStorage.getItem('robloc_demo_boss_cents') || '0'); } catch { return 0; }
  }
  async leaderboard(kind) {
    const p = this.read();
    if (!p) return [];
    const np = normalizeProfile(p);
    const v = lbValue(np, kind);
    return v > 0 ? [{ uid: 'demo-player', name: np.name, avatar: np.avatar, role: np.role, value: v, points: totalPoints(np), level: playerLevel(np).level }] : [];
  }
}

export const backend = configured ? new FirebaseBackend() : new DemoBackend();
