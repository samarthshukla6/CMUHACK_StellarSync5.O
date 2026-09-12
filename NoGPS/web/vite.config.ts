import { defineConfig } from "vite";
import { resolve } from "node:path";
import fs from "node:fs";

const certDir = resolve(__dirname, "../certs");
const keyPath = resolve(certDir, "localhost-key.pem");
const certPath = resolve(certDir, "localhost.pem");
const https =
  fs.existsSync(keyPath) && fs.existsSync(certPath)
    ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
    : undefined;

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    https,
    proxy: {
      "/ws": {
        target: "https://127.0.0.1:8443",
        ws: true,
        secure: false,
      },
      "/api": {
        target: "https://127.0.0.1:8443",
        secure: false,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    https,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        track: resolve(__dirname, "track.html"),
        dashboard: resolve(__dirname, "dashboard.html"),
      },
    },
  },
});
