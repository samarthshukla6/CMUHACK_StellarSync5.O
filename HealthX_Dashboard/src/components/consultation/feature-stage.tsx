"use client";

import type { FeatureStage as FeatureStageConfig, FeatureStageProps } from "@/config/features";

interface FeatureStageRendererProps extends FeatureStageProps {
  stage: FeatureStageConfig;
}

export function FeatureStageRenderer({ stage, ...stageProps }: FeatureStageRendererProps) {
  switch (stage.kind) {
    case "component": {
      const { Component } = stage;
      return (
        <div className="flex-1 min-h-0 lg:flex-1">
          <Component {...stageProps} />
        </div>
      );
    }
    case "iframe":
      return (
        <div className="flex-1 min-h-0 lg:flex-1 rounded-xl overflow-hidden border border-slate-100">
          <iframe
            src={stage.src}
            className="w-full h-full border-0"
            allow="camera; microphone"
          />
        </div>
      );
    case "placeholder":
    default:
      // Reserved space for a future codebase — intentionally blank.
      return <div className="flex-shrink-0 lg:flex-1 lg:min-h-0" />;
  }
}
