"use client";

import { useState } from "react";
import { FileText, Download, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { getReportPreviewText } from "@/lib/report/format";
import { TravelReportPdfDocument } from "@/components/report/medical-report-pdf";
import { ReportPreview } from "@/components/report/report-preview";
import type { TravelReport, TranscriptEntry } from "@/types";

interface ConsultationReportActionsProps {
  transcript: TranscriptEntry[];
  report: TravelReport | null;
  isGeneratingReport: boolean;
  conversationActive: boolean;
  onGenerate: (transcript: TranscriptEntry[]) => Promise<TravelReport | null>;
}

export function ConsultationReportActions({
  transcript,
  report,
  isGeneratingReport,
  conversationActive,
  onGenerate,
}: ConsultationReportActionsProps) {
  const [localGenerating, setLocalGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const generating = isGeneratingReport || localGenerating;
  const hasReport = !!(report?.markdown || report?.structured);
  const hasTranscript = transcript.length > 0;
  const canGenerate = hasTranscript && !conversationActive && !generating;
  const previewText = getReportPreviewText(report);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLocalGenerating(true);
    try {
      await onGenerate(transcript);
      setShowPreview(true);
    } finally {
      setLocalGenerating(false);
    }
  };

  const disabledReason = conversationActive
    ? "Finish the call first"
    : !hasTranscript
    ? "Complete a planning call first"
    : null;

  return (
    <div className="flex-shrink-0 mt-3 pt-3 lg:pt-4 border-t border-slate-200">
      <div className="flex items-center gap-2 mb-2 lg:mb-3">
        <Sparkles className="h-4 w-4 text-indigo-500 flex-shrink-0" />
        <h3 className="text-xs lg:text-sm font-semibold text-slate-900">Trip itinerary</h3>
        {disabledReason && (
          <span className="text-[10px] lg:text-xs text-amber-600 ml-auto truncate">
            {disabledReason}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:gap-4">
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-3 lg:p-5 flex flex-col lg:min-h-[172px]">
          <div className="flex items-start gap-2 lg:gap-3 mb-2 lg:mb-3">
            <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs lg:text-sm font-semibold text-slate-900">Travel itinerary</p>
              <p className="text-[10px] lg:text-xs text-slate-500 mt-0.5 hidden lg:block">
                Atlas planning summary via Gemini
              </p>
            </div>
            {hasReport && (
              <CheckCircle2 className="h-4 w-4 lg:h-5 lg:w-5 text-green-500 flex-shrink-0" />
            )}
          </div>

          {hasReport && report && (
            <div className="mb-2 lg:mb-3">
              {showPreview ? (
                <div className="max-h-24 lg:max-h-32 overflow-y-auto rounded-lg border border-indigo-50 bg-white/80 p-2">
                  <ReportPreview report={report} />
                </div>
              ) : (
                previewText && (
                  <p className="text-[10px] lg:text-xs text-slate-600 bg-white/70 rounded-lg p-2 line-clamp-2 border border-indigo-50">
                    {previewText}…
                  </p>
                )
              )}
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="text-[10px] text-indigo-600 mt-1 hover:underline"
              >
                {showPreview ? "Hide preview" : "Show formatted preview"}
              </button>
            </div>
          )}

          <div className="flex gap-2 mt-auto">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex-1 h-9 lg:h-11 rounded-lg text-xs lg:text-sm font-medium flex items-center justify-center gap-1.5 disabled:bg-slate-100 disabled:text-slate-400 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              )}
              <span className="hidden lg:inline">
                {generating ? "Generating…" : "Generate itinerary"}
              </span>
              <span className="lg:hidden">{generating ? "…" : "Generate"}</span>
            </button>

            {hasReport && report ? (
              <PDFDownloadLink
                document={<TravelReportPdfDocument report={report} />}
                fileName="travel-itinerary.pdf"
                className="flex-1 h-9 lg:h-11 rounded-lg text-xs lg:text-sm font-medium flex items-center justify-center gap-1.5 border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 shadow-sm"
              >
                {({ loading }) => (
                  <>
                    <Download className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                    <span className="hidden lg:inline">
                      {loading ? "Preparing…" : "Download PDF"}
                    </span>
                    <span className="lg:hidden">{loading ? "…" : "PDF"}</span>
                  </>
                )}
              </PDFDownloadLink>
            ) : (
              <button
                type="button"
                disabled
                className="flex-1 h-9 lg:h-11 rounded-lg text-xs lg:text-sm font-medium flex items-center justify-center gap-1.5 border border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
              >
                <Download className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                <span className="hidden lg:inline">Download PDF</span>
                <span className="lg:hidden">PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
