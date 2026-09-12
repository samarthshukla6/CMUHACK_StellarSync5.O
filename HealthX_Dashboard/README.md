# Atlas Travel

Voice travel planner. Talk to **Atlas**, pick a destination, get a short itinerary, and download or send the plan.

---

## What it does

A traveler starts a voice session with Atlas. Atlas asks where they want to go, how long, and how many people, then recommends places and builds a day-by-day itinerary. When the call ends, Gemini turns the transcript into a structured itinerary (Markdown + JSON) that can be exported as PDF or emailed to a guide.

---

## Features

| Feature | Description |
|---------|-------------|
| **Voice planning** | Real-time speech with Atlas via ElevenLabs Conversational AI |
| **Traveler avatars** | Six avatars for the traveler side of the call |
| **Live transcript** | Traveler vs Atlas messages during the call |
| **Itinerary** | Auto-generated on call end via Google Gemini |
| **PDF export** | Download the itinerary via `@react-pdf/renderer` |
| **Send to a guide** | Email the itinerary to a travel guide |
| **Book a call** | Request a follow-up slot with a guide |

---

## Getting started

- Node.js **≥ 20.19**
- ElevenLabs Conversational AI agent
- Google AI Studio API key (Gemini)
- SMTP credentials if you want email features

```bash
npm install
# Add keys to .env.local (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | Yes (voice) | Public agent ID from ElevenLabs Conversational AI |
| `GEMINI_API_KEY` | Yes (itineraries) | From Google AI Studio |
| `GEMINI_MODEL` | No | Override model |
| `EMAIL_SERVER_HOST` | For email | e.g. `smtp.gmail.com` |
| `EMAIL_SERVER_PORT` | For email | e.g. `587` |
| `EMAIL_SERVER_USER` | For email | SMTP username |
| `EMAIL_SERVER_PASSWORD` | For email | SMTP password / Gmail App Password |
| `EMAIL_FROM` | For email | Sender address |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

Atlas's system prompt and first message live in `src/config/assistant.ts` and are sent to ElevenLabs after connect.
