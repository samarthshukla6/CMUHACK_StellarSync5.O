import { marked } from "marked";
import type { TravelReport, StructuredReport } from "@/types";

marked.setOptions({ gfm: true, breaks: true });

export function stripMarkdown(text = ""): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function markdownToHtml(markdown = ""): string {
  if (!markdown) return "";
  return marked.parse(markdown) as string;
}

export function parseMarkdownSections(markdown = "") {
  const sections: { title: string; body: string; items: string[] }[] = [];
  const parts = markdown.split(/^##\s+/m).filter(Boolean);

  for (const part of parts) {
    const lines = part.trim().split("\n");
    const title = lines[0]?.replace(/\*\*/g, "").trim() || "Section";
    const body = lines.slice(1).join("\n").trim();
    const listItems = body
      .split("\n")
      .map((line) => line.replace(/^[-*]\s+|^\d+\.\s+/, "").replace(/\*\*/g, "").trim())
      .filter((line) => !line.startsWith("-") && line.length > 0 && !line.match(/^#{1,6}/));

    sections.push({ title, body: stripMarkdown(body), items: listItems.filter((l) => l.length > 0) });
  }

  return sections;
}

export function getReportPreviewText(report: TravelReport | null): string | null {
  if (!report) return null;
  if (report.structured?.destination) {
    return stripMarkdown(report.structured.destination);
  }
  if (report.markdown) {
    return stripMarkdown(report.markdown).slice(0, 160);
  }
  return null;
}

export function getReportMarkdown(report: TravelReport | null): string {
  if (!report) return "";
  if (report.markdown) return report.markdown;

  const s = report.structured;
  if (!s) return "";

  let md = "";
  if (Object.keys(s.travelerInformation || {}).length) {
    md += "## Traveler\n";
    Object.entries(s.travelerInformation).forEach(([k, v]) => {
      md += `- **${k}**: ${v}\n`;
    });
    md += "\n";
  }
  if (s.destination) md += `## Destination\n${s.destination}\n\n`;
  if (s.tripDetails) md += `## Trip details\n${s.tripDetails}\n\n`;
  if (s.recommendedPlaces?.length) {
    md += "## Recommended places\n";
    s.recommendedPlaces.forEach((i) => {
      md += `- ${i}\n`;
    });
    md += "\n";
  }
  if (s.itinerary) md += `## Itinerary\n${s.itinerary}\n\n`;
  if (s.nextActions?.length) {
    md += "## Next actions\n";
    s.nextActions.forEach((i) => {
      md += `- ${i}\n`;
    });
  }
  return md.trim();
}

export function emptyStructuredReport(): StructuredReport {
  return {
    travelerInformation: {},
    destination: "",
    tripDetails: "",
    recommendedPlaces: [],
    itinerary: "",
    nextActions: [],
  };
}
