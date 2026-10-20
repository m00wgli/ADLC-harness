---
name: security-asvs
description: "Map OWASP ASVS requirements to the feature: filter deterministically by level and chapters, display exact requirements, tag scope and rationale, present all at once for review. Runs after the spec is published."
disable-model-invocation: true
---

# Security ASVS

Map OWASP ASVS requirements to the feature described by the current grilling and spec. This skill runs **after** the spec is published.

The filtering is **fully deterministic** — the `asvs-filter.mjs` script produces the exact requirement list. The agent's only contribution is `scope` and `rationale` per requirement. A PreToolUse hook enforces that the checklist's `req_id`, `req_description`, `chapter_id`, and `chapter_name` match the filter output verbatim.

## Prerequisites

- `docs/agents/security-level.md` exists with a level other than `none`
- A PRD issue has been published (the spec)
- The grilling is in the current conversation context

If the level is `none` or `docs/agents/security-level.md` does not exist, skip this skill entirely. Tell the user they can run `/harness:setup-security-level` to set a level.

## Process

### 1. Gather context

Read the PRD issue body (the spec). The grilling decisions are already in the conversation context. Identify what the feature touches: data types, external input, auth flows, APIs, crypto, logging.

### 2. Suggest chapters

Based on the analysis, suggest which ASVS chapters apply. For each, give a one-line justification. Also list chapters considered but excluded, with a reason.

```
Based on the grilling and spec, these chapters apply:

  V1  — Encoding and Sanitization   → user input from registration form, API payloads
  V6  — Authentication              → password-based login, MFA discussed in Q4
  V13 — Configuration               → environment secrets, deployment config

Chapters considered but excluded:
  V5  — File Handling               → no file upload in this feature
  V17 — WebRTC                      → no real-time communication
```

### 3. User confirms chapters

Use `AskUserQuestion` (header: "Chapters"):

- `Accept these chapters (Recommended)`
- `I want to modify the selection`

If they want to modify, present the full 17-chapter list in batched multiSelect calls:

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

**Call 5** (header: "Chapter 17", multiSelect) — skip if V17 was already excluded and the user didn't modify Call 4:
- `V17 — WebRTC` (12 reqs)

If no chapters selected, warn and ask to confirm.

### 4. Filter requirements (deterministic)

Run the filter script:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/asvs-filter.mjs --chapters <comma-separated-chapter-ids>
```

This is the **source of truth**. The output contains the exact `req_id`, `req_description`, `chapter_id`, `chapter_name` for every requirement at the project's level within the selected chapters. **Do not paraphrase, abbreviate, or modify these fields.**

### 5. Add scope and rationale

For **each** requirement from the filter output, add two fields:

- **Applies** (yes / no): Default **yes**. N/A only with a concrete reason from the grilling.
- **Scope** (`application` or `feature`):
  - `application` — applies to the whole app (TLS config, CSP headers, logging infra, key rotation)
  - `feature` — applies to this specific feature (input validation for this form, auth for this endpoint)
- **Rationale** — one line referencing a grilling decision or spec section.

The `req_id`, `req_description`, `chapter_id`, and `chapter_name` come verbatim from the filter output. Do not alter them.

### 6. Present all at once for review

Present **all chapters together** in one output. The user sees everything at once and can review, modify applies/scope, or ask questions before confirming.

Format — one table per chapter, all in sequence:

```
### V1 — Encoding and Sanitization

| Req ID | Requirement | Applies | Scope | Rationale |
|--------|-------------|---------|-------|-----------|
| V1.2.1 | Verify that output encoding for an HTTP response… | Yes | feature | API payloads from Q3 |
| V1.2.2 | Verify that … | N/A | — | No user-generated HTML |

### V6 — Authentication

| Req ID | Requirement | Applies | Scope | Rationale |
|--------|-------------|---------|-------|-----------|
| V6.1.1 | Verify that … | Yes | feature | Password login from Q4 |
```

Rules:
- **Every row from the filter output must appear.** No silent skips.
- **Req ID and Requirement columns are verbatim from the filter.** The hook will reject mismatches.
- **Default to "Yes".** N/A needs a concrete reason.

After presenting, ask the user to confirm or request changes. On changes, update the affected rows and re-present only the changed section.

### 7. Write the checklist

Write `docs/agents/asvs-checklist.json`. The PreToolUse hook will run `asvs-filter.mjs` and validate that every `req_id`, `req_description`, `chapter_id`, and `chapter_name` matches the filter output verbatim. If it doesn't match, the write is blocked.

```json
{
  "level": "L2",
  "chapters": ["V1", "V6"],
  "counts": {
    "applicable": 18,
    "not_applicable": 3
  },
  "requirements": [
    {
      "req_id": "V1.2.1",
      "chapter_id": "V1",
      "chapter_name": "Encoding and Sanitization",
      "req_description": "Verify that output encoding for an HTTP response…",
      "applies": true,
      "scope": "feature",
      "rationale": "API payloads from Q3"
    }
  ]
}
```

Then run verification:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/asvs-verify.mjs verify-checklist
```

### 8. Update the PRD

Edit the PRD issue to replace the `## Security Requirements` placeholder. Use `gh issue edit <number>` to update the body.

Format — only applicable requirements, grouped by chapter. The section opens with the ASVS version and chosen level so any reader knows the standard and threshold at a glance:

```markdown
## Security Requirements

Security requirements mapped from **OWASP ASVS 5.0** at **Level 2** (L2 — 253 cumulative requirements). Chapters selected based on the feature's grilling and spec analysis.

### V6 — Authentication

| Req ID | Requirement | Scope | How it applies |
|--------|-------------|-------|----------------|
| V6.1.1 | Verify that … | feature | Password login: bcrypt cost >= 13 |

**Total: 18 requirements across 2 chapters (ASVS L2). Application-wide: 5, Feature-specific: 13.**
```

After editing:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/asvs-verify.mjs verify-spec <issue-number>
```

### 9. Summary

```
Security mapping complete.
  Level:       L2
  Chapters:    2 (V1, V6)
  Applicable:  18 requirements (5 application-wide, 13 feature-specific)
  N/A:         3 requirements
  Checklist:   docs/agents/asvs-checklist.json ✓
  PRD updated: #42 ✓
```
