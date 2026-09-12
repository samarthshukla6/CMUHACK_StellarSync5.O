export type TranscriptRole = "user" | "assistant";

export interface TranscriptEntry {
  role: TranscriptRole;
  text: string;
  type?: "final" | "partial";
  timestamp?: Date;
}

export interface StructuredReport {
  travelerInformation: Record<string, string>;
  destination: string;
  tripDetails: string;
  recommendedPlaces: string[];
  itinerary: string;
  nextActions: string[];
}

export interface TravelReport {
  markdown: string;
  structured: StructuredReport | null;
}

export interface Guide {
  id: number;
  name: string;
  styleId: string;
  style: string;
  avatarUrl: string;
  email: string;
}

export interface TripStyle {
  id: string;
  label: string;
}

export interface Avatar {
  src: string;
  gender: "male" | "female";
  age: "child" | "teenager" | "old";
  label: string;
}

export interface VoiceSessionError extends Error {
  userMessage?: string;
}

export interface ScheduleGuidePayload {
  guideId: number;
  guideName: string;
  guideEmail: string;
  guideStyle: string;
  appointmentDate: string;
  appointmentTime: string;
  travelerName?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  report?: TravelReport;
  bookedSlots?: { appointmentDate: string; appointmentTime: string }[];
  data?: T;
}
