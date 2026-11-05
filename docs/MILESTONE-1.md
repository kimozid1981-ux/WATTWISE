# Milestone 1 report — first working WATTWISE version

Date: 2026-11-05

## Features implemented (working, tested)

- **Navigation**: landing page, desktop sidebar, mobile bottom tab bar (Home, Bills, Insights, Profile), dark theme by default with light/system options.
- **Authentication foundations**: Firebase email/password sign-up/sign-in, password reset, Google sign-in, sign-out, account deletion. Local mode when Firebase is not configured.
- **Country selection** for FR, BE, DE, ES, PT, NL (IT, LU, AT, IE, DK, SE prepared as "coming later"), driving currency, number/date formats, bill vocabulary and official sources.
- **Household setup** and profile editing; consent capture (data processing required, AI document reading optional).
- **Energy dashboard**: average per day gauge, cost per day, typical week, latest bill, annual estimate (real 12 months or projection, method shown), comparison with previous bill, energy price, monthly chart (kWh / €), cost breakdown donut, top insights, electricity/gas switch. Every figure carries a quality badge. Empty state and DEMO data option.
- **Bill workflow**: upload PDF/JPG/PNG/WebP (or phone camera) → server-side AI extraction → editable review with uncertain fields highlighted → validation → confirmation → analysis page. Manual entry path when AI is not configured or not consented.
- **Bill analysis (deterministic)**: plain-language explanation; metrics (days, per-day consumption/cost, energy-only price, all-in price, subscription per 30 days, 365-day projection); line-by-line arithmetic check; reconciliation of lines vs total; findings for estimated readings, price changes, consumption changes, subscription changes, overlapping/missing periods, missing details, gas without conversion factor. Each finding states what, why, what you could do, and the uncertainty.
- **Insights**: findings per energy type, appliance cost calculator using the user's own price. Tariff comparison and Energy Coach are shown as "in preparation", not faked.
- **Privacy**: JSON export, delete everything, opt-in storage of originals, optional meter reference, draft privacy policy and terms.
- **Languages**: EN and FR complete; DE, ES, PT, NL, IT main screens (72 of 380 strings), English fallback elsewhere.

## Files created

All files are new (the repository was empty). Main ones:

- `packages/core/src/**` — provenance, languages, countries (types, configs, index), calc (numbers, dates, energy), bills (schema, validate, analyse), dashboard/summary, ai/extraction, format, demo; tests in `packages/core/test/`.
- `apps/web/src/app/**` — pages: `/`, `/signin`, `/onboarding`, `/app`, `/app/bills`, `/app/bills/new`, `/app/bills/view`, `/app/insights`, `/app/profile`, `/privacy`, `/terms`; API: `/api/bills/extract`, `/api/health`.
- `apps/web/src/components/**` — AppProvider, AppShell, UI kit, charts (gauge, bars, donut), bill review form, finding card, household fields, language select, legal page, logo.
- `apps/web/src/lib/**` — Firebase init, Firestore and local stores, demo helpers, finding texts, formatting hook.
- `apps/web/src/server/**` — OpenAI extractor, token verification and rate limiter.
- `apps/web/src/i18n/**` — dictionaries for 7 languages.
- `apps/web/e2e/**` — Playwright tests and mock AI server.
- `firebase/firestore.rules`, `firebase/storage.rules`, `firebase/tests/rules.test.js`, `firebase.json`.
- `docs/AUDIT.md`, `docs/ARCHITECTURE.md`, `docs/SETUP.md`, `docs/PRIVACY.md`, this report.

## Files modified

- `README.md`, `.gitignore` (from the initial commit).

## Tests actually executed (all in this environment)

| Suite | Command | Result |
| --- | --- | --- |
| Core unit tests (calculations, validation, analysis, dashboard, country config) | `npm test -w @wattwise/core` | **29 / 29 passed** |
| Web unit tests (i18n completeness, decimal parsing, auth decision, rate limiter, AI extractor with mocked HTTP) | `npm test -w @wattwise/web` | **22 / 22 passed** |
| Type checking (core + web) | `npm run typecheck` | **passed** |
| Production build | `npm run build` | **passed** |
| Browser end-to-end, local mode + mock AI (desktop + Pixel 7) | `npm run test:e2e` | **5 / 5 passed** |
| Browser end-to-end, Firebase mode against Auth/Firestore/Storage emulators | `npm run test:e2e:firebase -w @wattwise/web` | **1 / 1 passed** |
| Firestore & Storage security rules in emulator | `npm run test:rules` | **13 / 13 passed** |

Calculation tests use hand-verified figures (e.g. 620 kWh × €0.20 + €15 + €27.80 VAT = €166.80 over 31 days → €5.38/day, €0.2690/kWh all-in, €1,963.94 over 365 days).

## Not verified / remaining problems

- **No real OpenAI call was made** (no key available). The extractor is tested against a mock that follows the Responses API format; the first run with a real key and real bills must be checked, and extraction quality measured on a set of real FR/BE/DE/ES/PT/NL bills.
- **No real Firebase project** was used; everything Firebase was verified against the official emulators only.
- Mobile apps (Flutter) not started: no Flutter SDK here.
- Partial translations for DE/ES/PT/NL/IT; all translations need native review.
- Country configs are `draft`: compiled from general knowledge, must be checked against the listed official sources.
- AI rate limiting is per server instance; no per-plan quota yet.
- Account deletion is client-driven; a server-side deletion job (including backups and audit logs) is needed for full GDPR erasure.
- Legal pages are drafts. DPIA not yet written.
- npm 10 cannot install this tree (npm bug); npm 11 required.

## Exact next steps

1. Karim: create the Firebase project (EU region), enable Email/Password + Google auth, share the web config; provide `OPENAI_API_KEY` and chosen `OPENAI_MODEL` as server secrets.
2. Deploy rules and the web app to Firebase App Hosting; run the Firebase e2e test against staging.
3. Collect 10–20 anonymised real bills per launch country; measure extraction accuracy; tune instructions.
4. Start the Flutter app (auth, country, household, dashboard, bill upload via `/api/bills/extract`) with the same design tokens and rules.
5. Verify country configs against official sources and flip them to `verified`.
6. Complete translations with native reviewers.
7. Add server-side deletion, audit logging and a shared rate limiter/quota.
