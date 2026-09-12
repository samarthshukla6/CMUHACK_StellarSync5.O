import "../styles/track.css";
import type { Beacon, IncidentState, PathMatch, PathSummary, Pose } from "../shared/types";
import { IncidentBus } from "../shared/ws";
import { clamp, escapeHtml, formatMeters, storageKey, unitName, wrapDeg } from "../shared/util";
import { renderMiniMap } from "../map/draw";
import { VisualOdometry } from "../vo/tracker";
import { HeadingSource } from "../vo/heading";
import { kindMeta } from "../vo/detect";
import { embedFrame } from "../vo/embed";
import { hallwayReplay } from "../replay/paths";
import { ChevronTrail, type GuideTarget } from "./ar";
import { mountCompass } from "./compass";
import { icon } from "../shared/icons";

const HOME_COLOR = "#6ea8ff";
const PALETTE = ["#2dd4bf", "#a78bfa", "#f472b6", "#fb923c", "#a3e635", "#38bdf8"];
const MATCH_INTERVAL_MS = 2200;
const CONFIRM_HITS = 2;
const MISS_TOLERANCE = 1;

type DisplayMatch = PathMatch & { simulated?: boolean };

const app = document.querySelector("#app");
if (!app) throw new Error("#app");

app.innerHTML = `
  <div class="track-root">
    <video class="cam" id="cam" playsinline muted autoplay></video>
    <canvas class="ar-layer" id="ar"></canvas>
    <div class="viewfinder" id="viewfinder" aria-hidden="true">
      <i class="vf tl"></i><i class="vf tr"></i><i class="vf bl"></i><i class="vf br"></i>
    </div>
    <div class="hud">
      <div>
        <div class="top-row">
          <div class="chip-row">
            <div class="chip live"><span class="dot"></span>Live</div>
            <div class="chip" id="kf-chip">Tracking · 0 kf</div>
            <div class="chip ghost scan-chip" id="scan-chip"><span class="scan-dot"></span>Vision · scanning</div>
            <div class="chip record-badge" id="record-badge"><span class="dot"></span>REC</div>
            <button class="chip ghost icon-btn" id="stats-btn" aria-label="How this works">${icon("help", 15)}</button>
            <button class="chip stop icon-btn" id="stop-btn" aria-label="Pause tracking">${icon("pause", 15)}</button>
          </div>
        </div>
        <div class="instruction-card" id="instruction-card" hidden style="--instr-color:#5aa7ff">
          <div class="instr-arrow" id="instr-arrow">${icon("chevronUp", 22)}</div>
          <div class="instr-copy">
            <div class="instr-label" id="instr-label">STRAIGHT AHEAD</div>
            <div class="instr-meta"><span class="instr-dist" id="instr-dist">—</span><span class="instr-dest" id="instr-dest">—</span></div>
          </div>
          <div class="instr-ring-wrap" id="instr-ring-wrap" hidden>
            <svg class="instr-ring" viewBox="0 0 36 36" width="38" height="38">
              <circle class="instr-ring-track" cx="18" cy="18" r="15.5"></circle>
              <circle class="instr-ring-fill" id="instr-ring-fill" cx="18" cy="18" r="15.5"></circle>
            </svg>
            <span class="instr-ring-value" id="instr-ring-value">—</span>
          </div>
        </div>
        <div class="compass-wrap">
          <div class="heading-readout" id="heading-read">000° <small id="rel">REL</small></div>
          <div class="compass" id="compass"><div class="compass-needle"></div></div>
        </div>
        <div class="reco-stack" id="reco-stack"></div>
        <div class="nav-pill">
          <span class="exit">Home</span>
          <span class="seg">·</span>
          <span class="name" id="home-label">back to start</span>
          <span class="dist" id="beacon-dist">—</span>
          <button class="pill-btn" id="mode-replay">Demo</button>
          <button class="pill-btn active" id="mode-live">Walk</button>
          <button class="pill-btn record-pill" id="mode-record">Record</button>
        </div>
      </div>
      <div class="bottom-row">
        <div class="bottom-left">
          <div class="telemetry" id="telemetry">
            <span><b id="fps">—</b>fps</span>
            <span><b id="lat">—</b>ms</span>
            <span class="tele-steps"><i class="motion-dot" id="motion-dot"></i><b id="steps">0</b>steps</span>
          </div>
          <div class="actions" id="actions">
            <button class="action accent" data-act="beacon">${icon("plus", 13)}Beacon</button>
            <button class="action" id="more-btn">${icon("more", 13)}More</button>
            <button class="action record-save" data-act="save-path">Save path</button>
            <button class="action record-discard" data-act="discard-path">Discard</button>
          </div>
        </div>
        <div class="bottom-right">
          <div class="minimap">
            <canvas id="mini"></canvas>
            <div class="legend">
              <span><i style="background:#6ce7ff"></i>you</span>
              <span><i style="background:#fff"></i>start</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="toast" id="toast"></div>
    <div class="record-sheet" id="record-sheet" hidden>
      <div class="record-card">
        <h2>Record this path</h2>
        <p>Walk it once, name where it leads. Anyone who later points their camera at a similar view gets steered onto it.</p>
        <input class="record-input" id="record-label" placeholder="e.g. Radiology, Gate 3, Kitchen" maxlength="40" />
        <div class="swatches" id="swatches"></div>
        <div class="record-buttons">
          <button class="action" id="record-cancel">Cancel</button>
          <button class="primary" id="record-start">Start walking</button>
        </div>
      </div>
    </div>
    <div class="gate" id="gate">
      <div class="gate-card">
        <h2>Enable sensors</h2>
        <p>Hold the phone like a flashlight, camera down the hall. Path only moves when a step is detected — watch the <b>Steps</b> counter at the bottom. If it isn't climbing as you walk, press and hold anywhere on screen to advance the trail manually instead.</p>
        <button class="primary" id="enable">Start tracking</button>
      </div>
    </div>
    <div class="record-sheet" id="more-sheet" hidden>
      <div class="record-card">
        <h2>More</h2>
        <div class="sheet-group">
          <div class="sheet-group-label">Report</div>
          <div class="sheet-group-row">
            <button class="action danger" data-act="casualty">Casualty</button>
            <button class="action warn" data-act="hazard">Hazard</button>
            <button class="action" data-act="blocked">Blocked</button>
          </div>
        </div>
        <div class="sheet-group">
          <div class="sheet-group-label">Calibration</div>
          <div class="sheet-group-row">
            <button class="action" data-act="calibrate">5 m calibrate</button>
            <button class="action" data-act="north">True north</button>
            <button class="action" data-act="reset">Reset</button>
          </div>
        </div>
        <button class="primary" id="more-close">Close</button>
      </div>
    </div>
  </div>
`;

const video = document.querySelector<HTMLVideoElement>("#cam")!;
const arCanvas = document.querySelector<HTMLCanvasElement>("#ar")!;
const mini = document.querySelector<HTMLCanvasElement>("#mini")!;
const compassHost = document.querySelector<HTMLElement>("#compass")!;
const gate = document.querySelector<HTMLElement>("#gate")!;
const toastEl = document.querySelector<HTMLElement>("#toast")!;
const trackRoot = document.querySelector<HTMLElement>(".track-root")!;
const recordSheet = document.querySelector<HTMLElement>("#record-sheet")!;
const recordLabelInput = document.querySelector<HTMLInputElement>("#record-label")!;
const recordBadge = document.querySelector<HTMLElement>("#record-badge")!;
const scanChip = document.querySelector<HTMLElement>("#scan-chip")!;
const recoStack = document.querySelector<HTMLElement>("#reco-stack")!;
const viewfinder = document.querySelector<HTMLElement>("#viewfinder")!;
const motionDot = document.querySelector<HTMLElement>("#motion-dot")!;
const moreBtn = document.querySelector<HTMLButtonElement>("#more-btn")!;
const moreSheet = document.querySelector<HTMLElement>("#more-sheet")!;

const swatchHost = document.querySelector<HTMLElement>("#swatches")!;
let chosenColor = PALETTE[0];
swatchHost.innerHTML = PALETTE.map(
  (c, i) => `<button class="swatch-btn${i === 0 ? " selected" : ""}" data-color="${c}" style="--sw:${c}"></button>`,
).join("");
swatchHost.querySelectorAll<HTMLButtonElement>(".swatch-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    chosenColor = btn.dataset.color!;
    swatchHost.querySelectorAll(".swatch-btn").forEach((b) => b.classList.toggle("selected", b === btn));
  });
});

const id = storageKey();
const name = unitName();
const vo = new VisualOdometry();
const heading = new HeadingSource();
const compass = mountCompass(compassHost);
const trail = new ChevronTrail(arCanvas);
const bus = new IncidentBus();
const snapCanvas = document.createElement("canvas");
snapCanvas.width = 160;
snapCanvas.height = 90;
const snapCtx = snapCanvas.getContext("2d");
let gait = "IDLE";
let holdWalk = false;

let running = false;
let replay = false;
let frames = 0;
let fps = 0;
let lastFps = performance.now();
let lastSend = 0;
let lastSnap = 0;
let latency = 12;
let kfCount = 0;
let path: Pose[] = [{ t: 0, x: 0, y: 0, z: 0, yaw: 0 }];
let start: Pose = { t: 0, x: 0, y: 0, z: 0, yaw: 0 };
let keyframes: Pose[] = [];
let beacons: Beacon[] = [{ id: "b1", name: "beacon 1", x: 0, y: 18, z: 0, kind: "exit" }];
let paths: PathSummary[] = [];
let pose: Pose = { t: 0, x: 0, y: 0, z: 0, yaw: 0 };
let replayClock = 0;

let recording = false;
let recordLabel = "";
let recordCount = 0;
let lastRecordCaptureAt = 0;
let lastCapturePose: Pose = { t: 0, x: 0, y: 0, z: 0, yaw: 0 };

let matching = false;
let lastMatchAt = 0;
const candidates = new Map<string, { match: PathMatch; hits: number; misses: number }>();
let liveMatches: DisplayMatch[] = [];
let demoMatch: DisplayMatch | null = null;
let selectedPathId: string | null = null;

const params = new URLSearchParams(location.search);
if (params.get("mode") === "replay" || params.get("demo") === "1") replay = true;

function armWithoutPrompt(): void {
  running = true;
  gate.remove();
  bus.connect();
  bus.send({ type: "join", role: "tracker", id, name, source: replay ? "replay" : "real" });
}

function toast(msg: string): void {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  window.setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function pushFinding(kind: "casualty" | "hazard" | "blocked"): void {
  const meta = kindMeta(kind);
  bus.send({
    type: "finding",
    finding: {
      kind,
      label: meta.label,
      confidence: meta.confidence,
      x: pose.x,
      y: pose.y,
      z: 0,
      seenBy: name,
      seenCount: 1,
      assignedTo: "spot2",
    },
  });
  toast(`${meta.label} marked`);
}

function startRecording(label: string, color: string): void {
  recording = true;
  recordLabel = label;
  recordCount = 0;
  lastRecordCaptureAt = performance.now();
  lastCapturePose = { ...pose };
  candidates.clear();
  liveMatches = [];
  selectedPathId = null;
  trackRoot.classList.add("recording");
  recordBadge.innerHTML = `<span class="dot"></span>Path to ${escapeHtml(label)}`;
  bus.send({ type: "path_start", id, floor: 1, label, color });
  toast(`recording · path to ${label}`);
}

function finishRecording(): void {
  if (recordCount < 2) {
    toast("walk a little further before saving");
    return;
  }
  bus.send({ type: "path_finish", id });
  toast(`saved · path to ${recordLabel} (${recordCount} waypoints)`);
  stopRecording();
}

function cancelRecording(): void {
  bus.send({ type: "path_cancel", id });
  toast("recording discarded");
  stopRecording();
}

function stopRecording(): void {
  recording = false;
  trackRoot.classList.remove("recording");
  recordLabel = "";
  recordCount = 0;
}

// Keyframes depend on step detection, which can miss a real walk entirely on
// some phones/grips. This is the safety net: even with zero detected steps,
// force a waypoint every ~1.5s once dead reckoning shows *some* movement, so
// a recording never comes back near-empty just because the step detector
// didn't fire.
function captureIfRecording(now: number, gated: boolean): void {
  if (!recording) return;
  const moved = Math.hypot(pose.x - lastCapturePose.x, pose.y - lastCapturePose.y);
  if (gated && (now - lastRecordCaptureAt < 1500 || moved < 0.15)) return;
  lastRecordCaptureAt = now;
  lastCapturePose = { ...pose };
  void captureWaypoint();
}

async function captureWaypoint(): Promise<void> {
  recordCount += 1;
  let thumb: string | null = null;
  if (snapCtx && video.readyState >= 2) {
    snapCtx.drawImage(video, 0, 0, 160, 90);
    thumb = snapCanvas.toDataURL("image/jpeg", 0.5);
  }
  const embedding = await embedFrame(video);
  bus.send({
    type: "path_point",
    id,
    waypoint: { x: pose.x, y: pose.y, z: 0, yaw: pose.yaw, embedding, thumb },
  });
}

async function tryAmbientMatch(now: number): Promise<void> {
  if (matching || recording || replay || !running) return;
  if (now - lastMatchAt < MATCH_INTERVAL_MS) return;
  lastMatchAt = now;
  matching = true;
  const embedding = await embedFrame(video);
  matching = false;
  if (!embedding) return;
  bus.send({ type: "match_query", id, floor: 1, embedding });
}

function applyMatchResponse(matches: PathMatch[]): void {
  const seen = new Set(matches.map((m) => m.pathId));
  for (const m of matches) {
    const c = candidates.get(m.pathId);
    if (c) {
      c.match = m;
      c.hits = Math.min(c.hits + 1, 9);
      c.misses = 0;
    } else {
      candidates.set(m.pathId, { match: m, hits: 1, misses: 0 });
    }
  }
  for (const [pathId, c] of candidates) {
    if (!seen.has(pathId)) {
      c.misses += 1;
      if (c.misses > MISS_TOLERANCE) candidates.delete(pathId);
    }
  }
  liveMatches = Array.from(candidates.values())
    .filter((c) => c.hits >= CONFIRM_HITS)
    .sort((a, b) => b.match.confidence - a.match.confidence)
    .slice(0, 3)
    .map((c) => c.match);
}

// More than one recognised path at once means we genuinely don't know which
// destination the walker wants — surface a picker instead of guessing (or
// worse, showing two competing arrows). A single match needs no prompt.
function resolveGuidance(): { chosen: DisplayMatch[]; needsChoice: DisplayMatch[] } {
  if (liveMatches.length <= 1) {
    selectedPathId = liveMatches[0]?.pathId ?? null;
    return { chosen: liveMatches.length ? [liveMatches[0]] : [], needsChoice: [] };
  }
  if (selectedPathId) {
    const chosen = liveMatches.find((m) => m.pathId === selectedPathId);
    if (chosen) return { chosen: [chosen], needsChoice: [] };
    selectedPathId = null;
  }
  return { chosen: [], needsChoice: liveMatches };
}

function updateDemoMatch(clock: number): void {
  const demoPath = paths.find((p) => p.demo);
  const cyclePos = clock % 42000;
  if (!demoPath || cyclePos < 9000 || cyclePos > 34000) {
    demoMatch = null;
    return;
  }
  const phase = (cyclePos - 9000) / (34000 - 9000);
  const confidence = Math.max(0.6, Math.min(0.97, 0.82 + Math.sin(phase * Math.PI * 3) * 0.1));
  const turn = 20 * Math.sin(phase * Math.PI * 2);
  demoMatch = {
    pathId: demoPath.id,
    label: demoPath.label,
    color: demoPath.color,
    confidence,
    bearingOffsetDeg: turn,
    route: [
      { bearingDeg: turn, distanceM: 1.6 },
      { bearingDeg: 45, distanceM: 1.4 },
      { bearingDeg: 35, distanceM: 1.2 },
    ],
    simulated: true,
  };
}

function relativeBearingDeg(dx: number, dy: number, yawRad: number): number {
  const abs = Math.atan2(dx, dy);
  const rel = (((abs - yawRad) * 180) / Math.PI + 180) % 360;
  return (rel < 0 ? rel + 360 : rel) - 180;
}

// Turns the same bearing/distance numbers the chevron trail already renders
// into a plain-language instruction — no new tracking math, just a label.
function describeInstruction(bearingDeg: number, distanceM: number): { label: string; sub: string } {
  const abs = Math.abs(bearingDeg);
  let label: string;
  if (abs < 12) label = "Straight ahead";
  else if (abs < 45) label = bearingDeg > 0 ? "Bear right" : "Bear left";
  else if (abs < 135) label = bearingDeg > 0 ? "Turn right" : "Turn left";
  else label = "Turn around";
  return { label, sub: `${distanceM.toFixed(0)} m` };
}

function miniRingSvg(confidence: number, color: string, size = 30): string {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - clamp(confidence, 0, 1));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="mini-ring">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="mini-ring-track"></circle>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="mini-ring-fill" stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${size / 2} ${size / 2})"></circle>
  </svg>`;
}

const instructionCard = document.querySelector<HTMLElement>("#instruction-card")!;
const instrArrow = document.querySelector<HTMLElement>("#instr-arrow")!;
const instrLabel = document.querySelector<HTMLElement>("#instr-label")!;
const instrDist = document.querySelector<HTMLElement>("#instr-dist")!;
const instrDest = document.querySelector<HTMLElement>("#instr-dest")!;
const instrRingWrap = document.querySelector<HTMLElement>("#instr-ring-wrap")!;
const instrRingFill = document.querySelector<SVGCircleElement>("#instr-ring-fill")!;
const instrRingValue = document.querySelector<HTMLElement>("#instr-ring-value")!;

function renderInstruction(guides: GuideTarget[], recos: DisplayMatch[]): void {
  if (!guides.length) {
    instructionCard.hidden = true;
    return;
  }
  const primary = guides[0];
  const leg = primary.route[0] ?? { bearingDeg: 0, distanceM: 0 };
  const instr = describeInstruction(leg.bearingDeg, leg.distanceM);
  const matched = recos.find((r) => r.pathId === primary.id);
  instructionCard.hidden = false;
  instructionCard.style.setProperty("--instr-color", primary.color);
  instrArrow.style.transform = `rotate(${leg.bearingDeg}deg)`;
  instrLabel.textContent = instr.label;
  instrDist.textContent = instr.sub;
  instrDest.textContent = matched ? `Path to ${matched.label}` : "Back to start";
  if (matched) {
    instrRingWrap.hidden = false;
    const circumference = 2 * Math.PI * 15.5;
    instrRingFill.style.strokeDasharray = `${circumference}`;
    instrRingFill.style.strokeDashoffset = `${circumference * (1 - clamp(matched.confidence, 0, 1))}`;
    instrRingFill.style.stroke = matched.color;
    instrRingValue.textContent = `${Math.round(matched.confidence * 100)}%`;
  } else {
    instrRingWrap.hidden = true;
  }
}

// Signature-gated: renderRecoStack runs every animation frame, and rewriting
// innerHTML unconditionally would retrigger the chip's CSS entrance animation
// 60x/sec — leaving it perpetually stuck near opacity 0. Only touch the DOM
// when what should actually be displayed changes.
let lastRecoSig = "";

function renderRecoStack(recos: DisplayMatch[], choices: DisplayMatch[]): void {
  if (choices.length) {
    const sig = `pick:${choices.map((c) => c.pathId).join(",")}`;
    if (sig === lastRecoSig) return;
    lastRecoSig = sig;
    recoStack.classList.add("show");
    recoStack.innerHTML = `
      <div class="reco-picker">
        <div class="reco-picker-label">Which way?</div>
        <div class="reco-picker-row">
          ${choices
            .map(
              (c) =>
                `<button class="reco-pick" data-pick="${c.pathId}" style="--reco-color:${c.color}"><span class="reco-dot"></span>${escapeHtml(c.label)}</button>`,
            )
            .join("")}
        </div>
      </div>`;
    return;
  }
  if (!recos.length) {
    if (lastRecoSig !== "") {
      lastRecoSig = "";
      recoStack.classList.remove("show");
      recoStack.innerHTML = "";
    }
    return;
  }
  const sig = recos.map((r) => `${r.pathId}:${Math.round(r.confidence * 100)}:${r.simulated ? 1 : 0}`).join("|") + (liveMatches.length > 1 ? "+clear" : "");
  if (sig === lastRecoSig) return;
  lastRecoSig = sig;
  recoStack.classList.add("show");
  recoStack.innerHTML = recos
    .map(
      (r) => `
      <div class="reco-chip" style="--reco-color:${r.color}">
        ${miniRingSvg(r.confidence, r.color)}
        <span class="reco-label">Path to ${escapeHtml(r.label)}</span>
        <span class="reco-conf">${Math.round(r.confidence * 100)}%</span>
        ${r.simulated ? '<span class="reco-sim">sim</span>' : ""}
        ${!r.simulated && liveMatches.length > 1 ? `<button class="reco-clear" data-clear="1" aria-label="Choose a different path">${icon("close", 12)}</button>` : ""}
      </div>`,
    )
    .join("");
}

recoStack.addEventListener("click", (ev) => {
  const t = ev.target as HTMLElement;
  const pick = t.closest<HTMLElement>("[data-pick]");
  if (pick) {
    selectedPathId = pick.dataset.pick!;
    return;
  }
  if (t.closest("[data-clear]")) selectedPathId = null;
});

function updateHud(): void {
  const deg = heading.available ? heading.heading : wrapDeg((pose.yaw * 180) / Math.PI);
  compass.setHeading(deg);
  document.querySelector("#heading-read")!.innerHTML =
    `${String(Math.round(deg)).padStart(3, "0")}° <small id="rel">${heading.live ? (heading.relative ? "REL" : "TRUE") : "NO IMU"}</small>`;
  document.querySelector("#kf-chip")!.textContent = `Tracking · ${kfCount} kf · ${gait}`;
  document.querySelector("#fps")!.textContent = String(fps);
  document.querySelector("#lat")!.textContent = String(latency);
  document.querySelector("#steps")!.textContent = String(heading.stepCount);
  motionDot.classList.toggle("hot", heading.bounce > 1.05);
  const scanning = running && !recording && !replay;
  scanChip.classList.toggle("show", scanning);
  viewfinder.classList.toggle("scanning", scanning);
  const homeM = Math.hypot(pose.x - start.x, pose.y - start.y);
  document.querySelector("#beacon-dist")!.textContent = formatMeters(homeM);
  document.querySelector("#home-label")!.textContent = replay ? "demo loop" : "back to start";
  document.querySelector("#mode-replay")!.classList.toggle("active", replay);
  document.querySelector("#mode-live")!.classList.toggle("active", !replay && running && !recording);
  renderMiniMap(mini, path, pose, start, 5);

  const { chosen, needsChoice } = resolveGuidance();
  const recos = [...chosen, ...(demoMatch ? [demoMatch] : [])].slice(0, 2);
  renderRecoStack(recos, needsChoice);

  const guides: GuideTarget[] = [];
  if (recos.length) {
    const primary = recos[0];
    const route = primary.route.length ? primary.route : [{ bearingDeg: primary.bearingOffsetDeg, distanceM: 1.6 }];
    guides.push({
      id: primary.pathId,
      color: primary.color,
      route,
      prominence: 1,
      urgent: Math.abs(primary.bearingOffsetDeg) > 60,
    });
  }
  if ((heading.walkingPose || replay) && homeM > 0.6) {
    const homeBearing = relativeBearingDeg(start.x - pose.x, start.y - pose.y, pose.yaw);
    guides.push({
      id: "home",
      color: HOME_COLOR,
      route: [{ bearingDeg: homeBearing, distanceM: Math.min(homeM, 2.2) }],
      prominence: guides.length ? 0.4 : 0.85,
    });
  }
  trail.render(pose, guides);
  renderInstruction(guides, recos);
}

function loop(now: number): void {
  requestAnimationFrame(loop);
  if (!running) {
    updateHud();
    return;
  }

  frames += 1;
  if (now - lastFps > 1000) {
    fps = frames;
    frames = 0;
    lastFps = now;
    latency = Math.round(8 + Math.random() * 16);
  }

  if (replay) {
    replayClock += 16;
    pose = hallwayReplay(replayClock);
    if (heading.available) pose.yaw = (heading.heading * Math.PI) / 180;
    gait = "DEMO";
    updateDemoMatch(replayClock);
  } else {
    if (heading.available || heading.live) vo.setYaw(heading.heading);
    const stepped = heading.consumeStep();
    const sample = vo.advance({
      step: stepped && heading.walkingPose,
      holdWalk: holdWalk && heading.walkingPose,
      turning: heading.turning,
      aiming: heading.aiming || heading.tilting,
      now,
    });
    pose = sample.pose;
    gait = heading.aiming ? "AIM" : holdWalk ? "HOLD" : sample.mode.toUpperCase();
    if (sample.loopClosed) toast("loop closed · snapped to start");
    if (sample.kf) {
      kfCount += 1;
      keyframes.push({ ...pose });
      if (keyframes.length > 48) keyframes.shift();
      captureIfRecording(now, false);
    }
    captureIfRecording(now, true);
    void tryAmbientMatch(now);
  }

  if (path.length === 0 || Math.hypot(pose.x - path[path.length - 1].x, pose.y - path[path.length - 1].y) > 0.12) {
    path.push({ ...pose });
    if (path.length > 400) path.shift();
  }
  if (replay && (keyframes.length === 0 || Math.hypot(pose.x - keyframes[keyframes.length - 1].x, pose.y - keyframes[keyframes.length - 1].y) > 0.9)) {
    kfCount += 1;
    keyframes.push({ ...pose });
    if (keyframes.length > 48) keyframes.shift();
  }

  if (now - lastSend > 140) {
    lastSend = now;
    bus.send({
      type: "pose",
      id,
      pose,
      kfCount,
      fps,
      latencyMs: latency,
      heading: wrapDeg((pose.yaw * 180) / Math.PI),
    });
  }
  if (now - lastSnap > 2800 && video.readyState >= 2 && snapCtx) {
    lastSnap = now;
    snapCtx.drawImage(video, 0, 0, 160, 90);
    bus.send({ type: "snapshot", id, jpeg: snapCanvas.toDataURL("image/jpeg", 0.32) });
  }
  updateHud();
}

async function startCamera(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 360 } },
    audio: false,
  });
  video.srcObject = stream;
  video.classList.add("has-feed");
  if (!/iPhone|iPad|Android/i.test(navigator.userAgent)) video.classList.add("mirror");
  await video.play();
}

document.querySelector("#enable")!.addEventListener("click", async () => {
  const imuP = heading.request();
  try {
    await startCamera();
  } catch {
    toast("camera blocked — hold the screen to walk a path");
  }
  await imuP;
  window.setTimeout(() => {
    if (!heading.live) toast("No compass yet — turn the phone, or hold the screen to walk");
  }, 1200);
  vo.reset();
  armWithoutPrompt();
});

const armZone = document.querySelector(".track-root")!;
armZone.addEventListener("pointerdown", (ev) => {
  const t = ev.target as HTMLElement;
  if (t.closest("button") || t.closest(".record-sheet")) return;
  holdWalk = true;
});
window.addEventListener("pointerup", () => {
  holdWalk = false;
});
window.addEventListener("pointercancel", () => {
  holdWalk = false;
});

if (params.get("demo") === "1") {
  replay = true;
  armWithoutPrompt();
}

document.querySelector("#stop-btn")!.addEventListener("click", () => {
  running = !running;
  document.querySelector("#stop-btn")!.innerHTML = running ? icon("pause", 15) : icon("play", 15);
  toast(running ? "tracking" : "paused — trail frozen");
});

document.querySelector("#mode-replay")!.addEventListener("click", () => {
  if (recording) return;
  replay = true;
  replayClock = 0;
  path = [];
  keyframes = [];
  kfCount = 0;
  toast("canned demo loop — not your real walk");
});

document.querySelector("#mode-live")!.addEventListener("click", () => {
  if (recording) return;
  replay = false;
  demoMatch = null;
  vo.reset();
  path = [];
  keyframes = [];
  kfCount = 0;
  toast("live walk — arrows point home to START");
});

document.querySelector("#mode-record")!.addEventListener("click", () => {
  if (recording) return;
  recordLabelInput.value = "";
  recordSheet.hidden = false;
  window.setTimeout(() => recordLabelInput.focus(), 30);
});

document.querySelector("#record-cancel")!.addEventListener("click", () => {
  recordSheet.hidden = true;
});

document.querySelector("#record-start")!.addEventListener("click", () => {
  const label = recordLabelInput.value.trim();
  if (!label) {
    toast("name the destination first");
    return;
  }
  recordSheet.hidden = true;
  replay = false;
  path = [];
  keyframes = [];
  kfCount = 0;
  vo.reset();
  startRecording(label, chosenColor);
});

document.querySelector("#stats-btn")!.addEventListener("click", () => {
  toast("Walk with the phone level. AIM = looking up/down, path frozen. The arrow always points where to go next.");
});

moreBtn.addEventListener("click", () => {
  moreSheet.hidden = false;
});
document.querySelector("#more-close")!.addEventListener("click", () => {
  moreSheet.hidden = true;
});
moreSheet.addEventListener("click", (ev) => {
  if (ev.target === moreSheet) moreSheet.hidden = true;
});

document.querySelectorAll<HTMLButtonElement>("[data-act]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const act = btn.dataset.act;
    if (act === "beacon") {
      bus.send({
        type: "beacon",
        beacon: { name: `beacon ${beacons.length + 1}`, x: pose.x, y: pose.y, z: 0, kind: "custom" },
      });
      toast("beacon dropped");
    } else if (act === "calibrate") {
      vo.calibrate(5);
      toast("scale locked to 5.0 m");
    } else if (act === "casualty" || act === "hazard" || act === "blocked") {
      pushFinding(act);
    } else if (act === "north") {
      heading.relative = false;
      heading.heading = 0;
      toast("heading zeroed to true north");
    } else if (act === "reset") {
      vo.reset();
      path = [];
      keyframes = [];
      kfCount = 0;
      start = { t: 0, x: 0, y: 0, z: 0, yaw: 0 };
      toast("origin reset");
    } else if (act === "save-path") {
      finishRecording();
    } else if (act === "discard-path") {
      cancelRecording();
    }
    moreSheet.hidden = true;
  });
});

bus.handlers.onState = (state: IncidentState) => {
  beacons = state.beacons;
  paths = state.paths;
};
bus.handlers.onWelcome = (_wid, state: IncidentState) => {
  beacons = state.beacons;
  paths = state.paths;
};
bus.handlers.onMatch = applyMatchResponse;

requestAnimationFrame(loop);
