import "../styles/dashboard.css";
import type { FilterMode, IncidentState, PathSummary, Responder } from "../shared/types";
import { IncidentBus } from "../shared/ws";
import { escapeHtml, formatGmt } from "../shared/util";
import { icon } from "../shared/icons";
import { renderPlot } from "../map/draw";
import { paintWarehouse } from "./synth";

const app = document.querySelector("#app");
if (!app) throw new Error("#app");

app.innerHTML = `
  <div class="dash">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">${icon("compass", 17)}</span>
        <h1>NoGPS</h1>
        <span class="chip floor-chip">${icon("layers", 13)}Floor 1</span>
      </div>
      <div class="top-meta">
        <span class="chip" id="conn-indicator"><span class="dot"></span>waiting for phone…</span>
        <span class="chip"><span id="sim-count">0</span>&nbsp;sim</span>
        <span class="chip">${icon("clock", 12)}<span id="clock">${formatGmt()}</span></span>
        <div class="seg" id="filter">
          <button data-f="all" class="on">All</button>
          <button data-f="real">Phone</button>
          <button data-f="sim">Dummies</button>
        </div>
      </div>
    </header>
    <main class="workspace">
      <section class="hero-col">
        <div class="hero-panel">
          <div class="panel-head">
            <h2>Shared floor map</h2>
            <div class="checks">
              <span class="on">${icon("target", 11)}auto-fit</span>
              <span class="on">${icon("route", 11)}paths</span>
            </div>
          </div>
          <canvas id="shared"></canvas>
        </div>
        <div class="metrics-strip" id="metrics"></div>
        <div class="below-map-row">
          <div class="rail-section grow">
            <div class="section-head">
              <span>Live activity</span>
            </div>
            <div class="activity-list" id="activity-list"></div>
          </div>
          <div class="rail-section">
            <div class="section-head">
              <span>Recorded paths</span>
              <span class="meta" id="paths-meta">0 mapped</span>
            </div>
            <div class="paths-row" id="paths-row"></div>
          </div>
        </div>
      </section>
      <aside class="rail">
        <div class="rail-section device-section grow">
          <div class="section-head">
            <span>Devices</span>
            <span class="meta" id="live-hint">waiting for phone…</span>
          </div>
          <div class="seg device-switch" id="device-switch" hidden></div>
          <div class="device-row">
            <article class="tile" id="tile-0"></article>
          </div>
          <div class="sim-strip">
            <div class="sim-strip-head">Simulation <em>— not real, shown separately</em></div>
            <div class="sim-strip-row" id="sim-row"></div>
          </div>
        </div>
        <div class="rail-section grow-small">
          <div class="section-head">
            <span>Findings</span>
            <span class="meta" id="finding-meta">0 shown</span>
          </div>
          <div class="findings-list" id="findings"></div>
        </div>
      </aside>
    </main>
  </div>
`;

const findingsEl = document.querySelector("#findings")!;
const shared = document.querySelector<HTMLCanvasElement>("#shared")!;
const pathsRow = document.querySelector<HTMLElement>("#paths-row")!;
const simRow = document.querySelector<HTMLElement>("#sim-row")!;
const activityList = document.querySelector<HTMLElement>("#activity-list")!;
const metricsEl = document.querySelector<HTMLElement>("#metrics")!;
const connIndicator = document.querySelector<HTMLElement>("#conn-indicator")!;
const tileEl = document.querySelector("#tile-0")!;
const deviceSwitchEl = document.querySelector<HTMLElement>("#device-switch")!;
let filter: FilterMode = "all";
let state: IncidentState = { responders: [], beacons: [], findings: [], paths: [], serverTime: Date.now(), fps: 0 };
let lastIds = "";
let lastFindingSig = "";
let lastPathSig = "";
let lastSimSig = "";
let lastDeviceSwitchSig = "";
// Which phone's tile is shown when more than one is connected — sticky
// across frames until that phone drops off, then falls back to whichever
// real tracker is first.
let selectedDeviceId: string | null = null;
const sessionStart = performance.now();

function visible(): Responder[] {
  return state.responders.filter((r) => {
    if (filter === "all") return true;
    if (filter === "sim") return r.source === "sim";
    return r.source !== "sim";
  });
}

// Only ever a real tracker, never backfilled with a dummy unit — the
// simulation gets its own strip below instead.
function realResponders(): Responder[] {
  return state.responders.filter((r) => r.source === "real");
}

function currentDevice(real: Responder[]): Responder | undefined {
  const found = selectedDeviceId ? real.find((r) => r.id === selectedDeviceId) : undefined;
  return found ?? real[0];
}

function renderDeviceSwitch(real: Responder[]): void {
  const sig = real.map((r) => r.id).join(",") + selectedDeviceId;
  if (sig === lastDeviceSwitchSig) return;
  lastDeviceSwitchSig = sig;

  if (real.length < 2) {
    deviceSwitchEl.hidden = true;
    deviceSwitchEl.innerHTML = "";
    return;
  }
  deviceSwitchEl.hidden = false;
  const current = currentDevice(real);
  deviceSwitchEl.innerHTML = real
    .map(
      (r, i) => `<button data-id="${r.id}" class="${r.id === current?.id ? "on" : ""}">${escapeHtml(r.name || `Phone ${i + 1}`)}</button>`,
    )
    .join("");
  deviceSwitchEl.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedDeviceId = btn.dataset.id ?? null;
      lastIds = "";
      lastDeviceSwitchSig = "";
    });
  });
}

function mountTile(el: Element, r: Responder | undefined): void {
  if (!r) {
    el.innerHTML = `
      <div class="tile-video"><div class="empty">waiting for phone…</div></div>
      <div class="tile-plot"><canvas data-plot="empty"></canvas></div>`;
    return;
  }
  el.innerHTML = `
    <div class="tile-video">
      ${r.snapshot ? `<img alt="${r.name}" src="${r.snapshot}" />` : `<canvas class="synth" data-synth="${r.id}"></canvas>`}
      <div class="tile-tag"><span class="swatch" style="background:${r.color}"></span>${r.name}</div>
      <div class="pose-read" data-pose="${r.id}">${r.pose.x.toFixed(1)}, ${r.pose.y.toFixed(1)} · ${Math.round(r.heading)}°</div>
    </div>
    <div class="tile-plot">
      <canvas data-plot="${r.id}"></canvas>
    </div>`;
}

function paintTiles(real: Responder[]): void {
  const current = currentDevice(real);
  selectedDeviceId = current?.id ?? null;

  const ids = (current?.id ?? "none") + filter;
  if (ids !== lastIds) {
    lastIds = ids;
    mountTile(tileEl, current);
  }
  if (!current) return;
  const pose = document.querySelector(`[data-pose="${current.id}"]`);
  if (pose) pose.textContent = `${current.pose.x.toFixed(1)}, ${current.pose.y.toFixed(1)} · ${Math.round(current.heading)}°`;
  const img = document.querySelector<HTMLImageElement>(`#tile-0 img[alt="${current.name}"]`);
  if (img && current.snapshot) img.src = current.snapshot;
  const plot = document.querySelector<HTMLCanvasElement>(`canvas[data-plot="${current.id}"]`);
  if (plot) renderPlot(plot, [current], [], [], { labels: false, showGrid: true });
  const synth = document.querySelector<HTMLCanvasElement>(`canvas[data-synth="${current.id}"]`);
  if (synth) paintWarehouse(synth, current, performance.now());
}

function renderFindings(): void {
  const findings = state.findings.slice().reverse();
  const sig = findings.map((f) => f.id).join(",");
  document.querySelector("#finding-meta")!.textContent = `${findings.length} shown`;
  if (sig === lastFindingSig) return;
  lastFindingSig = sig;
  findingsEl.innerHTML = findings.length
    ? findings
        .map(
          (f) => `
        <div class="finding">
          <span class="badge badge-${f.kind}">${f.kind}</span>
          <div class="finding-body">
            <div class="finding-title">${f.label} <span class="conf">${Math.round(f.confidence * 100)}%</span></div>
            <div class="finding-sub">${f.distanceM.toFixed(0)} m from master · seen ${f.seenCount}x · ${escapeHtml(f.seenBy)} → ${escapeHtml(f.assignedTo)}</div>
          </div>
        </div>`,
        )
        .join("")
    : `<div class="empty-state">No findings yet. Mark one from a tracker's More menu, or wait for the simulation.</div>`;
}

function renderPaths(): void {
  const list: PathSummary[] = state.paths;
  document.querySelector("#paths-meta")!.textContent = `${list.length} mapped`;
  const sig = list.map((p) => `${p.id}:${p.points}`).join(",");
  if (sig === lastPathSig) return;
  lastPathSig = sig;
  pathsRow.innerHTML = list.length
    ? list
        .map(
          (p) => `
        <div class="path-chip">
          <span class="swatch" style="background:${p.color}"></span>
          <span class="path-label">${escapeHtml(p.label)}${p.demo ? " <em>seed</em>" : ""}</span>
          <span class="path-count">${p.points} pts</span>
        </div>`,
        )
        .join("")
    : `<div class="empty-state">No paths recorded yet — record one from a tracker's "Record" button.</div>`;
}

function renderSim(): void {
  const sims = state.responders.filter((r) => r.source === "sim");
  const sig = sims.map((s) => `${s.id}:${s.pose.x.toFixed(1)}:${s.pose.y.toFixed(1)}`).join(",");
  if (sig === lastSimSig) return;
  lastSimSig = sig;
  simRow.innerHTML = sims.length
    ? sims
        .map(
          (s) => `
        <div class="sim-chip">
          <span class="swatch" style="background:${s.color}"></span>
          <span class="sim-name">${escapeHtml(s.name)}</span>
          <span class="sim-pose">${s.pose.x.toFixed(1)}, ${s.pose.y.toFixed(1)} · ${Math.round(s.heading)}°</span>
        </div>`,
        )
        .join("")
    : `<div class="empty-state">No simulated units running.</div>`;
}

// --- Live activity: derived strictly from real state transitions already
// arriving over the WebSocket (never fabricated) — a capped, presentation-only
// log of "something changed" moments for the command view.
type ActivityTone = "live" | "sim" | "casualty" | "hazard" | "blocked" | "path";
interface ActivityItem { id: number; text: string; tone: ActivityTone; t: number }

const knownResponderIds = new Set<string>();
const knownFindingIds = new Set<string>();
const knownPathIds = new Set<string>();
let activitySeq = 0;
let activity: ActivityItem[] = [];
let lastActivitySig = "";

function pushActivity(text: string, tone: ActivityTone): void {
  activitySeq += 1;
  activity.unshift({ id: activitySeq, text, tone, t: Date.now() });
  if (activity.length > 24) activity.length = 24;
}

function detectActivity(): void {
  for (const r of state.responders) {
    if (knownResponderIds.has(r.id)) continue;
    knownResponderIds.add(r.id);
    pushActivity(
      r.source === "sim" ? `Simulated unit online — ${r.name}` : `Responder connected — ${r.name}`,
      r.source === "sim" ? "sim" : "live",
    );
  }
  for (const f of state.findings) {
    if (knownFindingIds.has(f.id)) continue;
    knownFindingIds.add(f.id);
    pushActivity(`Finding logged — ${f.label} by ${f.seenBy}`, f.kind);
  }
  for (const p of state.paths) {
    if (knownPathIds.has(p.id) || p.demo) continue;
    knownPathIds.add(p.id);
    pushActivity(`Path recorded — "${p.label}" (${p.points} waypoints)`, "path");
  }
}

const TONE_LABEL: Record<ActivityTone, string> = {
  live: "Responder", sim: "Simulation", casualty: "Casualty", hazard: "Hazard", blocked: "Blocked", path: "Route",
};

function renderActivity(): void {
  const sig = activity.map((a) => a.id).join(",");
  if (sig === lastActivitySig) return;
  lastActivitySig = sig;
  activityList.innerHTML = activity.length
    ? activity
        .map(
          (a) => `
      <div class="activity-row" title="${TONE_LABEL[a.tone]}">
        <span class="activity-dot tone-${a.tone}"></span>
        <span class="activity-text">${escapeHtml(a.text)}</span>
        <span class="activity-time">${new Date(a.t).toLocaleTimeString([], { hour12: false })}</span>
      </div>`,
        )
        .join("")
    : `<div class="empty-state">No activity yet — connect a tracker to see live events here.</div>`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

let lastMetricsSig = "";

function renderMetrics(): void {
  const live = state.responders.filter((r) => r.source === "real");
  const sim = state.responders.filter((r) => r.source === "sim");
  const waypoints = state.paths.reduce((sum, p) => sum + p.points, 0);
  const rows: Array<{ icon: Parameters<typeof icon>[0]; label: string; value: string }> = [
    { icon: "users", label: "Responders", value: String(live.length) },
    { icon: "bolt", label: "Sim units", value: String(sim.length) },
    { icon: "warning", label: "Findings", value: String(state.findings.length) },
    { icon: "route", label: "Paths", value: String(state.paths.length) },
    { icon: "target", label: "Waypoints", value: String(waypoints) },
    { icon: "clock", label: "Session", value: formatDuration(performance.now() - sessionStart) },
  ];
  const sig = rows.map((r) => r.value).join(",");
  if (sig === lastMetricsSig) return;
  lastMetricsSig = sig;
  metricsEl.innerHTML = rows
    .map(
      (m) => `
    <div class="metric-tile">
      <span class="metric-label">${icon(m.icon, 12)}${m.label}</span>
      <span class="metric-value">${m.value}</span>
    </div>`,
    )
    .join("");
}

function frame(): void {
  const live = realResponders();
  document.querySelector("#sim-count")!.textContent = String(state.responders.filter((r) => r.source === "sim").length);
  document.querySelector("#clock")!.textContent = formatGmt();
  const hint = document.querySelector("#live-hint")!;
  hint.textContent = live.length ? `${live.length} live · ${live[0].name}` : "no phone connected";
  connIndicator.classList.toggle("chip-live", live.length > 0);
  connIndicator.innerHTML = live.length
    ? `<span class="dot"></span>${live.length} phone live`
    : `<span class="dot dim"></span>waiting for phone…`;
  detectActivity();
  renderDeviceSwitch(live);
  paintTiles(live);
  renderFindings();
  renderPaths();
  renderSim();
  renderActivity();
  renderMetrics();
  renderPlot(shared, visible(), state.beacons, state.findings, { labels: true, showGrid: true }, state.paths);
}

document.querySelectorAll<HTMLButtonElement>("#filter button").forEach((btn) => {
  btn.addEventListener("click", () => {
    filter = btn.dataset.f as FilterMode;
    lastIds = "";
    document.querySelectorAll("#filter button").forEach((b) => b.classList.toggle("on", b === btn));
    frame();
  });
});

const bus = new IncidentBus({
  onState: (next) => {
    state = next;
  },
  onWelcome: (_id, next) => {
    state = next;
  },
});
bus.connect();
bus.send({ type: "join", role: "dashboard", id: "command", name: "master", source: "real" });
const tick = (): void => {
  frame();
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
