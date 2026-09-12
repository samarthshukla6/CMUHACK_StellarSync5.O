# 3D Globe — Fly Anywhere

A self-contained, "fly to any place" 3D globe: a rotating Earth in a dark
space scene that you can send to any city by typing its name — it swoops
across the globe, dives in, and drops a pin.

## Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## The module

Everything lives in [`src/components/globe-experience/`](src/components/globe-experience/)
and is built to be dropped into a larger app later:

```tsx
import { GlobeExperience } from "@/components/globe-experience";

<div style={{ width: 800, height: 600 }}>
  <GlobeExperience />
</div>;
```

It fills whatever container you give it (size the wrapper, not the
component). Props:

- `initialLocation` — `{ name, lat, lng }` to open already looking at.
- `onArrive` — called with the `GeoPlace` once a fly-to animation settles.
- `showSearch` — set `false` to hide the built-in search bar and drive the
  globe yourself via a ref (`ref.current.flyTo(place)`).

Geocoding uses the free OpenStreetMap Nominatim API client-side (no key,
but rate-limited — fine for a human typing into a search box, not for bulk
lookups). Swap `geocode.ts` for Mapbox/Google if you outgrow it.

City-level 3D (real buildings, street-level detail) is intentionally out of
scope for this module — `react-globe.gl` renders a low-res whole-Earth
globe, so zooming in stops at "recognizable coastline," not photorealism.
The natural next step, when you're ready, is handing off to Mapbox GL /
CesiumJS at a close altitude for a true city view.
