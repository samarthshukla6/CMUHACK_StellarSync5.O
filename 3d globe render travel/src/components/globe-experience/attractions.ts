import type { Attraction, GeoPlace } from "./types";

export async function fetchAttractions(
  place: GeoPlace,
  signal?: AbortSignal
): Promise<Attraction[]> {
  const url = new URL("/api/attractions", window.location.origin);
  url.searchParams.set("place", place.name);
  if (place.subtitle) url.searchParams.set("country", place.subtitle);

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Attractions request failed (${res.status})`);

  const data = await res.json();
  return data.attractions ?? [];
}
