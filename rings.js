const RING_BANDS = [
  { inner: 0.555, outer: 0.580, opacity: 0.12, tint: [1.0, 0.95, 0.88] },
  { inner: 0.585, outer: 0.635, opacity: 0.28, tint: [1.0, 0.96, 0.90] },
  { inner: 0.640, outer: 0.660, opacity: 0.18, tint: [0.95, 0.92, 0.88] },
  { inner: 0.662, outer: 0.760, opacity: 0.82, tint: [1.0, 0.97, 0.92] },
  { inner: 0.760, outer: 0.795, opacity: 0.70, tint: [0.98, 0.94, 0.88] },
  { inner: 0.797, outer: 0.808, opacity: 0.06, tint: [0.80, 0.80, 0.85] },
  { inner: 0.810, outer: 0.855, opacity: 0.58, tint: [1.0, 0.96, 0.90] },
  { inner: 0.855, outer: 0.862, opacity: 0.30, tint: [0.85, 0.85, 0.88] },
  { inner: 0.862, outer: 0.910, opacity: 0.50, tint: [1.0, 0.95, 0.88] },
  { inner: 0.912, outer: 0.940, opacity: 0.14, tint: [0.90, 0.90, 0.95] },
];

const RING_PARTICLES = Array.from({ length: 180 }, () => ({
  angle: Math.random() * Math.PI * 2,
  dist:  0.60 + Math.random() * 0.34,
  speed: (Math.random() - 0.5) * 0.00025,
  alpha: Math.random() * 0.5 + 0.15,
  r:     Math.random() * 1.0 + 0.2,
}));

function getRingBaseColor(hour, season) {
  const sun = getSunIntensity(hour);
  const isGolden = (hour >= 5.5 && hour <= 9.0) || (hour >= 16.5 && hour <= 20.5);
  const seasonTint = [
    [210, 225, 255],
    [255, 238, 195],
    [255, 198, 135],
    [185, 212, 255],
  ][season || 0];
  if (sun === 0)  return [105, 125, 205];
  if (isGolden)   return [255, 188, 68];
  return seasonTint;
}

function drawRings(ctx, w, h, hour, latitude, thickness, drift, opacityScale = 1, season = 0) {
  const tiltAngle = (90 - Math.abs(latitude)) * (Math.PI / 180);
  const cx    = w / 2;
  const cy    = h * 0.595;
  const maxRx = w * 0.90;
  const cosT  = Math.abs(Math.cos(tiltAngle));

  const thickMap   = { thin: 0.40, medium: 0.80, saturn: 1.35, extreme: 2.20 };
  const thickScale = thickMap[thickness] || 1.35;

  const [br, bg, bb] = getRingBaseColor(hour, season);
  const sun = getSunIntensity(hour);
  const t   = performance.now() / 1000;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(drift);

  const outerRx = maxRx * 0.945;
  const outerRy = outerRx * cosT * 0.125 + 5;

  // Outer diffuse glow
  for (let gi = 3; gi >= 1; gi--) {
    const glowRx = outerRx + gi * 18;
    const glowRy = glowRx * cosT * 0.125 + 5;
    const glowA  = 0.025 * opacityScale * (sun > 0 ? 1 : 0.3) / gi;
    const glow   = ctx.createRadialGradient(0, 0, glowRy * 0.5, 0, 0, glowRx);
    glow.addColorStop(0,    `rgba(${br},${bg},${bb},0)`);
    glow.addColorStop(0.65, `rgba(${br},${bg},${bb},${glowA})`);
    glow.addColorStop(1,    "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.ellipse(0, 0, glowRx, glowRy * 3.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
  }

  // Ring bands
  RING_BANDS.forEach(({ inner, outer, opacity, tint }) => {
    const rx1   = maxRx * inner, rx2 = maxRx * outer;
    const ry1   = rx1 * cosT * 0.125 + 4;
    const ry2   = rx2 * cosT * 0.125 + 4;
    const midRx = (rx1 + rx2) / 2;
    const midRy = (ry1 + ry2) / 2;
    const lineW = Math.max(1, (rx2 - rx1) * thickScale * opacityScale);

    const tr = Math.round(br * tint[0]);
    const tg = Math.round(bg * tint[1]);
    const tb = Math.round(bb * tint[2]);

    const shimmer = 1 + 0.035 * Math.sin(t * 0.6 + inner * 12.5);
    const a = Math.min(0.98, opacity * (sun > 0 ? 1 : 0.48) * opacityScale * shimmer);

    const grad = ctx.createLinearGradient(-midRx, 0, midRx, 0);
    grad.addColorStop(0,    `rgba(${tr},${tg},${tb},0)`);
    grad.addColorStop(0.04, `rgba(${tr},${tg},${tb},${a * 0.35})`);
    grad.addColorStop(0.15, `rgba(${tr},${tg},${tb},${a * 0.85})`);
    grad.addColorStop(0.50, `rgba(${tr},${tg},${tb},${Math.min(0.98, a * 1.12)})`);
    grad.addColorStop(0.85, `rgba(${tr},${tg},${tb},${a * 0.85})`);
    grad.addColorStop(0.96, `rgba(${tr},${tg},${tb},${a * 0.35})`);
    grad.addColorStop(1,    `rgba(${tr},${tg},${tb},0)`);

    ctx.beginPath();
    ctx.ellipse(0, 0, midRx, midRy, 0, 0, Math.PI * 2);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = lineW;
    ctx.stroke();
  });

  // Orbiting dust particles
  if (opacityScale > 0.25) {
    RING_PARTICLES.forEach((p) => {
      p.angle += p.speed;
      const prx = maxRx * p.dist;
      const pry = prx * cosT * 0.125 + 4;
      const px  = Math.cos(p.angle) * prx;
      const py  = Math.sin(p.angle) * pry;
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${br},${bg},${bb},${p.alpha * opacityScale * 0.45})`;
      ctx.fill();
    });
  }

  // Planet shadow on lower half of rings
  const shadowA = 0.28 * (1 - sun * 0.5);
  const shadow  = ctx.createLinearGradient(0, -outerRy * 2, 0, outerRy * 3);
  shadow.addColorStop(0,    "rgba(0,0,0,0)");
  shadow.addColorStop(0.46, "rgba(0,0,0,0)");
  shadow.addColorStop(0.56, `rgba(0,0,0,${shadowA * 0.6})`);
  shadow.addColorStop(1,    `rgba(0,0,0,${shadowA})`);
  ctx.beginPath();
  ctx.ellipse(0, 0, outerRx + 55, outerRy * 3.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = shadow;
  ctx.fill();

  ctx.restore();

  // Ring shadow stripe cast on ground below
  if (sun > 0.08) {
    const { x: sx } = getSunPosition(hour, w, h);
    const stripeAlpha = sun * 0.10 * opacityScale;
    const sg = ctx.createLinearGradient(0, h * 0.69, 0, h * 0.84);
    sg.addColorStop(0, `rgba(0,0,0,${stripeAlpha})`);
    sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, h * 0.69, w, h * 0.15);
  }
}
