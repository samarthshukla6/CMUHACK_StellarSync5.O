import type { Pose } from "../shared/types";

export function hallwayReplay(t: number): Pose {
  const cycle = (t / 1000) % 42;
  let x = 0;
  let y = 0;
  let yaw = 0;
  if (cycle < 14) {
    y = cycle * 0.85;
    yaw = 0;
  } else if (cycle < 18) {
    y = 14 * 0.85;
    x = (cycle - 14) * 0.7;
    yaw = Math.PI / 2;
  } else if (cycle < 32) {
    y = 14 * 0.85 - (cycle - 18) * 0.75;
    x = 4 * 0.7;
    yaw = Math.PI;
  } else {
    y = 14 * 0.85 - 14 * 0.75;
    x = 4 * 0.7 - (cycle - 32) * 0.7;
    yaw = -Math.PI / 2;
  }
  return { t, x, y, z: 0, yaw };
}

export function warehouseA(t: number): Pose {
  const u = (t / 1000) * 0.55;
  const x = 0;
  const y = (u % 28);
  return { t, x, y, z: 0, yaw: 0 };
}

export function warehouseB(t: number): Pose {
  const u = (t / 1000) * 0.42;
  const phase = u % 36;
  if (phase < 16) return { t, x: 8, y: phase, z: 0, yaw: 0 };
  if (phase < 20) return { t, x: 8 + (phase - 16), y: 16, z: 0, yaw: Math.PI / 2 };
  if (phase < 32) return { t, x: 12, y: 16 - (phase - 20), z: 0, yaw: Math.PI };
  return { t, x: 12 - (phase - 32), y: 4, z: 0, yaw: -Math.PI / 2 };
}

export function buildPath(gen: (t: number) => Pose, start: number, step: number, n: number): Pose[] {
  const path: Pose[] = [];
  for (let i = 0; i < n; i++) path.push(gen(start + i * step));
  return path;
}
