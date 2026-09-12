import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be between 1 and 65535");
const server = serve(
  {
    fetch: createApp({ draftSigningSecret: process.env.DRAFT_SIGNING_SECRET })
      .fetch,
    port,
    hostname: "127.0.0.1",
  },
  () =>
    console.log(`Storage valuation API listening on http://localhost:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => server.close());
