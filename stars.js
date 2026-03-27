const STARS = Array.from({ length: 160 }, () => {
  const mag = Math.pow(Math.random(), 2.5);
  const n   = Math.random();
  return {
    x:       Math.random(),
    y:       Math.random() * 0.70,
    r:       0.15 + mag * 1.8,
    twinkle: Math.random() * Math.PI * 2,
    speed:   0.012 + Math.random() * 0.025,
    color: n > 0.90 ? [155,176,255] :
           n > 0.78 ? [255,244,234] :
           n > 0.55 ? [255,229,160] :
                      [255,255,255],
  };
});

const MILKY_WAY = Array.from({ length: 280 }, () => ({
  x:    Math.random(),
  y:    Math.random(),
  r:    Math.random() * 0.7 + 0.1,
  a:    Math.pow(Math.random(), 1.8) * 0.35 + 0.02,
  band: Math.random() > 0.5 ? 0.26 : 0.32,
}));

function drawStars(ctx, w, h, hour, frame) {
  const night = 1 - getSunIntensity(hour);
  if (night <= 0.02) return;

  // Milky Way band
  if (night > 0.45) {
    const mwA = Math.min(1, (night - 0.45) / 0.4);
    // Single soft glow pass
    const mwg = ctx.createLinearGradient(w * 0.1, 0, w * 0.9, h * 0.6);
    mwg.addColorStop(0,   "rgba(0,0,0,0)");
    mwg.addColorStop(0.4, `rgba(55,60,110,${mwA * 0.08})`);
    mwg.addColorStop(0.6, `rgba(70,65,120,${mwA * 0.10})`);
    mwg.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.fillStyle = mwg;
    ctx.fillRect(0, 0, w, h * 0.70);

    MILKY_WAY.forEach((p) => {
      const bx = p.x * w;
      const by = (p.y * 0.45 + p.x * p.band - 0.08) * h;
      if (by < 0 || by > h * 0.68) return;
      ctx.beginPath();
      ctx.arc(bx, by, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(165,175,215,${p.a * mwA})`;
      ctx.fill();
    });
  }

  // Stars — simple filled circles, no radialGradient per star
  STARS.forEach((s) => {
    const flicker = 0.55 + 0.45 * Math.sin(s.twinkle + frame * s.speed);
    const alpha   = Math.min(0.95, night * flicker * 0.95);
    const [cr,cg,cb] = s.color;

    // Diffraction spike only for brightest stars
    if (s.r > 1.4 && night > 0.6) {
      const sx = s.x * w, sy = s.y * h;
      const len = s.r * 4 * flicker;
      ctx.save();
      ctx.globalAlpha = alpha * 0.25;
      ctx.strokeStyle = `rgb(${cr},${cg},${cb})`;
      ctx.lineWidth   = 0.5;
      ctx.beginPath(); ctx.moveTo(sx - len, sy); ctx.lineTo(sx + len, sy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, sy - len); ctx.lineTo(sx, sy + len); ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
    ctx.fill();
  });
}
