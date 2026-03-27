const CLOUD_LAYERS = [
  ...Array.from({ length: 5 }, (_, i) => ({
    x:     i * 0.22 + Math.random() * 0.10,
    y:     0.575 + Math.random() * 0.065,
    sx:    0.16  + Math.random() * 0.14,
    sy:    0.028 + Math.random() * 0.018,
    speed: 0.000020 + Math.random() * 0.000016,
    layer: 0,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    x:     i * 0.18 + Math.random() * 0.08,
    y:     0.495 + Math.random() * 0.065,
    sx:    0.09  + Math.random() * 0.10,
    sy:    0.017 + Math.random() * 0.012,
    speed: 0.000010 + Math.random() * 0.000009,
    layer: 1,
  })),
];

let lightningTimer = 0;
let lightningFlash = 0;
let lightningX     = 0;
let lightningY     = 0;

function drawLightningBolt(ctx, x1, y1) {
  const segs = 6;
  let cx = x1, cy = y1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  for (let i = 0; i < segs; i++) {
    cx += (Math.random() - 0.5) * 18;
    cy += 10 + Math.random() * 10;
    ctx.lineTo(cx, cy);
  }
  ctx.strokeStyle = `rgba(210,230,255,${0.75 + Math.random() * 0.25})`;
  ctx.lineWidth   = 0.8 + Math.random() * 0.8;
  ctx.stroke();
  // Bright core
  ctx.strokeStyle = `rgba(255,255,255,0.9)`;
  ctx.lineWidth   = 0.3;
  ctx.stroke();
}

function drawClouds(ctx, w, h, hour) {
  const sun      = getSunIntensity(hour);
  const isGolden = (hour >= 5.5 && hour <= 9.0) || (hour >= 16.5 && hour <= 20.5);
  const night    = 1 - sun;

  // Lightning trigger
  lightningTimer++;
  if (night > 0.55 && lightningTimer > 380 + Math.random() * 550) {
    lightningFlash = 10;
    lightningTimer = 0;
    // Pick a random foreground cloud centre for the bolt
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

    // Base alpha — brighter in day, dimmer at night, golden at sunrise/sunset
    const baseAlpha = isFg
      ? 0.08 + sun * 0.16 + night * 0.045
      : 0.04 + sun * 0.09 + night * 0.025;

    // Lightning flash boost
    const flashBoost = (lightningFlash > 0 && isFg) ? lightningFlash * 0.035 : 0;
    const alpha = baseAlpha + flashBoost;

    // Cloud colour
    let cloudR, cloudG, cloudB;
    if (isGolden) {
      cloudR = 255; cloudG = 200; cloudB = 120;
    } else if (night > 0.65) {
      cloudR = 130; cloudG = 145; cloudB = 185;
    } else {
      cloudR = 235; cloudG = 240; cloudB = 255;
    }

    // Multi-puff volumetric cloud
    const puffs = isFg ? 6 : 3;
    for (let p = 0; p < puffs; p++) {
      const t   = p / (puffs - 1);
      const px  = cx + (t - 0.5) * rx * 1.1;
      const py  = cy - Math.sin(t * Math.PI) * ry * 0.7;
      const pr  = rx * (0.38 + 0.18 * Math.sin(p * 1.3)) * (isFg ? 1 : 0.75);
      const pry = ry * (0.85 + 0.20 * Math.cos(p));

      const grad = ctx.createRadialGradient(px, py - pry * 0.2, 0, px, py, pr);
      grad.addColorStop(0,   `rgba(${cloudR},${cloudG},${cloudB},${alpha})`);
      grad.addColorStop(0.45,`rgba(${cloudR},${cloudG},${cloudB},${alpha * 0.65})`);
      grad.addColorStop(1,   "rgba(0,0,0,0)");

      ctx.beginPath();
      ctx.ellipse(px, py, pr, pry, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Draw lightning bolt inside cloud
    if (lightningFlash > 0 && isFg && Math.abs(cx - lightningX) < rx * 0.6) {
      drawLightningBolt(ctx, lightningX, lightningY - ry * 0.3);
      // Flash glow on cloud
      const flashGlow = ctx.createRadialGradient(lightningX, lightningY, 0, lightningX, lightningY, rx * 0.8);
      flashGlow.addColorStop(0,   `rgba(200,220,255,${lightningFlash * 0.025})`);
      flashGlow.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = flashGlow;
      ctx.fillRect(cx - rx, cy - ry * 2, rx * 2, ry * 3);
    }
  });
}
