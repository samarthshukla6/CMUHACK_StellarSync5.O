# Short-term traveler storage: product and integration decisions

## Intended customer and scope

A traveler needs somewhere to leave a backpack or luggage between checkout and departure, while sightseeing, or for another short period. The covered exposure in this prototype is the **declared storage session at a named location**, not the entire trip or possessions carried around afterward.

The system estimates replacement cost, not resale value. A $90 backpack does not imply anything about a laptop inside it. Coverage is limited to individually listed, eligible belongings. Worn clothing and scenery should not be selected.

## Settled workflow

1. Collect a named storage location, address, custodian, and start/end timestamps. Ask the backend for session eligibility before collecting photos.
2. Ask whether the traveler wants the bag alone or bag plus contents. An exterior-only photo can establish the bag, never what is inside.
3. Capture 1–5 photos together. For contents, offer a quick layout photo. Missing belongings can instead be manually declared; the app must label these declarations.
4. Show an editable draft. Every detected item needs an explicit include/exclude decision, including any incidental objects the model returned. Allow quantity changes, full identity/value corrections, and added entries.
5. Ask the traveler to confirm the inventory, their ownership, the listed-items limitation, and whether contents are absent, fully listed, or unlisted contents are excluded.
6. Recompute eligibility, review, totals, limits and premium deterministically. Never let a checkbox clear an existing valuable-item review. Request a close-up, identifying evidence or purchase evidence through the host application; evidence adjudication is not implemented here.
7. Show the session, item list, estimated value, eligible value, excluded/pending amounts, coverage limit, deductible, duration, exclusions and total session price. A real insurance partner must then supply an actual offer and issue coverage. This backend stops at a demo proposal.

## Public functions

- `assessStorageSession(session, {now?})`: validate location/time and check prototype storage eligibility without calling Gemini.
- `createTravelerInventoryDraft(input, {provider?, now?, maxImageBytes?})`: one multimodal extraction, explicit draft status, estimated totals and required actions. No premium or coverage claim.
- `quoteTravelerStorage({draft, confirmation}, {now?})`: pure deterministic confirmation and quoting, no new model call.

The draft expires after 30 minutes or at the session start, whichever is earlier. Quotes expire after 15 minutes or at the start. The local CLI/library expects trusted draft data; the public HTTP wrapper signs the draft.

## Session input

```json
{
  "startsAt": "2030-01-01T10:00:00Z",
  "endsAt": "2030-01-01T16:00:00Z",
  "storage": {
    "type": "staffed_storage",
    "locationName": "Demo luggage desk",
    "address": "123 Example Street, New York, NY",
    "countryCode": "US",
    "custodianName": "Demo operator",
    "bookingReference": "optional-booking-id"
  }
}
```

Supply timestamps in the future, including an offset. Duration must be positive and at most seven days. Boundary calculations use elapsed UTC time; partial minutes round upward for rating. Location/custodian fields are declarations, not verified facts.

| Storage type | Prototype outcome |
| --- | --- |
| `staffed_storage` | Eligible for demo quoting, subject to item rules |
| `secured_locker` | Eligible, with illustrative 1.15 pricing multiplier |
| `private_host`, `unknown` | Requires verification; no payable premium |
| `unattended` | Ineligible; no premium |

## Draft HTTP request

`POST /traveler/draft`, multipart fields `images` and one `metadata` JSON string:

```json
{
  "session": { "...": "session object above" },
  "coverageScope": "bag_and_contents",
  "photoCoverage": "bag_exterior_only"
}
```

`coverageScope`: `bag_only` or `bag_and_contents`.
`photoCoverage`: `bag_exterior_only` or `visible_contents` (photos actually show contents, optionally alongside bag exteriors).

Response: `{draft, draftToken}`. The token is HMAC-signed, expires with the draft, and contains no image buffers. It is signed, not encrypted; it contains inventory and session details and should be treated as private. An ephemeral random signing key is the default. Configure `DRAFT_SIGNING_SECRET` to preserve tokens across app restarts. Replay is possible within the TTL because no persistence or actual policy issuance exists.

## Confirmation HTTP request

`POST /traveler/quote`, JSON:

```json
{
  "draftToken": "unchanged-token-from-draft-response",
  "confirmation": {
    "decisions": [
      {"itemId":"item_001","include":true,"kind":"bag"},
      {"itemId":"item_002","include":false}
    ],
    "manualItems": [
      {
        "name":"Assorted clothing inside backpack",
        "category":"clothing",
        "brand":null,
        "model":null,
        "quantity":1,
        "condition":"good",
        "declaredUnitValue":100,
        "kind":"contents"
      }
    ],
    "attestations": {
      "inventoryConfirmed":true,
      "belongsToTraveler":true,
      "onlyListedItemsConsidered":true,
      "contentsDeclaration":"all_contents_listed"
    }
  }
}
```

Adjust decisions to the actual returned IDs. Missing, duplicate, unknown or extra decisions are rejected. Excluded entries cannot carry overrides. For an included entry, `quantity` changes the count. A full `correction` accepts the same fields as a manual item and replaces the identity/value; it must agree with the decision's `kind`, and cannot be combined with a separate quantity override.

A correction has no AI confidence and retains the original item's review/exclusion restrictions. Confirmation cannot turn an uncertain expensive watch into a trusted cheap item. It must be excluded from this quote or resolved through a fresh/evidence-backed workflow.

`kind` is `bag` or `contents`. Bag-only scope rejects contents. Exterior-only photo entries cannot be classified as photographically observed contents; add a declaration instead. At most 100 confirmed entries, with quantities 1–100. At least one selected or declared item is required.

`contentsDeclaration`: `no_contents`, `all_contents_listed`, or `unlisted_contents_excluded`. It must agree with the chosen items; all_contents_listed requires a listed contents item, while no_contents rejects contents entries.

Optional `requestedCoverageLimit` must be a $50 increment, at most $5,000 and no larger than the eligible recommendation. Lower coverage produces an explicit shortfall warning. Clients cannot supply rates, risk multipliers, confidence or approval flags.

## Review policy

The traveler flow retains confidence <0.60, quantity-adjusted expected item total >=$1,000, broad range >2.5 when expected line value >=$200, inherently sensitive goods, and model-suggested review. Matching checks names and brands as well as categories.

The watch exception is intentionally narrow: identified brand, identification confidence >=0.80, a basis more specific than category_estimate, line expected value <$250 and line high value <$500, no luxury/material warning and no user-declared identity. A $20 identified Casio can pass. An uncertain watch, luxury name, expensive watch or model recommendation still triggers review.

Manual/corrected declarations have `identificationConfidence:null`, `priceSource:user_declared`, and no invented visual evidence. Their values are declared amounts, represented by equal low/expected/high fields; that is not an inferred price range. Declarations >=$250 require verification; sensitive goods remain reviewable even below that. Cheap ordinary declared clothing may pass.

Any selected unresolved item prevents a ready quote. Its expected value is shown separately as pending review and is not silently priced into coverage. The traveler can explicitly remove it and obtain a new proposal for remaining items; no blanket waiver or approval shortcut exists.

## Coverage and rating: illustrative only

The whole selected inventory value, eligible value, excluded value, and pending-review value are separate. Only eligible items contribute to recommended coverage. Coverage rounds upward to $50, with a $5,000 session cap and $1,000 cap per physical unit. The current high-value review threshold normally intervenes before the per-unit cap; the cap is still an explicit plan term for future verified-item workflows.

Prototype exclusions: cash, currency, gift cards, passports/travel documents, food/perishables, unlisted contents, unattended storage, losses outside the selected period, and unresolved items. Category/name matching is heuristic; it is not an underwriting engine. Photo identification and declared information can be false or incomplete.

The demo deductible is **$0**. This avoids an unusable offer for a low-value backpack; an insurer must set actual terms. Proposed events are theft and accidental damage during the declared storage session, with no claim that this wording is a complete real policy.

| Duration | Illustrative rate per $100 coverage |
| --- | ---: |
| Up to 6 hours | $0.20 |
| Over 6 through 24 hours | $0.35 |
| Each additional started 24-hour block | +$0.25 |

`totalPremium = roundToCents(max(1.49, coverageLimit / 100 × durationRate × storageMultiplier))`.

The $1.49 minimum is per session, never per month. The pure calculator returns zero for zero coverage, but a no-value confirmed inventory receives `ineligible` and no payable premium. Rates/limits are fixed server-side constants, explicitly `demo_only`, not actuarial recommendations.

## Quote statuses

- `demo_quote_ready`: all selected nonexcluded items resolved and storage is eligible; total session premium available.
- `requires_review`: storage or selected items need verification; `premium:null` with item-specific next actions.
- `ineligible`: unattended storage or no eligible/pending value; `premium:null`.

Every response has `policyIssued:false`. Confirmation of inventory does not purchase anything or bind insurance. `coverage.limit` in a blocked response is an informational proposal for currently eligible items, not active coverage.

## Out of scope and later integration

No UI, database, authentication, payment, booking verification, live shopping prices, document upload/adjudication, claims handling or insurance issuance. A real partner must supply underwriting eligibility, premiums, terms, per-item limits, exclusions, evidence handling and binding. Future claims evidence should record the confirmed inventory and actual check-in/out custody event; no present guarantee that photo timestamps prove custody is made.

For the hackathon, demonstrate session selection, AI draft, removal of incidental clothing, manual hidden contents, explicit confirmation, one ready quote and one blocked valuable-item case. This demonstrates the intended workflow without pretending a photo discovers a closed bag's contents.
