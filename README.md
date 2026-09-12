<div align="center">

# TravelX(AI)
### StellarSync 5.0 · HackCMU

**Talk. Fly. Drop the bags. Find your way. Run AI on-device.**

Voice-first travel OS — plan a trip by speaking, scrape the world onto a 3D globe, stash luggage at nearby shops so you never book a hotel just to store a bag, navigate GPS-dead buildings, and keep a private copilot in the browser.

[![HackCMU](https://img.shields.io/badge/HackCMU-StellarSync_5.0-7c3aed?style=for-the-badge)](https://github.com/samarthshukla6/CMUHACK_StellarSync5.O)
[![Voice](https://img.shields.io/badge/Voice-ElevenLabs-000000?style=for-the-badge)](https://elevenlabs.io)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![WebGPU](https://img.shields.io/badge/On--device-WebGPU-76B900?style=for-the-badge)](https://www.w3.org/TR/webgpu/)

<br/>

`voice itinerary` · `3D globe scrape` · `bag drop, no hotel` · `indoor NoGPS` · `local WebGPU`

</div>

---

## The problem

Travel still assumes you **book a room** just to park a suitcase, **type forms** to plan a day, and **ask the front desk** the second GPS dies indoors.

TravelX(AI) flips that.

| Pain | TravelX(AI) move |
| --- | --- |
| Planning is a spreadsheet | Talk to TravelX. Gemini writes the itinerary. |
| “What should I even see?” | Globe flies there. Gemini scrapes the famous spots. |
| Hotel booked only for luggage | Voice + photo bag-drop at a nearby shop. Roam hotel-free. |
| GPS dies in hospitals / campuses | Record a hallway once. Camera + compass steers the next person. |
| Cloud AI everywhere | WebGPU Studio runs models on *your* GPU. |

---

## Architecture

```
                    ┌─────────────────────────────┐
                    │   TravelX(AI) Dash :3000    │
                    │   ElevenLabs voice · Gemini │
                    │        itinerary / PDF      │
                    └──────────────┬──────────────┘
           iframe tabs             │
   ┌───────────┬───────────┬───────┴────────┬────────────┐
   ▼           ▼           ▼                ▼            ▼
 Globe      Luggage      NoGPS           WebGPU      Transcript
 :3010      Mate :8094   :8080 / :8443   Studio      + PDF
 3D Earth   Auth0 +      Camera + IMU    :3020
 Gemini     Mongo +      MobileNet       WebLLM
 scrape     Gemini       match           on-device
            vision
```

Five apps. One cockpit. Each feature is a standalone codebase, wired into the dashboard as a stage.

---

## Features

### 1 · Voice trip planner
**TravelX talks. You talk back. The plan writes itself.**

- Real-time conversational AI via **ElevenLabs**
- Traveler avatars, live transcript, call-to-itinerary
- **Gemini** turns the conversation into a day-by-day plan
- Export **PDF** or email it to a guide

**Folder:** [`HealthX_Dashboard`](./HealthX_Dashboard) · **Dev:** `http://localhost:3000`

> **Demo video:**  
> `https://youtu.be/________`

---

### 2 · Luggage Mate — no hotel required
**Say what you’re carrying. Drop it at a shop. Keep walking.**

- Voice-style bag drop: destination, bags, suggested locker
- **Gemini vision** reads photos of belongings + estimates value
- Nearby businesses, walking directions, Auth0 + MongoDB booking
- Solves the “I only booked a hotel to store my suitcase” problem

**Folder:** [`luggage-mate`](./luggage-mate) · **Dev:** `http://127.0.0.1:8094`

<img width="1710" height="1107" alt="Image" src="https://github.com/user-attachments/assets/06f3c608-f6f5-4bc1-a97d-8a078f1e3b34" />

---

### 3 · NoGPS indoor maps
**GPS dies at the door. The hallway still knows the way.**

- Walk a route once, name it (“Radiology”, “Kitchen”)
- Phone HUD: camera + step count + compass dead-reckoning
- **MobileNetV2** embeddings match the live view to recorded waypoints
- Coloured arrow + shared incident map (casualty / hazard / blocked)
- Built for hospitals, campuses, terminals — anywhere satellites can’t see

**Folder:** [`NoGPS`](./NoGPS) · **Dev:** `http://127.0.0.1:8080/dashboard.html` · HUD `https://<lan-ip>:8443/track.html`

> **Demo video:**  
> `https://youtu.be/________`

---

### 4 · 3D globe + Gemini scrape
**Name a city. The planet swoops in. Attractions appear.**

- Full **Three.js / react-globe.gl** Earth in a starfield
- Fly-to any place (OpenStreetMap geocode)
- **Gemini** scrapes the 3 most famous sights
- Wikipedia photos, descriptions, Google Maps deep-links

**Folder:** [`3d globe render travel`](./3d%20globe%20render%20travel) · **Dev:** `http://localhost:3010`

> **Demo video:**  
> `https://youtu.be/________`

---

### 5 · WebGPU Studio
**A local-first copilot. No cloud key. Your GPU.**

- **WebLLM + WebGPU** chat (Llama / Qwen / Gemma) in the browser
- Vision via Transformers.js · embeddings in IndexedDB
- Structured JSON generation · streaming UI
- Private by default — models stay on-device

**Folder:** [`Webg/WebGPU-Studio`](./Webg/WebGPU-Studio) · **Dev:** `http://localhost:3020`

> **Demo video:**  
> `https://youtu.be/________`

---

## Team StellarSync 5.0

Built at **HackCMU** by **StellarSync 5.0**.

| | Name | Role |
| :---: | --- | --- |
| ◆ | _add name_ | Voice / TravelX dashboard |
| ◆ | _add name_ | 3D globe + Gemini scrape |
| ◆ | _add name_ | Luggage Mate / bag-drop |
| ◆ | _add name_ | NoGPS indoor wayfinding |
| ◆ | _add name_ | WebGPU Studio |

> Swap the `_add name_` rows for the real roster. Repo: [samarthshukla6/CMUHACK_StellarSync5.O](https://github.com/samarthshukla6/CMUHACK_StellarSync5.O)

---

## Implementation & tech stack

### Shell
| Layer | Stack |
| --- | --- |
| Dashboard | Next.js 16 · React 19 · TypeScript · Tailwind · Framer Motion |
| Voice | ElevenLabs Conversational AI |
| Itinerary | Google Gemini · `@react-pdf/renderer` · Nodemailer |
| Composition | Each feature is an **iframe stage** — own server, own deploy |

### Feature stacks

| Feature | Runtime | AI / sensing | Data / maps |
| --- | --- | --- | --- |
| **Voice planner** | Next.js | ElevenLabs + Gemini | PDF / email |
| **Luggage Mate** | Express · Auth0 PKCE | Gemini Flash vision + valuation | MongoDB Atlas · Google Maps / Directions |
| **NoGPS** | FastAPI · Uvicorn · Vite · Three.js | MobileNetV2 embeddings · IMU / compass | SQLite paths · WebSocket live map |
| **3D globe** | Next.js · Three.js · react-globe.gl | Gemini structured JSON scrape | Wikipedia REST · OSM Nominatim |
| **WebGPU Studio** | Next.js · Vercel AI SDK | WebLLM / WebGPU · Transformers.js · ONNX | Hugging Face models · IndexedDB |

---

## Quick start

Need **Node ≥ 20** (Luggage Mate prefers 24) and Python 3.10+ for NoGPS.

```bash
git clone https://github.com/samarthshukla6/CMUHACK_StellarSync5.O.git
cd CMUHACK_StellarSync5.O
```

| App | Start | URL |
| --- | --- | --- |
| TravelX(AI) dashboard | `cd HealthX_Dashboard && npm i && npm run dev` | http://localhost:3000 |
| Globe | `cd "3d globe render travel" && npm i && npm run dev` | http://localhost:3010 |
| Luggage Mate | `cd luggage-mate && npm i && npm start` | http://127.0.0.1:8094 |
| NoGPS | `cd NoGPS && ./start.sh` | http://127.0.0.1:8080/dashboard.html |
| WebGPU Studio | `cd Webg/WebGPU-Studio && npm i && npm run dev` | http://localhost:3020 |

Copy each app’s `.env.example` → `.env` / `.env.local` (Gemini, ElevenLabs, Auth0, Mongo, Maps). **Do not commit real keys.**

Dashboard iframe URLs live in `HealthX_Dashboard/.env.local`:

```
NEXT_PUBLIC_GLOBE_APP_URL=http://localhost:3010
NEXT_PUBLIC_LUGGAGEMATE_APP_URL=http://127.0.0.1:8094/dashboard/
NEXT_PUBLIC_NOGPS_APP_URL=http://localhost:8080/dashboard.html
NEXT_PUBLIC_WEBGPU_APP_URL=http://localhost:3020
```

---

## Repo map

```
CMUHACK_StellarSync5.O/
├── HealthX_Dashboard/          # TravelX(AI) voice + itinerary cockpit
├── luggage-mate/               # bag-drop, no hotel
├── NoGPS/                      # indoor wayfinding
├── 3d globe render travel/     # globe + Gemini scrape
└── Webg/WebGPU-Studio/         # on-device WebGPU AI
```

---

<div align="center">

**TravelX(AI)** · StellarSync 5.0 — HackCMU

*Travel light. Talk first. Never lose the hallway.*

</div>
