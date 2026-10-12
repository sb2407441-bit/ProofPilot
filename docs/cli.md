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

## Input and architecture

Snapshots use the same [strict schema](change-lab.md) as the UI. Files must be regular UTF-8 files, not symlinks or directories: each snapshot read is bounded to 48,000 bytes, then the engine limits JSON to 12,000 characters. A profile is bounded to 12,000 bytes, uses exactly the fields shown in `examples/change-review/profile.json`, and must satisfy the existing profile validator. Unknown fields are rejected. Sensitive-text heuristics inspect parsed profile text, including escaped text. They do not guarantee privacy. Supply only synthetic or non-sensitive public inputs.

Without `--profile`, the report explicitly labels `synthetic-demo` mode; it does not silently claim a personalized assessment. With `--profile`, every required field must be present and valid. Inputs stay in process memory. The CLI never fetches a supplied URL, invokes AI or sends telemetry.

`scripts/compare.mjs` handles bounded reads, arguments, output and exit policy → `lib/changes.mjs` validates/diffs → `lib/engine.mjs` evaluates the same profile at the same clock. JSON uses an explicit allowlist rather than serializing internal objects. No third-party CLI package was added. The browser workflow is unchanged.

Limitations: manually authored labels/source dates can be wrong; source identity/content is unverified; supported rule types are narrow; birth-year age boundaries remain uncertain; JSON schema version 1 is a prototype interface. The historical examples require the documented fixed time or updated checked dates. No monitoring, live AI, application submission or deployment is claimed. General website monitors and evaluation frameworks remain better suited to automated fetching or model evaluations.

Original CLI code, tests and synthetic examples were implemented with Codex AI coding assistance in the approved ProofPilot portfolio project. Ahmad Bilal directed the project; this feature does not establish unaided authorship or unverified personal implementation contributions. MIT license applies; no external implementation or private material was copied.
