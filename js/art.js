/* Generative, deliberately soft backgrounds: fractals and toon-ish patterns. */
'use strict';

const Art = (() => {
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function hsl2rgb(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360; s /= 100; l /= 100;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255));
  }

  // t=0 is the calm "paper" tone, t=1 the strongest accent. Low saturation keeps it quiet.
  function palette(dark) {
    const hue = rand(0, 360), spread = rand(60, 160) * (Math.random() < 0.5 ? -1 : 1);
    const sat = rand(28, 46);
    const lut = [];
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      const l = dark ? 13 + 34 * t : 93 - 36 * t;
      lut.push(hsl2rgb(hue + spread * t, sat + 10 * Math.sin(t * Math.PI), l));
    }
    const rgb = t => lut[Math.max(0, Math.min(255, Math.round(t * 255)))];
    const css = (t, a = 1) => { const [r, g, b] = rgb(t); return `rgba(${r},${g},${b},${a})`; };
    return { rgb, css, dark };
  }

  function background(ctx, w, h, pal) {
    const g = ctx.createRadialGradient(w * rand(0.3, 0.7), h * rand(0.3, 0.7), 0, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, pal.css(0.02));
    g.addColorStop(1, pal.css(0.2));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function pixels(ctx, w, h, scale, fn) {
    const W = Math.max(1, Math.round(w * scale)), H = Math.max(1, Math.round(h * scale));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data;
    for (let py = 0, j = 0; py < H; py++) {
      for (let px = 0; px < W; px++, j += 4) {
        const [r, g, b] = fn(px, py, W, H);
        d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c, 0, 0, w, h);
  }

  const JULIA = [[-0.8, 0.156], [-0.7269, 0.1889], [0.285, 0.01], [-0.4, 0.6], [-0.835, -0.2321], [0.355, 0.355], [-0.70176, -0.3842], [-0.162, 1.04]];
  const MANDEL = [[-0.743643887, 0.131825904, 0.012], [-0.7453, 0.1127, 0.01], [-1.25066, 0.02012, 0.012], [-0.16, 1.0405, 0.04], [-0.748, 0.1, 0.02], [-0.235125, 0.827215, 0.008], [-1.768778833, -0.001738996, 0.004], [0.3245, 0.04855, 0.01]];

  function escapeTime(julia) {
    return (ctx, w, h, pal) => {
      let cx, cy, span, cr = 0, ci = 0;
      if (julia) { [cr, ci] = pick(JULIA); cx = rand(-0.3, 0.3); cy = rand(-0.2, 0.2); span = rand(2.2, 3.4); }
      else { const p = pick(MANDEL); cx = p[0]; cy = p[1]; span = p[2] * rand(0.7, 1.4); }
      const maxI = julia ? 90 : 200, rot = rand(0, Math.PI * 2), cos = Math.cos(rot), sin = Math.sin(rot);
      const freq = rand(0.5, 0.9), phase = rand(0, Math.PI * 2);
      pixels(ctx, w, h, 0.38, (x, y, W, H) => {
        const k = span / Math.min(W, H), dx = (x - W / 2) * k, dy = (y - H / 2) * k;
        const px = cx + dx * cos - dy * sin, py = cy + dx * sin + dy * cos;
        let zr = julia ? px : 0, zi = julia ? py : 0;
        const ar = julia ? cr : px, ai = julia ? ci : py;
        let i = 0, zr2 = zr * zr, zi2 = zi * zi;
        while (i < maxI && zr2 + zi2 < 64) { zi = 2 * zr * zi + ai; zr = zr2 - zi2 + ar; zr2 = zr * zr; zi2 = zi * zi; i++; }
        if (i >= maxI) return pal.rgb(0.1);
        const mu = i + 1 - Math.log(Math.log(Math.sqrt(zr2 + zi2))) / Math.LN2;
        return pal.rgb(0.85 * (0.5 - 0.5 * Math.cos(Math.sqrt(Math.max(mu, 0)) * freq * 2 + phase)));
      });
    };
  }

  function plasma(ctx, w, h, pal) {
    const a = [rand(2, 6), rand(2, 6), rand(1, 3), rand(2, 5)], p = [rand(0, 6), rand(0, 6), rand(0, 6), rand(0, 6)];
    pixels(ctx, w, h, 0.25, (x, y, W, H) => {
      const u = x / Math.max(W, H), v = y / Math.max(W, H);
      const s = Math.sin(u * a[0] * 3 + Math.sin(v * a[1] * 3 + p[0]) * a[2] + p[1])
              + Math.sin(v * a[3] * 3 + Math.sin(u * a[0] * 2 + p[2]) * a[2]) + Math.sin((u + v) * a[1] * 2 + p[3]);
      return pal.rgb(0.08 + 0.7 * (0.5 + 0.5 * Math.sin(s * 1.3)));
    });
  }

  function fern(ctx, w, h, pal) {
    background(ctx, w, h, pal);
    const count = randi(1, 3);
    for (let f = 0; f < count; f++) {
      const scale = h * rand(0.06, 0.1), bx = w * rand(0.15, 0.85), rot = rand(-0.6, 0.6), mir = Math.random() < 0.5 ? -1 : 1;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const buckets = [[], [], [], []];
      let x = 0, y = 0;
      for (let i = 0; i < 45000; i++) {
        const r = Math.random(); let nx, ny;
        if (r < 0.01) { nx = 0; ny = 0.16 * y; }
        else if (r < 0.86) { nx = 0.85 * x + 0.04 * y; ny = -0.04 * x + 0.85 * y + 1.6; }
        else if (r < 0.93) { nx = 0.2 * x - 0.26 * y; ny = 0.23 * x + 0.22 * y + 1.6; }
        else { nx = -0.15 * x + 0.28 * y; ny = 0.26 * x + 0.24 * y + 0.44; }
        x = nx; y = ny;
        const lx = x * scale * mir, ly = -y * scale;
        buckets[Math.min(3, Math.floor(y / 2.6))].push(bx + lx * cos - ly * sin, h * 1.02 + lx * sin + ly * cos);
      }
      buckets.forEach((pts, b) => {
        ctx.fillStyle = pal.css(0.4 + b * 0.15, 0.55);
        for (let i = 0; i < pts.length; i += 2) ctx.fillRect(pts[i], pts[i + 1], 1.4, 1.4);
      });
    }
  }

  function tree(ctx, w, h, pal) {
    background(ctx, w, h, pal);
    const s = Math.min(w, h) / 500, spread = rand(0.3, 0.55), shrink = rand(0.68, 0.76), depth = randi(9, 11);
    ctx.lineCap = 'round';
    const branch = (x, y, len, ang, d) => {
      if (d === 0) {
        ctx.fillStyle = pal.css(rand(0.3, 0.75), 0.45);
        ctx.beginPath(); ctx.arc(x, y, rand(2, 7) * s, 0, Math.PI * 2); ctx.fill();
        return;
      }
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      ctx.strokeStyle = pal.css(0.9 - (depth - d) / depth * 0.35, 0.8);
      ctx.lineWidth = Math.max(1, d * 1.3 * s);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
      branch(x2, y2, len * shrink * rand(0.85, 1.1), ang - spread * rand(0.6, 1.3), d - 1);
      branch(x2, y2, len * shrink * rand(0.85, 1.1), ang + spread * rand(0.6, 1.3), d - 1);
    };
    branch(w * rand(0.35, 0.65), h * 1.02, h * 0.25, -Math.PI / 2 + rand(-0.1, 0.1), depth);
  }

  function chaos(ctx, w, h, pal) {
    background(ctx, w, h, pal);
    const n = pick([3, 4, 5, 6]), r = { 3: 0.5, 4: 0.5, 5: 0.382, 6: 0.333 }[n];
    const R = Math.min(w, h) * 0.47, cx = w / 2, cy = h / 2 + (n === 3 ? R * 0.12 : 0), rot = n === 3 ? -Math.PI / 2 : rand(0, Math.PI);
    const verts = Array.from({ length: n }, (_, i) => [cx + Math.cos(rot + i * 2 * Math.PI / n) * R, cy + Math.sin(rot + i * 2 * Math.PI / n) * R]);
    const buckets = verts.map(() => []);
    let x = cx, y = cy, prev = -1;
    for (let i = 0; i < 90000; i++) {
      const v = randi(0, n - 1);
      if (n === 4 && v === prev) continue;
      prev = v;
      x = verts[v][0] + (x - verts[v][0]) * r; y = verts[v][1] + (y - verts[v][1]) * r;
      if (i > 20) buckets[v].push(x, y);
    }
    buckets.forEach((pts, v) => {
      ctx.fillStyle = pal.css(0.35 + 0.5 * v / (n - 1), 0.4);
      for (let i = 0; i < pts.length; i += 2) ctx.fillRect(pts[i], pts[i + 1], 1.3, 1.3);
    });
  }

  function flow(ctx, w, h, pal) {
    background(ctx, w, h, pal);
    const s = Math.min(w, h) / 500, M = Math.max(w, h);
    const f = [rand(1, 3), rand(1, 3), rand(1, 3)].map(v => v / M * Math.PI * 2), p = [rand(0, 6), rand(0, 6), rand(0, 6)];
    const ang = (x, y) => (Math.sin(x * f[0] + p[0]) + Math.cos(y * f[1] + p[1]) + 0.5 * Math.sin((x + y) * f[2] + p[2])) * Math.PI * 0.8;
    const N = Math.round(w * h / 2200), step = 3 * s;
    ctx.lineWidth = rand(1, 2.4) * s; ctx.lineCap = 'round';
    for (let i = 0; i < N; i++) {
      let x = rand(0, w), y = rand(0, h);
      ctx.strokeStyle = pal.css(rand(0.3, 0.8), 0.35);
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 50; k++) { const a = ang(x, y); x += Math.cos(a) * step; y += Math.sin(a) * step; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }

  function bubbles(ctx, w, h, pal) {
    background(ctx, w, h, pal);
    const s = Math.min(w, h) / 500, circles = [];
    for (let t = 0; t < 1800 && circles.length < 140; t++) {
      const r = rand(8, 70 - t / 30) * s, x = rand(0, w), y = rand(0, h);
      if (r < 5 * s) continue;
      if (circles.some(c => Math.hypot(c.x - x, c.y - y) < c.r + r + 4 * s)) continue;
      circles.push({ x, y, r });
    }
    for (const c of circles) {
      ctx.fillStyle = pal.css(rand(0.25, 0.65), 0.5);
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = Math.max(1, c.r * 0.06); ctx.strokeStyle = pal.css(0.85, 0.3); ctx.stroke();
      ctx.fillStyle = pal.dark ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.45)';
      ctx.beginPath(); ctx.ellipse(c.x - c.r * 0.35, c.y - c.r * 0.4, c.r * 0.28, c.r * 0.16, -0.6, 0, Math.PI * 2); ctx.fill();
    }
  }

  function truchet(ctx, w, h, pal) {
    background(ctx, w, h, pal);
    const size = rand(40, 80) * Math.min(w, h) / 500;
    ctx.lineWidth = size * rand(0.12, 0.22); ctx.lineCap = 'round';
    const k = rand(0.5, 2) / size;
    for (let y = 0; y < h + size; y += size) {
      for (let x = 0; x < w + size; x += size) {
        ctx.strokeStyle = pal.css(0.4 + 0.3 * Math.sin(x * k) * Math.cos(y * k), 0.5);
        ctx.beginPath();
        if (Math.random() < 0.5) {
          ctx.arc(x, y, size / 2, 0, Math.PI / 2);
          ctx.moveTo(x + size / 2, y + size); ctx.arc(x + size, y + size, size / 2, Math.PI, Math.PI * 1.5);
        } else {
          ctx.arc(x + size, y, size / 2, Math.PI / 2, Math.PI);
          ctx.moveTo(x + size / 2, y + size); ctx.arc(x, y + size, size / 2, 0, -Math.PI / 2, true);
        }
        ctx.stroke();
      }
    }
  }

  function phyllotaxis(ctx, w, h, pal) {
    background(ctx, w, h, pal);
    const n = randi(500, 1100), cx = w * rand(0.3, 0.7), cy = h * rand(0.3, 0.7);
    const c = Math.max(w, h) * 0.6 / Math.sqrt(n), golden = 137.508 * Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const a = i * golden, r = c * Math.sqrt(i);
      ctx.fillStyle = pal.css(0.2 + 0.6 * i / n, 0.5);
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c * (0.3 + 0.25 * i / n), 0, Math.PI * 2); ctx.fill();
    }
  }

  function hills(ctx, w, h, pal) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, pal.css(0.12)); g.addColorStop(1, pal.css(0.02));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = pal.css(0.3, 0.6);
    ctx.beginPath(); ctx.arc(w * rand(0.2, 0.8), h * rand(0.15, 0.35), Math.min(w, h) * rand(0.06, 0.12), 0, Math.PI * 2); ctx.fill();
    const layers = randi(4, 6);
    for (let l = 0; l < layers; l++) {
      const base = h * (0.4 + 0.5 * l / layers), amp = h * rand(0.04, 0.1), fr = [rand(1, 3), rand(3, 7)].map(v => v * Math.PI * 2 / w), ph = rand(0, 6);
      ctx.fillStyle = pal.css(0.25 + 0.6 * l / layers, 0.85);
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 6) ctx.lineTo(x, base + Math.sin(x * fr[0] + ph) * amp + Math.sin(x * fr[1] + ph * 2) * amp * 0.3);
      ctx.lineTo(w, h); ctx.fill();
    }
  }

  const STYLES = {
    julia:      { name: 'Julia set',       fn: escapeTime(true) },
    mandelbrot: { name: 'Mandelbrot',      fn: escapeTime(false) },
    fern:       { name: 'Barnsley fern',   fn: fern },
    tree:       { name: 'Fractal tree',    fn: tree },
    chaos:      { name: 'Chaos game',      fn: chaos },
    flow:       { name: 'Flow field',      fn: flow },
    plasma:     { name: 'Plasma waves',    fn: plasma },
    bubbles:    { name: 'Bubbles',         fn: bubbles },
    truchet:    { name: 'Truchet tiles',   fn: truchet },
    phyllo:     { name: 'Sunflower',       fn: phyllotaxis },
    hills:      { name: 'Cartoon hills',   fn: hills },
  };

  function paint(canvas, { styles, strength = 0.55, dark = false, maxPixels = 1.4e6 } = {}) {
    const rect = canvas.getBoundingClientRect();
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const area = rect.width * rect.height * dpr * dpr;
    if (area > maxPixels) dpr *= Math.sqrt(maxPixels / area);
    const w = Math.max(2, Math.round(rect.width * dpr)), h = Math.max(2, Math.round(rect.height * dpr));
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const keys = (styles && styles.length ? styles : Object.keys(STYLES)).filter(k => STYLES[k]);
    const key = pick(keys.length ? keys : Object.keys(STYLES));
    const pal = palette(dark);
    ctx.save();
    STYLES[key].fn(ctx, w, h, pal);
    ctx.restore();
    // Veil: tones everything down toward the paper colour.
    ctx.fillStyle = pal.css(0, Math.max(0, 1 - strength) * 0.9);
    ctx.fillRect(0, 0, w, h);
    return STYLES[key].name;
  }

  return { STYLES, paint };
})();
