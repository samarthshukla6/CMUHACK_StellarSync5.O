import type { Beacon, Finding, PathSummary, Pose, Responder } from "../shared/types";

export type MapTheme = {
  path: string;
  you: string;
  grid: string;
  faint: string;
  ink: string;
};

export const darkTheme: MapTheme = {
  path: "#4ea6ff",
  you: "#6ce7ff",
  grid: "rgba(255,255,255,0.045)",
  faint: "rgba(255,255,255,0.22)",
  ink: "#9aa3b8",
};

export function worldBounds(points: Pose[], pad = 4): { minX: number; minY: number; maxX: number; maxY: number } {
  if (!points.length) return { minX: -8, minY: -8, maxX: 8, maxY: 8 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

export function project(
  x: number,
  y: number,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  w: number,
  h: number,
  northUp = true,
): { x: number; y: number } {
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 1);
  const sx = (x - (bounds.minX + bounds.maxX) / 2) / span;
  const sy = (y - (bounds.minY + bounds.maxY) / 2) / span;
  return {
    x: w / 2 + sx * (w - 28),
    y: northUp ? h / 2 - sy * (h - 28) : h / 2 + sy * (h - 28),
  };
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: MapTheme,
): void {
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  const step = 48;
  ctx.beginPath();
  for (let x = 0; x <= w; x += step) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
  }
  for (let y = 0; y <= h; y += step) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
  }
  ctx.stroke();
}

export function drawPath(
  ctx: CanvasRenderingContext2D,
  path: Pose[],
  bounds: ReturnType<typeof worldBounds>,
  w: number,
  h: number,
  color: string,
  northUp = true,
  dashed = false,
): void {
  if (path.length < 2) return;
  ctx.beginPath();
  path.forEach((p, i) => {
    const pt = project(p.x, p.y, bounds, w, h, northUp);
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash(dashed ? [3, 4] : []);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  r = 4,
  label?: string,
  glow = true,
): void {
  if (glow) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = r * 2.4;
  }
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (glow) ctx.restore();
  if (label) {
    ctx.fillStyle = "rgba(243,246,251,0.82)";
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.fillText(label, x + 8, y - 6);
  }
}

export function renderPlot(
  canvas: HTMLCanvasElement,
  responders: Responder[],
  beacons: Beacon[] = [],
  findings: Finding[] = [],
  opts: { northUp?: boolean; focus?: string; showGrid?: boolean; labels?: boolean } = {},
  paths: PathSummary[] = [],
): void {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return;
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#07090f";
  ctx.fillRect(0, 0, w, h);
  if (opts.showGrid !== false) drawGrid(ctx, w, h, darkTheme);

  const points = responders.flatMap((r) => r.path.concat(r.pose)).concat(paths.flatMap((p) => p.polyline.map((pt) => ({ ...pt, t: 0, z: 0, yaw: 0 }))));
  const bounds = worldBounds(points, 6);
  const northUp = opts.northUp !== false;

  ctx.setLineDash([2, 5]);
  for (const p of paths) {
    if (p.polyline.length < 2) continue;
    ctx.beginPath();
    p.polyline.forEach((pt, i) => {
      const proj = project(pt.x, pt.y, bounds, w, h, northUp);
      if (i === 0) ctx.moveTo(proj.x, proj.y);
      else ctx.lineTo(proj.x, proj.y);
    });
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.75;
    ctx.stroke();
    const end = project(p.polyline[p.polyline.length - 1].x, p.polyline[p.polyline.length - 1].y, bounds, w, h, northUp);
    ctx.globalAlpha = 1;
    if (opts.labels) {
      ctx.fillStyle = p.color;
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillText(p.label, end.x + 7, end.y + 3);
    }
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  const pulse = (Math.sin(performance.now() / 420) + 1) / 2;
  for (const r of responders) {
    if (opts.focus && r.id !== opts.focus) continue;
    drawPath(ctx, r.path, bounds, w, h, r.color, northUp, r.source === "sim");
    const p = project(r.pose.x, r.pose.y, bounds, w, h, northUp);
    if (r.source === "real") {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255,255,255,${0.16 + pulse * 0.14})`;
      ctx.lineWidth = 1.2;
      ctx.arc(p.x, p.y, 7 + pulse * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    const label = opts.labels ? (r.source === "sim" ? `${r.name} · sim` : r.name) : undefined;
    drawDot(ctx, p.x, p.y, r.color, 4.5, label);
    ctx.strokeStyle = r.color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.sin(r.pose.yaw) * 14, p.y - Math.cos(r.pose.yaw) * 14);
    ctx.stroke();
  }

  for (const b of beacons) {
    const p = project(b.x, b.y, bounds, w, h, northUp);
    drawDot(ctx, p.x, p.y, "#ffc14a", 3.5, opts.labels ? b.name : undefined);
  }

  for (const f of findings) {
    const p = project(f.x, f.y, bounds, w, h, northUp);
    const color = f.kind === "casualty" ? "#ff5b7a" : f.kind === "hazard" ? "#ffb020" : "#ff7a4d";
    drawDot(ctx, p.x, p.y, color, 4, opts.labels ? f.kind : undefined);
  }
}

export function renderMiniMap(
  canvas: HTMLCanvasElement,
  path: Pose[],
  you: Pose,
  start: Pose | null,
  scaleM: number,
): void {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(6,8,14,0.2)";
  ctx.fill();

  const bounds = worldBounds(path.concat(you, start ?? you), Math.max(scaleM * 0.6, 3));
  drawPath(ctx, path, bounds, w, h, "#4ea6ff", true);
  if (start) {
    const s = project(start.x, start.y, bounds, w, h, true);
    drawDot(ctx, s.x, s.y, "rgba(255,255,255,0.45)", 3.2);
  }
  const p = project(you.x, you.y, bounds, w, h, true);
  drawDot(ctx, p.x, p.y, "#6ce7ff", 4.2);
  ctx.fillStyle = "rgba(154,163,184,0.9)";
  ctx.font = "10px 'IBM Plex Mono', monospace";
  ctx.textAlign = "right";
  ctx.fillText(`${scaleM.toFixed(1)} m`, w - 16, h / 2 + 4);
}
