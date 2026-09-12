"use client";

import dynamic from "next/dynamic";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { GlobeMethods } from "react-globe.gl";
import StarField from "./StarField";
import DestinationSearch from "./DestinationSearch";
import AttractionCards from "./AttractionCards";
import { geocodePlace } from "./geocode";
import { fetchAttractions } from "./attractions";
import type {
  Attraction,
  GeoPlace,
  GlobeExperienceHandle,
  GlobeExperienceProps,
  LabelDatum,
  RingDatum,
} from "./types";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

// Self-hosted (not the unpkg CDN): that CDN is occasionally slow/unreachable,
// and `onGlobeReady` below doesn't fire until this texture finishes loading —
// so a flaky third-party fetch used to leave the spinner stuck forever.
const DAY_TEXTURE = "/textures/earth-blue-marble.jpg";
const BUMP_TEXTURE = "/textures/earth-topology.png";

// Absolute worst case (texture load stalls, WebGL hiccup, etc.) — stop
// showing the spinner and reveal the globe anyway rather than hang forever.
const READY_FALLBACK_MS = 1200;

const DEFAULT_VIEW: GeoPlace = { name: "Earth", lat: 18, lng: 12 };
const HOME_ALTITUDE = 2.4;
const APPROACH_ALTITUDE = 1.55;
const ARRIVAL_ALTITUDE = 0.45;
const APPROACH_MS = 2200;
const DIVE_MS = 1500;

type Phase = "idle" | "searching" | "flying" | "arrived";

const GlobeExperience = forwardRef<GlobeExperienceHandle, GlobeExperienceProps>(
  function GlobeExperience(
    { className, initialLocation = DEFAULT_VIEW, onArrive, showSearch = true },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const globeRef = useRef<GlobeMethods | undefined>(undefined);
    const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

    const [size, setSize] = useState({ width: 0, height: 0 });
    const [isGlobeReady, setIsGlobeReady] = useState(false);
    const [phase, setPhase] = useState<Phase>("idle");
    const [error, setError] = useState<string | null>(null);
    const [activePlace, setActivePlace] = useState<GeoPlace | null>(null);
    const [ringsData, setRingsData] = useState<RingDatum[]>([]);
    const [labelsData, setLabelsData] = useState<LabelDatum[]>([]);
    const [attractions, setAttractions] = useState<Attraction[]>([]);
    const [attractionsLoading, setAttractionsLoading] = useState(false);
    const [attractionsError, setAttractionsError] = useState<string | null>(null);
    const attractionsAbort = useRef<AbortController | null>(null);
    const attractionsKey = useRef<string | null>(null);

    const loadAttractions = useCallback((place: GeoPlace) => {
      const key = place.name.trim().toLowerCase();
      // Already fetching (or done fetching) for this same place — e.g. the
      // geocoded place arriving right after we already kicked this off from
      // the raw typed text. Don't throw away that head start.
      if (key && attractionsKey.current === key) return;
      attractionsKey.current = key;

      attractionsAbort.current?.abort();
      const controller = new AbortController();
      attractionsAbort.current = controller;

      setAttractions([]);
      setAttractionsError(null);
      setAttractionsLoading(true);

      fetchAttractions(place, controller.signal)
        .then((results) => {
          if (controller.signal.aborted) return;
          setAttractions(results);
        })
        .catch((err) => {
          if (controller.signal.aborted || (err as Error).name === "AbortError") return;
          setAttractionsError("Couldn't load recommendations right now.");
        })
        .finally(() => {
          if (controller.signal.aborted) return;
          setAttractionsLoading(false);
        });
    }, []);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    // Safety net: react-globe.gl's `onGlobeReady` only fires once the globe's
    // texture has finished loading. If that ever stalls (slow network, a
    // dropped request, a WebGL hiccup) reveal the globe anyway instead of
    // leaving the "spinning up" spinner on screen forever.
    useEffect(() => {
      if (size.width === 0 || size.height === 0) return;
      const fallback = setTimeout(() => {
        setIsGlobeReady(true);
        // onGlobeReady may not have fired yet (or at all) by this point —
        // make sure the globe is still spinning once it's revealed.
        const globe = globeRef.current;
        if (globe) {
          const controls = globe.controls();
          controls.autoRotate = true;
          controls.autoRotateSpeed = 0.55;
        }
      }, READY_FALLBACK_MS);
      timeouts.current.push(fallback);
      return () => clearTimeout(fallback);
    }, [size.width, size.height]);

    useEffect(() => {
      return () => {
        timeouts.current.forEach(clearTimeout);
        attractionsAbort.current?.abort();
      };
    }, []);

    const clearPendingTimeouts = () => {
      timeouts.current.forEach(clearTimeout);
      timeouts.current = [];
    };

    const flyTo = useCallback((place: GeoPlace) => {
      const globe = globeRef.current;
      if (!globe) return;

      clearPendingTimeouts();
      setError(null);
      setActivePlace(place);
      setPhase("flying");
      setRingsData([]);
      setLabelsData([]);

      // Kick off the recommendations fetch now so it's ready (or close to it)
      // by the time the camera actually arrives.
      loadAttractions(place);

      const controls = globe.controls();
      controls.autoRotate = false;

      globe.pointOfView(
        { lat: place.lat, lng: place.lng, altitude: APPROACH_ALTITUDE },
        APPROACH_MS
      );

      const diveTimer = setTimeout(() => {
        globe.pointOfView(
          { lat: place.lat, lng: place.lng, altitude: ARRIVAL_ALTITUDE },
          DIVE_MS
        );
      }, APPROACH_MS);

      const arriveTimer = setTimeout(() => {
        setPhase("arrived");
        setRingsData([
          {
            id: `${place.lat}-${place.lng}`,
            lat: place.lat,
            lng: place.lng,
            color: "#5eead4",
            maxR: 6,
            propagationSpeed: 2.4,
            repeatPeriod: 1500,
          },
        ]);
        setLabelsData([
          {
            id: `${place.lat}-${place.lng}`,
            lat: place.lat,
            lng: place.lng,
            name: place.name,
            subtitle: place.subtitle,
          },
        ]);
        onArrive?.(place);
      }, APPROACH_MS + DIVE_MS);

      timeouts.current.push(diveTimer, arriveTimer);
    }, [onArrive, loadAttractions]);

    const goHome = useCallback(() => {
      const globe = globeRef.current;
      if (!globe) return;

      clearPendingTimeouts();
      attractionsAbort.current?.abort();
      attractionsKey.current = null;
      setPhase("idle");
      setError(null);
      setActivePlace(null);
      setRingsData([]);
      setLabelsData([]);
      setAttractions([]);
      setAttractionsLoading(false);
      setAttractionsError(null);

      globe.pointOfView(
        { lat: DEFAULT_VIEW.lat, lng: DEFAULT_VIEW.lng, altitude: HOME_ALTITUDE },
        2000
      );
      const resumeTimer = setTimeout(() => {
        const controls = globe.controls();
        controls.autoRotate = true;
      }, 2100);
      timeouts.current.push(resumeTimer);
    }, []);

    useImperativeHandle(ref, () => ({ flyTo }), [flyTo]);

    const handleSubmit = useCallback(
      async (query: string) => {
        setPhase("searching");
        setError(null);

        // Kick off recommendations off the raw typed text immediately, in
        // parallel with geocoding — don't wait for the round trip that only
        // resolves coordinates for the camera. By the time flyTo() calls
        // loadAttractions again with the canonical geocoded name, the key
        // guard in loadAttractions recognizes it's the same place and skips
        // restarting the request.
        const trimmed = query.trim();
        if (trimmed) {
          loadAttractions({ name: trimmed, lat: 0, lng: 0 });
        }

        try {
          const place = await geocodePlace(query);
          if (!place) {
            setError(`Couldn't find "${query}" — try a different spelling.`);
            setPhase("idle");
            attractionsAbort.current?.abort();
            attractionsKey.current = null;
            return;
          }
          flyTo(place);
        } catch {
          setError("Search failed — check your connection and try again.");
          setPhase("idle");
          attractionsAbort.current?.abort();
          attractionsKey.current = null;
        }
      },
      [flyTo, loadAttractions]
    );

    const handleGlobeReady = useCallback(() => {
      const globe = globeRef.current;
      if (!globe) return;
      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.55;
      controls.enableZoom = true;

      // Start further out and ease in for a cinematic entrance.
      globe.pointOfView(
        { lat: initialLocation.lat, lng: initialLocation.lng, altitude: HOME_ALTITUDE + 1.4 },
        0
      );
      setIsGlobeReady(true);
      const settleTimer = setTimeout(() => {
        globe.pointOfView(
          { lat: initialLocation.lat, lng: initialLocation.lng, altitude: HOME_ALTITUDE },
          2600
        );
        // Re-assert in case anything reset it between mount and now.
        controls.autoRotate = true;
      }, 60);
      timeouts.current.push(settleTimer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div
        ref={containerRef}
        className={`relative h-full w-full overflow-hidden bg-[#02040a] ${className ?? ""}`}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(56,189,248,0.10), transparent 60%)," +
              "radial-gradient(ellipse 60% 50% at 80% 80%, rgba(168,85,247,0.08), transparent 60%)," +
              "#02040a",
          }}
        />
        <StarField />

        {size.width > 0 && size.height > 0 && (
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ${
              isGlobeReady ? "opacity-100" : "opacity-0"
            }`}
          >
            <Globe
              ref={globeRef}
              width={size.width}
              height={size.height}
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl={DAY_TEXTURE}
              bumpImageUrl={BUMP_TEXTURE}
              showAtmosphere
              atmosphereColor="#7fd4ff"
              atmosphereAltitude={0.2}
              ringsData={ringsData}
              ringLat="lat"
              ringLng="lng"
              ringColor={(d: object) => (d as RingDatum).color}
              ringMaxRadius={(d: object) => (d as RingDatum).maxR}
              ringPropagationSpeed={(d: object) => (d as RingDatum).propagationSpeed}
              ringRepeatPeriod={(d: object) => (d as RingDatum).repeatPeriod}
              labelsData={labelsData}
              labelLat="lat"
              labelLng="lng"
              labelText={(d: object) => (d as LabelDatum).name}
              labelSize={0.9}
              labelDotRadius={0.32}
              labelColor={() => "#e2fbf6"}
              labelResolution={2}
              labelAltitude={0.012}
              onGlobeReady={handleGlobeReady}
            />
          </div>
        )}

        {!isGlobeReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-white/50">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
              <p className="text-xs tracking-wide uppercase">Spinning up the globe…</p>
            </div>
          </div>
        )}

        {isGlobeReady && phase === "arrived" && activePlace && (
          <div className="pointer-events-none absolute inset-x-0 top-8 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl animate-[fadeSlideIn_0.6s_ease-out]">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_2px_rgba(94,234,212,0.8)]" />
              <div>
                <p className="text-sm font-medium text-white">{activePlace.name}</p>
                {activePlace.subtitle && (
                  <p className="text-xs text-white/50">{activePlace.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={goHome}
                className="ml-2 rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/60 transition-colors hover:border-cyan-300/30 hover:text-white"
              >
                ← Back to space
              </button>
            </div>
          </div>
        )}

        {isGlobeReady && phase === "arrived" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-32 flex justify-center sm:bottom-36">
            <AttractionCards
              attractions={attractions}
              isLoading={attractionsLoading}
              error={attractionsError}
            />
          </div>
        )}

        {showSearch && isGlobeReady && (
          <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center">
            <DestinationSearch
              onSubmit={handleSubmit}
              onPick={flyTo}
              isSearching={phase === "searching"}
              error={error}
            />
          </div>
        )}
      </div>
    );
  }
);

export default GlobeExperience;
