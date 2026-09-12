import { wrapDeg } from "../shared/util";

export class HeadingSource {
  heading = 0;
  rawHeading = 0;
  relative = true;
  available = false;
  live = false;
  turning = false;
  tilting = false;
  aiming = false;
  step = false;
  pitch = 70;
  roll = 0;
  bounce = 0;
  stepCount = 0;
  private base: number | null = null;
  private lastHeading = 0;
  private lastOrient = 0;
  private lastStepAt = 0;
  private prevHp = 0;
  private bound = false;

  async request(): Promise<boolean> {
    const doe = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    const dme = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    try {
      if (typeof doe.requestPermission === "function") await doe.requestPermission();
    } catch {
      /* bind anyway */
    }
    try {
      if (typeof dme.requestPermission === "function") await dme.requestPermission();
    } catch {
      /* orientation can still work */
    }
    this.bind();
    this.available = true;
    return true;
  }

  private bind(): void {
    if (this.bound) return;
    this.bound = true;
    window.addEventListener("deviceorientation", this.onOrient, true);
    window.addEventListener("devicemotion", this.onMotion, true);
  }

  get walkingPose(): boolean {
    return this.live && !this.aiming && !this.tilting;
  }

  consumeStep(): boolean {
    if (!this.step) return false;
    this.step = false;
    return true;
  }

  private onOrient = (ev: DeviceOrientationEvent): void => {
    const webkit = ev as DeviceOrientationEvent & { webkitCompassHeading?: number };
    if (typeof webkit.webkitCompassHeading === "number" && !Number.isNaN(webkit.webkitCompassHeading)) {
      this.relative = false;
      this.rawHeading = wrapDeg(webkit.webkitCompassHeading);
      this.live = true;
    } else if (ev.alpha != null && !Number.isNaN(ev.alpha)) {
      if (this.base == null) this.base = ev.alpha;
      this.rawHeading = wrapDeg(this.base - ev.alpha);
      this.relative = true;
      this.live = true;
    }
    if (ev.beta != null) this.pitch = ev.beta;
    if (ev.gamma != null) this.roll = ev.gamma;
    this.aiming = Math.abs(this.pitch) < 28 || Math.abs(this.pitch) > 112 || Math.abs(this.roll) > 48;

    const now = performance.now();
    const dt = Math.max(now - this.lastOrient, 16);
    const d = smallestTurn(this.rawHeading, this.lastHeading);
    this.turning = Math.abs(d) / (dt / 1000) > 45;
    this.lastHeading = this.rawHeading;
    this.lastOrient = now;
    this.heading = wrapDeg(this.heading + smallestTurn(this.rawHeading, this.heading) * 0.38);
  };

  private onMotion = (ev: DeviceMotionEvent): void => {
    const now = performance.now();
    const rate = ev.rotationRate;
    if (rate) {
      const yawSpin = Math.abs(rate.alpha ?? 0);
      const pitchSpin = Math.max(Math.abs(rate.beta ?? 0), Math.abs(rate.gamma ?? 0));
      this.turning = this.turning || yawSpin > 42;
      this.tilting = pitchSpin > 55;
    }

    const user = ev.acceleration;
    let bounce = 0;
    if (user && user.x != null && user.y != null && user.z != null) {
      bounce = Math.hypot(user.x, user.y, user.z);
      this.live = true;
    } else {
      const g = ev.accelerationIncludingGravity;
      if (!g || g.x == null || g.y == null || g.z == null) return;
      const mag = Math.hypot(g.x, g.y, g.z);
      bounce = Math.abs(mag - 9.81);
      this.live = true;
    }

    const rising = bounce - this.prevHp;
    this.prevHp = bounce;
    this.bounce = bounce;
    // Tuned for a steady "flashlight" grip, which damps the accelerometer
    // spike a normal swinging-arm gait would produce — loosened from an
    // earlier, more vigorous-gait threshold that mobile testing found
    // rarely fired for a level, held-out phone. Needs more field tuning.
    if (
      this.walkingPose &&
      !this.turning &&
      rising > 0.45 &&
      bounce > 1.05 &&
      now - this.lastStepAt > 300
    ) {
      this.lastStepAt = now;
      this.step = true;
      this.stepCount += 1;
    }
  };

  offset(delta: number): void {
    this.heading = wrapDeg(this.heading + delta);
    this.rawHeading = this.heading;
  }

  stop(): void {
    window.removeEventListener("deviceorientation", this.onOrient, true);
    window.removeEventListener("devicemotion", this.onMotion, true);
    this.bound = false;
  }
}

function smallestTurn(a: number, b: number): number {
  let d = a - b;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}
