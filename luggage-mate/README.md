# Luggage Mate

HackCMU luggage-storage prototype: choose a fictional business, add belongings manually or through Gemini photos, select optional demo protection, and save a booking with Auth0 and MongoDB Atlas.

**Start here: [SETUP.md](SETUP.md)**. Requires Node 24. Run `npm ci`, create `.env` from `.env.example`, configure your services, and run `npm start`. Open http://127.0.0.1:8094/.

## Included
- Boxmate-inspired homepage and two-page traveler booking flow.
- Auth0 OAuth authorization-code flow with PKCE and server JWT validation.
- Atlas users, fictional businesses/locations, bookings and temporary photo analyses.
- Google Maps and walking directions (legacy Directions API).
- Gemini Flash-Lite photo extraction and value estimation; teammate's source and compiled modules in `vendor/storage-valuation`.
- Tests: `npm test`.

No real reservations, payments, insurance, host interface, drop-off/collection operations or live voice agent. Photo estimates need user review. Map trip-wide detours are illustrative; point-to-business walking directions use Google.

## Code map
`app.js`: booking UI. `photos.js` and `photo-files.js`: photo UI and validation. `auth.js`: login, account and authenticated requests. `server/index.js`: API, persistence and public file allowlist. `server/booking.js`: pricing and validation. `server/photo-analysis.js`: teammate integration. `server/catalog.js`: fictional seed businesses. `maps.js` / `location-view.js`: map UI. `style.css` / `home.js`: visual design.

Secrets and real database records are not included. Use your own cloud resources or obtain access from the owner. Supplied Boxmate fonts/artwork are for this project; no third-party redistribution rights are granted.
