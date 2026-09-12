import { NextResponse } from "next/server";
import { generateReportFromTranscript } from "@/services/report/generate-report";
import type { TranscriptEntry } from "@/types";

export async function POST(request: Request) {
  try {
    const { transcript } = (await request.json()) as { transcript?: TranscriptEntry[] };

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: "Transcript is required and must be an array" },
        { status: 400 }
      );
    }

    const report = await generateReportFromTranscript(transcript);
    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate report";
    console.error("[generate-report]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
