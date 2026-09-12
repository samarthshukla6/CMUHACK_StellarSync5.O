# Live backpack results

Two separate real calls to Gemini 3.8 Flash through the unchanged backend pipeline succeeded.

| Backpack | Expected replacement estimate | Range | Identification confidence | Basis | Review |
| --- | ---: | --- | ---: | --- | --- |
| JanSport Big Student (probable model) | $50 | $35–$60 | 0.90 | probable_model | No |
| Fjällräven Kånken | $90 | $70–$100 | 0.95 | exact_model (model-reported) | No |

The JanSport brand patch is readable; the specific model is a prediction based on compartment layout, not a verified label. The Kånken name is visible on the circular logo. Neither run verifies authenticity or actual retail pricing.

The Kånken photo contains a wearer. The inventory pipeline also returned a plaid shirt ($40 expected) and jeans ($50 expected), producing a whole-image total of $180. **The backpack alone is $90.** A backpack-only photo avoids incidental clothing in contents totals. No hidden contents of either bag were inventoried.

These are approximate replacement values, not secondhand sale values or verified shopping prices. Both bags were estimated in good visible condition. Confidence is model-reported identification confidence, not calibrated pricing accuracy.

Full outputs: `backpack-jansport.json` and `backpack-kanken.json`. Photos and license credits are in `photos/` and `SOURCES.md`. No source code changes were needed for these runs.
