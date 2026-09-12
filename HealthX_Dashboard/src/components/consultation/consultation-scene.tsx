"use client";

import { AI_ASSISTANT_NAME } from "@/config/assistant";
import type { FeatureDefinition } from "@/config/features";
import { FeatureSelector } from "@/components/layout/feature-selector";
import { FeatureStageRenderer } from "@/components/consultation/feature-stage";
import { ConsultationReportActions } from "@/components/consultation/consultation-report-actions";
import type { TravelReport, TranscriptEntry } from "@/types";

interface ConsultationSceneProps {
  isCallActive: boolean;
  transcript: TranscriptEntry[];
  report: TravelReport | null;
  isGeneratingReport: boolean;
  onGenerateReport: (transcript: TranscriptEntry[]) => Promise<TravelReport | null>;
  features: FeatureDefinition[];
  activeFeature: FeatureDefinition;
  onSelectFeature: (id: string) => void;
}

export function ConsultationScene({
  isCallActive,
  transcript,
  report,
  isGeneratingReport,
  onGenerateReport,
  features,
  activeFeature,
  onSelectFeature,
}: ConsultationSceneProps) {
  return (
    <section className="h-full min-h-0 flex flex-col rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <header className="flex-shrink-0 flex items-start justify-between gap-2 px-3 py-2.5 lg:px-4 lg:py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/40">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{activeFeature.label}</h2>
          <p className="text-[10px] lg:text-xs text-slate-500 mt-0.5">
            {AI_ASSISTANT_NAME} plans your trip with you
          </p>
        </div>
        <FeatureSelector features={features} activeId={activeFeature.id} onSelect={onSelectFeature} />
      </header>

      <div className="flex-1 min-h-0 flex flex-col p-3 lg:p-4 overflow-y-auto lg:overflow-hidden">
        <FeatureStageRenderer stage={activeFeature.stage} isCallActive={isCallActive} />

        {activeFeature.showItinerary && (
          <ConsultationReportActions
            transcript={transcript}
            report={report}
            isGeneratingReport={isGeneratingReport}
            conversationActive={isCallActive}
            onGenerate={onGenerateReport}
          />
        )}
      </div>
    </section>
  );
}
