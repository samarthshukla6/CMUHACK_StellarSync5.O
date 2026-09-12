# Executed mocked examples

Run `npm run examples` from the package root to print and regenerate all three complete JSON results. Inventories come from `fixtures/model-responses`; generated plain pixels are only an image-pipeline test input. No actual photograph recognition is claimed.

| Scenario | Status | Low | Expected | High | Coverage | Monthly demo premium |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Ordinary box | auto_quoted | 190 | 310 | 460 | 350 | 2.99 |
| Electronics box | auto_quoted | 580 | 750 | 910 | 750 | 2.99 |
| Uncertain watch | provisional | 100 | 800 | 5000 | 800 | 2.99 |

The watch triggers `low_identification_confidence`, `broad_valuation_range`, `verification_sensitive_category`, and `model_suggested_review`, plus the supplied explanation: “Exact identity could materially affect value.” Its brand/model stay null.

Additional successful live Gemini results and public sample photographs are available under `live/`; see `live/README.md`. Put your own sample photographs anywhere convenient and run `npm run analyze -- /path/to/photo.jpg`. They are processed in memory; they are not copied into this package.
