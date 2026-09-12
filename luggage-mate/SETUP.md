# Teammate setup from scratch

## 1. Install and run

Install Node.js 24 LTS. Clone this repository or extract the handoff ZIP, then enter the project folder:

```sh
npm ci
cp .env.example .env
npm start
```

Complete the cloud settings below before using login/booking/photos. Use **http://127.0.0.1:8094/** consistently (not localhost). Restart after changing `.env`. `npm run dev` runs UI-only without loading `.env`. Never serve the whole directory with a static server: `.env` must remain server-only.

## 2. Auth0 / OAuth

Create your own Auth0 tenant and a **Single Page Application**, named Luggage Mate. Set Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins to `http://127.0.0.1:8094`. Enable your desired login connection.

Create an API named Luggage Mate API, Identifier `https://boxmate-travel-api`, signing algorithm RS256. If the dashboard exposes Application Access / user-delegated access, allow this SPA to request that API. A machine-to-machine grant is not needed for traveler login.

Put the SPA Domain and Client ID in `config.js`. Put the same domain and API identifier in `.env` as `AUTH0_DOMAIN` and `AUTH0_AUDIENCE`. No Auth0 client secret is needed. Existing public config points to the owner's tenant; replace it when using your own tenant. Local callback URLs may show a consent/confirmation screen. The SDK caches login in this browser tab's session storage. Use the explicit login control before choosing photos.

Reference: https://auth0.com/docs/quickstart/spa/vanillajs

## 3. MongoDB Atlas

Create a project and cluster (free tier if available). Create a database user with `readWrite` on `boxmate_travel`. Add your current development IP to the network access list. Copy the Node.js SRV connection string into `.env` as `MONGODB_URI`, substituting your credentials and URL-encoding special password characters. Set `MONGODB_DB=boxmate_travel`.

The app creates indexes and seeds three fictional businesses on its first database connection. No manual import or original Boxmate database is required. `/api/health` should return `database: connected`.

Collections:
- `users`: Auth0 subject, profile and timestamps; no passwords or tokens.
- `hosts`: fictional business names/types and active flags (no host UI).
- `storageLocations`: address, coordinates, photo, host reference and prices.
- `bookings`: owner, trip dates, inventory/value, bag count, protection, server-calculated price, retry ID, optional selected photo-analysis snapshot.
- `photoAnalyses`: extracted items/value and owner, expires after 24 hours via TTL. Original images are not stored.

The structure was adapted from Boxmate's Clients/Hosts/StorageLocations/Orders models, not copied customer records. Use a separate development database; the ZIP contains no database dump.

## 4. Google Maps

Enable Maps JavaScript API and obtain a browser key. Create ignored `config.local.js`:

```js
window.BOXMATE_CONFIG.googleMapsApiKey = 'YOUR_RESTRICTED_BROWSER_KEY';
```

Restrict websites to `http://127.0.0.1:8094/*` and API usage appropriately. Walking directions use the legacy DirectionsService, requiring Directions API access; new Google projects may need migration to Routes API. Base maps can work without walking directions. Set cloud billing/quotas according to your account.

Reference: https://developers.google.com/maps/documentation/javascript/get-api-key

## 5. Gemini photo analysis

Create a Gemini API key in Google AI Studio and set `GEMINI_API_KEY` in `.env`. Default model is `gemini-3.5-flash-lite`; optional `GEMINI_MODEL` overrides it. Availability and quotas depend on your Google account.

Signed-in users select up to five JPEG/PNG/WebP images, 25 MB each. Selection starts analysis. Server validates and downsizes images before sending them to Gemini. The user reviews editable values and selects Confirm items before booking. Only extracted data is persisted. Source/compiled teammate code is included under `vendor/storage-valuation`; the integration imports its `dist` modules directly, so no separate vendor install/build is necessary. If editing vendor TypeScript, rebuild its dist using its own package instructions.

## 6. Verify

```sh
npm test
```

Log in, select a location/dates, upload a sample from `vendor/storage-valuation/examples/live/photos`, review the result, confirm items, and Book storage. Open My account to check persistence. Refresh to verify the session survives within the same tab. Check all three protection choices and manual entry too.

The last automated run passed 12 tests. A live Flash-Lite backpack extraction took about 3.2 seconds in one test; latency varies. Recent visual changes have not been visually verified because browser tooling was blocked. The app remains a prototype.

Troubleshooting: port busy → stop the old preview; Atlas unavailable → check credentials/IP access; login audience error → match API identifier/domain on client and server; photo failure → inspect key/quota/model and file format. Do not print credentials in logs or commits.
