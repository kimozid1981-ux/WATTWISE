# WATTWISE — Phase 1 audit

Date: 2026-11-05 · Scope: repository `kimozid1981-ux/WATTWISE` and the development container.

## 1. Current project structure (before this milestone)

The repository was **empty**: no commits, no branches, no files. There was no existing code, configuration or design to preserve.

Development environment found:

| Tool | Status |
| --- | --- |
| Node.js 22 / npm 10 | Available (npm 10 hits a dependency-resolution bug with this tree; npm 11 works — see Risks) |
| Java 21 | Available (needed by the Firebase emulators) |
| Chromium + Playwright | Available |
| Flutter / Dart SDK | **Not installed** |
| Firebase CLI | Not installed globally (now a dev dependency) |
| Firebase project, OpenAI key | **Not provided** |

## 2. Recommended architecture

A monorepo with one shared brain and several thin clients:

```
packages/core      TypeScript: country configuration, deterministic calculations, bill
                   validation and analysis, AI extraction contract. No UI, no network.
apps/web           Next.js 16 (App Router, TypeScript, Tailwind 4). Website + web app +
                   server routes (AI extraction). Deployable on Firebase App Hosting.
apps/mobile        Flutter (Android + iOS) — next milestone; calls the same server API
                   and Firestore with the same rules.
firebase/          Firestore + Storage security rules, emulator tests.
```

Key decisions, in plain English:

- **Calculations are code, not AI.** Every euro and kWh shown is computed by `@wattwise/core` and covered by tests. AI only reads documents; its output is a *draft* the user must confirm.
- **One country configuration layer.** Currencies, units, tariff structures, bill vocabulary and official sources per country live in one file. No prices or tax rates are hardcoded anywhere.
- **Provenance everywhere.** Each figure carries a quality label: measured, estimated, calculated, confirmed by you, or DEMO.
- **Secrets stay on the server.** The OpenAI key is read only by a Next.js server route. Browsers only receive the public Firebase config.
- **Two storage modes behind one interface.** With Firebase configured, data lives in Firestore under strict rules. Without it, the app runs in a clearly labelled *local mode* (browser storage only), so it is usable before credentials exist.

## 3. Technology and dependency assessment

| Area | Choice | Notes |
| --- | --- | --- |
| Web framework | Next.js 16.4, React 19 | Current major. Server routes host the AI call. |
| Styling | Tailwind CSS 4 + CSS variables | Dark/light tokens shared with future Flutter theme. |
| Charts | Recharts 3 + custom SVG gauge | |
| Validation | Zod 4 | Bill draft schema. |
| Auth/DB | Firebase JS SDK 12 | Firebase 13 was just released; `@firebase/rules-unit-testing` 6 requires it. Upgrade together in a later milestone. |
| Token verification | `jose` against Google's public keys | Avoids needing a service account for the API route. |
| AI | OpenAI Responses API via `fetch` | Behind a provider-neutral `BillExtractor` interface; strict JSON schema; `store: false`. |
| Tests | Vitest 4, Playwright 1.63, Firebase emulators | |

## 4. Missing configuration (Karim must provide)

| Item | Where | Effect while missing |
| --- | --- | --- |
| Firebase project (web app config) | `apps/web/.env.local` → `NEXT_PUBLIC_FIREBASE_*` | App runs in local mode (no accounts) |
| Enable Auth providers (Email/Password, Google) | Firebase console | Sign-in fails |
| Deploy rules | `firebase deploy --only firestore:rules,storage` | Database would use console defaults |
| OpenAI API key + model name | Server env `OPENAI_API_KEY`, `OPENAI_MODEL` (Secret Manager in production) | Bill upload falls back to manual entry |
| App Check site key (reCAPTCHA Enterprise) | `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` | No App Check enforcement |
| Data Processing Agreement with OpenAI and Google | Legal | Required before real users |
| Legal review of privacy policy & terms | Legal | Pages are marked DRAFT |
| Apple / Google developer accounts | Stores | Needed for the mobile milestone |

## 5. Development risks

1. **Data accuracy and trust.** AI extraction can misread bills. Mitigation: mandatory user review, uncertain fields highlighted, deterministic checks, no "your bill is wrong" claims.
2. **Regulatory drift.** Tariff structures and terminology change. Country configs are marked `draft` with a review date; no prices stored.
3. **GDPR / sensitive data.** Consumption reveals occupancy. Mitigations in place: consent capture, data minimisation (meter reference optional, originals not stored by default), export and delete. A DPIA is recommended (see `PRIVACY.md`).
4. **Tariff comparison legality and coverage.** Not built yet on purpose: data access and licensing must be checked per source first.
5. **Smart-meter integrations vary hugely** (Linky, Datadis, P1 port, iMSys…). Treated as a later, per-country integration layer.
6. **Tooling:** npm 10 crashes resolving this dependency tree (`Cannot read properties of null (reading 'edgesOut')`); use npm 11 (`npx npm@11 install`). Rate limiting on the AI route is in-memory only.
7. **Translations:** English and French are complete; DE/ES/PT/NL/IT cover the main screens only and fall back to English elsewhere. All need native review.
8. **Mobile:** no Flutter SDK in this environment; iOS builds need macOS. Mobile work must be verified on real toolchains.

## 6. Prioritised implementation plan

| # | Milestone | Content |
| --- | --- | --- |
| 1 | **First working product (this PR)** | Core engine, web app with navigation, auth foundations, country selection, household, dashboard, bill upload → AI extraction → confirmation → analysis, rules, tests |
| 2 | Firebase go-live + mobile foundation | Real Firebase project, App Hosting deploy, App Check, Flutter app (auth, country, dashboard, bill upload via the same API), shared design tokens |
| 3 | Intelligence | Savings recommendations engine (what / why / action / impact / assumptions), Energy Coach (server-side, grounded on confirmed data), distributed rate limiting & usage quotas |
| 4 | Tariff framework | Source registry (official / supplier / third-party / sponsored), first official data connectors after licence checks |
| 5 | Integrations | Per-country smart-meter connectors with explicit consent and disconnect |
| 6 | Commercial readiness | Subscription architecture after store/payment rules review, analytics with consent, support, store listings |

## 7. Estimated development complexity

| Area | Complexity | Rough effort (1 senior engineer) |
| --- | --- | --- |
| Milestone 1 (done here) | Medium | — |
| Firebase go-live + App Hosting | Low–medium | 2–4 days (mostly configuration and verification) |
| Flutter app to parity with web milestone 1 | Medium–high | 3–5 weeks |
| Savings recommendations | Medium | 2–3 weeks |
| Energy Coach | Medium–high | 3–4 weeks incl. evaluation |
| Tariff comparison (per country) | High | 2–6 weeks per country, dominated by data access |
| Smart-meter integrations (per provider) | High | 2–4 weeks each, plus partner/legal steps |
| Subscriptions | Medium | 2–3 weeks after policy review |
