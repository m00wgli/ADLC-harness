---
name: setup-all
description: "Full harness setup: configure issue tracker, labels, domain docs, optionally enable Vercel previews, set the ASVS security level, and configure OTLP telemetry. Run once before first use. Applicable ASVS chapters are selected later during /harness:plan."
disable-model-invocation: true
---

# Setup

One-stop setup for the harness plugin. Runs four sub-skills in sequence. Adhere to the [core behaviors](${CLAUDE_PLUGIN_ROOT}/references/core-behaviors.md) throughout.

1. **Core config** — issue tracker, triage labels, domain docs
2. **Preview deploys** (optional) — Vercel preview URLs on every PR
3. **Security level** — OWASP ASVS compliance level
4. **Telemetry** (optional) — OTLP tracing for token usage and session metrics

## Process

### 1. Core config

Read `${CLAUDE_PLUGIN_ROOT}/skills/setup/setup-harness-skills/SKILL.md` and follow it. This configures the issue tracker, triage labels, and domain docs.

### 2. Preview deploys

After core config is complete, ask the user via `AskUserQuestion` (header: "Previews"):

- `Skip for now (Recommended)` — No preview deploys. Can be added later with `/harness:setup-preview-deploys`.
- `Enable Vercel previews` — Every PR gets a preview URL.

If the user picks **Enable Vercel previews**, read `${CLAUDE_PLUGIN_ROOT}/skills/setup/setup-preview-deploys/SKILL.md` and follow it.

### 3. Security level

After preview deploys is resolved, read `${CLAUDE_PLUGIN_ROOT}/skills/setup/setup-security-level/SKILL.md` and follow it. This sets the OWASP ASVS level. Applicable chapters are selected later during `/harness:plan`.

### 4. Telemetry

After security level is resolved, read `${CLAUDE_PLUGIN_ROOT}/skills/setup/setup-telemetry/SKILL.md` and follow it. This configures OpenTelemetry tracing for session metrics (token usage, tool calls, agent spawns).

### 5. Done

Summarise what was configured:

```
Setup complete.
  Tracker:    GitHub (owner/repo)
  Labels:     defaults
  Domain:     single-context
  Previews:   skip
  Security:   ASVS L2
  Telemetry:  OTLP → http://localhost:4318
```

Tell the user they can re-run any sub-skill individually (`/harness:setup-harness-skills`, `/harness:setup-preview-deploys`, `/harness:setup-security-level`, `/harness:setup-telemetry`) to change a single setting later.

## Verification

- [ ] Each sub-setup reported success or was skipped with reason
