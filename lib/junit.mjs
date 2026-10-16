// A deliberately minimal CI artifact. Never accept names, paths, prose, URLs or
// profile values from the comparison: aggregate gate metadata is enough here.
export function junitReport({gate,profileMode,evaluatedAt,changes,checks}){
  const skipped=gate.policy==='none';
  const failure=gate.blocked?1:0;
  const result=skipped
    ? '      <skipped message="Preview only; no review policy was enforced."/>\n'
    : gate.blocked
      ? '      <failure type="HumanReviewRequired" message="Evidence changes require human review under the selected policy.">Review the inputs locally with Markdown or JSON output. A gate failure is not an application rejection.</failure>\n'
      : '';
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + `<testsuites tests="1" failures="${failure}" errors="0" skipped="${Number(skipped)}">\n`
    + `  <testsuite name="ProofPilot evidence gate" tests="1" failures="${failure}" errors="0" skipped="${Number(skipped)}">\n`
    + '    <testcase classname="ProofPilot.EvidenceReview" name="review-policy">\n'
    + result
    + `      <system-out>Offline comparison. Policy: ${gate.policy}. Profile mode: ${profileMode}. Evaluated: ${evaluatedAt}. Changed fields: ${changes.length}. Changed checks: ${checks.length}. Evidence and profile values are omitted. A pass means no change blocked this policy; it does not certify eligibility or source accuracy.</system-out>\n`
    + '    </testcase>\n'
    + '  </testsuite>\n'
    + '</testsuites>\n';
}
