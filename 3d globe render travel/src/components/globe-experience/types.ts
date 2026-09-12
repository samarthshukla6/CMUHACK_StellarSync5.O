export interface GeoPlace {
  name: string;
  subtitle?: string;
  lat: number;
  lng: number;
}

export interface RingDatum {
  id: string;
  lat: number;
  lng: number;
  color: string;
  maxR: number;
  propagationSpeed: number;
  repeatPeriod: number;
}

export interface LabelDatum {
  id: string;
  lat: number;
  lng: number;
  name: string;
  subtitle?: string;
}

export interface GlobeExperienceProps {
  /** Fills its parent container — size the wrapper, not this component. */
  className?: string;
  /** Place the globe opens already looking at. Defaults to a wide Earth view. */
  initialLocation?: GeoPlace;
  /** Fires once the fly-to animation settles on a searched place. */
  onArrive?: (place: GeoPlace) => void;
  /** Hide the built-in search bar to drive the globe purely via props/ref. */
  showSearch?: boolean;
}

export interface GlobeExperienceHandle {
  flyTo: (place: GeoPlace) => void;
}

export interface Attraction {
  name: string;
  description: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  mapsUrl: string;
}
