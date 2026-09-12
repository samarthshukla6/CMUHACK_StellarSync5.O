import type { GeoPlace } from "./types";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: Record<string, string>;
}

/**
 * Free geocoding via OpenStreetMap Nominatim. No API key needed, but the
 * public instance is rate-limited (~1 req/s) — fine for a search box a
 * human types into, not for bulk lookups.
 */
export async function geocodePlace(
  query: string,
  signal?: AbortSignal
): Promise<GeoPlace | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);

  const results: NominatimResult[] = await res.json();
  const top = results[0];
  if (!top) return null;

  const address = top.address ?? {};
  const country = address.country;
  const locality =
    address.city ?? address.town ?? address.village ?? address.state;
  const subtitle = [locality, country].filter(Boolean).join(", ");

  return {
    name: top.name || trimmed,
    subtitle: subtitle || top.display_name,
    lat: parseFloat(top.lat),
    lng: parseFloat(top.lon),
  };
}
