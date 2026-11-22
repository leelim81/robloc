// Persistence layer. Uses Firebase (Google sign-in + Firestore) when configured,
// otherwise falls back to a local demo mode backed by localStorage.
import { firebaseConfig } from './firebase-config.js';
import { applyMatch, normalizeProfile, totalPoints } from './economy.js';

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

const LB_FIELD = { points: 'points', soccer: 'stats.soccer.wins', pickleball: 'stats.pickleball.wins' };

function lbValue(p, kind) {
  if (kind === 'soccer') return p.stats?.soccer?.wins || 0;
  if (kind === 'pickleball') return p.stats?.pickleball?.wins || 0;
  return totalPoints(p);
}
const ROLE_FIELDS = ['role', 'moneyBase', 'coinsBase', 'pointsBase', 'playedBase', 'winsBase', 'winChance'];
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
        const out = { role: r.role };
        for (const k of ROLE_FIELDS.slice(1)) out[k] = String(r[k] || '0');
        return out;
      }
    } catch (e) { console.warn('role read failed', e); }
    return { ...PLAYER_ROLE };
  }

  async loadProfile() {
    const snap = await this.F.getDoc(this.userRef());
    if (!snap.exists()) return null;
    let p = normalizeProfile(snap.data());
    const r = await this.readRole();
    if (ROLE_FIELDS.some(k => r[k] !== p[k])) {
      await this.F.updateDoc(this.userRef(), r);
      p = { ...p, ...r };
    }
    return p;
  }

  async createProfile({ name, avatar }) {
    const r = await this.readRole();
    const { serverTimestamp, setDoc } = this.F;
    const data = {
      name, avatar, ...r,
      points: 0, coinsEarned: 0, totalCoinsEarned: 0,
      badges: ['welcome'], stats: {},
      createdAt: serverTimestamp(), lastAward: serverTimestamp(),
    };
    await setDoc(this.userRef(), data);
    return normalizeProfile({ ...data, createdAt: null, lastAward: null });
  }

  async updateIdentity({ name, avatar }) {
    await this.F.updateDoc(this.userRef(), { name, avatar });
  }

  async recordMatch(match) {
    const { runTransaction, serverTimestamp } = this.F;
    return runTransaction(this.db, async tx => {
      const snap = await tx.get(this.userRef());
      if (!snap.exists()) throw new Error('Profile missing');
      const p = normalizeProfile(snap.data());
      const { next, reward, newBadges } = applyMatch(p, match);
      tx.update(this.userRef(), { ...next, lastAward: serverTimestamp() });
      return { profile: { ...p, ...next }, reward, newBadges };
    });
  }

  async leaderboard(kind) {
    const { collection, query, orderBy, limit, getDocs, where } = this.F;
    const field = LB_FIELD[kind];
    const q = query(collection(this.db, 'users'), where(field, '>', 0), orderBy(field, 'desc'), limit(50));
    // Role holders can have bonus points that the points query does not see, so fetch them too.
    const [snaps, special] = await Promise.all([
      getDocs(q),
      kind === 'points' ? getDocs(query(collection(this.db, 'users'), where('role', 'in', ['owner', 'siwei']))) : null,
    ]);
    const byId = new Map();
    for (const d of [...snaps.docs, ...(special ? special.docs : [])]) {
      const p = normalizeProfile(d.data());
      const value = lbValue(p, kind);
      if (value > 0) byId.set(d.id, { uid: d.id, name: p.name, avatar: p.avatar, role: p.role, value, points: totalPoints(p) });
    }
    return [...byId.values()].sort((a, b) => (BigInt(b.value) > BigInt(a.value) ? 1 : BigInt(b.value) < BigInt(a.value) ? -1 : 0)).slice(0, 50);
  }
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
  async createProfile({ name, avatar }) {
    const p = normalizeProfile({ name, avatar, ...PLAYER_ROLE, badges: ['welcome'] });
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
  async leaderboard(kind) {
    const p = this.read();
    if (!p) return [];
    const np = normalizeProfile(p);
    const v = lbValue(np, kind);
    return v > 0 ? [{ uid: 'demo-player', name: np.name, avatar: np.avatar, role: np.role, value: v, points: totalPoints(np) }] : [];
  }
}

export const backend = configured ? new FirebaseBackend() : new DemoBackend();
