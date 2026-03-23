const SKY_STOPS = [
  { h: 0,  top: "#020818", bot: "#0a1628" },
  { h: 4,  top: "#0d0520", bot: "#1a0a35" },
  { h: 5,  top: "#1a0a2e", bot: "#3d1c5e" },
  { h: 6,  top: "#c0392b", bot: "#e67e22" },
  { h: 7,  top: "#e67e22", bot: "#f39c12" },
  { h: 8,  top: "#5b8dd9", bot: "#ffd89b" },
  { h: 10, top: "#1a6bb5", bot: "#87ceeb" },
  { h: 12, top: "#0e5fa8", bot: "#6ab4e8" },
  { h: 16, top: "#1a6bb5", bot: "#87ceeb" },
  { h: 17, top: "#e67e22", bot: "#f1c40f" },
  { h: 18, top: "#c0392b", bot: "#e74c3c" },
  { h: 19, top: "#6c2d8b", bot: "#c0392b" },
  { h: 21, top: "#0d0520", bot: "#1a0a35" },
  { h: 24, top: "#020818", bot: "#0a1628" },
];

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
  const parse = (s) => {
    const v = parseInt(s.replace("#", ""), 16);
    return [v >> 16, (v >> 8) & 0xff, v & 0xff];
  };
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

function getSunIntensity(hour) {
  if (hour < 6 || hour > 20) return 0;
  if (hour < 8)  return (hour - 6) / 2;
  if (hour > 18) return (20 - hour) / 2;
  return 1;
}

function getSunPosition(hour, w, h) {
  // Arc from left horizon (6am) to right horizon (18pm), peak at noon
  const t = (hour - 6) / 12; // 0 at 6am, 1 at 6pm
  const x = w * 0.1 + t * w * 0.8;
  const arc = Math.sin(t * Math.PI);
  const y = h * 0.75 - arc * h * 0.55;
  return { x, y };
}

function drawSky(ctx, w, h, hour) {
  const { top, bot } = getSkyColors(hour);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const sun = getSunIntensity(hour);
  if (sun <= 0) return;

  const { x, y } = getSunPosition(hour, w, h);
  const isGolden = (hour < 8.5) || (hour > 17);
  const sunColor = isGolden ? [255, 200, 80] : [255, 255, 200];

  // Sun glow
  const glowR = 80 + sun * 60;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  glow.addColorStop(0, `rgba(${sunColor},${0.35 * sun})`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Sun disc
  ctx.beginPath();
  ctx.arc(x, y, 18 * sun, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${sunColor},${0.95 * sun})`;
  ctx.fill();

  // Horizon atmospheric glow
  const horizonY = h * 0.72;
  const hg = ctx.createRadialGradient(x, horizonY, 0, x, horizonY, w * 0.55);
  const hCol = isGolden ? `rgba(255,140,30,${sun * 0.3})` : `rgba(100,180,255,${sun * 0.12})`;
  hg.addColorStop(0, hCol);
  hg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, h);
}
