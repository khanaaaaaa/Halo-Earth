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
    body:  "Our star, 150 million km away. At this angle it illuminates Earth's ring system, casting dramatic shadows across the ring plane and scattering golden light through the ice particles.",
    icon:  "☀️",
  },
  moon: {
    title: "The Moon",
    body:  "Earth's natural satellite, 384,400 km away. The rings would cast a faint shadow across the lunar surface during certain alignments, creating a spectacular eclipse-like effect.",
    icon:  "🌙",
  },
  rings: {
    title: "Earth's Ring System",
    body:  "A hypothetical ring system similar to Saturn's. Composed of ice particles and rocky debris, it would span from 7,000 km to 80,000 km above Earth's surface. The Cassini Division — the dark gap — is caused by orbital resonance.",
    icon:  "🪐",
  },
  ringB: {
    title: "B Ring — Brightest Band",
    body:  "The densest and most opaque ring band. Composed of water ice particles ranging from centimetres to metres in size. This is the most visible part of the ring system from Earth's surface.",
    icon:  "💫",
  },
  ringCassini: {
    title: "Cassini Division",
    body:  "A 4,800 km wide gap between the B and A rings. Caused by a 2:1 orbital resonance with the Moon — particles here are repeatedly pulled out of orbit, clearing the gap over millions of years.",
    icon:  "🔭",
  },
  milkyway: {
    title: "The Milky Way",
    body:  "Our home galaxy, containing 200–400 billion stars. The glowing band across the sky is the galactic plane seen edge-on. Earth's rings would be visible against this backdrop on clear nights.",
    icon:  "🌌",
  },
  aurora: {
    title: "Aurora Borealis",
    body:  "Charged particles from the solar wind collide with atmospheric gases at the poles, creating curtains of green and teal light. Earth's rings would cast faint shadows through the aurora at high latitudes.",
    icon:  "🌠",
  },
  stars: {
    title: "Stars",
    body:  "Distant suns, light-years away. Their colours reveal their temperature: blue-white stars are the hottest (30,000K), yellow stars like our Sun are mid-range (5,800K), and red dwarfs are the coolest (3,000K).",
    icon:  "⭐",
  },
  sky_day: {
    title: "Daytime Sky",
    body:  "Blue light from the Sun scatters more than red light through the atmosphere (Rayleigh scattering), making the sky appear blue. Earth's rings would be visible as a bright arc even during the day.",
    icon:  "🌤️",
  },
  sky_dawn: {
    title: "Dawn Sky",
    body:  "As the Sun rises, light travels through more atmosphere, scattering away blue light and leaving warm reds and oranges. The rings would glow gold and amber at this angle, lit from below.",
    icon:  "🌅",
  },
  sky_dusk: {
    title: "Dusk Sky",
    body:  "The same scattering effect as dawn but in reverse. The rings would cast long shadows across the sky and glow with deep orange and crimson as the Sun dips below the horizon.",
    icon:  "🌇",
  },
  sky_night: {
    title: "Night Sky",
    body:  "Without the Sun's glare, the full ring system becomes visible — a ghostly silver arc stretching from horizon to horizon, faintly lit by moonlight and starlight.",
    icon:  "🌃",
  },
  ground: {
    title: "Earth's Surface",
    body:  "Standing on the ground, you would see the rings as a permanent feature of the sky — never setting, never rising, always at the same angle determined by your latitude. Near the equator they arch directly overhead.",
    icon:  "🌍",
  },
  clouds: {
    title: "Clouds",
    body:  "Water vapour condensed into droplets or ice crystals. Clouds would occasionally obscure the rings, and the rings would cast faint shadow bands across cloud tops — a phenomenon unique to a ringed Earth.",
    icon:  "☁️",
  },
  horizon: {
    title: "Horizon",
    body:  "The line where Earth's surface meets the sky, about 5 km away at eye level. The rings converge toward the horizon at both ends of their arc, vanishing into atmospheric haze.",
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

  // Smooth camera pan
  state.yaw   += (state.targetYaw   - state.yaw)   * 0.10;
  state.pitch += (state.targetPitch - state.pitch)  * 0.10;

  // Clear hit regions each frame
  state.hitRegions = [];

  // Apply camera pan as canvas transform
  ctx.save();
  ctx.translate(w / 2, h / 2);
  // Horizontal pan shifts the scene left/right
  ctx.translate(-state.yaw * w * 0.18, state.pitch * h * 0.12);
  ctx.translate(-w / 2, -h / 2);

  drawSky(ctx, w, h, hour, frame);
  drawStars(ctx, w, h, hour, frame);
  drawAurora(ctx, w, h, hour, lat);
  drawGround(w, h, hour, season);
  drawRings(ctx, w, h, hour, lat, thickness, drift, ringOpacity, season);
  drawClouds(ctx, w, h, hour);

  ctx.restore();

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
  const tiltDeg = tiltOverride >= 0 ? tiltOverride : Math.round(90 - Math.abs(CITIES[city].lat));
  ringInfo.textContent = `${city}  ·  ${formatTime(hour)}  ·  ${phase}  ·  Ring angle ${tiltDeg}°  ·  Drag to look around  ·  R to reset`;

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
