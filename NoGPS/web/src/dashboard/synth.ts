import type { Responder } from "../shared/types";

export function paintWarehouse(canvas: HTMLCanvasElement, unit: Responder, now: number): void {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const hue = unit.source === "sim" ? 258 : unit.color === "#5ee9a0" ? 150 : 210;
  ctx.fillStyle = `hsl(${hue} 18% 6%)`;
  ctx.fillRect(0, 0, w, h);

  const vanishingX = w * 0.5 + Math.sin(now / 1800 + unit.pose.x) * 18;
  const vanishingY = h * 0.38;
  ctx.strokeStyle = `hsla(${hue}, 30%, 70%, 0.14)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -6; i <= 6; i++) {
    ctx.moveTo(vanishingX, vanishingY);
    ctx.lineTo(w / 2 + i * (w / 5), h);
  }
  ctx.stroke();

  ctx.fillStyle = `hsla(${hue}, 10%, 10%, 0.9)`;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(vanishingX, vanishingY);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = `hsla(${hue}, 8%, 18%, 0.95)`;
  ctx.fillRect(0, 0, w, vanishingY);

  for (let i = 0; i < 5; i++) {
    const z = ((now / 40 + i * 80 + unit.pose.y * 8) % 400) / 400;
    const y = vanishingY + z * z * (h - vanishingY);
    const half = 20 + z * w * 0.42;
    ctx.strokeStyle = `hsla(${hue}, 70%, 70%, ${0.08 + z * 0.25})`;
    ctx.beginPath();
    ctx.moveTo(vanishingX - half, y);
    ctx.lineTo(vanishingX + half, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,220,140,0.08)";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(30 + i * (w / 4), 28, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let i = 0; i < 40; i++) {
    ctx.fillRect((i * 97 + now / 8) % w, (i * 53) % h, 1, 1);
  }
}
