# NoGPS

GPS-free indoor wayfinding. Walk a route once, name where it leads; anyone whose
camera later sees a similar view gets steered onto it with a coloured arrow.
Built for buildings where GPS dies at the door — hospitals, campuses, large
offices — and the alternative is asking the front desk.

## 60-second script

1. On the Mac: `./start.sh`
2. Open **Dashboard** at `http://127.0.0.1:8080/dashboard.html` (same process as the phone now).
3. Accept the local certificate if the browser warns (once).
4. On the same Wi-Fi, open the **Tracker HUD** on iPhone Safari: `https://<lan-ip>:8443/track.html`
5. Tap **Start tracking**, allow camera + motion, walk a hallway. Chevrons and the mini-map trail should grow.
6. Tap **Record path**, name a destination ("Radiology", "Kitchen"), walk to it, tap **Save path**. It now shows up on the dashboard's Recorded paths bar and on the shared map.
7. Walk that route again later (or have a second phone do it) — the HUD should recognise the view and surface a coloured **"Path to …"** chip with its own arrow, distinct from the white "back to start" trail.
8. If there's nothing recorded yet to recognise, open `/track.html?demo=1` for a canned walk that fires a simulated match against the seeded demo path — clearly tagged **sim** so it's never confused with a real recognition.
9. Tap **casualty** / **hazard** / **blocked** to log a facilities issue; it appears in Findings and on the shared map.

Mac-only backup: open `/track.html` in Chrome on the Air, use the webcam, walk with the laptop or hold the screen to simulate steps.

## What is running

| Surface | URL |
|---|---|
| Join | `https://<lan-ip>:8443/` |
| Tracker HUD | `/track.html` |
| Dashboard | `/dashboard.html` |

The Mac hosts HTTP `:8080` and HTTPS `:8443` **in one process** so phones and the
dashboard share the same map. Each tracker estimates pose in the browser (step
detection + compass). Recorded paths and their keyframes persist in a SQLite
database (`server/data/nogps.db`) so they survive a restart.

### How recognition works

- **Recording**: every ~0.7–1m of travel, the HUD grabs a camera frame, embeds
  it client-side with MobileNetV2 (loaded from CDN on first use), and sends
  `{pose, embedding, thumbnail}` to the server.
- **Matching**: while walking normally (not recording), the HUD periodically
  embeds the live frame and asks the server for the nearest stored waypoints
  by cosine similarity (`server/store.py::match_embedding`).
- **Recommendation**: a match above threshold returns the *bearing* the
  original recorder turned shortly after a similarly-framed waypoint — a
  relative "keep going this way" cue, not an absolute coordinate, since two
  phones never share a dead-reckoning origin. The HUD renders it as a
  colour-keyed chevron ribbon plus a labelled chip.

## Dev

```bash
./start.sh                 # build + serve on :8443
cd web && npm run dev      # Vite HUD (needs ./dev-server.sh for /ws)
./dev-server.sh            # FastAPI only
```

`mkcert` is preferred so iPhone trusts the cert. Without it, `start.sh` writes a self-signed pair and Safari will show a warning.

## Honest limits

- Position is step-count + compass dead reckoning, not real visual-inertial
  SLAM — scale is a manual "walk 5m, calibrate" gesture, and drift correction
  is a coordinate-snap loop closure, not a visual one yet.
- Recognition is single-floor and match-threshold-tuned on synthetic data —
  it hasn't been calibrated against real hallway footage, so `MATCH_THRESHOLD`
  in `server/store.py` will likely need adjusting in the field.
- Recorded paths from different phones live in different, unaligned
  coordinate frames, which is why recommendations are relative bearings
  rather than points on a shared map — merging multiple people's walks into
  one true graph is future work.
- Camera frames and thumbnails are stored for matching; there is no retention
  policy or privacy control yet. Do not point this at anything sensitive
  before that exists.
