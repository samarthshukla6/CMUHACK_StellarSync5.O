import type { ComponentType } from "react";
import { GLOBE_APP_URL, NOGPS_APP_URL, LUGGAGEMATE_APP_URL, WEBGPU_APP_URL } from "@/config/env.client";

/**
 * Props every stage component receives, regardless of which external
 * codebase it comes from. Keep this minimal and stable — it's the
 * contract a plugged-in codebase is written against.
 */
export interface FeatureStageProps {
  isCallActive: boolean;
}

/**
 * How a feature's stage gets rendered:
 * - "placeholder": nothing wired up yet (current default — reserved space).
 * - "component": an in-process React component. Point `Component` at a
 *   `next/dynamic(() => import("..."), { ssr: false })` wrapper so the
 *   external codebase's JS only loads when this feature is selected and
 *   never touches the main bundle. The import target can be a workspace
 *   package (e.g. "@atlas/globe-mapper") so the codebases stay physically
 *   separate on disk — this file just needs an import path.
 * - "iframe": a fully standalone app (its own server/build/deploy). Fully
 *   decoupled — no shared dependencies at all, communicate via postMessage
 *   if needed.
 */
export type FeatureStage =
  | { kind: "placeholder" }
  | { kind: "component"; Component: ComponentType<FeatureStageProps> }
  | { kind: "iframe"; src: string };

export interface FeatureDefinition {
  id: string;
  label: string;
  stage: FeatureStage;
  /** Whether the "Trip itinerary" section renders below the stage. */
  showItinerary: boolean;
}

export const FEATURES: FeatureDefinition[] = [
  {
    id: "trip-planner",
    label: "Trip Planner",
    // Standalone "3d globe render travel" codebase, served independently
    // (own server/build/deploy) and embedded via iframe. See GLOBE_APP_URL.
    stage: { kind: "iframe", src: GLOBE_APP_URL },
    showItinerary: true,
  },
  {
    id: "luggage-mate",
    label: "Luggage Mate",
    // Standalone "luggage-mate" codebase (its own Express server), served
    // independently and embedded via iframe. See LUGGAGEMATE_APP_URL.
    stage: { kind: "iframe", src: LUGGAGEMATE_APP_URL },
    // Full stage — no itinerary alongside it.
    showItinerary: false,
  },
  {
    id: "no-gps",
    label: "NoGPS",
    // Standalone "NoGPS" codebase (Python/FastAPI + Vite), served
    // independently and embedded via iframe. See NOGPS_APP_URL.
    stage: { kind: "iframe", src: NOGPS_APP_URL },
    // This feature gets the full stage — no itinerary alongside it.
    showItinerary: false,
  },
  {
    id: "webgpu-studio",
    label: "WebGPU Studio",
    // Standalone "WebGPU Studio" codebase (its own Next.js server), served
    // independently and embedded via iframe. See WEBGPU_APP_URL.
    stage: { kind: "iframe", src: WEBGPU_APP_URL },
    // Full stage, same as NoGPS/Luggage Mate above — no itinerary alongside it.
    showItinerary: false,
  },
];

export const DEFAULT_FEATURE_ID = FEATURES[0].id;

export function findFeature(id: string): FeatureDefinition {
  return FEATURES.find((f) => f.id === id) ?? FEATURES[0];
}
