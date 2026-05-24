# code-audit
- When auditing or analyzing a codebase, include concrete evidence from actual source files — function signatures, exact model definitions, relationship declarations, navigation stacks, and concurrency contexts. Do not produce plausible high-level summaries derived from documentation alone. Confidence: 0.85
- Preserve functioning systems — do not rewrite or refactor code that demonstrably works. Only propose changes when there is a concrete defect (crash, race, dead code, data loss, correctness failure), not for architectural preference or hypothetical improvement. Confidence: 0.80
- Gate every new abstraction or architectural layer on demonstrable failure of one of: scalability, testability, stability, concurrency correctness, or maintainability. If none of these are broken, do not introduce protocols, use-cases, coordinators, or DI frameworks. Confidence: 0.80

# communication
- Optimize output for correctness, verification, surgical precision, and production readiness — not for sounding intelligent. Avoid generic commentary, theoretical best-practices without evidence, aspirational architecture essays, and hallucinated file structures. Confidence: 0.80

# reconstruction-workflow
- All reconstruction patches must follow the mandatory 10-section output format: Problem, Root Cause, Severity, Systems Impacted, Implementation Strategy, Swift Patch, Migration Notes, Regression Risks, Validation Procedure, Cross-Agent Review Notes. Confidence: 0.80
- Execute reconstruction in strict wave order: Wave 0 (Launch Blockers) → Wave 1 (Stability) → Wave 2 (Performance/Reliability) → Wave 3 (UX/Polish) → Wave 4 (Deferred). No downstream implementation before upstream waves stabilize. Confidence: 0.80
- Every implementation must be cross-reviewed against impact on all other system domains (architecture, UX, performance, API, product) before finalizing. No agent operates in isolation. Confidence: 0.75

