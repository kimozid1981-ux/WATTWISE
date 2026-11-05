# Architecture

## Overview

```
Browser / mobile app                     Server (Next.js route handlers)          External
─────────────────────                    ────────────────────────────────         ─────────
UI (React, i18n, theme)                  POST /api/bills/extract  ──────────────▶ OpenAI Responses API
  │                                        • verifies Firebase ID token            (strict JSON schema,
  │ DataStore interface                    • rate limit, file type/size checks      store: false)
  ├─ FirestoreDataStore ─────────────────▶ Firestore + Storage (security rules)
  └─ LocalDataStore (browser only)
  │
@wattwise/core (same code on client and server)
  countries · calc · bills/validate · bills/analyse · dashboard/summary · ai/extraction
```

## Data flow for a bill

1. User uploads PDF/photo (≤10 MB). The browser sends it with the user's Firebase ID token to `/api/bills/extract`.
2. The server checks the token, rate limit and file, then sends the document to the AI provider with country-specific instructions and a strict JSON schema. The file is kept in memory only.
3. The raw answer goes through `normaliseExtraction` (invalid values become `null` and are flagged uncertain; nothing is guessed).
4. The user reviews and edits the **draft**. `validateBillDraft` blocks confirmation until required fields are valid.
5. Only the confirmed bill is saved. The original document is stored only if the user ticks "keep a copy".
6. `analyseBill` (deterministic) produces metrics, line checks, reconciliation and findings; `summariseEnergy` builds dashboard figures.

## Data model (Firestore)

| Path | Content | Access |
| --- | --- | --- |
| `users/{uid}` | profile, language, country, theme, consents, householdId | that user only; fields whitelisted |
| `households/{hid}` | name, country, occupants, home type, heating, `ownerId`, `memberIds` | members read/update; owner manages members, deletes |
| `households/{hid}/energy_bills/{id}` | `origin`, `confirmedAt`, `createdBy`, `data` (ConfirmedBill), `originalDocumentPath` | members; immutable after creation; validated |
| Storage `users/{uid}/bills/{id}/original` | original document (opt-in) | that user only; PDF/JPEG/PNG/WebP < 10 MB |
| `audit_logs`, `subscriptions` | reserved for server (Admin SDK) | closed to clients |

Planned collections from the product brief (`energy_suppliers`, `tariffs`, `consumption_records`, `meter_integrations`, `appliances`, `savings_recommendations`, `analysis_history`, `notifications`) will be added with their features, each with rules and emulator tests. `countries` stays in code (`@wattwise/core`) until it needs to be edited without a deploy.

## Calculation rules

- Billing periods are inclusive of both dates, computed in UTC.
- Monthly figures spread each bill evenly across its days (labelled *estimated*).
- Annual figure: the real sum of the last 365 days when bills fully cover them without overlap; otherwise a linear projection of the latest bill (labelled with the method used).
- Price comparison uses the energy-only unit price when bill lines allow it, otherwise the all-in cost per kWh, and says which.
- Tolerances: line check `max(0.05, 1 %)`, total reconciliation `max(1.00, 2 %)`, price change 3 %, consumption change 20 %.
- Gas in m³ is converted only with the factor printed on the bill; there is no default.

## Security notes

- No secret is ever sent to the browser. Firebase web config values are public identifiers by design.
- `/api/bills/extract` requires a valid Firebase ID token. Anonymous use is possible only with `ALLOW_ANONYMOUS_EXTRACTION=true` **and** a non-production `NODE_ENV` (used for local development and tests).
- The in-memory rate limiter protects a single instance; production needs a shared counter (Firestore or Redis) — planned with usage quotas.
- Security headers: `X-Frame-Options: DENY`, `nosniff`, strict referrer, limited permissions policy. A Content-Security-Policy should be added once Firebase/App Check domains are final.
- App Check is initialised when a site key is configured; enforce it in the console after verifying traffic.

## Mobile (next milestone)

The Flutter app will reuse: the Firestore model and rules, the `/api/bills/extract` endpoint, the design tokens in `apps/web/src/app/globals.css`, and the calculation rules above. To avoid two implementations of the financial logic drifting apart, the plan is to either expose the analysis through a server endpoint or port `@wattwise/core` to Dart with the **same test vectors** (the core tests are written as input/expected-output pairs for that reason).
