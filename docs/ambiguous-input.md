# One field, one reviewed value

A manually edited funding object can accidentally contain both `"type": "reimbursement"` and `"type": "covered"`. Before this fix, ProofPilot's native JSON parsing retained only the later value: the conflicting snapshot could produce **No changes / Likely fit**. This exact failure was reproduced locally on October 19, 2026. It is an input ambiguity, not proof that either funding claim is correct.

Change lab and the offline CLI now reject repeated field names in every object before evaluating evidence. This includes identical repeated values, duplicated whole objects and escape-equivalent names such as `type` and `\u0074ype`. The CLI also guards supplied profile JSON. Names can still repeat in separate objects or array elements; strings containing JSON-like prose are not interpreted as fields.

## Try the failure and repair

Open **Change lab → Conflicting fields**. The fictional example deliberately contradicts its own funding type. The result panel and report disappear; **Comparison unavailable** identifies the candidate input, the repeated field position and its first definition. Check the source, remove the conflicting definition and retain one reviewed value. ProofPilot never automatically chooses which value to keep.

The shared schema still needs human-reviewed public/synthetic evidence. The guard does not infer facts from prose or fetch either source. A single wrong value can still pass schema validation.

From a checkout with Node.js 24+; no dependency install needed for the CLI:

```sh
node scripts/compare.mjs --previous examples/change-review/before.json --candidate examples/change-review/ambiguous.json --now 2026-10-12T03:00:00Z --format json --fail-on review
```

Actual local output observed October 19, 2026:

```text
stderr: Comparison unavailable: Candidate snapshot repeats an object field at line 9, column 5 (first at line 8, column 5). Keep one value per field.
stdout: empty
exit: 1
```

Changing `--format json` to `--format junit` produced the same exit 1, diagnostic and empty stdout: no misleading passed test or XML. Replace the candidate path with `examples/change-review/before.json` to try a valid unchanged input, or `examples/change-review/after.json` for a valid funding reversal. Actual results:

| Candidate | Exit | Result | Decisions |
|---|---|---|---|
| `ambiguous.json` | 1 | Unavailable; no report | Not evaluated |
| `before.json` | 0 | No changes | Likely fit → Likely fit |
| `after.json` | 2 | Decision changed; review blocked | Likely fit → Upfront costs |

These files are wholly synthetic and require the documented fixed clock for the historical checked dates. Source URLs use example.org. No real applicant, employer or organizer content is included.

## Architecture and limits

`lib/review-json.mjs` uses native `JSON.parse` for syntax, then scans the original tokens iteratively with a separate decoded-name map for each object. It returns the parsed value only after checking duplicates and a 32-container nesting limit. No third-party parser, copied implementation, network call, storage or telemetry was added. Both schema entry points use it; HTTP/model JSON parsing is outside this focused change.

Inputs remain bounded to 12,000 JavaScript string units; CLI byte-read bounds also apply. Positions are one-based lines and UTF-16 columns at each opening field quote. CRLF is one line break; visual columns can differ with tabs or supplementary Unicode characters. Fixed diagnostics omit supplied field names/values/paths. Positions still reveal input structure. Invalid syntax gets a generic message, not a parser excerpt. Only the first duplicate is reported; repair it and rerun to find further errors. No auto-fix, Unicode normalization, numeric precision guarantee, semantic completeness or privacy guarantee is implied.

This is established parsing practice, not a novelty claim. Compared October 19, 2026: [RFC 8259 section 4](https://www.rfc-editor.org/rfc/rfc8259#section-4) describes duplicate-name interoperability problems; [Python's JSON API](https://docs.python.org/3/library/json.html#json.load) exposes ordered member pairs for custom decoding; [Ajv strict mode](https://ajv.js.org/strict-mode.html) checks schema mistakes rather than promising recovery of overwritten input members. ProofPilot's contribution is applying the guard consistently to its evidence decisions, CLI exit contract and repair workflow. No external code was copied.

## Validation and contributions

Local Windows Node.js 24.19.0: 101 tests and production build pass. Ten new regression tests cover the reproduced decision failure, identical/whole-object duplicates, decoded names, safe diagnostic positions, sibling scope/string lookalikes, malformed syntax, depth/length limits and actual CLI exits/recovery across all formats and supplied profiles.

The production UI was inspected through browser accessibility: normal funding reversal, conflicting-fields preset with line 15/14 positions, manually pasted escaped duplicate, manual repair restoring Upfront costs and valid unchanged recovery all worked. Screenshot APIs failed; no new pixel-layout/mobile screenshot inspection is claimed. Existing screenshots document earlier UI versions. Optional live AI, hosted deployment and clipboard denial remain unverified.

Ahmad Bilal directed the portfolio project. Implementation, regression tests, synthetic fixture and documentation were written with Codex AI coding assistance; no unaided authorship or additional personal contribution is asserted. Original code remains MIT; existing font OFL licenses remain intact.
