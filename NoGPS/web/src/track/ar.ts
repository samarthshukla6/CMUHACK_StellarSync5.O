import * as THREE from "three";
import type { Pose } from "../shared/types";
import { clamp, degToRad } from "../shared/util";

// A guide is one destination the HUD is currently steering toward — home,
// or a single recognised path. `route` is a chain of relative turns (0 =
// straight ahead from the previous leg, +90 = turn right, ±180 = turn
// around) — the same turn-by-turn data the matcher computes server-side.
export interface RouteLeg {
  bearingDeg: number;
  distanceM: number;
}

export interface GuideTarget {
  id: string;
  color: string;
  route: RouteLeg[];
  prominence: number; // 0..1 — smaller/dimmer for secondary guides (e.g. home when a path is active)
  urgent?: boolean; // a sharp turn is imminent — pulses for attention
}

interface Lane {
  meshes: THREE.Mesh[];
  material: THREE.MeshStandardMaterial;
}

const CHEVRON_GEO = buildChevronGeometry();
const LANE_SIZE = 10;

export class ChevronTrail {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private lanes = new Map<string, Lane>();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.08, 40);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const dir = new THREE.DirectionalLight(0x9fd6ff, 0.85);
    dir.position.set(2, 6, 3);
    this.scene.add(dir);
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  private resize = (): void => {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  // Every guide is a chain of chevrons that starts just in front of the
  // *camera* (not a fixed world coordinate) and bends through each leg's
  // relative turn from there. Anchoring to the camera each frame — rather
  // than to world x/y, like the old ground trail did — is what keeps the
  // whole chain on screen and centred no matter how the phone is held.
  render(you: Pose, guides: GuideTarget[]): void {
    this.resize();
    this.camera.position.set(you.x, 1.45, -you.y);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = -you.yaw;
    this.camera.rotation.x = -0.08;
    this.camera.updateMatrixWorld();

    const activeIds = new Set(guides.map((g) => g.id));
    for (const [id, lane] of this.lanes) {
      if (!activeIds.has(id)) {
        lane.meshes.forEach((m) => this.scene.remove(m));
        this.lanes.delete(id);
      }
    }

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(this.camera.quaternion);
    const worldUp = down.clone().negate();
    const now = performance.now();

    guides.forEach((target, gi) => {
      let lane = this.lanes.get(target.id);
      if (!lane) {
        lane = makeLane(new THREE.Color(target.color).getHex());
        lane.meshes.forEach((m) => this.scene.add(m));
        this.lanes.set(target.id, lane);
      }
      lane.meshes.forEach((m) => {
        m.visible = false;
      });
      lane.material.opacity = 0.5 + target.prominence * 0.5;
      lane.material.emissiveIntensity = target.urgent ? 0.6 + Math.sin(now / 140) * 0.22 : 0.42;

      const dir = forward.clone();
      const points: THREE.Vector3[] = [
        this.camera.position.clone().addScaledVector(forward, 0.6).addScaledVector(down, 0.3 + gi * 0.55),
      ];
      for (const leg of target.route) {
        dir.applyAxisAngle(worldUp, degToRad(-leg.bearingDeg));
        points.push(points[points.length - 1].clone().addScaledVector(dir, clamp(leg.distanceM, 0.35, 1.3)));
      }

      const segLens = points.slice(1).map((p, i) => p.distanceTo(points[i]));
      const totalLen = segLens.reduce((a, b) => a + b, 0) || 0.01;
      const count = Math.min(lane.meshes.length, Math.max(3, Math.round(totalLen / 0.32)));
      let seg = 0;
      let covered = 0;
      for (let i = 1; i <= count; i++) {
        const at = (i / (count + 1)) * totalLen;
        while (seg < segLens.length - 1 && at > covered + segLens[seg]) {
          covered += segLens[seg];
          seg += 1;
        }
        const segLen = segLens[seg] || 0.001;
        const t = Math.min(1, Math.max(0, (at - covered) / segLen));
        const p0 = points[seg];
        const p1 = points[seg + 1];
        const mesh = lane.meshes[i - 1];
        mesh.visible = true;
        mesh.position.lerpVectors(p0, p1, t);
        mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(p0, p1, worldUp));
        mesh.scale.setScalar(0.8 + target.prominence * 0.35);
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener("resize", this.resize);
    this.renderer.dispose();
  }
}

function makeLane(hex: number): Lane {
  const material = new THREE.MeshStandardMaterial({
    color: hex,
    emissive: hex,
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.15,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const meshes: THREE.Mesh[] = [];
  for (let i = 0; i < LANE_SIZE; i++) {
    const mesh = new THREE.Mesh(CHEVRON_GEO, material);
    mesh.visible = false;
    meshes.push(mesh);
  }
  return { meshes, material };
}

// Extruded (not flat) so each chevron catches light and reads as a solid
// object rather than a painted decal. Tip points along local -Z after the
// rotate below, matching THREE's lookAt/camera-forward convention, so
// orienting a chevron along any 3D segment is one quaternion assignment.
function buildChevronGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.22);
  shape.lineTo(0.13, -0.06);
  shape.lineTo(0.05, -0.06);
  shape.lineTo(0.05, -0.2);
  shape.lineTo(-0.05, -0.2);
  shape.lineTo(-0.05, -0.06);
  shape.lineTo(-0.13, -0.06);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}
