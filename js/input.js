// Unified input: keyboard + on-screen joystick and two action buttons.
const KEYS_LEFT = ['ArrowLeft', 'KeyA'], KEYS_RIGHT = ['ArrowRight', 'KeyD'];
const KEYS_UP = ['ArrowUp', 'KeyW'], KEYS_DOWN = ['ArrowDown', 'KeyS'];
const KEYS_A = ['Space', 'KeyJ', 'Enter'], KEYS_B = ['ShiftLeft', 'ShiftRight', 'KeyK', 'KeyL'];

function btnState() { return { down: false, pressed: false, released: false, heldFor: 0 }; }

export class Input {
  constructor() {
    this.keys = new Set();
    this.mx = 0; this.my = 0;
    this.a = btnState(); this.b = btnState();
    this.joy = { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0 };
    this.pausePressed = false;
    this.taps = [];          // taps/clicks on the game canvas this frame, in game coordinates
    this.touchMode = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    this.enabled = false;
    this.bind();
  }

  bind() {
    addEventListener('keydown', e => {
      if (!this.enabled) return;
      if (e.code === 'Escape' || e.code === 'KeyP') { this.pausePressed = true; return; }
      if ([...KEYS_A, ...KEYS_B, ...KEYS_UP, ...KEYS_DOWN, ...KEYS_LEFT, ...KEYS_RIGHT].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (KEYS_A.includes(e.code)) this.press(this.a);
      if (KEYS_B.includes(e.code)) this.press(this.b);
    });
    addEventListener('keyup', e => {
      this.keys.delete(e.code);
      if (KEYS_A.includes(e.code) && !KEYS_A.some(k => this.keys.has(k))) this.release(this.a);
      if (KEYS_B.includes(e.code) && !KEYS_B.some(k => this.keys.has(k))) this.release(this.b);
    });
    // Some tablets report no touch support until they're touched; switch to touch controls on first touch.
    addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch' && !this.touchMode) {
        this.touchMode = true;
        if (document.getElementById('game-layer').classList.contains('playing')) document.getElementById('touch-controls').classList.add('on');
      }
    }, { capture: true });
    addEventListener('blur', () => { this.keys.clear(); this.release(this.a); this.release(this.b); this.joyEnd(); });

    const zone = document.getElementById('joy-zone');
    this.base = document.getElementById('joy-base');
    this.knob = document.getElementById('joy-knob');
    zone.addEventListener('pointerdown', e => {
      if (this.joy.active) return;
      e.preventDefault();
      zone.setPointerCapture(e.pointerId);
      const zr = zone.getBoundingClientRect();
      const r = this.base.offsetWidth / 2;
      const cx = Math.min(Math.max(e.clientX, zr.left + r + 8), zr.right - r - 8);
      const cy = Math.min(Math.max(e.clientY, zr.top + r + 8), zr.bottom - r - 8);
      this.base.style.left = (cx - zr.left - r) + 'px';
      this.base.style.top = (cy - zr.top - r) + 'px';
      this.base.style.bottom = 'auto';
      this.base.classList.add('active');
      Object.assign(this.joy, { active: true, id: e.pointerId, cx, cy, dx: 0, dy: 0 });
      this.joyMove(e);
    });
    zone.addEventListener('pointermove', e => { if (this.joy.active && e.pointerId === this.joy.id) this.joyMove(e); });
    const end = e => { if (e.pointerId === this.joy.id) this.joyEnd(); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);

    const hook = (el, st) => {
      el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('down'); this.press(st); if (navigator.vibrate) navigator.vibrate(8); });
      const up = () => { el.classList.remove('down'); this.release(st); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', e => e.preventDefault());
    };
    hook(document.getElementById('btn-a'), this.a);
    hook(document.getElementById('btn-b'), this.b);
  }

  joyMove(e) {
    const r = this.base.offsetWidth / 2 * 0.8;
    let dx = e.clientX - this.joy.cx, dy = e.clientY - this.joy.cy;
    const d = Math.hypot(dx, dy);
    if (d > r) { dx *= r / d; dy *= r / d; }
    this.joy.dx = dx / r; this.joy.dy = dy / r;
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  joyEnd() {
    this.joy.active = false; this.joy.id = null; this.joy.dx = 0; this.joy.dy = 0;
    if (this.knob) this.knob.style.transform = '';
    if (this.base) { this.base.classList.remove('active'); this.base.style.left = ''; this.base.style.top = ''; this.base.style.bottom = ''; }
  }

  press(st) { if (!st.down) { st.down = true; st.pressed = true; st.heldFor = 0; } }
  release(st) { if (st.down) { st.down = false; st.released = true; } }

  update(dt) {
    let kx = 0, ky = 0;
    if (KEYS_LEFT.some(k => this.keys.has(k))) kx -= 1;
    if (KEYS_RIGHT.some(k => this.keys.has(k))) kx += 1;
    if (KEYS_UP.some(k => this.keys.has(k))) ky -= 1;
    if (KEYS_DOWN.some(k => this.keys.has(k))) ky += 1;
    if (this.joy.active) {
      let dx = this.joy.dx, dy = this.joy.dy;
      const m = Math.hypot(dx, dy);
      if (m < 0.12) { dx = 0; dy = 0; } else { const k = Math.min(1, (m - 0.12) / 0.88) / m; dx *= k; dy *= k; }
      this.mx = dx; this.my = dy;
    } else {
      const m = Math.hypot(kx, ky) || 1;
      this.mx = kx / m; this.my = ky / m;
    }
    if (this.a.down) this.a.heldFor += dt;
    if (this.b.down) this.b.heldFor += dt;
  }
  // Games with tap menus hide the joystick so taps anywhere reach the game.
  setTapMode(on) { document.getElementById('touch-controls').classList.toggle('tap-mode', !!on); }
  endFrame() {
    this.taps.length = 0;
    this.a.pressed = this.a.released = false;
    this.b.pressed = this.b.released = false;
    this.pausePressed = false;
  }
  reset() {
    this.keys.clear(); this.joyEnd();
    this.a = Object.assign(this.a, btnState()); this.b = Object.assign(this.b, btnState());
    document.querySelectorAll('.act-btn').forEach(b => b.classList.remove('down'));
  }
  setLabels(a, b) {
    document.getElementById('btn-a-label').textContent = a;
    document.getElementById('btn-b-label').textContent = b;
  }
}
