const CLOUD_LAYERS = [
  // [x, y, scaleX, scaleY, speed, puffs]
  ...Array.from({ length: 4 }, (_, i) => ({
    x: i * 0.28 + Math.random() * 0.1,
    y: 0.60 + Math.random() * 0.08,
    sx: 0.14 + Math.random() * 0.12,
    sy: 0.028 + Math.random() * 0.018,
    speed: 0.000025 + Math.random() * 0.00002,
    layer: 0, // foreground
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    x: i * 0.22 + Math.random() * 0.08,
    y: 0.50 + Math.random() * 0.07,
    sx: 0.10 + Math.random() * 0.10,
    sy: 0.020 + Math.random() * 0.012,
    speed: 0.000015 + Math.random() * 0.000012,
    layer: 1, // background
  })),
];

function drawClouds(ctx, w, h, hour) {
  const sun = getSunIntensity(hour);
  const isGolden = (hour >= 5.5 && hour <= 8.5) || (hour >= 17 && hour <= 20);
  const night = 1 - sun;

  CLOUD_LAYERS.forEach((c) => {
    c.x += c.speed;
    if (c.x > 1.4) c.x = -0.4;

    const cx = c.x * w, cy = c.y * h;
    const rx = c.sx * w, ry = c.sy * h;
    const isFg = c.layer === 0;

    // Cloud color shifts with time
    const baseAlpha = isFg
      ? 0.10 + sun * 0.14 + night * 0.04
      : 0.06 + sun * 0.08 + night * 0.02;

    const cloudR = isGolden ? 255 : night > 0.5 ? 160 : 240;
    const cloudG = isGolden ? 200 : night > 0.5 ? 170 : 245;
    const cloudB = isGolden ? 120 : night > 0.5 ? 200 : 255;

    // Multi-puff volumetric look
    const puffs = isFg ? 5 : 3;
    for (let p = 0; p < puffs; p++) {
      const px = cx + (p - puffs / 2) * rx * 0.45;
      const py = cy - Math.sin((p / puffs) * Math.PI) * ry * 0.6;
      const pr = rx * (0.5 + 0.15 * Math.sin(p));
      const pry = ry * (0.9 + 0.2 * Math.cos(p));

      const grad = ctx.createRadialGradient(px, py, 0, px, py, pr);
      grad.addColorStop(0,   `rgba(${cloudR},${cloudG},${cloudB},${baseAlpha})`);
      grad.addColorStop(0.5, `rgba(${cloudR},${cloudG},${cloudB},${baseAlpha * 0.6})`);
      grad.addColorStop(1,   "rgba(0,0,0,0)");

      ctx.beginPath();
      ctx.ellipse(px, py, pr, pry, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  });
}
