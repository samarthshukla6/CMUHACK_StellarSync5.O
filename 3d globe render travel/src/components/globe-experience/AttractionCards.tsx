"use client";

import type { ReactNode } from "react";
import type { Attraction } from "./types";

interface AttractionCardsProps {
  attractions: Attraction[];
  isLoading: boolean;
  error: string | null;
}

function CardShell({
  children,
  delayMs,
}: {
  children: ReactNode;
  delayMs: number;
}) {
  return (
    <div
      className="w-56 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:w-64"
      style={{
        animation: "fadeSlideUp 0.6s ease-out both",
        animationDelay: `${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}

function SkeletonCard({ delayMs }: { delayMs: number }) {
  return (
    <CardShell delayMs={delayMs}>
      <div className="h-28 animate-pulse bg-white/10 sm:h-32" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="h-2.5 w-full animate-pulse rounded bg-white/10" />
        <div className="h-2.5 w-5/6 animate-pulse rounded bg-white/10" />
      </div>
    </CardShell>
  );
}

function PlaceholderArt() {
  return (
    <div className="flex h-28 items-center justify-center bg-gradient-to-br from-cyan-900/40 to-slate-900/60 sm:h-32">
      <svg
        className="h-8 w-8 text-white/25"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </svg>
    </div>
  );
}

export default function AttractionCards({
  attractions,
  isLoading,
  error,
}: AttractionCardsProps) {
  if (!isLoading && !error && attractions.length === 0) return null;

  return (
    <div className="pointer-events-auto flex max-w-full gap-3 overflow-x-auto px-4 pb-1 sm:justify-center sm:overflow-visible">
      {isLoading &&
        [0, 1, 2].map((i) => <SkeletonCard key={i} delayMs={i * 80} />)}

      {!isLoading && error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs text-red-200 backdrop-blur-xl">
          {error}
        </div>
      )}

      {!isLoading &&
        !error &&
        attractions.map((place, i) => (
          <CardShell key={place.name} delayMs={i * 100}>
            {place.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={place.imageUrl}
                alt={place.name}
                className="h-28 w-full object-cover sm:h-32"
                loading="lazy"
              />
            ) : (
              <PlaceholderArt />
            )}
            <div className="flex flex-col gap-1.5 p-3">
              <p className="line-clamp-1 text-sm font-medium text-white">
                {place.name}
              </p>
              <p className="line-clamp-3 text-xs leading-snug text-white/60">
                {place.description}
              </p>
              <a
                href={place.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-cyan-200 transition-colors hover:border-cyan-300/30 hover:bg-white/[0.1]"
              >
                Open in Maps
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </CardShell>
        ))}
    </div>
  );
}
