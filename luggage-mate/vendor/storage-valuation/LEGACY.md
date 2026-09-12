# Legacy monthly valuation API

This documents the original compatibility API. New integrations should follow README.md and TRAVELER_FLOW.md. Historical live results here used the original all-watches review rule.

# Storage contents valuation

Reusable TypeScript backend: photographs → Gemini inventory → validated quantities and unit values → deterministic review rules → estimated replacement value → recommended coverage → **demo-only** monthly premium. No final product UI, database, external pricing, or authentication is included.

## Setup

Requires Node.js 20.19+ (verified with Node 22). From this package directory:

```bash
npm install
cp .env.example .env
```

Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) and set `GEMINI_API_KEY` in `.env`. Do not commit it. CLI/server load `.env`; library callers manage their environment themselves. `.gitignore` excludes `.env`. No key is included in this deliverable.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Required for real inference, server-side only |
| `GEMINI_MODEL` | Optional; defaults to `gemini-3.8-flash` |
| `PORT` | Optional HTTP port; defaults to 3000, loopback binding |
| `RUN_LIVE_GEMINI` | Set to `1` to opt in to live tests |
| `LIVE_IMAGE_PATHS` | Comma-separated paths to 1–5 actual photographs for live tests |

The installed `@google/genai` 2.22 SDK uses `interactions.create`, `response_format: {type: "text", mime_type: "application/json", schema}`, and `output_text`. See Google's [Interactions migration documentation](https://ai.google.dev/gemini-api/docs/interactions-breaking-changes-may-2026). Requests set `store: false`, low thinking, and send every normalized image together. The exact supplied inventory prompt is preserved, with a separate quantity-semantics instruction. There are no search tools. No provider substitution or model fallback occurs.

## Commands

```bash
npm run typecheck
npm test
npm run build
npm run examples
npm run analyze -- ./photo1.jpg ./photo2.jpg
npm start
# Or after build:
npm run start:built
```

```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/analyze \
  -F "images=@box1.jpg" \
  -F "images=@box2.jpg" \
  -F "riskMultiplier=1"
```

Successful responses contain `status`, `currency`, `imagesAnalyzed`, `items`, `totals`, `premium`, `warnings`, and provider/model/time metadata. `replacementValue` is per unit; multiply by `quantity` for item totals. Grouped lots use quantity 1. Reviewed items remain included in provisional totals and premiums; a provisional result is not approved coverage.

## Library integration

```ts
import { readFile } from 'node:fs/promises';
import { analyzeStorageContents } from './dist/index.js';

const result = await analyzeStorageContents({
  images: [{ buffer: await readFile('./box.jpg'), mimeType: 'image/jpeg' }],
  currency: 'USD',
  riskMultiplier: 1,
});
```

`AnalyzeStorageContentsDependencies` accepts a provider, `maxImageBytes` (default 12 MiB per image), a custom `sensitiveCategories` keyword set (replaces the defaults), and a clock. An injected `InventoryVisionProvider` only needs `analyze(images)`; optional metadata identifies mocks/custom providers accurately. Import `createApp` from `./dist/server/app.js` for an injectable Hono wrapper. Core services never import Hono.

The first live call exposed a Gemini HTTP 400 rejection of the bounded Zod JSON Schema. `providers/geminiSchema.ts` now omits schema-version and size/upper-bound keywords from the provider schema while retaining structural types, required fields, enums and numeric minimums. The complete Zod schema still enforces every bound after inference. No validation rule was relaxed locally.

## Rules and safety boundaries

- Validate 1–5 JPEG, PNG, or WebP still images, nonempty buffers, and raw size limits. Sharp checks actual format against MIME, rejects animation/corruption, limits decoded pixels to 100 million, applies EXIF rotation, and converts in memory to JPEG at quality 92 with longest side at most 2048px. Small images are not enlarged. Metadata is stripped. Photos are never permanently written to disk by this feature.
- Deduplication is performed by Gemini across all views in one interaction. The domain preserves model quantities and does not merge visually similar inventory entries that could represent separate objects.
- Zod rejects malformed entries, extra fields (including model totals), invalid enums, nonfinite numbers, and inverted price ranges. Safety bounds: at most 500 entries, quantity at most 100,000, unit values at most $1 billion, bounded text lengths. Arithmetic exceeding safe monetary precision is rejected.
- Review triggers: confidence below 0.60; quantity-adjusted expected item value at least $1,000; range ratio above 2.5 when expected item total is at least $200; sensitive category keywords; or a model suggestion. Keyword matching normalizes case, punctuation and underscores and uses word boundaries. Reasons are deduplicated; model reason text is preserved as data. Frontends must render all model text safely, never as raw HTML.
- Totals multiply quantity by unit values, then round to cents. Coverage rounds the expected total upward to $50. Premium is `max(2.99, coverage × 0.003 × riskMultiplier)`, rounded to cents; zero coverage gives zero premium. Risk multiplier must be finite and between 0.25 and 5 inclusive.
- An empty model inventory produces typed `EMPTY_AI_RESPONSE` (HTTP 422), never a fabricated zero quote. The V1 schema cannot reliably distinguish an empty scene from recognition failure, so users should retry with clearer photos. A nonempty valid zero-value inventory can yield zero totals/premium.
- Gemini calls have a 45-second request timeout and at most three total attempts with 250/500ms delays. Only 429, 5xx and recognized connection failures retry. SDK retries are disabled to prevent nested attempts. Authentication failures, malformed JSON and schema failures do not retry.
- HTTP errors contain only safe code/message, without provider details or causes. Image size errors use 413, unsupported MIME 415, invalid request/input 400, empty inventory 422, AI failures 502, unexpected/configuration failures 500. The total multipart body is limited before parsing to five image limits plus 1 MiB overhead.

Vitest is pinned to 4.1.11 with Vite 7 overridden for Node 20 compatibility and to avoid an npm 10 optional-peer resolution failure with newer Vite releases. The final dependency audit reported zero vulnerabilities.

## Tests and examples

Most tests use an injected mock provider; provider adapter tests use a mocked transport. Tests cover validation, EXIF/resize, quantity arithmetic, threshold boundaries, review/status, premium, malformed responses, retries, multipart requests, and safe errors. No offline test contacts Gemini.

`npm run examples` prints full JSON for three mocked scenarios and saves `examples/*.result.json`. Generated blank pixels exercise image decoding only: **these are not visual accuracy demonstrations**. `fixtures/model-responses/duplicates.json` represents one console seen in three views and is valued once.

Live Gemini testing has now succeeded using the public photographs in `examples/live/photos/` and an ephemeral user-supplied key. See `examples/live/README.md` for results and attribution. No key is saved in this package. To run the optional integration test:

```bash
RUN_LIVE_GEMINI=1 LIVE_IMAGE_PATHS=./examples/live/photos/ps5.jpg npm test -- tests/live.test.ts
```

The live test also requires `GEMINI_API_KEY` (including through `.env`); otherwise it skips cleanly. The live sample runs establish basic integration, recognition and duplicate-upload handling only; cluttered scenes, different viewpoints and valuation accuracy still require broader evaluation.

## Limitations and privacy

This does not verify authenticity, retrieve live prices in V1, constitute an insurance appraisal, or constitute actuarially validated insurance pricing. Hidden belongings cannot be inventoried; heavily occluded objects may be missed. Model-estimated identifications, quantities, deduplication and replacement values can be wrong. Deterministic rules catch specified review cases, but cannot establish whether a visual claim is true. Review category matching depends on the model's category label. Values are approximate estimates, with `priceSource: "model_estimate"` and a warning on every successful result.

The Gemini free tier may have different data-use terms than paid commercial usage. For the hackathon, use test/sample imagery rather than sensitive customer possessions. Images are transmitted to Google; `store: false` is not a guarantee about Google's broader data-use policies. Production insurance underwriting requires additional actuarial/risk factors. The demo HTTP service is intended for local use and has no authentication or production traffic controls.

## Future integration hooks (not implemented)

`PriceResolver` describes a future verified-pricing integration; it is intentionally not called in V1. Additional-photo requests, barcode/model-number capture, provider risk modeling (location, loss history, fire protection, flood, security, climate control and duration), and claims feedback (inventory → corrections → declared values → claims → settlement) are documented extension directions only.

## File layout

```text
src/
  index.ts
  domain/       schemas.ts types.ts errors.ts categories.ts
  prompts/      storageInventoryPrompt.ts
  providers/    InventoryVisionProvider.ts GeminiInventoryVisionProvider.ts
  image/        validateImage.ts preprocessImage.ts
  services/     analyzeStorageContents.ts postProcessInventory.ts
                reviewRules.ts valuation.ts premiumCalculator.ts
  pricing/      PriceResolver.ts
  server/       app.ts start.ts
  cli/          analyze.ts loadImages.ts
tests/          domain, provider, image, HTTP, optional live tests
fixtures/model-responses/  four mocked inventories
examples/       runMocked.ts, README.md, three executed result JSON files
.env.example
package.json
package-lock.json
tsconfig.json
tsconfig.check.json
vitest.config.ts
```
