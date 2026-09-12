export const ELEVENLABS_AGENT_ID =
  process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID?.trim() ?? "";

// URL of the standalone "3D Globe" codebase (its own repo/server/deploy).
// Runs on its own port in dev — see 3d globe render travel/README.md.
export const GLOBE_APP_URL =
  process.env.NEXT_PUBLIC_GLOBE_APP_URL?.trim() || "http://localhost:3010";

// URL of the standalone "NoGPS" codebase (its own Python/FastAPI + Vite
// repo/server/deploy). Its dashboard view over plain HTTP — see NoGPS/README.md.
export const NOGPS_APP_URL =
  process.env.NEXT_PUBLIC_NOGPS_APP_URL?.trim() || "http://localhost:8080/dashboard.html";

// URL of the standalone "luggage-mate" codebase (its own Express repo/
// server/deploy). Its booking dashboard view — see luggage-mate/README.md.
export const LUGGAGEMATE_APP_URL =
  process.env.NEXT_PUBLIC_LUGGAGEMATE_APP_URL?.trim() || "http://127.0.0.1:8094/dashboard/";

// URL of the standalone "WebGPU Studio" codebase (its own Next.js repo/
// server/deploy). Runs on its own port in dev — see Webg/WebGPU-Studio/README.md.
export const WEBGPU_APP_URL =
  process.env.NEXT_PUBLIC_WEBGPU_APP_URL?.trim() || "http://localhost:3020";
