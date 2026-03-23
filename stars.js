const STARS = Array.from({ length: 280 }, () => ({
  x: Math.random(),
  y: Math.random() * 0.65,
  r: Math.random() * 1.6 + 0.2,
  twinkle: Math.random() * Math.PI * 2,
  color: Math.random() > 0.85
    ? `rgba(180,200,255,`   // blue-white
    : Math.random() > 0.7
      ? `rgba(255,220,180,` // warm
      : `rgba(255,255,255,`,// white
}));

function drawStars(ctx, w, h, hour, frame) {
  const night = 1 - getSunIntensity(hour);
  if (night <= 0) return;
  STARS.forEach((s) => {
    const flicker = 0.65 + 0.35 * Math.sin(s.twinkle + frame * 0.025);
    const alpha = night * flicker * 0.92;
    // Subtle cross-sparkle for brighter stars
    if (s.r > 1.2 && night > 0.6) {
      ctx.strokeStyle = `${s.color}${alpha * 0.4})`;
      ctx.lineWidth = 0.5;
      const cx = s.x * w, cy = s.y * h, len = s.r * 3;
      ctx.beginPath(); ctx.moveTo(cx - len, cy); ctx.lineTo(cx + len, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - len); ctx.lineTo(cx, cy + len); ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `${s.color}${alpha})`;
    ctx.fill();
  });
}
