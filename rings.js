// Ring bands based on Saturn/Cassini spectroscopy data
// r = normalised radius (0=inner D ring, 1=outer F ring)
// hw = half-width as fraction of total ring span
// op = optical depth / opacity
// c  = RGB colour from Cassini VIMS spectroscopy
const RING_BANDS = [
  { name:"D",       r:0.08, hw:0.040, op:0.10, c:[200,195,185] },
  { name:"C",       r:0.22, hw:0.100, op:0.28, c:[195,188,172] },
  { name:"B-inner", r:0.40, hw:0.080, op:0.88, c:[245,238,220] },
  { name:"B-outer", r:0.52, hw:0.095, op:0.92, c:[248,242,225] },
  { name:"Cassini", r:0.63, hw:0.018, op:0.04, c:[ 80, 85,100] },
  { name:"A-inner", r:0.73, hw:0.060, op:0.72, c:[238,230,210] },
  { name:"Encke",   r:0.81, hw:0.005, op:0.03, c:[ 80, 85,100] },
  { name:"A-outer", r:0.87, hw:0.055, op:0.65, c:[235,228,208] },
  { name:"F",       r:0.97, hw:0.018, op:0.22, c:[250,245,235] },
];

function getRingLightColor(hour, season) {
  const sun  = getSunIntensity(hour);
  const elev = getSolarElevation(hour);
  if (sun < 0.02) return { r:180, g:188, b:210, boost:0.55 };
  if (elev < 15) {
    const t = Math.max(0, 1 - elev / 15);
    return { r:Math.min(255,245+t*10), g:Math.round(220-t*30), b:Math.round(180-t*80), boost:1+t*0.3 };
  }
  const s = [[0,0,8],[0,-5,0],[-5,0,0],[0,5,15]][season||0];
  return { r:245+s[0], g:238+s[1], b:220+s[2], boost:1.0 };
}

function getSolarElevation(hour) {
  const sun = getSunIntensity(hour);
  if (sun <= 0) return -10;
  const t = Math.max(0, Math.min(1, (hour - 5.8) / 14.4));
  return Math.sin(t * Math.PI) * 60;
}

// Project ring arc point to screen.
// arcAngle: 0=right horizon, PI=left horizon (upper semicircle)
// normR: 0-1 across ring system
// elevDeg: 90 - |lat|, how high the arc peaks above horizon
// panX, panY: camera pan offset in pixels
function projectRing(arcAngle, normR, elevDeg, w, h, panX, panY) {
  const elev = elevDeg * (Math.PI / 180);
  const lx   = Math.cos(arcAngle) * normR;
  const ly   = Math.sin(arcAngle) * normR; // always >= 0 for 0..PI

  const worldY = ly * Math.sin(elev);
  const worldZ = ly * Math.cos(elev) + 0.04;

  if (worldZ <= 0.001) return null;

  const fov = h * 0.90;
  const sx  = w / 2 + (lx / worldZ) * fov + panX;
  const sy  = h * 0.72 - (worldY / worldZ) * fov + panY;

  // Atmospheric extinction (Beer-Lambert) — fades rings near horizon
  const ptElev = Math.atan2(worldY, worldZ);
  const ext    = Math.exp(-0.07 * Math.max(0, 1 / Math.max(0.08, Math.sin(Math.max(0.08, ptElev))) - 1));

  return { x: sx, y: sy, ext };
}

function drawRings(ctx, w, h, hour, latitude, thickness, _drift, opacityScale, season) {
  if (Math.abs(latitude) > 89) return;

  const elevDeg  = 90 - Math.abs(latitude);
  const light    = getRingLightColor(hour, season);
  const sun      = getSunIntensity(hour);
  const groundY  = h * 0.72;
  const STEPS    = 80; // enough for smooth arc, low enough for 60fps
  const thickMap = { thin:1.5, medium:3.0, saturn:5.5, extreme:10 };
  const thickBase = (thickMap[thickness] || 5.5) * opacityScale;

  // Pan offset — passed in from app state via global (set before call)
  const panX = (window._ringPanX || 0);
  const panY = (window._ringPanY || 0);

  ctx.save();

  // Sky tint from ring-reflected light
  const skyA = opacityScale * (sun > 0 ? 0.032 : 0.016);
  const skyG = ctx.createLinearGradient(0, 0, 0, groundY);
  skyG.addColorStop(0,    `rgba(${light.r},${light.g},${light.b},0)`);
  skyG.addColorStop(0.65, `rgba(${light.r},${light.g},${light.b},${skyA})`);
  skyG.addColorStop(1,    `rgba(${light.r},${light.g},${light.b},0)`);
  ctx.fillStyle = skyG;
  ctx.fillRect(0, 0, w, groundY);

  RING_BANDS.forEach(({ r, hw, op, c }) => {
    const [cr,cg,cb] = c;
    const lr = Math.min(255, Math.round(cr * (light.r/245) * light.boost));
    const lg = Math.min(255, Math.round(cg * (light.g/238) * light.boost));
    const lb = Math.min(255, Math.round(cb * (light.b/220) * light.boost));

    const alpha = Math.min(0.96, op * opacityScale * light.boost);
    const lw    = Math.max(1, hw * thickBase * 85);

    // Pre-compute all arc points
    const pts = new Array(STEPS + 1);
    for (let i = 0; i <= STEPS; i++) {
      pts[i] = projectRing((i / STEPS) * Math.PI, r, elevDeg, w, h, panX, panY);
    }

    // Find leftmost and rightmost visible points for gradient
    let lftX = w, rgtX = 0, midExt = 1;
    const mid = pts[Math.floor(STEPS / 2)];
    if (mid) midExt = mid.ext;

    for (let i = 0; i <= STEPS; i++) {
      const p = pts[i];
      if (!p || p.y > groundY) continue;
      if (p.x < lftX) lftX = p.x;
      if (p.x > rgtX) rgtX = p.x;
    }

    if (rgtX <= lftX) return; // nothing visible

    const aM = alpha * midExt;
    const aE = alpha * 0.12; // horizon ends

    const grad = ctx.createLinearGradient(lftX, 0, rgtX, 0);
    grad.addColorStop(0,    `rgba(${lr},${lg},${lb},${aE})`);
    grad.addColorStop(0.10, `rgba(${lr},${lg},${lb},${aM * 0.8})`);
    grad.addColorStop(0.50, `rgba(${lr},${lg},${lb},${aM})`);
    grad.addColorStop(0.90, `rgba(${lr},${lg},${lb},${aM * 0.8})`);
    grad.addColorStop(1,    `rgba(${lr},${lg},${lb},${aE})`);

    // Draw arc path
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= STEPS; i++) {
      const p = pts[i];
      if (!p || p.y > groundY + 1) { started = false; continue; }
      if (!started) { ctx.moveTo(p.x, p.y); started = true; }
      else            ctx.lineTo(p.x, p.y);
    }

    ctx.strokeStyle = grad;
    ctx.lineWidth   = lw;
    ctx.lineCap     = "butt";
    ctx.stroke();

    // Bloom pass
    ctx.lineWidth   = lw * 3;
    ctx.strokeStyle = `rgba(${lr},${lg},${lb},${aM * 0.09})`;
    ctx.stroke();
  });

  // Ground shadow
  if (sun > 0.05) {
    const sg = ctx.createLinearGradient(0, groundY, 0, groundY + h * 0.09);
    sg.addColorStop(0, `rgba(0,0,0,${0.08 * sun * opacityScale})`);
    sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, groundY, w, h * 0.09);
  }

  // Night ring-glow (rings reflect moonlight back to surface)
  if (sun < 0.1) {
    const ng = ctx.createLinearGradient(0, groundY - h*0.04, 0, groundY + h*0.12);
    ng.addColorStop(0, `rgba(180,190,220,${opacityScale * 0.035})`);
    ng.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ng;
    ctx.fillRect(0, groundY - h*0.04, w, h*0.16);
  }

  ctx.restore();
}
