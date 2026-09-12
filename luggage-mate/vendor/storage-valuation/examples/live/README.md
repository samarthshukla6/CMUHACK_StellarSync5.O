# Successful live Gemini tests

Ran against `gemini-3.8-flash` using the normal compiled provider and a user-supplied credential held only in process memory. These JSON files contain actual Gemini results, not fixture responses.

| Scenario | Photos | Status | Expected value | Coverage | Demo monthly premium | Elapsed |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| electronics | 1 | auto_quoted | $520 | $550 | $2.99 | 25.76s |
| watch | 1 | provisional | $20 | $50 | $2.99 | 3.31s |
| duplicate-photo | 2 | auto_quoted | $515 | $550 | $2.99 | 11.30s |

The console and controller were recognized and counted once each even when the identical photograph was submitted twice. The watch was recognized as Casio F-91W, with visible model text, and triggered `verification_sensitive_category` independently of the model suggestion. This reflects the requested rule that every watch needs review, including inexpensive watches.

The repeated-photo run estimated $515 versus $520 for the first run because the controller's model estimate varied by $5; counts remained correct. Replacement estimates are not live prices and need not be identical across requests. The two-photo test does not establish deduplication across different camera angles. These clear product images do not establish accuracy for cluttered storage boxes.

## Live-discovered fix

The initially generated bounded JSON Schema received HTTP 400 from Gemini. Simplifying the wire schema resolved it. The provider now omits schema-version, text-size, array-size, and upper-bound keywords while retaining structural constraints; full Zod validation still enforces the original local limits. `geminiSchema.ts` and its regression test are included. The exact inventory prompt is unchanged.

Read `SOURCES.md` for photo attribution and licenses. Original photographs are in `photos/`. No credential is stored here.

## Backpack follow-up

Two additional live backpack tests succeeded. See `BACKPACKS.md` for bag-only estimates and the incidental clothing found in the lifestyle photo.
