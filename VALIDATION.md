# Validation

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
