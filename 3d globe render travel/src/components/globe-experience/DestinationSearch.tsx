"use client";

import { useState, type FormEvent } from "react";
import type { GeoPlace } from "./types";
import { FEATURED_DESTINATIONS } from "./destinations";

interface DestinationSearchProps {
  onSubmit: (query: string) => void;
  onPick: (place: GeoPlace) => void;
  isSearching: boolean;
  error: string | null;
}

export default function DestinationSearch({
  onSubmit,
  onPick,
  isSearching,
  error,
}: DestinationSearchProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isSearching) return;
    onSubmit(value);
  };

  return (
    <div className="pointer-events-auto flex w-full max-w-xl flex-col items-center gap-3 px-4">
      <form
        onSubmit={handleSubmit}
        className="group flex w-full items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-2 py-2 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-colors focus-within:border-cyan-300/40 focus-within:bg-white/[0.09]"
      >
        <svg
          className="ml-3 h-4 w-4 shrink-0 text-white/50"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Where do you want to go? Try “Amsterdam”…"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={isSearching || !value.trim()}
          className="shrink-0 rounded-full bg-gradient-to-br from-cyan-300 to-sky-500 px-4 py-2 text-xs font-medium text-slate-950 transition-opacity disabled:opacity-40"
        >
          {isSearching ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
              Locating
            </span>
          ) : (
            "Fly there"
          )}
        </button>
      </form>

      {error && (
        <p className="rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-300 backdrop-blur">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {FEATURED_DESTINATIONS.map((place) => (
          <button
            key={place.name}
            type="button"
            onClick={() => onPick(place)}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/60 transition-colors hover:border-cyan-300/30 hover:bg-white/[0.08] hover:text-white"
          >
            {place.name}
          </button>
        ))}
      </div>
    </div>
  );
}
