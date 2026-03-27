// Aurora borealis — visible at high latitudes at night
const AURORA_BANDS = Array.from({ length: 3 }, (_, i) => ({
  offset:  i * 0.18,
  speed:   0.00008 + Math.random() * 0.00006,
  phase:   Math.random() * Math.PI * 2,
  hue:     [140, 160, 120, 180, 100][i], // greens and teals
  width:   0.06 + Math.random() * 0.05,
}));

function drawAurora(ctx, w, h, hour, latitude) {
  const night    = 1 - getSunIntensity(hour);
  const absLat   = Math.abs(latitude);
  // Only visible at latitudes above ~55° and at night
  const latFactor = Math.max(0, (absLat - 50) / 30);
  const strength  = night * latFactor;
  if (strength < 0.02) return;

  const t = performance.now() / 1000;

  AURORA_BANDS.forEach((band) => {
    band.phase += band.speed;
    const yBase = h * (0.08 + band.offset * 0.55);

    // Wavy curtain using sine path
    const points = 60;
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const px = (i / points) * w;
      const wave1 = Math.sin(i * 0.18 + band.phase) * h * 0.04;
      const wave2 = Math.sin(i * 0.09 + band.phase * 0.7 + 1.2) * h * 0.025;
      const py = yBase + wave1 + wave2;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }

    // Curtain height varies along the wave
    const curtainH = h * band.width * (0.7 + 0.3 * Math.sin(t * 0.4 + band.phase));
    const alpha    = strength * (0.12 + 0.08 * Math.sin(t * 0.3 + band.offset * 5));

    // Vertical gradient for each curtain strip
    const grad = ctx.createLinearGradient(0, yBase - curtainH, 0, yBase + curtainH * 0.5);
    grad.addColorStop(0,   "rgba(0,0,0,0)");
    grad.addColorStop(0.2, `hsla(${band.hue},90%,55%,${alpha * 0.4})`);
    grad.addColorStop(0.5, `hsla(${band.hue},95%,60%,${alpha})`);
    grad.addColorStop(0.8, `hsla(${band.hue + 20},80%,45%,${alpha * 0.5})`);
    grad.addColorStop(1,   "rgba(0,0,0,0)");

    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth   = curtainH;
    ctx.stroke();
    ctx.restore();
  });
}
