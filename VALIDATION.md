# Validation

## Source desk — October 18, 2026

Windows, Node.js 24.19.0: `npm run check` passes **91 tests** (20 new source extraction/network/API tests) and the Vite production build. Tests cover conditions/negations, inert/hidden HTML, duplicate blocks, contact omission, empty/truncated/limited results, category coverage, selective briefs/anchors, public URL and IPv4/IPv6 boundaries, mixed DNS rejection, pinned transport with no auth/cookies, streamed byte limits, redirect revalidation, compressed expansion/invalid encoding, HTTP/non-HTML failures, stalled DNS/network timeouts, URL-only API payloads, origin/content-type/no-store boundaries, error masking/stable failure codes and concurrency release. Network failures use injected responses; a separate real capture is documented below. `npm audit --omit=dev --json` reported zero known production dependency advisories at this check; that is not a security guarantee.

Observed actual local production API GET to `https://www.python.org/psf/grants/` on October 18: HTML read succeeded, with 61,747 decompressed bytes, 69 matching blocks, 24 excerpts and an explicit limited result. The browser also displayed the fetched page title, source, capture timestamp and excerpts. No login/application action, source snapshot storage or live AI was involved. Only metadata from this real response is documented; third-party prose is not bundled.

In the in-app browser, verified synthetic demo → four excerpts; selecting travel → one kept; Timing filter → one visible timing excerpt while travel selection persists; Copy → success status; expanded preview → only selected travel prose with its `#travel` source anchor. A local-IP URL showed Source unavailable, then a real-page read recovered. Reload cleared data; final rebuilt JS was reloaded before the anchor/filter/copy checks. Desktop was visually inspected using a normal-viewport CDP screenshot, published with synthetic data. At a 390×844 mobile override, DOM client/scroll widths were both 375px and controls/filter/preview worked. The regular screenshot/full-page APIs timed out and resized captures were clipped by display scaling; a normal-viewport CDP capture succeeded. No complete mobile pixel inspection is claimed. Temporary viewport/device overrides were cleared. Clipboard denial and browser file delivery remain unverified; selectable preview exists as fallback. Source desk does not alter the separate optional local AI limitation below.

## Minimal JUnit CI reports — October 16, 2026

Windows, Node.js 24.19.0: `npm run check` passes **71 tests** (7 new executable JUnit workflow tests) and the Vite production build. Real CLI subprocesses verify blocked/unchanged/preview states, review-versus-decision policy behavior, fixed-time reproducibility, invalid/missing evidence, and omission of supplied evidence/profile/path/XML/CI payload strings. Tests do not establish that arbitrary private inputs are safe.

Separately generated funding, deadline, unchanged and preview XML and parsed them using Python standard-library ElementTree. Verified failure/pass/skipped structure, exit 2/0, empty stderr, and missing-file exit 1 with empty stdout. [Captured actual output](docs/junit-demo.md). JUnit test names and messages contain no supplied prose; no duration or execution-performance metric is invented. Hosted GitLab/JUnit viewer rendering remains unverified. No new dependency, network operation, file write or provider call was added to the CLI.

The existing production browser editor was also rechecked on October 16 in the Codex in-app browser: manually pasting the full valid synthetic candidate changed the funding result to **No changes / Likely fit → Likely fit**; manually entering an incomplete object showed **Comparison unavailable**, with a required-field explanation; pasting valid reimbursement evidence restored **Upfront costs**. Accessibility state confirmed these edits. Screenshot/Playwright DOM capture was unavailable, so no new pixel-layout or console-health verification is claimed. This resolves the earlier unconfirmed manual editor checks for these states. Browser code is unchanged. Optional live AI, browser download delivery and hosted deployment remain unverified; prior mobile inspections remain historical.

## Offline CLI — October 12, 2026

Windows, Node.js 24.19.0: `npm run check` passes **64 tests** (17 new subprocess CLI tests) and the Vite production build. CLI tests run the real executable, checking both streams and exit status: funding/closed/identical demos, file inputs matching the shared engine, custom synthetic funding plans, profile omission, wording-only versus decision gates, stale refreshes, bounded/non-UTF8/directory/missing inputs, malformed JSON, unknown/incomplete/sensitive profiles, invalid/repeated options, impossible clocks, deterministic output and help.

Separately ran and inspected terminal output: included synthetic file workflow with fixed clock returns JSON **Likely fit → Upfront costs**, review gate exit **2**; unchanged demo exits **0**; missing synthetic file exits **1** with a safe diagnostic and no report. [Captured actual Markdown output](docs/cli-demo.md) uses the built-in synthetic funding demo. The CLI introduces no dependency, network, provider calls or file writes. Architecture and gate limitations are in [CLI docs](docs/cli.md).

No browser UI code changed in this feature. Existing browser screenshots and October 11 observations remain historical evidence; the previously unconfirmed extra manual JSON-edit interaction and optional live AI remain unverified. No new browser/deployed-service/live-model success is claimed by this CLI validation. Linux CI status is recorded separately after publication, not inferred from local Windows tests.

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
