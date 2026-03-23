const RING_BANDS = [
  { inner: 0.60, outer: 0.63, opacity: 0.25 }, // C ring (faint inner)
  { inner: 0.65, outer: 0.78, opacity: 0.70 }, // B ring (brightest)
  { inner: 0.79, outer: 0.80, opacity: 0.10 }, // Cassini division (gap)
  { inner: 0.81, outer: 0.90, opacity: 0.50 }, // A ring
  { inner: 0.91, outer: 0.94, opacity: 0.15 }, // F ring (faint outer)
];

function getRingColor(hour) {
  const sun = getSunIntensity(hour);
  const isGolden = (hour >= 5.5 && hour <= 8.5) || (hour >= 17 && hour <= 20);
  if (sun === 0)    return { r: 120, g: 140, b: 210 };
  if (isGolden)     return { r: 255, g: 185, b: 70  };
  return              { r: 210, g: 228, b: 255 };
}

function drawRings(ctx, w, h, hour, latitude, thickness, drift) {
  const tiltAngle = (90 - Math.abs(latitude)) * (Math.PI / 180);
  const cx = w / 2;
  const cy = h * 0.60;
  const maxRx = w * 0.92;

  const thickMap = { thin: 0.5, medium: 0.9, saturn: 1.4, extreme: 2.2 };
  const thickScale = thickMap[thickness] || 1.4;

  const { r, g, b } = getRingColor(hour);
  const sun = getSunIntensity(hour);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(drift);

  // Outer bloom glow
  const bloomRx = maxRx * 0.94 + 30;
  const bloomRy = bloomRx * Math.abs(Math.cos(tiltAngle)) * 0.13 + 6;
  const bloom = ctx.createRadialGradient(0, 0, bloomRy * 0.5, 0, 0, bloomRx);
  bloom.addColorStop(0, `rgba(${r},${g},${b},0)`);
  bloom.addColorStop(0.7, `rgba(${r},${g},${b},${0.06 * (sun > 0 ? 1 : 0.4)})`);
  bloom.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, bloomRx, bloomRy * 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = bloom;
  ctx.fill();

  // Draw each band
  RING_BANDS.forEach(({ inner, outer, opacity }) => {
    const rx1 = maxRx * inner;
    const rx2 = maxRx * outer;
    const ry1 = rx1 * Math.abs(Math.cos(tiltAngle)) * 0.13 + 4;
    const ry2 = rx2 * Math.abs(Math.cos(tiltAngle)) * 0.13 + 4;
    const midRx = (rx1 + rx2) / 2;
    const midRy = (ry1 + ry2) / 2;
    const lineW = (rx2 - rx1) * thickScale;

    const grad = ctx.createLinearGradient(-midRx, 0, midRx, 0);
    const a = opacity * (sun > 0 ? 1 : 0.55);
    grad.addColorStop(0,    `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.08, `rgba(${r},${g},${b},${a * 0.5})`);
    grad.addColorStop(0.25, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(0.5,  `rgba(${r},${g},${b},${a * 1.1 > 1 ? 1 : a * 1.1})`);
    grad.addColorStop(0.75, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(0.92, `rgba(${r},${g},${b},${a * 0.5})`);
    grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);

    ctx.beginPath();
    ctx.ellipse(0, 0, midRx, midRy, 0, 0, Math.PI * 2);
    ctx.strokeStyle = grad;
    ctx.lineWidth = lineW;
    ctx.stroke();
  });

  // Shadow on lower half (planet shadow cast on rings)
  const shadowGrad = ctx.createLinearGradient(0, -bloomRy * 2, 0, bloomRy * 2);
  shadowGrad.addColorStop(0,   "rgba(0,0,0,0)");
  shadowGrad.addColorStop(0.5, "rgba(0,0,0,0)");
  shadowGrad.addColorStop(0.6, `rgba(0,0,0,${0.18 * (1 - sun * 0.5)})`);
  shadowGrad.addColorStop(1,   `rgba(0,0,0,${0.35 * (1 - sun * 0.5)})`);
  ctx.beginPath();
  ctx.ellipse(0, 0, bloomRx, bloomRy * 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = shadowGrad;
  ctx.fill();

  ctx.restore();
}
