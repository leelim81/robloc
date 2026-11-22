// ROBLOC audio engine: every sound and music track is synthesized live with the Web Audio API,
// so there are no audio files to download or license.

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const CHORD = {
  maj: [0, 4, 7, 12], min: [0, 3, 7, 12], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10], sus: [0, 5, 7, 12], add9: [0, 4, 7, 14],
};

const TRACKS = {
  menu: {
    bpm: 100,
    chords: [[41, 'maj7'], [43, 'add9'], [40, 'min7'], [45, 'min7']],
    drums: { k: 'x.....x...x.....', s: '....x.......x...', h: '..x...x...x...x.', c: '' },
    bass: 'r.....r.5...r...', arp: '0.1.2.3.2.1.0.2.', arpInst: 'pluck', lead: 'x..x..x...x.x...', leadOct: 72,
  },
  soccer: {
    bpm: 126,
    chords: [[45, 'min'], [41, 'maj'], [48, 'maj'], [43, 'maj']],
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', c: '....x.......x..x' },
    bass: '..r...r...r.8.r.', arp: '0123012301230123', arpInst: 'pluck', lead: 'x.x...x.x.x...x.', leadOct: 72,
  },
  baseball: {
    bpm: 118,
    chords: [[43, 'maj'], [48, 'maj'], [45, 'min7'], [50, 'dom7']],
    drums: { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', c: '............x.x.' },
    bass: 'r...5...r.r.5...', arp: '0.1.2.1.0.1.2.3.', arpInst: 'marimba', lead: 'x.x.x...x...x.x.', leadOct: 72,
  },
  mall: {
    bpm: 96,
    chords: [[41, 'maj7'], [38, 'min7'], [43, 'min7'], [36, 'dom7']],
    drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', c: '' },
    bass: 'r..5..r.r..5..8.', arp: '0.2.1.3.2.0.3.1.', arpInst: 'marimba', lead: 'x...x.x.x...x...', leadOct: 72,
  },
  pickleball: {
    bpm: 112,
    chords: [[48, 'maj7'], [45, 'min7'], [50, 'min7'], [43, 'dom7']],
    drums: { k: 'x......x..x.....', s: '....x.......x...', h: 'x.xxx.xxx.xxx.x.', c: '' },
    bass: 'r..r..5.r.r..58.', arp: '0.2.1.3..2.0.3.1', arpInst: 'marimba', lead: 'x...x.x...x..x..', leadOct: 72,
  },
};

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

class AudioEngine {
  constructor() {
    this.ctx = null;
    // ALL sound is OFF by default: no music, no sound effects, no crowd
    // noise - nothing plays on its own when the game opens or in any game.
    // The two sliders in Settings are the switches: 0 is off, anything
    // above 0 turns that sound on (and remembers the choice). An old saved
    // volume never turns sound back on: only an explicit on-choice does.
    this.vol = { music: 0, sfx: 0, musicOn: false, sfxOn: false };
    try { const v = JSON.parse(localStorage.getItem('robloc_vol') || 'null'); if (v) this.vol = { ...this.vol, ...v }; } catch {}
    if (!this.vol.musicOn) this.vol.music = 0;
    if (!this.vol.sfxOn) this.vol.sfx = 0;
    this.track = null; this.wanted = null;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
      this.master.connect(comp).connect(ctx.destination);
      this.musicBus = ctx.createGain(); this.sfxBus = ctx.createGain();
      this.musicBus.connect(this.master); this.sfxBus.connect(this.master);
      this.reverb = ctx.createConvolver(); this.reverb.buffer = this.impulse(2.4, 2.6);
      this.revSend = ctx.createGain(); this.revSend.gain.value = 0.35;
      this.revSend.connect(this.reverb).connect(this.master);
      this.noise = this.makeNoise(2);
      this.applyVolumes();
      this.initCrowd();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.wanted && !this.track) this.music(this.wanted);
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.42, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
  }
  setVolume(kind, v) {
    this.vol[kind] = v;
    if (kind === 'music') {
      // The Music slider is the on/off switch.
      this.vol.musicOn = v > 0;
      if (v > 0) { if (this.wanted && !this.track) this.music(this.wanted); }
      else this.stopMusic();
    }
    if (kind === 'sfx') {
      // The Sound slider is the on/off switch for every sound effect and
      // for the crowd noise. Turning it to 0 silences the crowd at once;
      // turning it up brings the crowd back to where the game set it.
      this.vol.sfxOn = v > 0;
      if (v > 0) { if (this.crowdLevel) this.setCrowd(this.crowdLevel); }
      else this.setCrowd(0);
    }
    this.applyVolumes();
    try { localStorage.setItem('robloc_vol', JSON.stringify(this.vol)); } catch {}
  }

  makeNoise(sec) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  impulse(sec, decay) {
    const len = this.ctx.sampleRate * sec, b = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  // ---------- primitives ----------
  tone(t, { type = 'sine', f = 440, f2 = null, dur = 0.2, gain = 0.3, attack = 0.005, dest, rev = 0, detune = 0, curve = 'exp' }) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    else g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest || this.sfxBus);
    if (rev) { const s = ctx.createGain(); s.gain.value = rev; g.connect(s).connect(this.revSend); }
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  noiseHit(t, { dur = 0.1, gain = 0.3, type = 'bandpass', f = 1000, f2 = null, q = 1, dest, rev = 0, attack = 0.002 }) {
    const ctx = this.ctx, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noise; s.loop = true;
    fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(dest || this.sfxBus);
    if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r).connect(this.revSend); }
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  // ---------- SFX ----------
  play(name, o = {}) {
    // Sound effects never play on their own: only when the player turned
    // the Sound slider above 0 in Settings.
    if (!this.vol.sfxOn) return;
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.005;
    const p = o.power ?? 1;
    switch (name) {
      case 'click': this.tone(t, { type: 'sine', f: 620, f2: 1040, dur: 0.09, gain: 0.25 }); this.tone(t, { type: 'triangle', f: 1240, dur: 0.05, gain: 0.08 }); break;
      case 'hover': this.tone(t, { f: 1500, dur: 0.035, gain: 0.05 }); break;
      case 'back': this.tone(t, { f: 700, f2: 420, dur: 0.12, gain: 0.2 }); break;
      case 'select': this.tone(t, { type: 'triangle', f: 880, dur: 0.08, gain: 0.2 }); this.tone(t + 0.06, { type: 'triangle', f: 1320, dur: 0.12, gain: 0.18 }); break;
      case 'whoosh': this.noiseHit(t, { dur: 0.35, gain: 0.18, f: 300, f2: 3000, q: 1.2 }); break;
      case 'kick':
        this.tone(t, { f: 150, f2: 55, dur: 0.14, gain: 0.55 * (0.5 + p * 0.5) });
        this.noiseHit(t, { dur: 0.06 + p * 0.04, gain: 0.35 * p + 0.1, type: 'lowpass', f: 1400 + p * 1200 });
        break;
      case 'dribble': this.tone(t, { f: 200, f2: 120, dur: 0.05, gain: 0.14 }); break;
      case 'thud': this.tone(t, { f: 110, f2: 60, dur: 0.1, gain: 0.25 * p }); this.noiseHit(t, { dur: 0.04, gain: 0.1 * p, type: 'lowpass', f: 600 }); break;
      case 'post':
        [523, 1397, 2431, 3320].forEach((f, i) => this.tone(t, { f, dur: 0.9 - i * 0.15, gain: 0.16 / (i + 1), rev: 0.4 }));
        this.noiseHit(t, { dur: 0.05, gain: 0.3, type: 'highpass', f: 2000 });
        break;
      case 'whistle': {
        const dur = o.long ? 0.9 : 0.32, reps = o.triple ? 3 : 1;
        for (let r = 0; r < reps; r++) {
          const st = t + r * (dur + 0.12);
          [2850, 2990].forEach(f => {
            const osc = this.tone(st, { type: 'sine', f, dur, gain: 0.12, attack: 0.02, curve: 'lin', rev: 0.25 });
            const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
            lfo.frequency.value = 32; lg.gain.value = 120; lfo.connect(lg).connect(osc.frequency); lfo.start(st); lfo.stop(st + dur);
          });
        }
        break;
      }
      case 'tackle': this.tone(t, { f: 90, f2: 50, dur: 0.15, gain: 0.4 }); this.noiseHit(t, { dur: 0.12, gain: 0.25, type: 'lowpass', f: 800 }); break;
      case 'catch': this.tone(t, { f: 160, f2: 80, dur: 0.1, gain: 0.35 }); this.noiseHit(t, { dur: 0.07, gain: 0.3, f: 1800, q: 0.8 }); break;
      case 'net': this.noiseHit(t, { dur: 0.3, gain: 0.25, type: 'lowpass', f: 1500, f2: 300 }); this.tone(t, { f: 140, dur: 0.15, gain: 0.12 }); break;
      case 'paddle':
        this.noiseHit(t, { dur: 0.045, gain: 0.5 * p + 0.15, f: 2300, q: 3 });
        this.tone(t, { type: 'triangle', f: 980 + p * 200, f2: 700, dur: 0.07, gain: 0.3 });
        this.tone(t, { f: 210, dur: 0.06, gain: 0.2 });
        break;
      case 'pbBounce': this.tone(t, { type: 'triangle', f: 520, f2: 330, dur: 0.06, gain: 0.22 * p }); this.noiseHit(t, { dur: 0.03, gain: 0.12 * p, f: 1500, q: 2 }); break;
      case 'bat': this.noiseHit(t, { dur: 0.05, gain: 0.5, f: 2600, q: 1.5 }); this.tone(t, { type: 'triangle', f: 900, f2: 500, dur: 0.08, gain: 0.3 }); this.tone(t, { f: 180, f2: 90, dur: 0.12, gain: 0.25 }); break;
      case 'swoosh': this.noiseHit(t, { dur: 0.16, gain: 0.12, f: 600, f2: 2600, q: 2 }); break;
      case 'coin': this.tone(t, { type: 'square', f: 988, dur: 0.08, gain: 0.08 }); this.tone(t + 0.07, { type: 'square', f: 1319, dur: 0.3, gain: 0.08, rev: 0.3 }); break;
      case 'tick': this.tone(t, { type: 'square', f: 1800 + Math.random() * 300, dur: 0.025, gain: 0.03 }); break;
      case 'beep': this.tone(t, { type: 'square', f: 660, dur: 0.14, gain: 0.1 }); break;
      case 'go': this.tone(t, { type: 'square', f: 990, dur: 0.4, gain: 0.12, rev: 0.3 }); this.tone(t, { type: 'square', f: 1485, dur: 0.4, gain: 0.05 }); break;
      case 'point': this.tone(t, { type: 'triangle', f: 1047, dur: 0.25, gain: 0.2, rev: 0.4 }); this.tone(t + 0.09, { type: 'triangle', f: 1568, dur: 0.4, gain: 0.18, rev: 0.4 }); break;
      case 'fault': this.tone(t, { type: 'sawtooth', f: 180, f2: 120, dur: 0.35, gain: 0.12 }); this.tone(t, { type: 'square', f: 90, dur: 0.3, gain: 0.06 }); break;
      case 'badge': {
        [72, 76, 79, 84, 88].forEach((m, i) => this.tone(t + i * 0.08, { type: 'triangle', f: mtof(m), dur: 0.5, gain: 0.16, rev: 0.6 }));
        for (let i = 0; i < 8; i++) this.tone(t + 0.4 + i * 0.04, { f: mtof(96 + (i % 4) * 3), dur: 0.15, gain: 0.04, rev: 0.8 });
        break;
      }
      case 'fanfare': {
        const notes = [[60, 0], [64, 0.12], [67, 0.24], [72, 0.36]];
        notes.forEach(([m, d]) => {
          this.tone(t + d, { type: 'sawtooth', f: mtof(m), dur: 0.6, gain: 0.09, rev: 0.5 });
          this.tone(t + d, { type: 'square', f: mtof(m + 12), dur: 0.4, gain: 0.04 });
        });
        [60, 64, 67, 72].forEach(m => this.tone(t + 0.5, { type: 'sawtooth', f: mtof(m), dur: 1.4, gain: 0.07, rev: 0.6, curve: 'lin' }));
        break;
      }
      case 'win': {
        [67, 72, 76, 79, 84].forEach((m, i) => this.tone(t + i * 0.1, { type: 'triangle', f: mtof(m), dur: 0.4, gain: 0.18, rev: 0.5 }));
        [72, 76, 79, 84].forEach(m => this.tone(t + 0.55, { type: 'sawtooth', f: mtof(m), dur: 1.6, gain: 0.05, rev: 0.6, curve: 'lin' }));
        this.cheer(1.2);
        break;
      }
      case 'lose': [67, 66, 65, 64].forEach((m, i) => this.tone(t + i * 0.22, { type: 'triangle', f: mtof(m), dur: i === 3 ? 0.9 : 0.25, gain: 0.16, rev: 0.4 })); break;
      case 'draw': [67, 72, 67].forEach((m, i) => this.tone(t + i * 0.16, { type: 'triangle', f: mtof(m), dur: 0.3, gain: 0.15, rev: 0.4 })); break;
      case 'cheer': this.cheer(o.amount ?? 1); break;
      case 'aww': this.aww(); break;
    }
  }

  // ---------- crowd ambience ----------
  initCrowd() {
    const ctx = this.ctx;
    this.crowdGain = ctx.createGain(); this.crowdGain.gain.value = 0;
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.5;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.23; lg.gain.value = 220;
    lfo.connect(lg).connect(bp.frequency); lfo.start();
    src.connect(bp).connect(this.crowdGain).connect(this.sfxBus); src.start();
    this.crowdLevel = 0;
  }
  setCrowd(level, time = 0.8) {
    if (!this.ctx) return;
    this.crowdLevel = level;
    // The crowd is a sound effect too: silent unless sound is on.
    const target = this.vol.sfxOn ? level * 0.08 : 0;
    this.crowdGain.gain.setTargetAtTime(target, this.ctx.currentTime, time / 3);
  }
  cheer(amount = 1) {
    // Cheers are sound effects: silent unless sound is on. Games call this
    // directly, not through play(), so it needs its own check.
    if (!this.vol.sfxOn) return;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noiseHit(t, { dur: 2.6 * amount + 0.6, gain: 0.2 * amount, f: 1100, q: 0.4, attack: 0.25, rev: 0.4 });
    this.noiseHit(t + 0.05, { dur: 2.2 * amount, gain: 0.12 * amount, f: 2600, q: 0.7, attack: 0.3 });
    for (let i = 0; i < 6 * amount; i++) {
      const st = t + 0.1 + Math.random() * 1.2, f = 900 + Math.random() * 900;
      this.tone(st, { type: 'sawtooth', f, f2: f * 1.25, dur: 0.4 + Math.random() * 0.4, gain: 0.012, attack: 0.08 });
    }
  }
  aww() {
    if (!this.vol.sfxOn) return;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noiseHit(t, { dur: 1.4, gain: 0.14, type: 'lowpass', f: 1400, f2: 400, attack: 0.15 });
  }

  // ---------- music sequencer ----------
  music(name) {
    this.wanted = name;
    // Music never starts on its own: it only plays when the player turned
    // the Music slider above 0 in Settings.
    if (!this.vol.musicOn) return;
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.track && this.track.name === name) return;
    this.stopMusic(true);
    const def = TRACKS[name]; if (!def) return;
    const bus = this.ctx.createGain(); bus.gain.value = 0.0001; bus.connect(this.musicBus);
    bus.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + 1.2);
    const tr = { name, def, bus, step: 0, bar: 0, next: this.ctx.currentTime + 0.1, rand: rng(name.length * 977), melody: [] };
    tr.melody = this.makeMelody(def, tr.rand);
    tr.timer = setInterval(() => this.schedule(tr), 25);
    this.track = tr;
  }
  stopMusic(fast = false) {
    const tr = this.track; if (!tr) return;
    clearInterval(tr.timer);
    const t = this.ctx.currentTime;
    tr.bus.gain.cancelScheduledValues(t);
    tr.bus.gain.setValueAtTime(tr.bus.gain.value, t);
    tr.bus.gain.exponentialRampToValueAtTime(0.0001, t + (fast ? 0.4 : 1.2));
    setTimeout(() => tr.bus.disconnect(), 1500);
    this.track = null;
  }
  duck(amount = 0.35, time = 2) {
    if (!this.track) return;
    const g = this.track.bus.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(amount, t + 0.1); g.linearRampToValueAtTime(1, t + time);
  }
  makeMelody(def, rand) {
    // Melody per chord: notes chosen from chord tones and pentatonic neighbours.
    return def.chords.map(([root, q]) => {
      const tones = CHORD[q];
      const out = [];
      for (let i = 0; i < 16; i++) {
        if (def.lead[i] !== 'x') { out.push(null); continue; }
        const pick = tones[Math.floor(rand() * 3)] + (rand() < 0.25 ? 2 : 0);
        out.push(root % 12 + pick);
      }
      return out;
    });
  }
  schedule(tr) {
    if (!this.ctx || this.track !== tr) return;
    const def = tr.def, stepDur = 60 / def.bpm / 4;
    while (tr.next < this.ctx.currentTime + 0.15) {
      const t = tr.next, s = tr.step % 16, bar = tr.bar;
      const [root, q] = def.chords[bar % def.chords.length];
      const tones = CHORD[q];
      const section = Math.floor(bar / 4) % 4; // 0 intro, 1 groove, 2 lead, 3 lead+full
      const d = def.drums;
      if (d.k[s] === 'x' && section > 0) this.mKick(t, tr.bus);
      if (d.s[s] === 'x' && section > 0) this.mSnare(t, tr.bus);
      if (d.c && d.c[s] === 'x' && section === 3) this.mClap(t, tr.bus);
      if (d.h[s] === 'x') this.mHat(t, tr.bus, s % 4 === 2 ? 0.07 : 0.045);
      if (s === 0) this.mPad(t, tones.map(i => mtof(root + 24 + i)), stepDur * 16, tr.bus);
      const b = def.bass[s];
      if (b && b !== '.' && section > 0) {
        const off = b === 'r' ? 0 : b === '5' ? 7 : b === '8' ? 12 : 0;
        this.mBass(t, mtof(root - 12 + 12 + off), stepDur * 1.8, tr.bus);
      }
      const a = def.arp[s];
      if (a && a !== '.' && section !== 0) {
        const m = root + 36 + tones[+a % tones.length];
        def.arpInst === 'marimba' ? this.mMarimba(t, mtof(m), tr.bus) : this.mPluck(t, mtof(m), tr.bus);
      }
      if (section >= 2) {
        const mel = tr.melody[bar % tr.melody.length][s];
        if (mel !== null && mel !== undefined) this.mLead(t, mtof(def.leadOct + mel), stepDur * 2.2, tr.bus);
      }
      tr.next += stepDur * (s % 2 === 1 ? 0.96 : 1.04);
      tr.step++;
      if (tr.step % 16 === 0) {
        tr.bar++;
        if (tr.bar % 16 === 0) tr.melody = this.makeMelody(def, tr.rand);
      }
    }
  }
  mKick(t, bus) { this.tone(t, { f: 150, f2: 42, dur: 0.3, gain: 0.85, dest: bus }); }
  mSnare(t, bus) { this.noiseHit(t, { dur: 0.18, gain: 0.35, f: 1900, q: 0.7, dest: bus, rev: 0.15 }); this.tone(t, { type: 'triangle', f: 200, f2: 140, dur: 0.1, gain: 0.25, dest: bus }); }
  mClap(t, bus) { for (let i = 0; i < 3; i++) this.noiseHit(t + i * 0.011, { dur: 0.09, gain: 0.22, f: 1300, q: 1, dest: bus, rev: 0.25 }); }
  mHat(t, bus, g) { this.noiseHit(t, { dur: 0.04, gain: g * 2.2, type: 'highpass', f: 7500, dest: bus }); }
  mBass(t, f, dur, bus) {
    const ctx = this.ctx, o = ctx.createOscillator(), o2 = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f / 2;
    fl.type = 'lowpass'; fl.Q.value = 6; fl.frequency.setValueAtTime(1400, t); fl.frequency.exponentialRampToValueAtTime(220, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); o2.connect(fl); fl.connect(g).connect(bus);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  mPad(t, freqs, dur, bus) {
    const ctx = this.ctx, fl = ctx.createBiquadFilter(), g = ctx.createGain();
    fl.type = 'lowpass'; fl.frequency.value = 1100; fl.Q.value = 0.5;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + dur * 0.25); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.05);
    fl.connect(g).connect(bus);
    const rs = ctx.createGain(); rs.gain.value = 0.6; g.connect(rs).connect(this.revSend);
    freqs.forEach(f => [-8, 8].forEach(dt => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt;
      o.connect(fl); o.start(t); o.stop(t + dur * 1.1);
    }));
  }
  mPluck(t, f, bus) { this.tone(t, { type: 'triangle', f, dur: 0.28, gain: 0.11, dest: bus, rev: 0.35 }); this.tone(t, { type: 'sine', f: f * 2, dur: 0.12, gain: 0.04, dest: bus }); }
  mMarimba(t, f, bus) { this.tone(t, { type: 'sine', f, dur: 0.35, gain: 0.16, dest: bus, rev: 0.3 }); this.tone(t, { type: 'sine', f: f * 4, dur: 0.05, gain: 0.05, dest: bus }); }
  mLead(t, f, dur, bus) {
    const ctx = this.ctx, o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'square'; o.frequency.value = f; lfo.frequency.value = 5.5; lg.gain.value = 6;
    lfo.connect(lg).connect(o.detune);
    fl.type = 'lowpass'; fl.frequency.value = 2600;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl).connect(g).connect(bus);
    const rs = ctx.createGain(); rs.gain.value = 0.5; g.connect(rs).connect(this.revSend);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }
}

export const audio = new AudioEngine();
