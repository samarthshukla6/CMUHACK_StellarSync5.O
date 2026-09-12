"use client";

import { useState, useCallback, useEffect } from "react";
import { generateReport } from "@/lib/api/consultation-api";
import type { TravelReport, TranscriptEntry } from "@/types";

const WAS_CONNECTED_KEY = "wasConnected";

export function useConsultationReport(connected: boolean, transcript: TranscriptEntry[]) {
  const [report, setReport] = useState<TravelReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReportFromTranscript = useCallback(async (entries: TranscriptEntry[]) => {
    if (!entries.length) return null;

    setIsGenerating(true);
    setReport(null);

    try {
      const result = await generateReport(entries);
      setReport(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[useConsultationReport]", message);
      const errorReport: TravelReport = {
        markdown: `Failed to generate itinerary: ${message}`,
        structured: null,
      };
      setReport(errorReport);
      return errorReport;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  useEffect(() => {
    const wasConnected = sessionStorage.getItem(WAS_CONNECTED_KEY) === "true";

    if (wasConnected && !connected && transcript.length > 0) {
      generateReportFromTranscript(transcript);
    }

    sessionStorage.setItem(WAS_CONNECTED_KEY, connected ? "true" : "false");

    return () => {
      if (!connected) sessionStorage.removeItem(WAS_CONNECTED_KEY);
    };
  }, [connected, transcript, generateReportFromTranscript]);

  return { report, isGenerating, generateReportFromTranscript };
}
