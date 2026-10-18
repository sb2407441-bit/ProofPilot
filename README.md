# ProofPilot

An evidence-first workspace for international opportunities: check eligibility, understand funding conditions, and prepare a draft whose factual statements have visible provenance.

Start with **Source desk**: read one public HTML page on demand, find possible funding/timing/requirement mentions, and keep selected excerpts in a source-linked brief. No personal profile or AI provider is involved. This is keyword-based reading assistance, not a verified eligibility verdict. [Demo, architecture and limits](docs/source-desk.md).

![ProofPilot desktop workspace](docs/preview.png)

## What works

- **Source desk:** bounded public HTTPS capture, section/source links, capture time and HTML digest, category filters, selective copy and explicit unavailable/empty states. Try the original synthetic example without an external request. Real public-page fetching was observed against the PSF grants documentation on October 18, 2026; future availability is not guaranteed.

- **Offline CLI / CI review gate:** compare evidence files without a browser, export JSON/Markdown or a minimal JUnit XML report, and distinguish review blockers from invalid inputs. JUnit omits evidence and profile values; preview runs are explicitly skipped. No dependency install or API needed. [Runnable synthetic demos, CI recipe and limits](docs/cli.md).

- **Change lab:** compare two reviewed JSON snapshots, see eligibility/funding consequences, and copy a Markdown review report. Try the fictional founder-programme demo; invalid input is explicit. [Workflow, screenshot, schema and limits](docs/change-lab.md).

- Search and filter curated opportunities against an editable, anonymous demo profile.
- Explain age, education, training and availability requirements, including uncertain age boundaries and stale source checks.
- Distinguish travel awards from reimbursements requiring money upfront.
- Prepare a clearly labeled template draft and show the self-reported or organizer source behind each selected fact.
- Review a Markdown brief, copy its preview or request a file download.
- Optionally ask a local AI model to select a writing plan. The model cannot add free-form claims to the final draft.

## Run locally

Requires Node.js 24 or newer.

```sh
npm ci --ignore-scripts
npm run check
npm start
```

Open **http://127.0.0.1:5189**. For development, use `npm run dev` and open http://127.0.0.1:5188. The servers bind to loopback.

The complete eligibility, review and template workflow works without an API key. Profile changes stay in memory and disappear on reload.

## Optional local AI

An already installed Ollama instance at `http://127.0.0.1:11434` is detected when opening Opportunities. Choose one of its installed models in the draft panel. ProofPilot neither installs a model nor creates a provider account.

For an existing **unauthenticated loopback** OpenAI-compatible gateway, set `LOCAL_AI_KIND=gateway` and `LOCAL_AI_URL=http://127.0.0.1:20128` before starting. These are connection settings, not credentials. Gateways requiring authentication are not supported by this version; do not disable their security to connect.

Only generic fact labels and identifiers are sent to the model. Applicant text is assembled locally from the reviewed catalog. A gateway may itself call a remote service; its model pricing and data policies still apply. This does not make every gateway model free.

The local-provider adapter is covered by contract tests. A live model response has **not** been verified in the development environment: Ollama was unavailable and the existing gateway's advertised free model was unavailable. The UI reports this honestly and offers template drafting.

## Evidence and limits

The three initial records are curated snapshots checked on October 7, 2026, with official source links. They are not a live opportunity feed. Verify current organizer requirements, deadlines and funding before applying; date-only deadlines do not imply a verified timezone. After 14 days, the app flags source rechecking.

Source desk is separate from those records and from Change lab: fetched text never automatically updates a record, fills a profile, submits an application or becomes a funding decision. Source websites see the requested URL and the server's network address. Read only public pages you are permitted to access; excerpts retain their original owners' rights.

“Likely fit” is provisional. Missing personal examples and availability still require review. Self-reported facts are not independently verified. This app does not submit applications, certify claims, upload documents, or guarantee selection.

It is a local, single-user prototype. Do not expose it as a public service without adding authentication and reviewing deployment security. No application documents, employer data or real applicant contact details are bundled.

## Structure

| Directory | Purpose |
|---|---|
| `data/` | Source-linked opportunity snapshots and anonymous demo profile |
| `lib/` | Eligibility, deadlines, sensitive-text checks, grounded draft assembly |
| `server/` | Local API, static serving and optional local-provider adapter |
| `src/` | React interface |
| `tests/` | Meaningful engine, provider and HTTP boundary tests |
| `scripts/compare.mjs` | Dependency-free snapshot CLI and explicit CI exit policy |
| `examples/change-review/` | Wholly synthetic evidence and profile fixtures |

See [validation](VALIDATION.md), [security notes](SECURITY.md) and [design notes](DESIGN.md).

Built with AI coding assistance. Describe personal contributions accurately when presenting this portfolio project. No award, organizer endorsement or production usage is claimed.

## License

MIT for project code. Bundled Manrope and Source Sans 3 fonts retain their included SIL Open Font Licenses under `public/fonts/`.

Cheerio is used under MIT for inert HTML parsing; installed transitive dependencies retain MIT, BSD-2-Clause or ISC licenses. Their package licenses remain in the dependency distribution. Public source-page text is not relicensed under this project's MIT license. The bundled source example and published brief are original synthetic fixtures.
