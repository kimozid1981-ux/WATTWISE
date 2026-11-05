# Privacy and GDPR notes (engineering view)

This is an engineering record, not legal advice. It must be reviewed by a privacy professional before launch.

## Is a DPIA needed?

**Recommendation: yes, carry out a DPIA before public launch.** Reasons, against the EDPB criteria:

- Energy consumption data can reveal occupancy patterns and habits (sensitive in practice, even if not a GDPR "special category").
- Systematic processing of household data at scale across several EU countries.
- Use of innovative technology (AI document understanding) and later smart-meter data.
- Future profiling-like features (recommendations, tariff suitability).

## What milestone 1 already does

| Principle | Implementation |
| --- | --- |
| Lawful basis & consent | Onboarding records a timestamped consent for processing entered data, and a separate, optional consent for AI document reading. AI upload is blocked without it. |
| Data minimisation | Meter reference is optional with a one-click "remove"; original documents are not stored unless the user opts in; the AI route keeps files in memory only. |
| Purpose limitation | Data is used only to compute and explain the user's own energy situation. No analytics or advertising SDKs are included. |
| Transparency | Draft privacy policy and terms pages; every figure labelled measured / estimated / calculated / DEMO. |
| Access & portability | "Export my data (JSON)" in Profile. |
| Erasure | "Delete everything" removes bills, stored documents, household, profile and the Firebase account. |
| Security | Strict Firestore/Storage rules tested in the emulator; secrets server-side only; token-verified AI endpoint; security headers. |
| Processors | AI calls use `store: false`. A DPA with the AI provider and Google (Firebase) is required. |
| No sale of data | Stated in the UI and policy; no code path shares data with third parties other than the AI processor. |

## Still to do

- DPIA document and records of processing (Art. 30).
- Retention policy (e.g. automatic deletion of inactive accounts, audit log retention) and a server-side deletion job that also covers backups.
- Choose EU data regions for Firestore/Storage and verify the AI provider's data residency options.
- Server-side audit logging of security-relevant events (`audit_logs`, Admin SDK only).
- Cookie/analytics consent banner if analytics are ever added.
- Multi-member households: invitation flow with explicit consent of each member.
