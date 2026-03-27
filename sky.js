// Physically-based sky colors using Rayleigh scattering approximation
const SKY_STOPS = [
  { h: 0,    top: "#010610", bot: "#04091e" },
  { h: 3.5,  top: "#020818", bot: "#080d28" },
  { h: 5.0,  top: "#0d0520", bot: "#2a0e40" },
  { h: 5.5,  top: "#3a0c18", bot: "#7a2010" },
  { h: 6.0,  top: "#8b1a08", bot: "#c84010" },
  { h: 6.5,  top: "#c83010", bot: "#e86020" },
  { h: 7.0,  top: "#d05018", bot: "#f09030" },
  { h: 7.8,  top: "#a06828", bot: "#f0b848" },
  { h: 8.5,  top: "#3a70b8", bot: "#d8c080" },
  { h: 9.5,  top: "#1858a8", bot: "#90c8e8" },
  { h: 11,   top: "#0e4e98", bot: "#60b0e0" },
  { h: 13,   top: "#0a4890", bot: "#50a8d8" },
  { h: 15,   top: "#0e4e98", bot: "#60b0e0" },
  { h: 16.5, top: "#1858a8", bot: "#90c8e8" },
  { h: 17.2, top: "#a05820", bot: "#e89030" },
  { h: 17.8, top: "#c03010", bot: "#e05020" },
  { h: 18.3, top: "#8a1808", bot: "#c03018" },
  { h: 19.0, top: "#3a0818", bot: "#780818" },
  { h: 20.0, top: "#150420", bot: "#2a0810" },
  { h: 21.5, top: "#050310", bot: "#0a0618" },
  { h: 24,   top: "#010610", bot: "#04091e" },
];

const shootingStars = [];
let ssTimer = 0;

function getSkyColors(hour) {
  let a = SKY_STOPS[0], b = SKY_STOPS[1];
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    if (hour >= SKY_STOPS[i].h && hour < SKY_STOPS[i + 1].h) {
      a = SKY_STOPS[i]; b = SKY_STOPS[i + 1]; break;
    }
  }
  const t = (hour - a.h) / (b.h - a.h);
  return { top: lerpColor(a.top, b.top, t), bot: lerpColor(a.bot, b.bot, t) };
}

function lerpColor(c1, c2, t) {
  const p = (s) => { const v = parseInt(s.replace("#",""), 16); return [v>>16, (v>>8)&255, v&255]; };
  const [r1,g1,b1] = p(c1), [r2,g2,b2] = p(c2);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

function getSunIntensity(hour) {
  if (hour < 5.8 || hour > 20.2) return 0;
  if (hour < 7.5)  return Math.pow((hour - 5.8) / 1.7, 1.4);
  if (hour > 18.5) return Math.pow((20.2 - hour) / 1.7, 1.4);
  return 1;
}

function getSunPosition(hour, w, h) {
  const t = Math.max(0, Math.min(1, (hour - 5.8) / 14.4));
  const arc = Math.sin(t * Math.PI);
  return {
    x: w * 0.05 + t * w * 0.90,
    y: h * 0.80 - arc * h * 0.62,
  };
}

function drawMoon(ctx, w, h, hour) {
  const night = 1 - getSunIntensity(hour);
  if (night < 0.05) return;
  // Moon rises ~12h offset from sun
  const t = Math.max(0, Math.min(1, ((hour + 12) % 24 - 5.8) / 14.4));
  if (t <= 0.01 || t >= 0.99) return;
  const mx = w * 0.05 + t * w * 0.90;
  const my = h * 0.80 - Math.sin(t * Math.PI) * h * 0.55;

  // Atmospheric halo around moon
  const halo = ctx.createRadialGradient(mx, my, 14, mx, my, 80);
  halo.addColorStop(0,   `rgba(200,215,255,${night * 0.15})`);
  halo.addColorStop(0.3, `rgba(180,200,255,${night * 0.07})`);
  halo.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  // Moon surface gradient
  const moonG = ctx.createRadialGradient(mx - 4, my - 4, 0, mx, my, 16);
  moonG.addColorStop(0,   `rgba(248,250,255,${night})`);
  moonG.addColorStop(0.5, `rgba(225,235,255,${night * 0.97})`);
  moonG.addColorStop(1,   `rgba(190,210,250,${night * 0.85})`);
  ctx.beginPath();
  ctx.arc(mx, my, 16, 0, Math.PI * 2);
  ctx.fillStyle = moonG;
  ctx.fill();

  // Crescent — clip a dark circle offset
  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, 16, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(mx + 8, my - 1, 14, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(4, 8, 22, ${night * 0.94})`;
  ctx.fill();
  ctx.restore();
}

function drawShootingStars(ctx, w, h, hour) {
  const night = 1 - getSunIntensity(hour);
  if (night < 0.6) return;
  ssTimer++;
  if (ssTimer > 220 + Math.random() * 500) {
    shootingStars.push({
      x: Math.random() * w * 0.75 + w * 0.1,
      y: Math.random() * h * 0.38,
      vx: 6 + Math.random() * 8,
      vy: 3 + Math.random() * 5,
      life: 1.0,
      width: 0.8 + Math.random() * 1.2,
    });
    ssTimer = 0;
  }
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s = shootingStars[i];
    s.x += s.vx; s.y += s.vy; s.life -= 0.028;
    if (s.life <= 0) { shootingStars.splice(i, 1); continue; }
    const tailLen = 12;
    const g = ctx.createLinearGradient(
      s.x - s.vx * tailLen, s.y - s.vy * tailLen, s.x, s.y
    );
    g.addColorStop(0,   "rgba(255,255,255,0)");
    g.addColorStop(0.5, `rgba(210,225,255,${s.life * night * 0.5})`);
    g.addColorStop(1,   `rgba(255,255,255,${s.life * night * 0.95})`);
    ctx.beginPath();
    ctx.moveTo(s.x - s.vx * tailLen, s.y - s.vy * tailLen);
    ctx.lineTo(s.x, s.y);
    ctx.strokeStyle = g;
    ctx.lineWidth = s.width * s.life;
    ctx.stroke();
    // Bright head
    const hg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 3);
    hg.addColorStop(0, `rgba(255,255,255,${s.life * night})`);
    hg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
  }
}

function drawSky(ctx, w, h, hour, frame) {
  // Multi-stop vertical gradient for realistic atmospheric depth
  const { top, bot } = getSkyColors(hour);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0,    top);
  grad.addColorStop(0.45, bot);
  grad.addColorStop(0.75, bot);
  grad.addColorStop(1,    bot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Rayleigh scattering — blue tint at zenith fades to horizon
  const rayleigh = ctx.createLinearGradient(0, 0, 0, h * 0.7);
  const sun = getSunIntensity(hour);
  rayleigh.addColorStop(0, `rgba(10,30,80,${sun * 0.18})`);
  rayleigh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rayleigh;
  ctx.fillRect(0, 0, w, h * 0.7);

  drawMoon(ctx, w, h, hour);
  drawShootingStars(ctx, w, h, hour);

  if (sun <= 0) return;

  const { x, y } = getSunPosition(hour, w, h);
  const isGolden = hour < 9.0 || hour > 16.8;
  const isSunrise = hour < 8.5;
  const isSunset  = hour > 17.0;

  // Wide atmospheric scatter — Mie scattering near horizon
  const mie = ctx.createRadialGradient(x, h * 0.78, 0, x, h * 0.78, w * 0.75);
  if (isGolden) {
    mie.addColorStop(0,   `rgba(255,130,20,${sun * 0.28})`);
    mie.addColorStop(0.3, `rgba(255,80,10,${sun * 0.14})`);
    mie.addColorStop(0.7, `rgba(180,40,10,${sun * 0.06})`);
    mie.addColorStop(1,   "rgba(0,0,0,0)");
  } else {
    mie.addColorStop(0,   `rgba(180,210,255,${sun * 0.12})`);
    mie.addColorStop(0.5, `rgba(100,160,255,${sun * 0.05})`);
    mie.addColorStop(1,   "rgba(0,0,0,0)");
  }
  ctx.fillStyle = mie;
  ctx.fillRect(0, 0, w, h);

  // Sun corona — 4 layered radial glows
  const coronaRadii  = [280, 160, 80, 36];
  const coronaAlphas = [0.04, 0.09, 0.20, 0.55];
  coronaRadii.forEach((r, i) => {
    const cg = ctx.createRadialGradient(x, y, 0, x, y, r * sun);
    const col = isGolden ? `255,${180 - i*20},${40 - i*8}` : `255,255,${200 - i*15}`;
    cg.addColorStop(0, `rgba(${col},${coronaAlphas[i] * sun})`);
    cg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, w, h);
  });

  // Crepuscular rays (god rays) at sunrise/sunset
  if (isGolden && sun > 0.15) {
    const rayCount = 14;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + (frame || 0) * 0.00015;
      const len   = (60 + 35 * Math.sin(i * 1.7 + 2)) * sun;
      const rg = ctx.createLinearGradient(
        x + Math.cos(angle) * 24 * sun, y + Math.sin(angle) * 24 * sun,
        x + Math.cos(angle) * (24 + len) * sun, y + Math.sin(angle) * (24 + len) * sun
      );
      rg.addColorStop(0, `rgba(255,180,60,${0.10 * sun})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * 24 * sun, y + Math.sin(angle) * 24 * sun);
      ctx.lineTo(x + Math.cos(angle) * (24 + len) * sun, y + Math.sin(angle) * (24 + len) * sun);
      ctx.strokeStyle = rg;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Sun disc — limb darkening (brighter center, darker edge)
  const sunR = 22 * Math.min(1, sun + 0.1);
  const disc = ctx.createRadialGradient(x - 3*sun, y - 3*sun, 0, x, y, sunR);
  if (isGolden) {
    disc.addColorStop(0,    "rgba(255,255,220,1)");
    disc.addColorStop(0.4,  "rgba(255,230,120,1)");
    disc.addColorStop(0.75, "rgba(255,170,40,0.95)");
    disc.addColorStop(1,    "rgba(255,100,10,0.80)");
  } else {
    disc.addColorStop(0,    "rgba(255,255,240,1)");
    disc.addColorStop(0.4,  "rgba(255,255,200,1)");
    disc.addColorStop(0.75, "rgba(255,240,150,0.95)");
    disc.addColorStop(1,    "rgba(255,210,80,0.80)");
  }
  ctx.beginPath();
  ctx.arc(x, y, sunR, 0, Math.PI * 2);
  ctx.fillStyle = disc;
  ctx.fill();

  // Horizon colour band — warm at golden hour, cool blue at midday
  const hBand = ctx.createLinearGradient(0, h * 0.50, 0, h * 0.80);
  if (isGolden) {
    hBand.addColorStop(0, "rgba(0,0,0,0)");
    hBand.addColorStop(0.5, `rgba(200,70,10,${sun * 0.22})`);
    hBand.addColorStop(1,   `rgba(120,30,5,${sun * 0.30})`);
  } else {
    hBand.addColorStop(0, "rgba(0,0,0,0)");
    hBand.addColorStop(1, `rgba(20,80,180,${sun * 0.10})`);
  }
  ctx.fillStyle = hBand;
  ctx.fillRect(0, h * 0.50, w, h * 0.30);
}
