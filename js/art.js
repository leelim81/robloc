// Procedural character art shared by every ROBLOC game.
// A human figure is 100 units tall with feet at (0, 0); callers pass a scale in px per unit.

export const SKINS = ['#f9d7b9', '#eebb94', '#d39a6a', '#a86d45', '#7a4a2c', '#4e2f1c'];
export const HAIRS = ['#1b1b1f', '#4a2c18', '#8a5a2b', '#d9a64a', '#b8432f', '#e8e3d6', '#5b3fa8'];
export const SHIRTS = ['#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#f472b6', '#111827'];
export const HAIR_STYLES = ['short', 'buzz', 'curly', 'long', 'ponytail'];
export const HAIR_STYLE_LABELS = { short: 'Short', buzz: 'Buzz', curly: 'Curly', long: 'Long', ponytail: 'Ponytail' };
export const DEFAULT_AVATAR = { skin: SKINS[1], hair: HAIRS[1], style: 'short', shirt: SHIRTS[1] };

export function shade(hex, amt) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function limb(ctx, x1, y1, x2, y2, w, color) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export { rrect };

export function drawShadow(ctx, x, y, rx, ry, alpha = 0.35) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

/**
 * o: { view: 'front'|'back'|'side', flip, phase, moving, skin, hair, style, shirt, shorts, socks, shoes,
 *      number, pose: 'run'|'kick'|'swing'|'celebrate'|'dive'|'ready', poseT, paddle, gloves, alpha, shadow }
 */
export function drawHuman(ctx, x, y, s, o) {
  const view = o.view || 'front';
  const skin = o.skin || SKINS[1], hair = o.hair || HAIRS[0], shirt = o.shirt || SHIRTS[0];
  const shorts = o.shorts || shade(shirt, -0.55), socks = o.socks || shirt, shoes = o.shoes || '#f8fafc';
  const ph = o.phase || 0, mv = Math.min(1, o.moving || 0), pose = o.pose || 'run', pt = o.poseT || 0;
  const outline = 'rgba(15,18,35,.55)';
  ctx.save();
  ctx.translate(x, y);
  if (o.shadow !== false) drawShadow(ctx, 0, 0, 26 * s, 8 * s, 0.38 * (o.alpha ?? 1));
  ctx.scale(o.flip ? -s : s, s);
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;

  if (pose === 'dive') {
    ctx.translate(0, -30);
    ctx.rotate(-1.25 * Math.min(1, pt * 1.6));
    ctx.translate(0, 30);
  }

  const bob = pose === 'celebrate' ? -Math.abs(Math.sin(ph * 2)) * 10 : -Math.abs(Math.sin(ph)) * 3 * mv;
  ctx.translate(0, bob);

  // ---------- legs ----------
  const hipY = -46;
  const drawLegFB = (side, lift, fwd) => {
    const hx = side * 6.5, fx = side * 7 + fwd, fy = -lift;
    limb(ctx, hx, hipY, fx, fy - 6, 9.5, outline);
    limb(ctx, hx, hipY, fx, fy - 6, 8, skin);
    limb(ctx, fx, fy - 17, fx, fy - 6, 8.4, socks);
    ctx.fillStyle = shoes; ctx.strokeStyle = outline; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(fx, fy - 3, 6, 4.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
  const drawLegSide = (a, bend, front) => {
    const thigh = 23, shin = 22;
    const kx = Math.sin(a) * thigh, ky = hipY + Math.cos(a) * thigh;
    const sa = a - bend;
    const fx = kx + Math.sin(sa) * shin, fy = ky + Math.cos(sa) * shin;
    const col = front ? skin : shade(skin, -0.15);
    limb(ctx, 0, hipY, kx, ky, 10, outline); limb(ctx, kx, ky, fx, fy, 9, outline);
    limb(ctx, 0, hipY, kx, ky, 8.6, col); limb(ctx, kx, ky, fx, fy, 7.6, col);
    const sx = kx + Math.sin(sa) * shin * 0.45, sy = ky + Math.cos(sa) * shin * 0.45;
    limb(ctx, sx, sy, fx, fy, 8, front ? socks : shade(socks, -0.2));
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(-sa * 0.5);
    ctx.fillStyle = front ? shoes : shade(shoes, -0.2); ctx.strokeStyle = outline; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(3.5, -1, 7.5, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  };

  if (view === 'side') {
    let a1 = Math.sin(ph) * 0.75 * mv, a2 = -a1;
    let b1 = Math.max(0, -Math.sin(ph + 0.6)) * 1.1 * mv, b2 = Math.max(0, Math.sin(ph + 0.6)) * 1.1 * mv;
    if (pose === 'kick') { const k = Math.sin(Math.min(1, pt) * Math.PI); a1 = -0.4 + 1.9 * k - 0.5 * (1 - pt); b1 = 0.9 * (1 - k); a2 = -0.25; b2 = 0.1; }
    if (pose === 'dive') { a1 = 0.5; a2 = 0.2; b1 = 0.4; b2 = 0.6; }
    if (pose === 'ready') { a1 = 0.25; a2 = -0.25; b1 = 0.35; b2 = 0.35; }
    drawLegSide(a2, b2, false);
    drawLegSide(a1, b1, true);
  } else {
    let l1 = Math.max(0, Math.sin(ph)) * 9 * mv, l2 = Math.max(0, -Math.sin(ph)) * 9 * mv;
    let f1 = 0, f2 = 0;
    if (pose === 'ready') { f1 = -3; f2 = 3; }
    if (pose === 'celebrate') { l1 = Math.max(0, Math.sin(ph * 2)) * 6; l2 = l1; }
    drawLegFB(-1, l1, f1);
    drawLegFB(1, l2, f2);
  }

  // shorts
  ctx.fillStyle = shorts; ctx.strokeStyle = outline; ctx.lineWidth = 1.4;
  if (view === 'side') { rrect(ctx, -9, -55, 18, 16, 4); } else { rrect(ctx, -14, -55, 28, 15, 4); }
  ctx.fill(); ctx.stroke();

  // long hair behind body (front view)
  const headY = -96;
  if ((o.style === 'long') && view === 'front') {
    ctx.fillStyle = shade(hair, -0.1);
    rrect(ctx, -13, headY - 4, 26, 30, 9); ctx.fill();
  }

  // ---------- arms (back arm first) ----------
  const shY = -80;
  const armSwing = Math.sin(ph) * 0.7 * mv;
  const drawArm = (sx, ang, len, col, sleeve, withPaddle, glove) => {
    const ex = sx + Math.sin(ang) * len * 0.5, ey = shY + Math.cos(ang) * len * 0.5;
    const hx = sx + Math.sin(ang) * len, hy = shY + Math.cos(ang) * len;
    limb(ctx, sx, shY, hx, hy, 8.4, outline);
    limb(ctx, sx, shY, hx, hy, 7, col);
    limb(ctx, sx, shY, ex, ey, 8.6, sleeve);
    if (glove) { ctx.fillStyle = glove; ctx.beginPath(); ctx.arc(hx, hy, 5.2, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill(); }
    if (withPaddle) {
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(-ang);
      ctx.fillStyle = '#334155'; rrect(ctx, -2, -2, 4, 12, 2); ctx.fill();
      const pg = ctx.createLinearGradient(-10, 10, 10, 34);
      pg.addColorStop(0, o.paddleColor || '#facc15'); pg.addColorStop(1, shade(o.paddleColor || '#facc15', -0.35));
      ctx.fillStyle = pg; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 22, 10, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(-3, 18, 4, 6, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  };
  const sleeve = shirt, sleeveDark = shade(shirt, -0.25);
  let aL, aR;
  if (view === 'side') { aL = -armSwing - 0.1; aR = armSwing + 0.1; }
  else { aL = 0.18; aR = -0.18; }
  if (pose === 'celebrate') { aL = Math.PI - 0.5 + Math.sin(ph * 3) * 0.15; aR = Math.PI + 0.5 - Math.sin(ph * 3) * 0.15; }
  if (pose === 'dive') { aL = Math.PI - 0.15; aR = Math.PI + 0.15; }
  if (pose === 'kick') { aL = -0.9; aR = 0.9; }
  const hasPaddle = !!o.paddle;
  const swingT = Math.min(1, pt), sw = o.swingDir || 1;
  if (view === 'side') {
    if (hasPaddle) {
      if (pose === 'swing') aR = sw > 0 ? (-1.9 + 3.6 * easeOut(swingT)) : (1.9 - 3.4 * easeOut(swingT));
      else if (pose === 'ready') aR = 0.9;
      else aR = 0.6 + armSwing * 0.3;
    }
    drawArm(-2, aL, 30, shade(skin, -0.18), sleeveDark, false, o.gloves);
  }

  // ---------- torso ----------
  const tg = ctx.createLinearGradient(-15, 0, 15, 0);
  tg.addColorStop(0, shade(shirt, 0.18)); tg.addColorStop(0.55, shirt); tg.addColorStop(1, shade(shirt, -0.3));
  ctx.fillStyle = tg; ctx.strokeStyle = outline; ctx.lineWidth = 1.5;
  if (view === 'side') rrect(ctx, -10, -86, 20, 36, 7); else rrect(ctx, -16, -86, 32, 36, 9);
  ctx.fill(); ctx.stroke();
  if (o.stripe) {
    ctx.fillStyle = o.stripe;
    if (view === 'side') ctx.fillRect(-10, -66, 20, 5); else ctx.fillRect(-16, -66, 32, 5);
  }
  if (view === 'back' && o.number !== undefined) {
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = '900 17px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(o.number), 0, -69);
  }
  if (view === 'front') {
    ctx.fillStyle = shade(shirt, -0.35); ctx.beginPath(); ctx.moveTo(-6, -86); ctx.lineTo(0, -79); ctx.lineTo(6, -86); ctx.closePath(); ctx.fill();
  }

  // front arms
  if (view === 'side') drawArm(2, aR, 30, skin, sleeve, hasPaddle, o.gloves);
  else {
    // Seen from the back the player's right hand is on screen-right; from the front, on screen-left.
    const rx = view === 'back' ? 15 : -15, sg = Math.sign(rx);
    let angOff = -sg * 0.2, angPad = sg * 0.2;
    if (pose === 'celebrate') { angOff = -sg * (Math.PI - 0.5 + Math.sin(ph * 3) * 0.15); angPad = sg * (Math.PI - 0.5 + Math.sin(ph * 3) * 0.15); }
    else if (pose === 'kick') { angOff = -sg * 0.9; angPad = sg * 0.9; }
    else if (mv > 0) { angOff = -sg * (0.2 + armSwing * 0.15); angPad = sg * (0.2 - armSwing * 0.15); }
    if (hasPaddle) {
      if (pose === 'swing') {
        const k = Math.sin(swingT * Math.PI * 0.85) ;
        angPad = sw > 0 ? sg * (0.35 + 2.0 * k) : -sg * (0.25 + 1.7 * k);
      } else if (pose === 'ready') angPad = sg * 0.95;
      else angPad = sg * (0.55 - armSwing * 0.1);
    }
    drawArm(-rx, angOff, 30, skin, sleeve, false, o.gloves);
    drawArm(rx, angPad, 30, skin, sleeve, hasPaddle, o.gloves);
  }

  // ---------- neck & head ----------
  ctx.fillStyle = shade(skin, -0.12); ctx.fillRect(-4, -90, 8, 6);
  drawHead(ctx, 0, headY, view, skin, hair, o.style || 'short', outline, o.face);
  ctx.restore();
}

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function drawHead(ctx, x, y, view, skin, hair, style, outline, face) {
  const r = 11.5;
  const hg = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, r * 1.2);
  hg.addColorStop(0, shade(skin, 0.15)); hg.addColorStop(1, shade(skin, -0.15));
  // ponytail behind
  if (style === 'ponytail' && view !== 'front') {
    ctx.fillStyle = hair; ctx.beginPath();
    const px = view === 'side' ? x - 12 : x;
    ctx.ellipse(px, y + 6, 5, 11, view === 'side' ? 0.5 : 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = hg; ctx.strokeStyle = outline; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = hair;
  const hairTop = (amt) => { ctx.beginPath(); ctx.arc(x, y - 1, r + 1, Math.PI + amt, -amt); ctx.closePath(); ctx.fill(); };
  if (view === 'back') {
    ctx.beginPath(); ctx.arc(x, y - 1, r + 1, Math.PI * 0.95, Math.PI * 2.05); ctx.lineTo(x + r, y + 6); ctx.quadraticCurveTo(x, y + 10, x - r, y + 6); ctx.closePath(); ctx.fill();
    if (style === 'long') { ctx.fillRect(x - 12, y, 24, 22); }
    if (style === 'curly') curls(ctx, x, y, r, hair, 1);
  } else if (view === 'side') {
    // face to +x
    ctx.beginPath(); ctx.arc(x - 1, y - 1, r + 1, Math.PI * 0.75, Math.PI * 1.95); ctx.lineTo(x - 6, y + 2); ctx.closePath(); ctx.fill();
    if (style === 'long') { ctx.beginPath(); ctx.ellipse(x - 7, y + 6, 6, 14, 0.15, 0, Math.PI * 2); ctx.fill(); }
    if (style === 'curly') curls(ctx, x - 3, y, r, hair, 0.7);
    ctx.fillStyle = shade(skin, -0.2); ctx.beginPath(); ctx.arc(x - 3, y + 1, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e1b2e'; ctx.beginPath(); ctx.ellipse(x + 6, y - 1, 1.6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = shade(skin, -0.3); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 10, y + 1); ctx.lineTo(x + 12.5, y + 3.5); ctx.lineTo(x + 10, y + 4.5); ctx.stroke();
  } else {
    const amt = style === 'buzz' ? 0.15 : 0.05;
    hairTop(amt);
    if (style === 'short' || style === 'ponytail') { ctx.beginPath(); ctx.ellipse(x + 3, y - 7, 8, 4, -0.3, 0, Math.PI * 2); ctx.fill(); }
    if (style === 'long') { ctx.beginPath(); ctx.ellipse(x - 9, y + 2, 4, 10, 0, 0, Math.PI * 2); ctx.ellipse(x + 9, y + 2, 4, 10, 0, 0, Math.PI * 2); ctx.fill(); }
    if (style === 'curly') curls(ctx, x, y, r, hair, 1);
    // face
    ctx.fillStyle = '#1e1b2e';
    ctx.beginPath(); ctx.ellipse(x - 4.2, y + 1, 1.7, 2.3, 0, 0, Math.PI * 2); ctx.ellipse(x + 4.2, y + 1, 1.7, 2.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(x - 3.6, y + 0.2, 0.6, 0, Math.PI * 2); ctx.arc(x + 4.8, y + 0.2, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = shade(hair, 0.1); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(x - 6.5, y - 3.5); ctx.lineTo(x - 2.5, y - 3.8); ctx.moveTo(x + 2.5, y - 3.8); ctx.lineTo(x + 6.5, y - 3.5); ctx.stroke();
    ctx.strokeStyle = shade(skin, -0.45); ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (face === 'sad') ctx.arc(x, y + 8.5, 3, Math.PI * 1.15, Math.PI * 1.85);
    else if (face === 'happy') { ctx.arc(x, y + 5, 3.8, 0.15, Math.PI - 0.15); }
    else ctx.arc(x, y + 5, 3, 0.3, Math.PI - 0.3);
    ctx.stroke();
    ctx.fillStyle = 'rgba(244,114,182,.25)'; ctx.beginPath(); ctx.arc(x - 7, y + 4, 2.4, 0, Math.PI * 2); ctx.arc(x + 7, y + 4, 2.4, 0, Math.PI * 2); ctx.fill();
  }
}

function curls(ctx, x, y, r, hair, k) {
  ctx.fillStyle = hair;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * k, y - 2 + Math.sin(a) * r, 4.2, 0, Math.PI * 2); ctx.fill();
  }
}

// Square portrait (head and shoulders) for profile chips and leaderboard rows.
export function drawPortrait(canvas, avatar = DEFAULT_AVATAR, opts = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (opts.bg !== false) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, shade(avatar.shirt || SHIRTS[1], -0.2)); g.addColorStop(1, shade(avatar.shirt || SHIRTS[1], -0.65));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.42, w * 0.38, 0, Math.PI * 2); ctx.fill();
  }
  const s = w / 44;
  drawHuman(ctx, w / 2, h + 50 * s, s, { view: 'front', ...avatar, pose: 'idle', shadow: false, face: 'happy' });
}

export function drawAvatarFull(canvas, avatar, t = 0) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const s = h / 125;
  const phase = t * 2.2;
  drawHuman(ctx, w / 2, h - 14, s, { view: 'front', ...avatar, phase, moving: 0, pose: Math.floor(t / 3) % 3 === 2 ? 'celebrate' : 'idle', face: 'happy' });
}
