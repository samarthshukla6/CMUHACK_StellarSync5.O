import type { ApiResponse, TravelReport, ScheduleGuidePayload, TranscriptEntry } from "@/types";

async function parseJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

export async function generateReport(transcript: TranscriptEntry[]): Promise<TravelReport> {
  const res = await fetch("/api/generate-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });

  const data = await parseJson<ApiResponse>(res);
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  if (!data.report) throw new Error("No itinerary returned");
  return data.report;
}

export async function sendItineraryToGuide(
  file: File,
  guide: { name: string; email: string },
  travelerName = "Traveler"
): Promise<string> {
  const formData = new FormData();
  formData.append("reportFile", file);
  formData.append("guideEmail", guide.email);
  formData.append("guideName", guide.name);
  formData.append("travelerName", travelerName);

  const res = await fetch("/api/send-report", { method: "POST", body: formData });
  const data = await parseJson<ApiResponse>(res);
  if (!res.ok) throw new Error(data.message ?? "Send failed");
  return data.message ?? "Itinerary sent.";
}

export async function scheduleGuideCall(payload: ScheduleGuidePayload): Promise<string> {
  const res = await fetch("/api/schedule-appointment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseJson<ApiResponse>(res);
  if (!res.ok) throw new Error(data.message ?? "Scheduling failed");
  return data.message ?? "Call requested.";
}
