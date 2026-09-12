# Executed traveler scenarios

Run `npm run examples:traveler` to regenerate fresh drafts and quotes. These four examples use a mocked provider replaying a recorded backpack inventory, so the confirmation/removal behavior is reproducible without network access.

| Scenario | Selected expected value | Status | Proposed limit | Session price |
| --- | ---: | --- | ---: | ---: |
| Bag only; remove shirt and jeans | $90 | demo_quote_ready | $100 | $1.49 |
| Bag + declared clothing | $190 | demo_quote_ready | $200 | $1.49 |
| Bag + unverified declared laptop | $990 | requires_review | $100 eligible-item preview | null |
| Unattended storage | $90 | ineligible | $100 informational preview | null |

Each is a six-hour session. None issues insurance. Full `.draft.json`, `.confirmation.json`, `.metadata.json`, and `.quote.json` files are saved. `summary.json` contains the compact results. The laptop's $900 value remains pending verification, not silently covered.

`live-backpack-flow.json`, when present, records an additional real Gemini call with the new traveler-specific prompt against the public Kånken lifestyle photograph. It is separate from the mocked scenarios. Source/attribution: `../live/SOURCES.md`.

Example files contain timestamps and expire intentionally. Regenerate them before trying the local CLI quote command. They are developer examples, not proof of user confirmation or actual storage custody.
