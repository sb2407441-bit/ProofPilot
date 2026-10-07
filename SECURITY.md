# Security notes

- No API keys are included or needed for the default workflow. `.env` files, dependencies, build output and local logs are excluded from Git.
- HTTP servers listen only on `127.0.0.1`. Host/origin checks reject unrelated origins. Provider connections accept HTTP loopback origins only, reject URL credentials and do not follow redirects.
- Request size and profile field lengths/types are bounded. Model output is parsed as a plan, then checked against known fact identifiers; model-written prose is never rendered as a factual draft.
- Sensitive-text checks block common key, private-key, identifier and email patterns before draft preparation or export. They are heuristics, not a complete confidentiality guarantee. Do not enter credentials, identity documents or employer data.
- No profile persistence, analytics, document uploads or application submission are implemented. Downloaded briefs are user-controlled files and may contain self-reported information.
- An optional local gateway can forward requests remotely. Inspect its own configuration and costs separately. This app sends only generic labels and identifiers to its model endpoint.
- The prototype has no authentication and is intended for one user on their own computer. Do not change the binding to a public network address without a separate security review.

Before sharing a repository, scan both the tracked tree and Git history and review the files yourself. A clean scanner result cannot prove the absence of every secret.
