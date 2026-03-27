const CLOUD_LAYERS = [
  ...Array.from({ length: 4 }, (_, i) => ({
    x:     i * 0.28 + Math.random() * 0.10,
    y:     0.575 + Math.random() * 0.06,
    sx:    0.16  + Math.random() * 0.12,
    sy:    0.026 + Math.random() * 0.016,
    speed: 0.000018 + Math.random() * 0.000014,
    layer: 0,
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    x:     i * 0.26 + Math.random() * 0.08,
    y:     0.500 + Math.random() * 0.06,
    sx:    0.09  + Math.random() * 0.09,
    sy:    0.016 + Math.random() * 0.010,
    speed: 0.000009 + Math.random() * 0.000008,
    layer: 1,
  })),
];

let lightningTimer = 0;
let lightningFlash = 0;
let lightningX = 0, lightningY = 0;

function drawLightningBolt(ctx, x1, y1) {
  let cx = x1, cy = y1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  for (let i = 0; i < 5; i++) {
    cx += (Math.random() - 0.5) * 16;
    cy += 9 + Math.random() * 9;
    ctx.lineTo(cx, cy);
  }
  ctx.strokeStyle = `rgba(210,230,255,0.9)`;
  ctx.lineWidth   = 1;
  ctx.stroke();
}

function drawClouds(ctx, w, h, hour) {
  const sun      = getSunIntensity(hour);
  const isGolden = (hour >= 5.5 && hour <= 9.0) || (hour >= 16.5 && hour <= 20.5);
  const night    = 1 - sun;

  lightningTimer++;
  if (night > 0.55 && lightningTimer > 420 + Math.random() * 500) {
    lightningFlash = 8;
    lightningTimer = 0;
    const fg = CLOUD_LAYERS.filter(c => c.layer === 0);
    const lc = fg[Math.floor(Math.random() * fg.length)];
    lightningX = lc.x * w;
    lightningY = lc.y * h;
  }
  if (lightningFlash > 0) lightningFlash--;

  CLOUD_LAYERS.forEach((c) => {
    c.x += c.speed;
    if (c.x > 1.45) c.x = -0.45;

    const cx   = c.x * w;
    const cy   = c.y * h;
    const rx   = c.sx * w;
    const ry   = c.sy * h;
    const isFg = c.layer === 0;

    const baseAlpha = isFg
      ? 0.07 + sun * 0.14 + night * 0.04
      : 0.04 + sun * 0.08 + night * 0.02;
    const flashBoost = (lightningFlash > 0 && isFg) ? lightningFlash * 0.03 : 0;
    const alpha = baseAlpha + flashBoost;

    const cloudR = isGolden ? 255 : night > 0.6 ? 128 : 232;
    const cloudG = isGolden ? 198 : night > 0.6 ? 142 : 238;
    const cloudB = isGolden ? 115 : night > 0.6 ? 182 : 255;

    // 3 puffs max — one radialGradient each
    const puffs = isFg ? 3 : 2;
    for (let p = 0; p < puffs; p++) {
      const t   = puffs === 1 ? 0.5 : p / (puffs - 1);
      const px  = cx + (t - 0.5) * rx * 1.0;
      const py  = cy - Math.sin(t * Math.PI) * ry * 0.6;
      const pr  = rx * (0.42 + 0.12 * Math.sin(p * 1.2)) * (isFg ? 1 : 0.72);

      const grad = ctx.createRadialGradient(px, py, 0, px, py, pr);
      grad.addColorStop(0,   `rgba(${cloudR},${cloudG},${cloudB},${alpha})`);
      grad.addColorStop(0.5, `rgba(${cloudR},${cloudG},${cloudB},${alpha * 0.55})`);
      grad.addColorStop(1,   "rgba(0,0,0,0)");

      ctx.beginPath();
      ctx.ellipse(px, py, pr, ry * (0.8 + 0.18 * Math.cos(p)), 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    if (lightningFlash > 0 && isFg && Math.abs(cx - lightningX) < rx * 0.6) {
      drawLightningBolt(ctx, lightningX, lightningY - ry * 0.3);
    }
  });
}
