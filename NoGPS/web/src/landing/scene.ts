// Purely decorative, presentation-only animation for the landing hero — a
// stylized corridor floor-plan with a walking marker, a route trail, and a
// pulsing "recognized" waypoint. No WebSocket, no app state: this never
// touches shared/ws.ts and has zero bearing on real tracking/recognition.

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ROOMS: Room[] = [
  { x: 0.06, y: 0.1, w: 0.22, h: 0.28 },
  { x: 0.06, y: 0.44, w: 0.22, h: 0.28 },
  { x: 0.06, y: 0.78, w: 0.22, h: 0.16 },
  { x: 0.72, y: 0.1, w: 0.22, h: 0.24 },
  { x: 0.72, y: 0.62, w: 0.22, h: 0.32 },
];

// Corridor spine the marker walks, in normalized 0..1 space.
const SPINE = [
  { x: 0.18, y: 0.86 },
  { x: 0.18, y: 0.24 },
  { x: 0.5, y: 0.24 },
  { x: 0.5, y: 0.72 },
  { x: 0.82, y: 0.72 },
  { x: 0.82, y: 0.22 },
];

const RECOGNIZED_AT = 0.62; // fraction along the spine where the "match" pulses

function pathLength(pts: { x: number; y: number }[]): number[] {
  const lens: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return lens;
}

function sampleAt(pts: { x: number; y: number }[], lens: number[], t: number): { x: number; y: number } {
  const total = lens[lens.length - 1];
  const at = t * total;
  let seg = 0;
  while (seg < lens.length - 2 && at > lens[seg + 1]) seg++;
  const segLen = lens[seg + 1] - lens[seg] || 1;
  const local = (at - lens[seg]) / segLen;
  return {
    x: pts[seg].x + (pts[seg + 1].x - pts[seg].x) * local,
    y: pts[seg].y + (pts[seg + 1].y - pts[seg].y) * local,
  };
}

export function mountLandingScene(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  let raf = 0;
  let start = performance.now();
  const CYCLE_MS = 9000;

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const draw = (now: number): void => {
    raf = requestAnimationFrame(draw);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const t = ((now - start) % CYCLE_MS) / CYCLE_MS;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#080a12";
    ctx.fillRect(0, 0, w, h);

    // faint grid
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const step = 28;
    for (let x = 0; x <= w; x += step) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = 0; y <= h; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();

    // rooms
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    ctx.strokeStyle = "rgba(120,170,255,0.16)";
    ctx.lineWidth = 1;
    for (const r of ROOMS) {
      const rx = r.x * w, ry = r.y * h, rw = r.w * w, rh = r.h * h;
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, 6);
      ctx.fill();
      ctx.stroke();
    }

    // corridor spine (faint base line)
    const pts = SPINE.map((p) => ({ x: p.x * w, y: p.y * h }));
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 10;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    // traveled route (glowing blue), up to current t
    ctx.strokeStyle = "#5aa7ff";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#5aa7ff";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const tt = (i / steps) * t;
      const p = sampleAt(pts, pathLength(pts), tt);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // recognized waypoint pulse
    const recognizedPt = sampleAt(pts, pathLength(pts), RECOGNIZED_AT);
    if (t > RECOGNIZED_AT - 0.02) {
      const pulse = (now / 700) % 1;
      ctx.beginPath();
      ctx.arc(recognizedPt.x, recognizedPt.y, 6 + pulse * 16, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(94,233,160,${0.5 - pulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(recognizedPt.x, recognizedPt.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#5ee9a0";
      ctx.shadowColor = "#5ee9a0";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // walking marker
    const head = sampleAt(pts, pathLength(pts), t);
    ctx.beginPath();
    ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(108,231,255,0.18)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(head.x, head.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#6ce7ff";
    ctx.shadowColor = "#6ce7ff";
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  raf = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}
