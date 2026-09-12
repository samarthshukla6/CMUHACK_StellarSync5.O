import { GoogleGenAI, ThinkingLevel } from "@google/genai";

interface AttractionRaw {
  name: string;
  description: string;
  wikipediaTitle?: string;
}

interface WikiSummary {
  imageUrl: string | null;
  sourceUrl: string | null;
}

const WIKI_USER_AGENT =
  "3d-globe-render-travel/1.0 (Next.js demo app; no contact configured)";

async function fetchWikiSummary(title: string): Promise<WikiSummary> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { Accept: "application/json", "User-Agent": WIKI_USER_AGENT } }
    );
    if (!res.ok) return { imageUrl: null, sourceUrl: null };
    const data = await res.json();
    if (data.type === "disambiguation") return { imageUrl: null, sourceUrl: null };
    return {
      imageUrl: data.thumbnail?.source ?? data.originalimage?.source ?? null,
      sourceUrl: data.content_urls?.desktop?.page ?? null,
    };
  } catch {
    return { imageUrl: null, sourceUrl: null };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const place = searchParams.get("place");
  const country = searchParams.get("country") ?? "";

  if (!place) {
    return Response.json({ error: "Missing 'place' query param" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Server missing GEMINI_API_KEY" }, { status: 500 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `List the 3 most famous places to visit for a tourist in ${place}${
      country ? `, ${country}` : ""
    }. For each, write a vivid, specific 2-3 sentence description (35-45 words) — no generic filler. Also give the best-matching English Wikipedia article title for that exact landmark or attraction (not the city itself).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // This is a simple lookup/formatting task, not a reasoning task —
        // skip the model's internal "thinking" pass so it responds in
        // seconds instead of ~10s.
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        responseSchema: {
          type: "object",
          properties: {
            attractions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  wikipediaTitle: { type: "string" },
                },
                required: ["name", "description"],
              },
            },
          },
          required: ["attractions"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");

    const parsed: { attractions: AttractionRaw[] } = JSON.parse(text);

    const attractions = await Promise.all(
      parsed.attractions.slice(0, 3).map(async (a) => {
        let wiki = await fetchWikiSummary(a.wikipediaTitle || a.name);
        if (!wiki.imageUrl && a.wikipediaTitle && a.wikipediaTitle !== a.name) {
          wiki = await fetchWikiSummary(a.name);
        }
        return {
          name: a.name,
          description: a.description,
          imageUrl: wiki.imageUrl,
          sourceUrl: wiki.sourceUrl,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${a.name}, ${place}`
          )}`,
        };
      })
    );

    return Response.json({ attractions });
  } catch (err) {
    console.error("[/api/attractions]", err);
    return Response.json({ error: "Failed to fetch attractions" }, { status: 500 });
  }
}
