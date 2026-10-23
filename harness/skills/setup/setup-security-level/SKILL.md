---
name: setup-security-level
description: "Set the OWASP ASVS compliance level for this project. Writes docs/agents/security-level.md."
disable-model-invocation: true
---

# Setup Security Level

Configure the project's OWASP ASVS compliance level. Adhere to the [core behaviors](${CLAUDE_PLUGIN_ROOT}/references/core-behaviors.md) throughout. This determines which security requirements are enforced during planning (`/harness:plan`). Applicable chapters are selected later, during planning, based on the actual feature being built.

## 1. Check current state

Read `docs/agents/security-level.md` if it exists. If a level is already set, show it and ask whether to reconfigure or keep it.

## 2. Choose ASVS level

Use `AskUserQuestion` (header: "ASVS level"):

- `None (Recommended)` — No ASVS compliance tracking. Security best practices still apply, but no formal requirement audit during planning.
- `L1 — Basic` — 70 requirements. Minimum bar for all applications. Largely automatable.
- `L2 — Standard` — 253 requirements (includes L1). For apps handling sensitive data, auth, transactions.
- `L3 — Advanced` — 345 requirements (includes L1 + L2). For critical infrastructure, financial, healthcare.

## 3. Write

Write `docs/agents/security-level.md` using the template at `${CLAUDE_PLUGIN_ROOT}/skills/setup/setup-harness-skills/security-level.md`. Fill in the chosen level.

Add a `### Security level` sub-block to the `## Agent skills` section in `CLAUDE.md` (or `AGENTS.md`):

If a level was chosen:

```markdown
### Security level

ASVS <level>. See `docs/agents/security-level.md`.
```

If level is `none`:

```markdown
### Security level

No ASVS compliance tracking. See `docs/agents/security-level.md`.
```

## 4. Done

Tell the user the security level is configured. If a level other than none was set, mention that `/harness:design` will select applicable chapters and map ASVS requirements during the security-asvs step.

## Verification

- [ ] `docs/agents/security-level.md` exists with a valid level
