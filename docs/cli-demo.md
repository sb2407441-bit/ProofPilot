# Observed CLI demo

Captured on October 12, 2026 using wholly synthetic built-in inputs. The evaluation clock is fixed for reproducibility. This is actual local command output, not live AI or fetched data.

Command: `node scripts/compare.mjs --demo funding --now 2026-10-12T03:00:00Z --fail-on review`

Observed exit code: 2 (valid comparison; review gate blocked).

```text
# ProofPilot change review

Result: Decision changed
Evaluated: 2026-10-12T03:00:00.000Z

Previous programme: Sample Founder Studio
Candidate programme: Sample Founder Studio
Previous source: https://example.org/synthetic-founder-studio
Candidate source: https://example.org/synthetic-founder-studio
Source identity: Same supplied URL; identity and content are not independently verified.

Previous decision: Likely fit
Candidate decision: Upfront costs
Evidence review required: Yes

## Changed fields
- Funding type: covered → reimbursement
- Travel summary: Travel arranged before participation → Paid after participation
- Funding detail: Synthetic terms: approved travel is booked before participation. → Synthetic revised terms: participants pay first; reimbursement follows participation.

## Changed checks
- Upfront travel costs: not required → funding. You cannot cover upfront travel; this is a funding blocker.

## Limits
Deterministic comparison of manually supplied snapshots against the same in-memory profile. No scraping, live AI, automated verification, application submission or legal certification. Supported rules only; source prose can contain requirements this schema does not express. A stable decision does not mean changed evidence is safe to ignore. Profile text is omitted from this report. Review the report before sharing.

Profile mode: synthetic-demo
Gate policy: review
Gate blocked: Yes
```
