---
name: security-asvs
description: "Map OWASP ASVS requirements to the feature: suggest chapters from the grilling context, filter deterministically, tag each requirement as application-wide or feature-specific, write the checklist, and update the PRD. Runs after the spec is published."
disable-model-invocation: true
---

# Security ASVS

Map OWASP ASVS requirements to the feature described by the current grilling and spec. This skill runs **after** the spec is published, using the conversation context (grilling decisions) and the PRD content to make informed chapter suggestions.

## Prerequisites

- `docs/agents/security-level.md` exists with a level other than `none`
- A PRD issue has been published (the spec)
- The grilling is in the current conversation context

If the level is `none` or `docs/agents/security-level.md` does not exist, skip this skill entirely. Tell the user they can run `/harness:setup-security-level` to set a level.

## Process

### 1. Gather context

Read the PRD issue body (the spec). The grilling decisions are already in the conversation context. Identify:

- What data the feature handles (PII, credentials, financial, health, etc.)
- What external input enters the system (forms, APIs, file uploads, webhooks)
- What auth and session flows exist
- What APIs are exposed or consumed
- What cryptographic operations are needed
- What logging and error handling is described

### 2. Suggest chapters

Based on the analysis, suggest which of the 17 ASVS chapters apply to this feature. For each suggested chapter, give a one-line justification tied to a specific grilling decision or spec section. Also list chapters you considered but excluded, with a reason.

```
Based on the grilling and spec, these chapters apply:

  V1  — Encoding and Sanitization   → user input from registration form, API payloads
  V6  — Authentication              → password-based login, MFA discussed in Q4
  V8  — Authorization               → role-based access from Q7
  V13 — Configuration               → environment secrets, deployment config
  V14 — Data Protection             → PII storage decided in Q12

Chapters considered but excluded:
  V5  — File Handling               → no file upload in this feature
  V10 — OAuth and OIDC              → using password auth, not OAuth
  V17 — WebRTC                      → no real-time communication
```

### 3. User confirms chapters

Use `AskUserQuestion` (header: "Chapters"):

- `Accept these chapters (Recommended)`
- `I want to modify the selection`

If the user accepts, use the suggested chapters. If they want to modify, present the full chapter list in batched multiSelect calls. Pre-check the suggested chapters in the description so the user knows the starting point.

**Call 1** (header: "Chapters 1–4", multiSelect):
- `V1  — Encoding and Sanitization` (30 reqs)
- `V2  — Validation and Business Logic` (13 reqs)
- `V3  — Web Frontend Security` (31 reqs)
- `V4  — API and Web Service` (16 reqs)

**Call 2** (header: "Chapters 5–8", multiSelect):
- `V5  — File Handling` (13 reqs)
- `V6  — Authentication` (47 reqs)
- `V7  — Session Management` (19 reqs)
- `V8  — Authorization` (13 reqs)

**Call 3** (header: "Chapters 9–12", multiSelect):
- `V9  — Self-contained Tokens` (7 reqs)
- `V10 — OAuth and OIDC` (36 reqs)
- `V11 — Cryptography` (24 reqs)
- `V12 — Secure Communication` (12 reqs)

**Call 4** (header: "Chapters 13–17", multiSelect):
- `V13 — Configuration` (21 reqs)
- `V14 — Data Protection` (13 reqs)
- `V15 — Secure Coding and Architecture` (21 reqs)
- `V16 — Security Logging and Error Handling` (17 reqs)

**Call 5** (header: "Chapter 17", multiSelect):
- `V17 — WebRTC` (12 reqs)

_Call 5 may be skipped if WebRTC is clearly irrelevant — V17 was already listed in the "excluded" suggestions. If the user didn't modify Call 4 and V17 was excluded, skip Call 5._

After confirmation, if no chapters are selected, warn that no requirements will be audited and ask to confirm.

### 4. Filter requirements (deterministic)

Run the filter script with the confirmed chapters:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/asvs-filter.mjs --chapters <comma-separated-chapter-ids>
```

Parse the JSON output. This gives the full list of requirements at the project's level for the selected chapters.

### 5. Map each requirement

For **each** requirement in the filtered list, determine:

- **Applies** (yes / no): Does this requirement apply? Default to **yes**. A requirement is N/A only when there is a concrete reason from the grilling that the feature does not touch the relevant behaviour. "Probably not relevant" is not a valid reason.
- **Scope** (`application` or `feature`):
  - `application` — the requirement applies to the application as a whole, not specific to this feature. Examples: TLS configuration, global CSP headers, logging infrastructure, key rotation policy, secure build pipeline.
  - `feature` — the requirement applies to this specific feature's implementation. Examples: input validation for this form, password hashing for this login flow, authorization checks for this endpoint.
- **Rationale** — one line explaining why it applies (or does not), referencing a grilling decision or spec section.

### 6. User reviews the mapping

Present the mapping grouped by chapter, one chapter at a time:

| Req ID | Requirement | Applies | Scope | Rationale |
|--------|-------------|---------|-------|-----------|
| V6.1.1 | Verify that … | **Yes** | feature | Password login from Q4 |
| V6.1.2 | Verify that … | **N/A** | — | No credential recovery flow |

Rules:
- **Walk every row.** Do not silently skip requirements.
- **Default to "Yes".** A requirement is N/A only with a concrete reason.
- **Derive from the grilling.** Use established facts, not new assumptions.
- **Group by chapter.** Present one chapter at a time.

After each chapter, the user confirms or overrides. They can flip any row's Applies or Scope. Confirmed rows are final.

### 7. Write the checklist

Write `docs/agents/asvs-checklist.json`:

```json
{
  "level": "L2",
  "chapters": ["V1", "V6", "V13"],
  "counts": {
    "applicable": 28,
    "not_applicable": 14
  },
  "requirements": [
    {
      "req_id": "V6.1.1",
      "chapter_id": "V6",
      "chapter_name": "Authentication",
      "req_description": "Verify that …",
      "applies": true,
      "scope": "feature",
      "rationale": "Password login from Q4"
    },
    {
      "req_id": "V6.1.2",
      "chapter_id": "V6",
      "chapter_name": "Authentication",
      "req_description": "Verify that …",
      "applies": false,
      "scope": null,
      "rationale": "No credential recovery flow"
    }
  ]
}
```

Run verification:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/asvs-verify.mjs verify-checklist
```

If it fails, fix and retry.

### 8. Update the PRD

Edit the PRD issue to add the Security Requirements section. Use `gh issue edit <number>` to update the body. Replace the placeholder `## Security Requirements` section with the real content.

Format:

```markdown
## Security Requirements

ASVS requirements applicable to this feature, mapped from the security analysis.

### V6 — Authentication

| Req ID | Requirement | Scope | How it applies |
|--------|-------------|-------|----------------|
| V6.1.1 | Verify that … | feature | Password login: must use bcrypt with cost >= 13 |

### V13 — Configuration

| Req ID | Requirement | Scope | How it applies |
|--------|-------------|-------|----------------|
| V13.1.1 | Verify that … | application | All secrets via env vars, no hardcoded credentials |

**Total: 28 requirements across 3 chapters (ASVS L2). Application-wide: 8, Feature-specific: 20.**
```

Only applicable requirements (applies: true) appear in the PRD. Group by chapter. Include the scope tag and a concrete "how it applies" line.

After editing, run:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/asvs-verify.mjs verify-spec <issue-number>
```

### 9. Summary

Report the final state:

```
Security mapping complete.
  Level:       L2
  Chapters:    3 (V1, V6, V13)
  Applicable:  28 requirements (8 application-wide, 20 feature-specific)
  N/A:         14 requirements
  Checklist:   docs/agents/asvs-checklist.json ✓
  PRD updated: #42 ✓
```
