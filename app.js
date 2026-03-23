const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d");

const citySelect  = document.getElementById("city");
const timeSlider  = document.getElementById("time");
const timeLabel   = document.getElementById("timeLabel");
const thickSelect = document.getElementById("thickness");
const standBtn    = document.getElementById("standBtn");
const autoCheck   = document.getElementById("autoPlay");

const state = {
  city: "London",
  hour: 12,
  thickness: "saturn",
  drift: 0,
  frame: 0,
  immersive: false,
  autoPlay: false,
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

function drawGround(w, h, hour) {
  const sun = getSunIntensity(hour);
  const night = 1 - sun;
  const r = Math.round(10  + sun * 20  + night * 5);
  const g = Math.round(18  + sun * 35  + night * 8);
  const b = Math.round(10  + sun * 15  + night * 5);
  const grad = ctx.createLinearGradient(0, h * 0.72, 0, h);
  grad.addColorStop(0, `rgb(${r},${g},${b})`);
  grad.addColorStop(1, `rgb(${Math.round(r*0.6)},${Math.round(g*0.6)},${Math.round(b*0.6)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  // Ground-sky blend
  const blend = ctx.createLinearGradient(0, h * 0.68, 0, h * 0.76);
  blend.addColorStop(0, "rgba(0,0,0,0)");
  blend.addColorStop(1, `rgba(${r},${g},${b},1)`);
  ctx.fillStyle = blend;
  ctx.fillRect(0, h * 0.68, w, h * 0.08);
}

function loop() {
  const { hour, city, thickness, drift, frame } = state;
  const lat = CITIES[city].lat;
  const w = canvas.width, h = canvas.height;

  drawSky(ctx, w, h, hour);
  drawStars(ctx, w, h, hour, frame);
  drawRings(ctx, w, h, hour, lat, thickness, drift);
  drawClouds(ctx, w, h, hour);
  drawGround(w, h, hour);

  state.drift += 0.000018;
  state.frame++;

  if (state.autoPlay) {
    state.hour = (state.hour + 0.004) % 24;
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

standBtn.addEventListener("click", () => {
  state.immersive = !state.immersive;
  document.getElementById("controls").classList.toggle("hidden", state.immersive);
  canvas.classList.toggle("immersive", state.immersive);
  standBtn.textContent = state.immersive ? "✕ Exit" : "🌍 Stand Outside";
});

timeLabel.textContent = formatTime(state.hour);
timeSlider.value = state.hour;
loop();
