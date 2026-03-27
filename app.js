const canvas = document.getElementById("sky");
const ctx    = canvas.getContext("2d");

const citySelect    = document.getElementById("city");
const timeSlider    = document.getElementById("time");
const timeLabel     = document.getElementById("timeLabel");
const thickSelect   = document.getElementById("thickness");
const standBtn      = document.getElementById("standBtn");
const autoCheck     = document.getElementById("autoPlay");
const opacitySlider = document.getElementById("ringOpacity");
const tiltSlider    = document.getElementById("ringTilt");
const tiltLabel     = document.getElementById("tiltLabel");
const ringInfo      = document.getElementById("ringInfo");

const state = {
  city:         "London",
  hour:         12,
  thickness:    "saturn",
  ringOpacity:  1,
  tiltOverride: -1,
  season:       0,
  drift:        0,
  frame:        0,
  immersive:    false,
  autoPlay:     false,
  autoSpeed:    0.004,
  // Camera pan (Google Maps style)
  yaw:          0,        // horizontal pan in radians
  pitch:        0,        // vertical tilt in radians
  targetYaw:    0,
  targetPitch:  0,
  dragging:     false,
  dragStartX:   0,
  dragStartY:   0,
  dragYaw:      0,
  dragPitch:    0,
  // Mouse
  mouseX:       0,
  mouseY:       0,
  // Hit regions registered each frame
  hitRegions:   [],
};

// ── Info panel ────────────────────────────────────────────
const infoPanel = document.createElement("div");
infoPanel.id = "infoPanel";
document.body.appendChild(infoPanel);

const infoTitle = document.createElement("div");
infoTitle.id = "infoTitle";
const infoBody  = document.createElement("div");
infoBody.id  = "infoBody";
infoPanel.appendChild(infoTitle);
infoPanel.appendChild(infoBody);

// Crosshair dot
const crosshair = document.createElement("div");
crosshair.id = "crosshair";
document.body.appendChild(crosshair);

// ── Sky object database ───────────────────────────────────
const SKY_OBJECTS = {
  sun: {
    title: "The Sun",
    body:  "Distance: 149.6 million km. Angular diameter: 0.53°. At low elevation (golden hour), sunlight travels through ~38× more atmosphere, scattering blue wavelengths and leaving red/orange. This forward-scatters through ring ice particles, turning them gold. Solar irradiance at Earth's surface: ~1,000 W/m².",
    icon:  "☀️",
  },
  moon: {
    title: "The Moon",
    body:  "Distance: 384,400 km. Angular diameter: 0.52° — nearly identical to the Sun. With Earth's rings present, the Moon would pass through the ring plane twice per orbit (~27.3 days), causing mutual eclipses. Ring shadows on the Moon would be visible to the naked eye.",
    icon:  "🌙",
  },
  rings: {
    title: "Earth's Hypothetical Ring System",
    body:  "Based on research by Scharf (2013) and Zuluaga et al. (2015): if Earth had Saturn-like rings, the inner edge would sit at the Roche limit for ice (~9,500 km altitude, ~2.44× Earth's radius). The rings would be coplanar with the equator. They would NOT rotate with Earth — they orbit at Keplerian velocities (inner edge ~5.6 km/s). The rings would be visible from all latitudes except the poles.",
    icon:  "🪐",
  },
  ringB: {
    title: "B Ring — Brightest Band",
    body:  "Saturn's B ring is 25,500 km wide with optical depth τ = 0.4–2.5. Composed of 90–95% water ice particles (1 cm to 10 m diameter). Cassini VIMS spectroscopy shows cream-white colour (albedo ~0.6). The B ring is so dense it is essentially opaque — sunlight cannot pass through it. On a ringed Earth, this band would appear as a bright white stripe across the sky.",
    icon:  "💫",
  },
  ringCassini: {
    title: "Cassini Division",
    body:  "A 4,800 km wide gap at 117,580 km from Saturn's centre. Caused by a 2:1 mean-motion resonance with Mimas — particles here complete exactly 2 orbits for every 1 orbit of Mimas, receiving repeated gravitational kicks that clear the region. Optical depth τ ≈ 0.05–0.15. Appears as a dark gap in the ring arc.",
    icon:  "🔭",
  },
  milkyway: {
    title: "The Milky Way Galaxy",
    body:  "Our barred spiral galaxy: diameter ~100,000 light-years, containing 200–400 billion stars. The band visible here is the galactic plane seen edge-on from our position ~26,000 light-years from the centre. The dark rifts are dust lanes blocking starlight. On a ringed Earth, the rings would cross the Milky Way band, creating a spectacular intersection in the night sky.",
    icon:  "🌌",
  },
  aurora: {
    title: "Aurora Borealis",
    body:  "Caused by solar wind electrons (0.1–10 keV) colliding with O and N₂ at 100–300 km altitude. Green (557.7 nm): oxygen at 100–150 km. Red (630 nm): oxygen above 200 km. Blue/purple: nitrogen. Occurs within the auroral oval at ~65–72° geomagnetic latitude. Earth's rings would cast faint shadow bands through the aurora curtains.",
    icon:  "🌠",
  },
  stars: {
    title: "Stars",
    body:  "Stellar classification by surface temperature (Harvard system): O/B blue-white >10,000K, A white 7,500–10,000K, F yellow-white 6,000–7,500K, G yellow 5,200–6,000K (our Sun is G2V at 5,778K), K orange 3,700–5,200K, M red <3,700K. Twinkle (scintillation) is caused by atmospheric turbulence bending starlight — planets don't twinkle because they have measurable angular diameter.",
    icon:  "⭐",
  },
  sky_day: {
    title: "Daytime Sky — Rayleigh Scattering",
    body:  "Scattering intensity ∝ λ⁻⁴ (Rayleigh's law). Blue light (450 nm) scatters ~5.5× more than red (700 nm), making the sky blue. The sky would appear slightly brighter overall on a ringed Earth — rings reflect ~60% of sunlight back, adding ~10–15% to daytime illumination. Ring shadows would create subtle parallel dark bands across the sky.",
    icon:  "🌤️",
  },
  sky_dawn: {
    title: "Civil Twilight / Sunrise",
    body:  "Civil twilight: Sun 0° to −6° below horizon. Nautical twilight: −6° to −12°. Astronomical twilight: −12° to −18°. At sunrise, the optical path through the atmosphere is ~38× longer than at zenith, scattering all blue light and leaving red/orange. The rings would glow amber-gold as sunlight grazes their underside — a phenomenon called 'ring opposition surge'.",
    icon:  "🌅",
  },
  sky_dusk: {
    title: "Sunset / Evening Twilight",
    body:  "The Belt of Venus (pink band above the blue Earth shadow) is visible just after sunset — it's the shadow of Earth cast on the atmosphere. On a ringed Earth, the ring shadow would add a dramatic dark band across the sky during equinoxes, when the Sun is in the ring plane. At solstices, one face of the rings is fully illuminated.",
    icon:  "🌇",
  },
  sky_night: {
    title: "Night Sky — Ring-Lit Darkness",
    body:  "Research by Zuluaga et al. (2015) found that Earth's rings would make nights significantly brighter — the rings would reflect sunlight onto the night side, reducing darkness by the equivalent of a half-moon. This would have profound effects on circadian rhythms, animal behaviour, and astronomy. The rings would be the brightest object in the night sky after the Moon.",
    icon:  "🌃",
  },
  ground: {
    title: "Earth's Surface",
    body:  "The ring arc is a permanent, fixed feature of the sky — it never rises or sets. Its position is determined solely by your latitude. The arc always points toward the celestial equator. At the equator, it passes through the zenith. The rings orbit at 9,500–19,000 km altitude, completing one orbit in 3–6 hours — fast enough that individual particles would be visible moving if you watched carefully.",
    icon:  "🌍",
  },
  clouds: {
    title: "Clouds",
    body:  "Tropospheric clouds form at 2–12 km altitude — far below the ring system at 9,500+ km. Clouds would periodically obscure the rings. Crucially, the rings would cast shadow bands on cloud tops during certain sun angles, creating striped illumination patterns visible from aircraft. High-altitude cirrus clouds (ice crystals at 8–12 km) would create halos around the ring arc.",
    icon:  "☁️",
  },
  horizon: {
    title: "Horizon & Ring Convergence",
    body:  "The geometric horizon is ~5 km away at eye level (h=1.7m). The ring arc converges to two points on the horizon — due east and due west — regardless of latitude. This is because the ring plane intersects the horizon at the equatorial azimuth points. The rings appear to 'rise' from these two horizon points and arch overhead (or at an angle depending on latitude).",
    icon:  "📍",
  },
};

let currentHit   = null;
let infoPanelVis = false;
let infoPanelTimeout = null;

function showInfo(key) {
  const obj = SKY_OBJECTS[key];
  if (!obj || key === currentHit) return;
  currentHit = key;
  infoTitle.textContent = `${obj.icon}  ${obj.title}`;
  infoBody.textContent  = obj.body;
  infoPanel.classList.add("visible");
  clearTimeout(infoPanelTimeout);
}

function hideInfo() {
  infoPanelTimeout = setTimeout(() => {
    infoPanel.classList.remove("visible");
    currentHit = null;
  }, 300);
}

// ── Resize ────────────────────────────────────────────────
function resize() {
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
window.addEventListener("resize", resize);
resize();

function formatTime(h) {
  const hh = Math.floor(h).toString().padStart(2, "0");
  const mm = Math.round((h % 1) * 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function getPhaseLabel(hour) {
  if (hour < 5.5) return "Night";
  if (hour < 7.0) return "Dawn";
  if (hour < 9.0) return "Sunrise";
  if (hour < 17)  return "Day";
  if (hour < 18)  return "Sunset";
  if (hour < 20)  return "Dusk";
  return "Night";
}

// ── Hit region registration ───────────────────────────────
// Called by draw functions to register hoverable zones
function registerHit(key, x, y, r) {
  state.hitRegions.push({ key, x, y, r });
}
function registerHitRect(key, x, y, w, h) {
  state.hitRegions.push({ key, x, y, w, h, rect: true });
}

function hitTest(mx, my) {
  for (let i = state.hitRegions.length - 1; i >= 0; i--) {
    const r = state.hitRegions[i];
    if (r.rect) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return r.key;
    } else {
      const dx = mx - r.x, dy = my - r.y;
      if (dx*dx + dy*dy <= r.r*r.r) return r.key;
    }
  }
  return null;
}

// ── Ground ────────────────────────────────────────────────
function drawGround(w, h, hour, season) {
  const sun   = getSunIntensity(hour);
  const night = 1 - sun;
  const sg    = [[18,42,18],[22,48,15],[45,32,12],[28,32,38]][season];
  const r = Math.round(sg[0] * sun * 1.2 + 8  * night);
  const g = Math.round(sg[1] * sun * 1.2 + 12 * night);
  const b = Math.round(sg[2] * sun * 1.2 + 10 * night);

  const grad = ctx.createLinearGradient(0, h * 0.73, 0, h);
  grad.addColorStop(0, `rgb(${r},${g},${b})`);
  grad.addColorStop(1, `rgb(${Math.round(r*.55)},${Math.round(g*.55)},${Math.round(b*.55)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.73, w, h * 0.27);

  const blend = ctx.createLinearGradient(0, h * 0.69, 0, h * 0.76);
  blend.addColorStop(0, "rgba(0,0,0,0)");
  blend.addColorStop(1, `rgba(${r},${g},${b},1)`);
  ctx.fillStyle = blend;
  ctx.fillRect(0, h * 0.69, w, h * 0.07);

  // Hit regions
  registerHitRect("ground",  0, h * 0.73, w, h * 0.27);
  registerHitRect("horizon", 0, h * 0.70, w, h * 0.06);
}

// ── Compass rose ──────────────────────────────────────────
function drawCompass(w, h) {
  const cx = w - 52, cy = h - 52, r = 28;
  ctx.save();
  ctx.globalAlpha = 0.55;

  // Background circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(3,8,24,0.7)";
  ctx.fill();
  ctx.strokeStyle = "rgba(80,120,220,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Cardinal directions
  const dirs = [
    { label: "N", angle: -Math.PI/2 - state.yaw },
    { label: "E", angle:  0         - state.yaw },
    { label: "S", angle:  Math.PI/2 - state.yaw },
    { label: "W", angle:  Math.PI   - state.yaw },
  ];
  dirs.forEach(({ label, angle }) => {
    const x = cx + Math.cos(angle) * (r - 8);
    const y = cy + Math.sin(angle) * (r - 8);
    ctx.fillStyle = label === "N" ? "#ff6655" : "#8899cc";
    ctx.font = `${label === "N" ? "bold " : ""}9px Outfit, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
  });

  // North needle
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + Math.cos(-Math.PI/2 - state.yaw) * (r - 14),
    cy + Math.sin(-Math.PI/2 - state.yaw) * (r - 14)
  );
  ctx.strokeStyle = "#ff6655";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// ── Crosshair cursor ──────────────────────────────────────
function updateCrosshair(mx, my) {
  crosshair.style.left = `${mx}px`;
  crosshair.style.top  = `${my}px`;
}

// ── Main loop ─────────────────────────────────────────────
function loop() {
  const { hour, city, thickness, ringOpacity, tiltOverride, season, drift, frame } = state;
  const lat = tiltOverride >= 0 ? (90 - tiltOverride) : CITIES[city].lat;
  const w   = canvas.width;
  const h   = canvas.height;

  // Smooth camera pan — clamp yaw to ±1.2 (no full 360, just look left/right)
  state.targetYaw   = Math.max(-1.2, Math.min(1.2, state.targetYaw));
  state.yaw        += (state.targetYaw   - state.yaw)   * 0.10;
  state.pitch      += (state.targetPitch - state.pitch)  * 0.10;

  // Clear hit regions each frame
  state.hitRegions = [];

  // Pass pan offset to rings via global (avoids canvas transform overhead)
  window._ringPanX = -state.yaw * w * 0.22;
  window._ringPanY =  state.pitch * h * 0.10;

  // Draw everything without canvas transform — pan is baked into ring projection
  // Sky/stars/ground shift slightly via CSS-like offset on ctx
  ctx.save();
  ctx.translate(window._ringPanX * 0.35, window._ringPanY * 0.35); // subtle parallax
  drawSky(ctx, w, h, hour, frame);
  drawStars(ctx, w, h, hour, frame);
  drawAurora(ctx, w, h, hour, lat);
  ctx.restore();

  drawGround(w, h, hour, season);
  drawRings(ctx, w, h, hour, lat, thickness, 0, ringOpacity, season);
  drawClouds(ctx, w, h, hour);

  // Register sky-wide hit zones (outside transform — screen space)
  const sun    = getSunIntensity(hour);
  const phase  = getPhaseLabel(hour);

  // Sky background zone
  const skyKey = phase === "Day" ? "sky_day"
               : phase === "Dawn" || phase === "Sunrise" ? "sky_dawn"
               : phase === "Dusk" || phase === "Sunset"  ? "sky_dusk"
               : "sky_night";
  registerHitRect(skyKey, 0, 0, w, h * 0.50);

  // Sun hit zone
  if (sun > 0) {
    const { x: sx, y: sy } = getSunPosition(hour, w, h);
    const panX = sx - state.yaw * w * 0.18;
    const panY = sy + state.pitch * h * 0.12;
    registerHit("sun", panX, panY, 45);
  }

  // Moon hit zone
  const night = 1 - sun;
  if (night > 0.05) {
    const mt = Math.max(0, Math.min(1, ((hour + 12) % 24 - 5.8) / 14.4));
    if (mt > 0.01 && mt < 0.99) {
      const mx2 = w * 0.05 + mt * w * 0.90 - state.yaw * w * 0.18;
      const my2 = h * 0.80 - Math.sin(mt * Math.PI) * h * 0.55 + state.pitch * h * 0.12;
      registerHit("moon", mx2, my2, 35);
    }
  }

  // Ring arc hit zone — mid-sky band
  registerHitRect("rings",       w * 0.05, h * 0.25, w * 0.90, h * 0.20);
  registerHitRect("ringB",       w * 0.15, h * 0.30, w * 0.70, h * 0.08);
  registerHitRect("ringCassini", w * 0.20, h * 0.38, w * 0.60, h * 0.04);

  // Milky Way — upper sky at night
  if (night > 0.5) registerHitRect("milkyway", 0, 0, w, h * 0.35);

  // Aurora — upper sky at high lat night
  if (night > 0.5 && Math.abs(lat) > 50) registerHitRect("aurora", 0, 0, w, h * 0.30);

  // Stars — upper sky at night
  if (night > 0.3) registerHitRect("stars", 0, 0, w, h * 0.65);

  // Clouds — mid-sky
  registerHitRect("clouds", 0, h * 0.45, w, h * 0.25);

  // Compass
  drawCompass(w, h);

  // Info bar
  const tiltDeg  = tiltOverride >= 0 ? tiltOverride : Math.round(getRingElevationDeg(CITIES[city].lat));
  const cityDesc  = CITIES[city].desc;
  ringInfo.textContent = `${city}  ·  ${formatTime(hour)}  ·  ${phase}  ·  ${cityDesc}  ·  Drag to look  ·  R to reset`;

  state.drift += 0.000016;
  state.frame++;

  if (state.autoPlay) {
    state.hour = (state.hour + state.autoSpeed) % 24;
    timeSlider.value = state.hour;
    timeLabel.textContent = formatTime(state.hour);
  }

  requestAnimationFrame(loop);
}

// ── Mouse / touch pan (Google Maps style) ─────────────────
canvas.addEventListener("mousedown", (e) => {
  state.dragging   = true;
  state.dragStartX = e.clientX;
  state.dragStartY = e.clientY;
  state.dragYaw    = state.targetYaw;
  state.dragPitch  = state.targetPitch;
  canvas.style.cursor = "grabbing";
});

window.addEventListener("mouseup", () => {
  state.dragging = false;
  canvas.style.cursor = "grab";
});

window.addEventListener("mousemove", (e) => {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
  updateCrosshair(e.clientX, e.clientY);

  if (state.dragging) {
    const dx = (e.clientX - state.dragStartX) / canvas.width;
    const dy = (e.clientY - state.dragStartY) / canvas.height;
    state.targetYaw   = state.dragYaw   - dx * 2.5;
    state.targetPitch = Math.max(-0.6, Math.min(0.6, state.dragPitch + dy * 1.5));
    return;
  }

  // Hit test
  const hit = hitTest(e.clientX, e.clientY);
  if (hit) showInfo(hit);
  else     hideInfo();
});

canvas.addEventListener("mouseleave", () => {
  hideInfo();
  crosshair.style.opacity = "0";
});
canvas.addEventListener("mouseenter", () => {
  crosshair.style.opacity = "1";
});

// Touch support
canvas.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  state.dragging   = true;
  state.dragStartX = t.clientX;
  state.dragStartY = t.clientY;
  state.dragYaw    = state.targetYaw;
  state.dragPitch  = state.targetPitch;
}, { passive: true });

canvas.addEventListener("touchmove", (e) => {
  if (!state.dragging) return;
  const t  = e.touches[0];
  const dx = (t.clientX - state.dragStartX) / canvas.width;
  const dy = (t.clientY - state.dragStartY) / canvas.height;
  state.targetYaw   = state.dragYaw   - dx * 2.5;
  state.targetPitch = Math.max(-0.6, Math.min(0.6, state.dragPitch + dy * 1.5));
}, { passive: true });

canvas.addEventListener("touchend", () => { state.dragging = false; });

// Scroll to tilt pitch
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  state.targetPitch = Math.max(-0.6, Math.min(0.6, state.targetPitch + e.deltaY * 0.0008));
}, { passive: false });

// ── Controls ──────────────────────────────────────────────
citySelect.addEventListener("change",  (e) => { state.city = e.target.value; });
thickSelect.addEventListener("change", (e) => { state.thickness = e.target.value; });
timeSlider.addEventListener("input",   (e) => {
  state.hour = parseFloat(e.target.value);
  timeLabel.textContent = formatTime(state.hour);
});
autoCheck.addEventListener("change",   (e) => { state.autoPlay = e.target.checked; });
opacitySlider.addEventListener("input",(e) => { state.ringOpacity = parseFloat(e.target.value); });
tiltSlider.addEventListener("input",   (e) => {
  const v = parseInt(e.target.value);
  state.tiltOverride = v;
  tiltLabel.textContent = v < 0 ? "Auto" : `${v}°`;
});

document.querySelectorAll(".tog-btn[data-speed]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tog-btn[data-speed]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.autoSpeed = parseFloat(btn.dataset.speed);
  });
});

document.querySelectorAll(".tog-btn[data-season]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tog-btn[data-season]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.season = parseInt(btn.dataset.season);
  });
});

// Keyboard
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  if (e.key === "ArrowRight") { state.hour = (state.hour + 0.5) % 24; }
  if (e.key === "ArrowLeft")  { state.hour = (state.hour - 0.5 + 24) % 24; }
  if (e.key === "a" || e.key === "A") state.targetYaw -= 0.3;
  if (e.key === "d" || e.key === "D") state.targetYaw += 0.3;
  if (e.key === "w" || e.key === "W") state.targetPitch = Math.max(-0.6, state.targetPitch - 0.15);
  if (e.key === "s" || e.key === "S") state.targetPitch = Math.min(0.6,  state.targetPitch + 0.15);
  if (e.key === " ") { e.preventDefault(); state.autoPlay = !state.autoPlay; autoCheck.checked = state.autoPlay; }
  if (e.key === "f" || e.key === "F") standBtn.click();
  if (e.key === "r" || e.key === "R") { state.targetYaw = 0; state.targetPitch = 0; }
  timeSlider.value = state.hour;
  timeLabel.textContent = formatTime(state.hour);
});

standBtn.addEventListener("click", () => {
  state.immersive = !state.immersive;
  document.getElementById("controls").classList.toggle("hidden", state.immersive);
  canvas.classList.toggle("immersive", state.immersive);
  standBtn.textContent = state.immersive ? "✕ Exit" : "🌍 Stand Outside";
});

document.documentElement.style.setProperty("--muted", "#556699");
canvas.style.cursor = "grab";
timeLabel.textContent = formatTime(state.hour);
timeSlider.value      = state.hour;
loop();
