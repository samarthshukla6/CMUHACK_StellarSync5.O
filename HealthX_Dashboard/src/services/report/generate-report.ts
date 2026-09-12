import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TravelReport, TranscriptEntry } from "@/types";
import { getGeminiApiKey, getGeminiModelCandidates } from "@/lib/env";
import { parseGeminiReportResponse } from "@/lib/report/parse-markdown";

function formatTranscript(transcript: TranscriptEntry[]): string {
  return transcript
    .map((msg) => `${msg.role === "user" ? "Traveler" : "Atlas"}: ${msg.text}`)
    .join("\n");
}

function buildReportPrompt(formattedTranscript: string): string {
  return `
Extract a short travel itinerary from this call between Atlas (AI planner) and a traveler. Use only facts from the transcript. Keep it concise.

**Output Format:**
1. **Markdown** with ## headings.
2. **JSON** with these keys:
   * \`travelerInformation\`: object (name, party size, budget if mentioned). Lowercase keys.
   * \`destination\`: string.
   * \`tripDetails\`: string (duration, dates, trip type).
   * \`recommendedPlaces\`: array of strings (3 or fewer if that is all they discussed).
   * \`itinerary\`: string (day-by-day, morning / afternoon / evening).
   * \`nextActions\`: array of strings (what they should do next).

**Instructions:**
* Do not invent opening hours, prices, visas, or bookings.
* If a section was not discussed, leave it empty.
* No medical or legal advice.

**Conversation Transcript:**
---
${formattedTranscript}
---

**Generated Output (Markdown and JSON):**
\`\`\`markdown
## Traveler
...
\`\`\`

\`\`\`json
{
  "travelerInformation": {},
  "destination": "",
  "tripDetails": "",
  "recommendedPlaces": [],
  "itinerary": "",
  "nextActions": []
}
\`\`\`
`.trim();
}

export async function generateReportFromTranscript(
  transcript: TranscriptEntry[]
): Promise<TravelReport> {
  if (!transcript.length) {
    throw new Error("Transcript data is empty.");
  }

  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const prompt = buildReportPrompt(formatTranscript(transcript));
  const modelNames = getGeminiModelCandidates();

  let lastError: Error | null = null;
  let responseText: string | null = null;

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`Gemini model ${modelName} failed:`, lastError.message);
    }
  }

  if (!responseText) {
    throw lastError ?? new Error("All Gemini models failed.");
  }

  return parseGeminiReportResponse(responseText);
}
