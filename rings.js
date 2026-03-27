const RING_BANDS = [
  { rMin: 0.60, rMax: 0.64, opacity: 0.25, tint: [1.00, 0.96, 0.90] }, // C ring
  { rMin: 0.65, rMax: 0.79, opacity: 0.90, tint: [1.00, 0.97, 0.93] }, // B ring
  { rMin: 0.795,rMax: 0.808,opacity: 0.06, tint: [0.55, 0.58, 0.70] }, // Cassini gap
  { rMin: 0.81, rMax: 0.91, opacity: 0.65, tint: [1.00, 0.96, 0.90] }, // A ring
  { rMin: 0.912,rMax: 0.94, opacity: 0.18, tint: [0.88, 0.90, 0.96] }, // F ring
];

function getRingBaseColor(hour, season) {
  const sun      = getSunIntensity(hour);
  const isGolden = (hour >= 5.5 && hour <= 9.0) || (hour >= 16.5 && hour <= 20.5);
  const tints    = [[215,230,255],[255,242,200],[255,202,140],[190,218,255]];
  if (sun === 0)  return [110, 130, 215];
  if (isGolden)   return [255, 192, 72];
  return tints[season || 0];
}

// Project one point on the ring arc to screen space.
// arcAngle: 0 = right horizon, PI = left horizon (upper semi-circle only)
// elevAngle: how high the ring plane tilts above horizon (radians)
//   equator lat=0  → elevAngle = PI/2 → rings arch straight overhead
//   pole    lat=90 → elevAngle = 0    → rings lie on the horizon
function project(arcAngle, normR, elevAngle, w, h) {
  const R      = normR;                          // keep normalised
  const lx     = Math.cos(arcAngle) * R;         // left / right
  const ly     = Math.sin(arcAngle) * R;         // radial (always ≥0 for 0..PI)

  // Tilt: ly rotates into worldY (up) and worldZ (depth)
  const worldY = ly * Math.sin(elevAngle);
  const worldZ = ly * Math.cos(elevAngle) + 0.001; // tiny offset avoids /0

  // Simple perspective — fov chosen so rings fill the sky
  const fov = h * 0.95;
  const sx  = w / 2 + (lx / (worldZ + 0.5)) * fov;
  const sy  = h * 0.72 - (worldY / (worldZ + 0.5)) * fov;

  // Fade based on how close to horizon (large worldZ = near horizon)
  const fade = Math.max(0.05, 1 - worldZ * 0.85);

  return { x: sx, y: sy, fade };
}

function drawRings(ctx, w, h, hour, latitude, thickness, drift, opacityScale = 1, season = 0) {
  const sun        = getSunIntensity(hour);
  const isGolden   = (hour >= 5.5 && hour <= 9.0) || (hour >= 16.5 && hour <= 20.5);
  const [br,bg,bb] = getRingBaseColor(hour, season);
  const elevAngle  = (90 - Math.abs(latitude)) * (Math.PI / 180);
  const thickMap   = { thin: 3, medium: 6, saturn: 11, extreme: 20 };
  const baseThick  = (thickMap[thickness] || 11) * opacityScale;
  const STEPS      = 120; // reduced for performance
  const groundY    = h * 0.72;
  const t          = performance.now() / 1000;

  ctx.save();

  // Subtle sky glow from ring light
  const skyGlow = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGlow.addColorStop(0,   `rgba(${br},${bg},${bb},0)`);
  skyGlow.addColorStop(0.7, `rgba(${br},${bg},${bb},${0.04 * opacityScale})`);
  skyGlow.addColorStop(1,   `rgba(${br},${bg},${bb},0)`);
  ctx.fillStyle = skyGlow;
  ctx.fillRect(0, 0, w, groundY);

  RING_BANDS.forEach(({ rMin, rMax, opacity, tint }) => {
    const rMid    = (rMin + rMax) / 2;
    const tr      = Math.min(255, Math.round(br * tint[0]));
    const tg      = Math.min(255, Math.round(bg * tint[1]));
    const tb      = Math.min(255, Math.round(bb * tint[2]));
    const shimmer = 1 + 0.035 * Math.sin(t * 0.5 + rMid * 12);
    const alpha   = Math.min(0.95, opacity * (sun > 0 ? 1 : 0.6) * opacityScale * shimmer);
    const lw      = baseThick * (rMax - rMin) / 0.14; // scale linewidth to band width

    // Build arc points
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const angle = (i / STEPS) * Math.PI + drift;
      const p     = project(angle, rMid, elevAngle, w, h);
      pts.push(p);
    }

    // Draw the arc as one path — clip to above ground
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= STEPS; i++) {
      const p = pts[i];
      if (p.y > groundY) { started = false; continue; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; }
      else            ctx.lineTo(p.x, p.y);
    }

    // Horizontal gradient: fade at both horizon ends, bright at peak
    const midPt  = pts[Math.floor(STEPS / 2)];
    const leftPt = pts[0];
    const rgtPt  = pts[STEPS];
    const grad   = ctx.createLinearGradient(leftPt.x, 0, rgtPt.x, 0);
    const aL     = alpha * leftPt.fade * 0.3;
    const aM     = alpha * midPt.fade;
    const aR     = alpha * rgtPt.fade * 0.3;
    grad.addColorStop(0,    `rgba(${tr},${tg},${tb},${aL})`);
    grad.addColorStop(0.15, `rgba(${tr},${tg},${tb},${aM * 0.85})`);
    grad.addColorStop(0.5,  `rgba(${tr},${tg},${tb},${aM})`);
    grad.addColorStop(0.85, `rgba(${tr},${tg},${tb},${aM * 0.85})`);
    grad.addColorStop(1,    `rgba(${tr},${tg},${tb},${aR})`);

    // Main band
    ctx.strokeStyle = grad;
    ctx.lineWidth   = Math.max(1, lw);
    ctx.lineCap     = "round";
    ctx.stroke();

    // Bloom glow (single extra pass, wide + transparent)
    ctx.lineWidth   = Math.max(2, lw * 3.5);
    ctx.strokeStyle = `rgba(${tr},${tg},${tb},${aM * 0.12})`;
    ctx.stroke();
  });

  // Ring shadow on ground
  if (sun > 0.05) {
    const sg = ctx.createLinearGradient(0, groundY, 0, groundY + h * 0.12);
    sg.addColorStop(0, `rgba(0,0,0,${0.10 * sun * opacityScale})`);
    sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, groundY, w, h * 0.12);
  }

  ctx.restore();
}
