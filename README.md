# WATTWISE

**Understand Your Energy. Take Control.**

An independent household energy intelligence platform for Europe: read and explain energy bills, follow consumption, and find savings opportunities, without selling anyone's data.

> Status: **Milestone 1 — first working web version.** See [docs/MILESTONE-1.md](docs/MILESTONE-1.md) for what works today and what does not yet.

## Repository layout

| Path | What it is |
| --- | --- |
| `packages/core` | Shared TypeScript engine: country configuration, deterministic calculations, bill validation and analysis, AI extraction contract |
| `apps/web` | Next.js web app (website + app + server API) |
| `firebase/` | Firestore and Storage security rules, plus emulator tests |
| `docs/` | Audit, architecture, privacy notes, milestone report |

## Quick start (no credentials needed)

Requirements: Node.js 20.9+ and **npm 11** (npm 10 fails on this dependency tree; `npx npm@11` works).

```bash
npx npm@11 install
npm run dev            # http://localhost:3000
```

Without Firebase configuration the app runs in **local mode**: no account, data stays in your browser, clearly labelled in the UI. Without an OpenAI key, bill upload falls back to guided manual entry. You can explore with clearly labelled **DEMO** data from the empty dashboard.

## Connecting real services

See [docs/SETUP.md](docs/SETUP.md) for Firebase, OpenAI and deployment steps.

## Tests

```bash
npm test                                   # unit tests (core + web)
npm run typecheck
npm run test:e2e                           # browser tests, local mode + mock AI provider
npm run test:e2e:firebase -w @wattwise/web # browser test against Firebase emulators (needs Java)
npm run test:rules                         # Firestore/Storage rules in the emulator (needs Java)
```

## Principles

- Never present an estimate as a measurement: every number shows its source and quality.
- Calculations are done by tested code; AI only reads documents and the user confirms the result.
- No prices, taxes or tariffs are invented or hardcoded.
- Energy data is sensitive: minimal collection, export and deletion built in.
