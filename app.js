const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d");

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

const state = {
  city: "London",
  hour: 12,
  thickness: "saturn",
  ringOpacity: 1,
  tiltOverride: -1,   // -1 = auto from latitude
  drift: 0,
  frame: 0,
  immersive: false,
  autoPlay: false,
  autoSpeed: 0.004,
  mouse: { x: 0, y: 0 },
  zoom: 1,
  targetZoom: 1,
};

// Ring info overlay
const ringInfo = document.createElement("div");
ringInfo.id = "ringInfo";
document.body.appendChild(ringInfo);

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
  if (hour < 5)  return "Night";
  if (hour < 7)  return "Dawn";
  if (hour < 9)  return "Sunrise";
  if (hour < 17) return "Day";
  if (hour < 19) return "Sunset";
  if (hour < 21) return "Dusk";
  return "Night";
}

function drawGround(w, h, hour) {
  const sun = getSunIntensity(hour);
  const night = 1 - sun;
  const r = Math.round(10 + sun * 20 + night * 5);
  const g = Math.round(18 + sun * 35 + night * 8);
  const b = Math.round(10 + sun * 15 + night * 5);
  const grad = ctx.createLinearGradient(0, h * 0.72, 0, h);
  grad.addColorStop(0, `rgb(${r},${g},${b})`);
  grad.addColorStop(1, `rgb(${Math.round(r*0.6)},${Math.round(g*0.6)},${Math.round(b*0.6)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  const blend = ctx.createLinearGradient(0, h * 0.68, 0, h * 0.76);
  blend.addColorStop(0, "rgba(0,0,0,0)");
  blend.addColorStop(1, `rgba(${r},${g},${b},1)`);
  ctx.fillStyle = blend;
  ctx.fillRect(0, h * 0.68, w, h * 0.08);
}

function loop() {
  const { hour, city, thickness, ringOpacity, tiltOverride, drift, frame } = state;
  const lat = tiltOverride >= 0 ? (90 - tiltOverride) : CITIES[city].lat;
  const w = canvas.width, h = canvas.height;

  // Smooth zoom
  state.zoom += (state.targetZoom - state.zoom) * 0.06;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(state.zoom, state.zoom);
  ctx.translate(-w / 2, -h / 2);

  drawSky(ctx, w, h, hour);
  drawStars(ctx, w, h, hour, frame);
  drawRings(ctx, w, h, hour, lat, thickness, drift, ringOpacity);
  drawClouds(ctx, w, h, hour);
  drawGround(w, h, hour);

  ctx.restore();

  // Ring info bar
  const phase = getPhaseLabel(hour);
  const tiltDeg = tiltOverride >= 0 ? tiltOverride : Math.round(90 - Math.abs(CITIES[city].lat));
  ringInfo.textContent = `${city}  ·  ${formatTime(hour)}  ·  ${phase}  ·  Ring angle ${tiltDeg}°`;

  state.drift += 0.000018;
  state.frame++;

  if (state.autoPlay) {
    state.hour = (state.hour + state.autoSpeed) % 24;
    timeSlider.value = state.hour;
    timeLabel.textContent = formatTime(state.hour);
  }

  requestAnimationFrame(loop);
}

// Controls
citySelect.addEventListener("change",  (e) => { state.city = e.target.value; });
thickSelect.addEventListener("change", (e) => { state.thickness = e.target.value; });
timeSlider.addEventListener("input",   (e) => {
  state.hour = parseFloat(e.target.value);
  timeLabel.textContent = formatTime(state.hour);
});
autoCheck.addEventListener("change", (e) => { state.autoPlay = e.target.checked; });

opacitySlider.addEventListener("input", (e) => {
  state.ringOpacity = parseFloat(e.target.value);
});

tiltSlider.addEventListener("input", (e) => {
  const v = parseInt(e.target.value);
  state.tiltOverride = v;
  tiltLabel.textContent = v < 0 ? "Auto" : `${v}°`;
});

// Speed buttons
document.querySelectorAll(".speed-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.autoSpeed = parseFloat(btn.dataset.speed);
  });
});

// Scroll to zoom
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  state.targetZoom = Math.min(2.5, Math.max(0.8, state.targetZoom - e.deltaY * 0.001));
}, { passive: false });

// Mouse move tooltip
canvas.addEventListener("mousemove", (e) => {
  state.mouse = { x: e.clientX, y: e.clientY };
  const h = state.hour;
  const phase = getPhaseLabel(h);
  tooltip.textContent = `${formatTime(h)} · ${phase}`;
  tooltip.style.left = `${e.clientX + 14}px`;
  tooltip.style.top  = `${e.clientY - 28}px`;
  tooltip.classList.add("visible");
});
canvas.addEventListener("mouseleave", () => tooltip.classList.remove("visible"));

// Click canvas to nudge time forward 1 hour
canvas.addEventListener("click", () => {
  state.hour = (state.hour + 1) % 24;
  timeSlider.value = state.hour;
  timeLabel.textContent = formatTime(state.hour);
});

// Keyboard shortcuts
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") { state.hour = (state.hour + 0.5) % 24; }
  if (e.key === "ArrowLeft")  { state.hour = (state.hour - 0.5 + 24) % 24; }
  if (e.key === " ")          { state.autoPlay = !state.autoPlay; autoCheck.checked = state.autoPlay; }
  if (e.key === "f" || e.key === "F") { standBtn.click(); }
  timeSlider.value = state.hour;
  timeLabel.textContent = formatTime(state.hour);
});

standBtn.addEventListener("click", () => {
  state.immersive = !state.immersive;
  document.getElementById("controls").classList.toggle("hidden", state.immersive);
  canvas.classList.toggle("immersive", state.immersive);
  standBtn.textContent = state.immersive ? "✕ Exit" : "🌍 Stand Outside";
  state.targetZoom = state.immersive ? 1.15 : 1;
});

timeLabel.textContent = formatTime(state.hour);
timeSlider.value = state.hour;
loop();
