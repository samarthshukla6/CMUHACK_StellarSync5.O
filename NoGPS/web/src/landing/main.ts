import "../styles/landing.css";
import { fetchLanUrl } from "../shared/ws";
import { icon } from "../shared/icons";
import { mountLandingScene } from "./scene";

const app = document.querySelector("#app");
if (!app) throw new Error("#app");

app.innerHTML = `
  <div class="landing">
    <div class="landing-inner">
      <div class="landing-copy">
        <div class="kicker"><span class="dot"></span>GPS-denied · runs on your local network</div>
        <h1>GPS-free spatial<br /><span>awareness</span>, indoors.</h1>
        <p class="lede">
          Walk a hallway once with a phone camera and it becomes a landmark.
          Anyone whose camera later sees a similar view gets steered onto that
          route with a live directional cue — no beacons, no floor plans, no
          satellite signal required.
        </p>
        <div class="join-grid">
          <a class="join-card" href="/track.html">
            <span class="join-icon">${icon("compass", 20)}</span>
            <strong>Open Tracker</strong>
            <span>Live AR heading, route recognition, path recording — phone or webcam.</span>
            <span class="join-cta">Start tracking ${icon("chevronRight", 14)}</span>
          </a>
          <a class="join-card" href="/dashboard.html">
            <span class="join-icon">${icon("layers", 20)}</span>
            <strong>Open Command</strong>
            <span>Shared floor view, live responders, findings, and recorded paths.</span>
            <span class="join-cta">View dashboard ${icon("chevronRight", 14)}</span>
          </a>
        </div>
        <div class="meta-row">
          <span>${icon("wifi", 13)}Mac-hosted · one process serves every device</span>
          <span class="lan" id="lan">resolving LAN…</span>
        </div>
      </div>
      <div class="landing-scene glass-panel">
        <div class="scene-head">
          <span class="scene-live"><span class="dot"></span>Simulated preview</span>
          <span class="scene-floor">Floor 1</span>
        </div>
        <canvas id="scene-canvas"></canvas>
        <div class="scene-foot">
          <span>${icon("footprints", 13)}Recorded route</span>
          <span>${icon("target", 13)}Recognized waypoint</span>
        </div>
      </div>
    </div>
  </div>
`;

void fetchLanUrl().then((url) => {
  document.querySelector("#lan")!.textContent = url;
});

const sceneCanvas = document.querySelector<HTMLCanvasElement>("#scene-canvas");
if (sceneCanvas) mountLandingScene(sceneCanvas);
