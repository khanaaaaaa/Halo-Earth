// Stars with realistic magnitude distribution (power law)
const STARS = Array.from({ length: 420 }, () => {
  const mag = Math.pow(Math.random(), 2.5); // brighter stars rarer
  const n   = Math.random();
  return {
    x:       Math.random(),
    y:       Math.random() * 0.72,
    r:       0.15 + mag * 2.2,
    twinkle: Math.random() * Math.PI * 2,
    speed:   0.012 + Math.random() * 0.028,
    // Stellar classification colours
    color: n > 0.92 ? [155, 176, 255] :  // O/B blue
           n > 0.82 ? [170, 191, 255] :  // A blue-white
           n > 0.70 ? [255, 244, 234] :  // F white
           n > 0.55 ? [255, 229, 160] :  // G yellow (sun-like)
           n > 0.38 ? [255, 210, 120] :  // K orange
                      [255, 160, 100],   // M red dwarf
  };
});

// Milky Way — two overlapping bands for depth
const MILKY_WAY = Array.from({ length: 1200 }, () => ({
  x:     Math.random(),
  y:     Math.random(),
  r:     Math.random() * 0.85 + 0.08,
  alpha: Math.pow(Math.random(), 1.8) * 0.45 + 0.02,
  band:  Math.random() > 0.5 ? 0 : 1,
}));

function drawStars(ctx, w, h, hour, frame) {
  const night = 1 - getSunIntensity(hour);
  if (night <= 0.02) return;

  // Milky Way — diagonal arc
  if (night > 0.4) {
    const mwAlpha = Math.min(1, (night - 0.4) / 0.45);
    // Soft nebula glow first
    const mwGlow = ctx.createLinearGradient(w * 0.1, 0, w * 0.9, h * 0.65);
    mwGlow.addColorStop(0,   "rgba(0,0,0,0)");
    mwGlow.addColorStop(0.35,`rgba(50,55,100,${mwAlpha * 0.07})`);
    mwGlow.addColorStop(0.55,`rgba(70,65,120,${mwAlpha * 0.10})`);
    mwGlow.addColorStop(0.75,`rgba(50,55,100,${mwAlpha * 0.06})`);
    mwGlow.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.fillStyle = mwGlow;
    ctx.fillRect(0, 0, w, h * 0.72);

    MILKY_WAY.forEach((p) => {
      const offset = p.band === 0 ? 0.26 : 0.32;
      const bx = p.x * w;
      const by = (p.y * 0.48 + p.x * offset - 0.10) * h;
      if (by < 0 || by > h * 0.70) return;
      ctx.beginPath();
      ctx.arc(bx, by, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(165,175,215,${p.alpha * mwAlpha})`;
      ctx.fill();
    });
  }

  STARS.forEach((s) => {
    const flicker = 0.50 + 0.50 * Math.sin(s.twinkle + frame * s.speed);
    const alpha   = Math.min(0.98, night * flicker * 0.98);
    const [cr, cg, cb] = s.color;

    // Atmospheric dispersion — diffraction spikes for bright stars
    if (s.r > 1.2 && night > 0.55) {
      const sx = s.x * w, sy = s.y * h;
      const spikeLen = s.r * 5.5 * flicker;
      ctx.save();
      ctx.globalAlpha = alpha * 0.30;
      ctx.strokeStyle = `rgb(${cr},${cg},${cb})`;
      ctx.lineWidth = 0.5;
      // Horizontal spike
      ctx.beginPath(); ctx.moveTo(sx - spikeLen, sy); ctx.lineTo(sx + spikeLen, sy); ctx.stroke();
      // Vertical spike
      ctx.beginPath(); ctx.moveTo(sx, sy - spikeLen); ctx.lineTo(sx, sy + spikeLen); ctx.stroke();
      // Diagonal spikes (45°) for very bright stars
      if (s.r > 1.6) {
        const d = spikeLen * 0.55;
        ctx.globalAlpha = alpha * 0.15;
        ctx.beginPath(); ctx.moveTo(sx - d, sy - d); ctx.lineTo(sx + d, sy + d); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + d, sy - d); ctx.lineTo(sx - d, sy + d); ctx.stroke();
      }
      ctx.restore();
    }

    // Star disc with soft edge
    const sg = ctx.createRadialGradient(s.x*w, s.y*h, 0, s.x*w, s.y*h, s.r * 1.5);
    sg.addColorStop(0,   `rgba(${cr},${cg},${cb},${alpha})`);
    sg.addColorStop(0.5, `rgba(${cr},${cg},${cb},${alpha * 0.6})`);
    sg.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.r * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = sg;
    ctx.fill();
  });
}
