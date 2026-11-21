// Lightweight particle, floating-text and screen-shake effects for canvas games.
export class FX {
  constructor() { this.parts = []; this.texts = []; this.shakeAmt = 0; this.sx = 0; this.sy = 0; this.flash = 0; this.flashColor = '#fff'; }

  confetti(x, y, n = 80, colors = ['#f472b6', '#22d3ee', '#fbbf24', '#a3e635', '#818cf8', '#fff']) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 520;
      this.parts.push({ type: 'confetti', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 300, g: 600, drag: 1.6,
        life: 0, max: 1.8 + Math.random() * 1.4, size: 5 + Math.random() * 6, color: colors[i % colors.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 18 });
    }
  }
  rain(W, n = 120, colors) {
    for (let i = 0; i < n; i++) {
      this.parts.push({ type: 'confetti', x: Math.random() * W, y: -20 - Math.random() * 300, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 160,
        g: 60, drag: 0.2, life: 0, max: 4 + Math.random() * 2, size: 6 + Math.random() * 6,
        color: (colors || ['#f472b6', '#22d3ee', '#fbbf24', '#a3e635', '#fff'])[i % 5], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    }
  }
  dust(x, y, n = 6, color = 'rgba(255,255,255,.5)') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 60;
      this.parts.push({ type: 'dust', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.4 - 10, g: 0, drag: 3, life: 0, max: 0.4 + Math.random() * 0.4, size: 3 + Math.random() * 5, color });
    }
  }
  sparks(x, y, n = 12, color = '#fff7cc') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 260;
      this.parts.push({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 300, drag: 2.5, life: 0, max: 0.3 + Math.random() * 0.3, size: 2 + Math.random() * 2, color });
    }
  }
  ring(x, y, color = '#fff', r = 40) { this.parts.push({ type: 'ring', x, y, vx: 0, vy: 0, g: 0, drag: 0, life: 0, max: 0.45, size: r, color }); }
  text(str, x, y, { color = '#fff', size = 34, life = 1.2, rise = 60, stroke = 'rgba(0,0,0,.6)' } = {}) {
    this.texts.push({ str, x, y, color, size, life: 0, max: life, rise, stroke });
  }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  flashScreen(color = '#fff', a = 0.6) { this.flash = a; this.flashColor = color; }

  update(dt) {
    for (const p of this.parts) {
      p.life += dt;
      p.vx -= p.vx * p.drag * dt; p.vy -= p.vy * p.drag * dt * (p.type === 'confetti' ? 0.4 : 1);
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.rot !== undefined) p.rot += p.vr * dt;
    }
    this.parts = this.parts.filter(p => p.life < p.max);
    for (const t of this.texts) t.life += dt;
    this.texts = this.texts.filter(t => t.life < t.max);
    this.shakeAmt *= Math.pow(0.0015, dt);
    if (this.shakeAmt < 0.3) this.shakeAmt = 0;
    this.sx = (Math.random() - 0.5) * this.shakeAmt * 2; this.sy = (Math.random() - 0.5) * this.shakeAmt * 2;
    this.flash = Math.max(0, this.flash - dt * 2.5);
  }

  draw(ctx) {
    for (const p of this.parts) {
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 2);
      if (p.type === 'confetti') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 * (0.4 + Math.abs(Math.sin(p.rot * 1.3))));
        ctx.restore();
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color; ctx.lineWidth = 4 * k; ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * (1.2 - k), p.size * (1.2 - k) * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.type === 'dust' ? (1.5 - k) : k), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      const k = t.life / t.max;
      const pop = k < 0.15 ? 0.5 + (k / 0.15) * 0.7 : k < 0.25 ? 1.2 - (k - 0.15) * 2 : 1;
      ctx.save();
      ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
      ctx.translate(t.x, t.y - t.rise * easeOut(k));
      ctx.scale(pop, pop);
      ctx.font = `${t.size}px 'Lilita One', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = t.size / 6; ctx.strokeStyle = t.stroke; ctx.lineJoin = 'round'; ctx.strokeText(t.str, 0, 0);
      ctx.fillStyle = t.color; ctx.fillText(t.str, 0, 0);
      ctx.restore();
    }
  }
  drawFlash(ctx, W, H) {
    if (this.flash <= 0) return;
    ctx.globalAlpha = this.flash; ctx.fillStyle = this.flashColor; ctx.fillRect(-2000, -2000, W + 4000, H + 4000); ctx.globalAlpha = 1;
  }
}
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// Big animated banner text ("GOAL!", "3", "WIN") with a squash-and-stretch entrance.
export function drawBanner(ctx, text, x, y, t, { size = 120, color = '#fff', glow = '#fbbf24', sub = null } = {}) {
  const k = Math.min(1, t / 0.35);
  const sc = k < 1 ? 0.3 + 0.95 * easeBack(k) : 1 + Math.sin(t * 6) * 0.02;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(Math.sin(t * 3) * 0.02);
  ctx.font = `${size}px 'Lilita One', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = glow; ctx.shadowBlur = 40;
  ctx.lineJoin = 'round'; ctx.lineWidth = size / 7; ctx.strokeStyle = '#1e1b4b'; ctx.strokeText(text, 0, size * 0.06);
  ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  g.addColorStop(0, '#fff'); g.addColorStop(0.5, color); g.addColorStop(1, glow);
  ctx.fillStyle = g; ctx.fillText(text, 0, 0);
  if (sub) {
    ctx.font = `${size * 0.28}px 'Lilita One', sans-serif`; ctx.lineWidth = 6; ctx.strokeStyle = '#1e1b4b';
    ctx.strokeText(sub, 0, size * 0.72); ctx.fillStyle = '#fff'; ctx.fillText(sub, 0, size * 0.72);
  }
  ctx.restore();
}
function easeBack(t) { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
