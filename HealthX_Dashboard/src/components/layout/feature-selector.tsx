"use client";

import type { FeatureDefinition } from "@/config/features";

interface FeatureSelectorProps {
  features: FeatureDefinition[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function FeatureSelector({ features, activeId, onSelect }: FeatureSelectorProps) {
  if (features.length < 2) return null;

  return (
    <div className="flex-shrink-0 flex gap-0.5 bg-slate-100 rounded-full p-0.5">
      {features.map((feature) => (
        <button
          key={feature.id}
          type="button"
          onClick={() => onSelect(feature.id)}
          aria-pressed={activeId === feature.id}
          className={`px-2.5 py-1 rounded-full text-[10px] lg:text-xs font-medium whitespace-nowrap transition-colors ${
            activeId === feature.id
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {feature.label}
        </button>
      ))}
    </div>
  );
}
