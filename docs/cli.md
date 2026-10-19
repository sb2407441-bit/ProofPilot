# Evidence review in your terminal

A reviewed programme changes from prepaid travel to reimbursement. A text diff shows words; ProofPilot shows **Likely fit → Upfront costs** against the same profile. This CLI reuses Change lab's deterministic engine and lets a developer put that review in a local script or CI gate. No browser, dependency install, provider account or network is needed for the CLI.

## Try it

From a checkout with Node.js 24 or newer:

```sh
node scripts/compare.mjs --demo funding
node scripts/compare.mjs --demo deadline --format json
node scripts/compare.mjs --demo unchanged --fail-on review
node scripts/compare.mjs --help
```

`npm run compare -- --demo funding` is also available. The built-in demos generate synthetic dates relative to the evaluation clock. They do not represent real programmes. For a repeatable historical demo, use `--now 2026-10-12T03:00:00Z`.

For the included wholly synthetic files:

```sh
node scripts/compare.mjs --previous examples/change-review/before.json --candidate examples/change-review/after.json --profile examples/change-review/profile.json --now 2026-10-12T03:00:00Z --format json --fail-on review
```

That command intentionally exits **2**, with a valid JSON report on stdout. The report includes:

```json
{
  "schemaVersion": 1,
  "available": true,
  "mode": "offline",
  "profileMode": "supplied",
  "state": "Decision changed",
  "gate": {"policy": "review", "blocked": true},
  "decisions": {"previous": "Likely fit", "candidate": "Upfront costs"}
}
```

This is an excerpt of observed command output, not the entire JSON schema. Full reports also include the evaluation time, supplied source URLs, changed fields/checks and limits. See [a full observed Markdown demo](cli-demo.md) and the existing [running browser screenshots](change-lab.md).

## Gate policies and failure handling

| Policy | Blocks when | Use |
|---|---|---|
| `none` (default) | Never for a valid comparison | Preview a review |
| `review` | Substantive evidence changes **or** decision changes | Conservative CI review gate |
| `decision` | Eligibility/funding/review decision or check status changes | Narrow outcome gate; changed prose can pass |

These policies gate **changes**, not eligibility approval: identical snapshots can pass even when both are closed or ineligible. Check `decisions` and the report; a pass does not certify either snapshot. `review` also blocks stale-to-current decision changes even when only the check date changes. Prose is diffed but not semantically interpreted. `decision` can allow a changed funding paragraph with stable structured labels; use `review` if all such changes need attention.

| Exit | Meaning | Output |
|---|---|---|
| 0 | Valid comparison, gate passed (or preview) | Report on stdout |
| 2 | Valid comparison, review gate blocked | Report on stdout |
| 1 | Comparison unavailable | Fixed diagnostic on stderr; stdout empty |

Exit 1 is never a no-change verdict. File paths, raw malformed inputs, stack traces and profile fields are not echoed in failure diagnostics. Do not mask all nonzero exits with `|| true` in CI. For example, a normal CI shell can run the synthetic funding command above: it should fail until a person reviews the intentional change. Redirect stdout to a local report file if desired, but inspect it before publishing; it contains your supplied evidence. The CLI itself writes no files. Keep real profile/input/report files out of public repositories and public CI logs.

## JUnit: a small CI artifact without evidence values

```sh
node scripts/compare.mjs --demo funding --now 2026-10-16T03:00:00Z --format junit --fail-on review > proofpilot-review.xml
```

This intentionally exits **2** with one failed `ProofPilot.EvidenceReview` / `review-policy` test. An unchanged comparison with an enforced policy produces one passing test. Policy `none` produces a **skipped** test: previewing evidence is not an enforced policy pass. A failed test means a change requires human review, not that a programme or applicant was rejected. See the [actual XML transcript and independent parser verification](junit-demo.md).

The JUnit report contains fixed test names/messages, policy, evaluation time, synthetic/supplied profile mode and changed-field/check counts. It omits programme names, source URLs, evidence values, individual decisions, profile values, local paths and raw errors. Those omissions are implemented by selecting metadata, not by redacting a full report afterward. Counts and gate status still reveal that a comparison/review occurred; this is not a promise of anonymity. Markdown and JSON still include supplied evidence and should stay local unless reviewed for sharing.

Invalid options, missing files or invalid evidence keep the existing **exit 1 / empty stdout** contract, including JUnit mode. There is no misleading passed test or XML artifact for an unavailable comparison. Shell redirection can leave an empty file; CI must treat exit 1 as an error rather than interpreting an absent report as success. The CLI writes no file itself. Use `node` directly when redirecting XML; `npm run` can prepend script banners.

For a GitLab project **you already operate**, this illustrative Linux-runner recipe uses only bundled synthetic evidence:

```yaml
proofpilot-review:
  image: node:24
  script:
    - node scripts/compare.mjs --previous examples/change-review/before.json --candidate examples/change-review/after.json --now 2026-10-12T03:00:00Z --format junit --fail-on review > proofpilot-review.xml
  artifacts:
    when: always
    reports:
      junit: proofpilot-review.xml
```

The synthetic funding change intentionally fails this job with exit 2. Keep that nonzero exit; JUnit artifacts alone do not enforce job status. Do not upload private input files, full reports or profiles as artifacts. For multiple comparisons, use separate jobs: this minimal reporter has one fixed test identity, and concatenated XML documents are not a valid combined report. Only Python ElementTree parsing and CLI behavior have been observed here; hosted GitLab/JUnit-viewer rendering is **not verified**. No account, upload or deployment was created.

Comparison with existing tools, checked October 16, 2026: [Promptfoo already exports JUnit and other formats](https://www.promptfoo.dev/docs/usage/command-line/); [GitLab documents JUnit display and separate exit-code enforcement](https://docs.gitlab.com/ci/testing/unit_test_reports/). ProofPilot's narrow contribution is applying its existing evidence-change policy to a metadata-only artifact, not inventing JUnit or model evaluation.

## Input and architecture

Snapshots use the same [strict schema](change-lab.md) as the UI. Files must be regular UTF-8 files, not symlinks or directories: each snapshot read is bounded to 48,000 bytes, then the engine limits JSON to 12,000 characters. A profile is bounded to 12,000 bytes, uses exactly the fields shown in `examples/change-review/profile.json`, and must satisfy the existing profile validator. Unknown fields are rejected. Duplicate fields in either snapshot or supplied profile are rejected before schema evaluation, including escaped names. Diagnostics identify the input and both positions without echoing field names or values. JSON nesting is capped at 32 levels. [Reproduction and repair](ambiguous-input.md). Sensitive-text heuristics inspect raw and parsed profile text, including escaped text. They do not guarantee privacy. Supply only synthetic or non-sensitive public inputs.

Without `--profile`, the report explicitly labels `synthetic-demo` mode; it does not silently claim a personalized assessment. With `--profile`, every required field must be present and valid. Inputs stay in process memory. The CLI never fetches a supplied URL, invokes AI or sends telemetry.

`scripts/compare.mjs` handles bounded reads, arguments, output and exit policy → `lib/changes.mjs` validates/diffs → `lib/engine.mjs` evaluates the same profile at the same clock. JSON uses an explicit allowlist rather than serializing internal objects; `lib/junit.mjs` selects only aggregate gate metadata for JUnit. No third-party CLI package was added. The browser and CLI share `lib/review-json.mjs`: native syntax parsing followed by an iterative per-object duplicate-name scan before schema validation.

Limitations: manually authored labels/source dates can be wrong; source identity/content is unverified; supported rule types are narrow; birth-year age boundaries remain uncertain; JSON schema version 1 is a prototype interface. The historical examples require the documented fixed time or updated checked dates. No monitoring, live AI, application submission or deployment is claimed. General website monitors and evaluation frameworks remain better suited to automated fetching or model evaluations.

Original CLI code, tests and synthetic examples were implemented with Codex AI coding assistance in the approved ProofPilot portfolio project. Ahmad Bilal directed the project; this feature does not establish unaided authorship or unverified personal implementation contributions. MIT license applies; no external implementation or private material was copied.
