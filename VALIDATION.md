# Validation

## Change lab — October 11, 2026

Windows, Node.js 24.19.0. `npm run check`: 47 tests pass (18 additional change-review tests) and Vite production build passes. The first run had one failing assertion expecting a URL-specific error although the earlier sensitive-input guard correctly rejected that fixture; the assertion was corrected, not the guard removed. Coverage includes funding reversals, same-profile funding plans, deadlines, changed/removed rule checks, stable decisions with changed prose, source changes, JSON key order, stale refresh, invalid schemas/dates/timestamps/profile values, sensitive-input rejection and report limits/profile omission.

Verified through the running production HTTP server in Edge: funding switch shows **Likely fit → Upfront costs**, closed-deadline example shows **Closed**, identical inputs show **No changes**, incomplete evidence shows **Comparison unavailable** with a fix instruction. Report preview contains field changes, consequences, source URLs and limitations; clicking Copy review report visibly reports success. Clipboard denial fallback exists in code but was not independently triggered. Screenshots contain only the fictional sample programme. Inspected desktop at 1280×960 and mobile at 390×844: DOM scroll width was 1265 and 375 respectively, below viewport width, and the mobile error and stacked editors were visually checked. Temporary dimension overrides were cleared. Full-page capture timed out; actual viewport screenshots were saved instead.

The browser debugger detached during an additional manual text-edit check; that extra interaction was not confirmed. Preset workflows, report copy and the viewport checks above were observed before detachment; parsing edited snapshots is covered by engine tests. The final build was reloaded and the funding scenario rechecked before that additional attempt.

The new workflow is local deterministic snapshot comparison, not observed live AI, website monitoring, independent source verification or a deployed service. Existing local AI remains unverified. Current source prose is not fetched or interpreted; strict structured labels must be checked by a person. See [schema and tradeoffs](docs/change-lab.md).

## Original workflow — October 7, 2026

Checked October 7, 2026 on Windows, Node.js 24.19.0.

## Automated checks

`npm run check`: 29 tests pass; Vite production build passes. Tests cover eligibility and age uncertainty, stale/date-only deadlines, funding conditions, invalid profile inputs, sensitive-content blocking, unknown model facts, local-provider URL boundaries, mocked Ollama/gateway responses, HTTP origin checks and API errors.

Provider tests use controlled responses. They do not establish that a real local or remote model is available.

## Browser checks

Verified in the Codex in-app browser:

- Default opportunity selection and funding explanations.
- Preparing a template draft through the real local HTTP API.
- Updating the birth year to an ineligible value changes status and disables drafting.
- An unmatched search shows an empty state; clearing restores the list.
- PyCon Namibia clearly flags upfront travel costs.
- Review displays draft status, source-related requirements and funding conditions.
- Selectable Markdown preview displays the source, funding conditions and remaining requirements.
- Desktop and mobile layout inspection; no horizontal document overflow at the tested 390 and 768 pixel viewport settings.

File-download delivery is not verified: the in-app browser did not expose a completed download event. The UI says “download requested,” and the review panel provides the same Markdown as selectable text. Brief content is covered by automated checks. Verify browser file delivery in an ordinary browser before advertising it as supported there.

## Live AI limitation

Ollama was not available. The existing local gateway returned authentication errors on its model API, and its advertised free model was unavailable when checked through its own CLI. No keys were created, copied, published or replaced. The app's working default is explicitly labeled template drafting.

## Repository checks

Gitleaks 8.30.1 scanned the staged project files with default rules and redacted output: no detected leaks. This is detection evidence, not a confidentiality guarantee. The repository contains anonymous demo data; application documents and audit reports are outside it.
