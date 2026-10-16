# Observed JUnit demo

Captured on October 16, 2026 with Node.js 24.19.0 on Windows. Wholly synthetic built-in evidence; no fetched source, live AI or real applicant data.

```sh
node scripts/compare.mjs --demo funding --now 2026-10-16T03:00:00Z --format junit --fail-on review
```

Observed exit: **2** (valid comparison; human review required). Stderr was empty.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="1" failures="1" errors="0" skipped="0">
  <testsuite name="ProofPilot evidence gate" tests="1" failures="1" errors="0" skipped="0">
    <testcase classname="ProofPilot.EvidenceReview" name="review-policy">
      <failure type="HumanReviewRequired" message="Evidence changes require human review under the selected policy.">Review the inputs locally with Markdown or JSON output. A gate failure is not an application rejection.</failure>
      <system-out>Offline comparison. Policy: review. Profile mode: synthetic-demo. Evaluated: 2026-10-16T03:00:00.000Z. Changed fields: 3. Changed checks: 1. Evidence and profile values are omitted. A pass means no change blocked this policy; it does not certify eligibility or source accuracy.</system-out>
    </testcase>
  </testsuite>
</testsuites>
```

Python standard-library ElementTree independently parsed this XML and the unchanged, preview/skipped and deadline reports. The missing-file workflow returned exit 1 with empty stdout. No GitLab account or hosted JUnit viewer was used; consumer UI rendering is not verified. This report omits evidence/profile values; aggregate counts and gate results still reveal that a review occurred.
