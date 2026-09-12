export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function wrapDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export function formatMeters(m: number): string {
  return `${m.toFixed(1)} m`;
}

export function formatGmt(d = new Date()): string {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} GMT`;
}

export function responderColor(index: number, source: string): string {
  if (source === "sim") return "#c084fc";
  return index % 2 === 0 ? "#4ea6ff" : "#5ee9a0";
}

export function storageKey(): string {
  const existing = localStorage.getItem("nogps-id");
  if (existing) return existing;
  const next = uid("unit");
  localStorage.setItem("nogps-id", next);
  return next;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function unitName(): string {
  const existing = localStorage.getItem("nogps-name");
  if (existing) return existing;
  const n = `spot${1 + Math.floor(Math.random() * 4)}`;
  localStorage.setItem("nogps-name", n);
  return n;
}
