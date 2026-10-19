# Security level

## ASVS level

**Level:** <none / L1 / L2 / L3>

- **none:** No ASVS compliance tracking. Security-and-hardening practices still apply.
- **L1 (Basic):** 70 requirements. Minimum for all applications. Largely automatable.
- **L2 (Standard):** 183 requirements (includes L1). For apps handling sensitive data, auth, transactions.
- **L3 (Advanced):** 345 requirements (includes L1 + L2). For critical infrastructure, financial, healthcare.

## Applicable chapters

Mark each chapter that applies to this project. Skip chapters the project does not touch (e.g. skip WebRTC if there is no real-time communication).

- [ ] V1  — Encoding and Sanitization (30 reqs)
- [ ] V2  — Validation and Business Logic (13 reqs)
- [ ] V3  — Web Frontend Security (31 reqs)
- [ ] V4  — API and Web Service (16 reqs)
- [ ] V5  — File Handling (13 reqs)
- [ ] V6  — Authentication (47 reqs)
- [ ] V7  — Session Management (19 reqs)
- [ ] V8  — Authorization (13 reqs)
- [ ] V9  — Self-contained Tokens (7 reqs)
- [ ] V10 — OAuth and OIDC (36 reqs)
- [ ] V11 — Cryptography (24 reqs)
- [ ] V12 — Secure Communication (12 reqs)
- [ ] V13 — Configuration (21 reqs)
- [ ] V14 — Data Protection (13 reqs)
- [ ] V15 — Secure Coding and Architecture (21 reqs)
- [ ] V16 — Security Logging and Error Handling (17 reqs)
- [ ] V17 — WebRTC (12 reqs)

## ASVS version

5.0.0 (May 2025). Reference data: `${CLAUDE_PLUGIN_ROOT}/references/asvs/asvs-5.0.0.flat.json`.
