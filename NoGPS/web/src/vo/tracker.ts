import type { Pose } from "../shared/types";
import { degToRad } from "../shared/util";

export interface VoSample {
  pose: Pose;
  kf: boolean;
  mode: "step" | "turn" | "aim" | "idle" | "loop";
  loopClosed: boolean;
}

export class VisualOdometry {
  private pose: Pose = { t: 0, x: 0, y: 0, z: 0, yaw: 0 };
  private lastKf = { x: 0, y: 0, yaw: 0 };
  private traveled = 0;
  private farthest = 0;
  scale = 0.62;
  yaw = 0;
  calibrated = false;

  reset(): void {
    this.pose = { t: performance.now(), x: 0, y: 0, z: 0, yaw: degToRad(this.yaw) };
    this.lastKf = { x: 0, y: 0, yaw: this.yaw };
    this.traveled = 0;
    this.farthest = 0;
  }

  setYaw(deg: number): void {
    this.yaw = deg;
    this.pose.yaw = degToRad(deg);
  }

  calibrate(meters: number): void {
    if (this.traveled <= 0.001) return;
    this.scale *= meters / this.traveled;
    this.calibrated = true;
  }

  advance(opts: {
    step: boolean;
    holdWalk: boolean;
    turning: boolean;
    aiming: boolean;
    now?: number;
  }): VoSample {
    const now = opts.now ?? performance.now();
    const yawRad = degToRad(this.yaw);
    this.pose.t = now;
    this.pose.yaw = yawRad;

    if (opts.aiming) {
      return { pose: { ...this.pose }, kf: false, mode: "aim", loopClosed: false };
    }
    if (opts.turning && !opts.holdWalk) {
      return { pose: { ...this.pose }, kf: false, mode: "turn", loopClosed: false };
    }

    let dist = 0;
    if (opts.step) dist = this.scale;
    else if (opts.holdWalk) dist = this.scale * 0.04;

    if (dist <= 0) {
      return { pose: { ...this.pose }, kf: false, mode: "idle", loopClosed: false };
    }

    this.pose.x += Math.sin(yawRad) * dist;
    this.pose.y += Math.cos(yawRad) * dist;
    this.traveled += dist;
    const home = Math.hypot(this.pose.x, this.pose.y);
    this.farthest = Math.max(this.farthest, home);

    let loopClosed = false;
    if (this.traveled > 12 && this.farthest > 3.5 && home < 1.25) {
      this.pose.x = 0;
      this.pose.y = 0;
      loopClosed = true;
    }

    const moved = Math.hypot(this.pose.x - this.lastKf.x, this.pose.y - this.lastKf.y);
    const kf = moved > 0.7;
    if (kf) this.lastKf = { x: this.pose.x, y: this.pose.y, yaw: this.yaw };
    return { pose: { ...this.pose }, kf, mode: loopClosed ? "loop" : "step", loopClosed };
  }

  getPose(): Pose {
    return { ...this.pose };
  }
}
