# Traveler luggage storage protection — backend prototype

A traveler chooses a short storage session, photographs their luggage, confirms what they are leaving, and receives a **demo session quote**. This package implements the reusable backend and tiny HTTP/CLI wrappers. No product UI, database, authentication or policy issuance is included.

```text
Storage location + start/end → eligibility check (no AI)
Photos → one Gemini interaction → inventory draft (no premium)
Traveler includes/excludes items + declares hidden contents
→ deterministic review and eligibility → coverage proposal → total session premium
```

Read [TRAVELER_FLOW.md](TRAVELER_FLOW.md) for the settled product decisions and API contract. The earlier monthly API remains compatible at `POST /analyze` and `analyzeStorageContents`; it is **not** the recommended traveler flow. See [LEGACY.md](LEGACY.md).

## Setup

Node 20.19+; tested on Node 22.23.2.

```bash
npm install
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env` from [Google AI Studio](https://aistudio.google.com/apikey). Keep it server-side; never commit it. CLI/server load dotenv; library callers supply environment or an injected provider.

| Variable | Use |
| --- | --- |
| `GEMINI_API_KEY` | Required for real image inference only |
| `GEMINI_MODEL` | Defaults to `gemini-3.8-flash` |
| `PORT` | Local server port, default 3000 |
| `DRAFT_SIGNING_SECRET` | Optional stable secret, at least 32 bytes; without it tokens invalidate when the app restarts |
| `RUN_LIVE_GEMINI`, `LIVE_IMAGE_PATHS` | Optional legacy live-test opt-in; not needed for offline tests |

No API key is saved in the deliverable. The original key was used through non-echoing stdin only. Vitest 4.1.11 and a Vite 7 override preserve Node 20 compatibility and avoid an npm optional-peer resolution issue. Scripts use `node --import tsx` to avoid the tsx CLI's extra IPC listener.

## Verify and run examples

```bash
npm run typecheck
npm test
npm run build
npm run examples:traveler
npm run examples       # original mocked monthly scenarios
```

Traveler examples replay a recorded inventory using a mock provider and save full draft, confirmation, and quote JSON under `examples/traveler/`. The generated image is only a preprocessing fixture, not a visual accuracy test. Examples use current timestamps; rerun to refresh expired drafts.

## HTTP API

```bash
npm start
# Or after build:
npm run start:built
```

- `GET /health`
- `POST /traveler/session` — JSON session, returns eligibility before photos
- `POST /traveler/draft` — multipart `images` (1–5) plus one JSON `metadata` field
- `POST /traveler/quote` — JSON `{ draftToken, confirmation }`; no second inference
- `POST /analyze` — original monthly compatibility endpoint

After running the traveler examples, this creates a fresh real AI draft from a sample backpack:

```bash
curl http://localhost:3000/traveler/draft \
  -F 'images=@examples/live/photos/kanken.jpg' \
  -F 'metadata=<examples/traveler/bag-only.metadata.json' > work-draft-response.json
```

The response contains `draft` and `draftToken`. The frontend must show every draft item for confirmation and send the token back unchanged. The token protects the original AI fields from modification; legitimate corrections are explicit user declarations. See the exact confirmation shape in TRAVELER_FLOW.md. Do not fabricate confirmation automatically in the product.

## Developer CLI

```bash
npm run --silent traveler -- draft examples/traveler/bag-only.metadata.json examples/live/photos/kanken.jpg > draft.json
# Review the actual draft and write a matching confirmation JSON.
npm run traveler -- quote draft.json confirmation.json
```

Because npm can print script headers, use `npm run --silent traveler -- ... > draft.json` when redirecting CLI JSON, or run `node dist/cli/traveler.js ...` after building.

A fully offline compiled CLI smoke example:

```bash
npm run examples:traveler
node dist/cli/traveler.js quote \
  examples/traveler/bag-and-declared-contents.draft.json \
  examples/traveler/bag-and-declared-contents.confirmation.json
```

Developer CLI draft files are trusted local inputs. Public applications should use the signed HTTP flow or provide equivalent server-side integrity protection.

## Library integration

```ts
import {
  assessStorageSession,
  createTravelerInventoryDraft,
  quoteTravelerStorage,
} from './dist/index.js';

const assessment = assessStorageSession(session);
// If suitable, collect photos:
const draft = await createTravelerInventoryDraft({
  images, session, coverageScope: 'bag_and_contents',
  photoCoverage: 'bag_exterior_only',
});
// Obtain explicit traveler decisions and declarations:
const quote = quoteTravelerStorage({ draft, confirmation });
```

Use dependency injection for a mock provider and clock. `InventoryVisionProvider` now optionally accepts traveler context; legacy one-argument providers still work. Gemini remains behind the interface, and core services have no Hono imports. `PriceResolver` remains a documented future extension, unused in V1.

## Model and validation

Sharp validates actual JPEG/PNG/WebP still-image contents, corrects EXIF orientation, strips metadata, and resizes in memory to at most 2048px without upscaling. Default raw limit: 12 MiB per image; decoded pixel limit: 100 million. Photos are not written to disk by analysis. All views go to Gemini together for deduplication.

The exact original inventory prompt is preserved. An additional traveler instruction narrows selection to stored belongings, excludes worn clothing/background objects, respects bag-only scope, and forbids inferring hidden contents. Final inclusion always requires traveler confirmation because model selection can still be wrong.

Gemini uses structured output, low thinking, and `store:false`. Live testing exposed an HTTP 400 with the bounded schema; the wire schema omits some size/version/upper-bound keywords while the complete local Zod schema still enforces them. AI totals and premiums are never accepted. Retry limit: three attempts only for recognized transient failures; 45-second per-request timeout. Permanent and malformed-response failures do not retry.

## Limits and privacy

This prototype does not verify identity, ownership, storage operators, authenticity, actual retail prices, or declared values. A signed draft is not proof of ownership or photographic truth. Uploaded images go to Google; free-tier data-use terms may differ from commercial usage. Use sample imagery rather than sensitive customer photos; `store:false` is not a broader data-use guarantee.

This is neither an insurance appraisal nor actuarially validated pricing. Every quote is a demo proposal with `policyIssued:false`. No payment, binding, certificate, claims service or licensed insurer integration exists. Real insurance requires insurer-provided eligibility, rates, wording, limits, evidence requirements, and issuance. The prototype uses US storage sessions and USD replacement estimates only.

Public sample photos retain their licenses and credits in `examples/live/SOURCES.md`. Old and new live results are clearly distinguished from mocked scenarios.
