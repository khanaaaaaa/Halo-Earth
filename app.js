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
const tooltip       = document.getElementById("tooltip");
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
  zoom:         1,
  targetZoom:   1,
};

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

function drawGround(w, h, hour, season) {
  const sun   = getSunIntensity(hour);
  const night = 1 - sun;

  // Season affects ground colour
  const seasonGround = [
    [18, 42, 18],  // spring — green
    [22, 48, 15],  // summer — lush
    [45, 32, 12],  // autumn — brown
    [28, 32, 38],  // winter — grey-blue
  ][season];

  const [sr, sg, sb] = seasonGround;
  const r = Math.round(sr * sun * 1.2 + 8  * night);
  const g = Math.round(sg * sun * 1.2 + 12 * night);
  const b = Math.round(sb * sun * 1.2 + 10 * night);

  const grad = ctx.createLinearGradient(0, h * 0.73, 0, h);
  grad.addColorStop(0, `rgb(${r},${g},${b})`);
  grad.addColorStop(1, `rgb(${Math.round(r*0.55)},${Math.round(g*0.55)},${Math.round(b*0.55)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.73, w, h * 0.27);

  // Sky-ground blend strip
  const blend = ctx.createLinearGradient(0, h * 0.69, 0, h * 0.76);
  blend.addColorStop(0, "rgba(0,0,0,0)");
  blend.addColorStop(1, `rgba(${r},${g},${b},1)`);
  ctx.fillStyle = blend;
  ctx.fillRect(0, h * 0.69, w, h * 0.07);
}

function loop() {
  const { hour, city, thickness, ringOpacity, tiltOverride, season, drift, frame } = state;
  const lat = tiltOverride >= 0 ? (90 - tiltOverride) : CITIES[city].lat;
  const w   = canvas.width;
  const h   = canvas.height;

  // Smooth zoom
  state.zoom += (state.targetZoom - state.zoom) * 0.055;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(state.zoom, state.zoom);
  ctx.translate(-w / 2, -h / 2);

  drawSky(ctx, w, h, hour, frame);
  drawStars(ctx, w, h, hour, frame);
  drawAurora(ctx, w, h, hour, lat);
  drawRings(ctx, w, h, hour, lat, thickness, drift, ringOpacity, season);
  drawClouds(ctx, w, h, hour);
  drawGround(w, h, hour, season);

  ctx.restore();

  // Info bar
  const phase   = getPhaseLabel(hour);
  const tiltDeg = tiltOverride >= 0 ? tiltOverride : Math.round(90 - Math.abs(CITIES[city].lat));
  ringInfo.textContent = `${city}  ·  ${formatTime(hour)}  ·  ${phase}  ·  Ring angle ${tiltDeg}°`;

  state.drift += 0.000016;
  state.frame++;

  if (state.autoPlay) {
    state.hour = (state.hour + state.autoSpeed) % 24;
    timeSlider.value = state.hour;
    timeLabel.textContent = formatTime(state.hour);
  }

  requestAnimationFrame(loop);
}

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

// Speed toggle buttons
document.querySelectorAll(".tog-btn[data-speed]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tog-btn[data-speed]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.autoSpeed = parseFloat(btn.dataset.speed);
  });
});

// Season toggle buttons
document.querySelectorAll(".tog-btn[data-season]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tog-btn[data-season]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.season = parseInt(btn.dataset.season);
  });
});

// Scroll to zoom
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  state.targetZoom = Math.min(2.8, Math.max(0.75, state.targetZoom - e.deltaY * 0.001));
}, { passive: false });

// Tooltip
canvas.addEventListener("mousemove", (e) => {
  tooltip.textContent = `${formatTime(state.hour)} · ${getPhaseLabel(state.hour)}`;
  tooltip.style.left  = `${e.clientX + 14}px`;
  tooltip.style.top   = `${e.clientY - 28}px`;
  tooltip.classList.add("visible");
});
canvas.addEventListener("mouseleave", () => tooltip.classList.remove("visible"));

// Click to advance 1 hour
canvas.addEventListener("click", () => {
  state.hour = (state.hour + 1) % 24;
  timeSlider.value = state.hour;
  timeLabel.textContent = formatTime(state.hour);
});

// Keyboard shortcuts
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  if (e.key === "ArrowRight") state.hour = (state.hour + 0.5) % 24;
  if (e.key === "ArrowLeft")  state.hour = (state.hour - 0.5 + 24) % 24;
  if (e.key === " ")          { e.preventDefault(); state.autoPlay = !state.autoPlay; autoCheck.checked = state.autoPlay; }
  if (e.key === "f" || e.key === "F") standBtn.click();
  timeSlider.value = state.hour;
  timeLabel.textContent = formatTime(state.hour);
});

// Stand Outside / immersive
standBtn.addEventListener("click", () => {
  state.immersive = !state.immersive;
  document.getElementById("controls").classList.toggle("hidden", state.immersive);
  canvas.classList.toggle("immersive", state.immersive);
  standBtn.textContent = state.immersive ? "✕ Exit" : "🌍 Stand Outside";
  state.targetZoom = state.immersive ? 1.18 : 1;
});

// Fix CSS variable typo in style.css at runtime
document.documentElement.style.setProperty("--muted", "#556699");

timeLabel.textContent = formatTime(state.hour);
timeSlider.value      = state.hour;
loop();
