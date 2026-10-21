---
name: setup-telemetry
description: "Configure OpenTelemetry tracing for Claude Code sessions. Writes OTLP env vars to .claude/settings.json and verifies the collector is reachable. Run once per project."
disable-model-invocation: true
---

# Setup Telemetry

Configure Claude Code's built-in OpenTelemetry export so every session ships traces (tool calls, API requests, token usage) to the user's observability platform.

## 1. Check current state

Read `~/.claude/settings.json` (global) and `.claude/settings.json` (project) if they exist. If `OTEL_EXPORTER_OTLP_ENDPOINT` is already set in the global config, show it and ask whether to reconfigure or keep it.

## 2. Ask

Use `AskUserQuestion` (header: "Telemetry"):

- `m00wgli (Recommended)` — Traces → `http://localhost:8181` (m00wgli platform).
- `Standard OTLP` — Traces → `http://localhost:4318` (Grafana Alloy, OTel Collector, SigNoz, etc.).
- `No tracing` — Skip. Can be added later with `/harness:setup-telemetry`.

If the user picks **No tracing**, write `docs/agents/telemetry.md` with status `disabled` using the template at `${CLAUDE_PLUGIN_ROOT}/skills/setup/setup-telemetry/telemetry.md`, and stop here.

If the user picks **m00wgli**, set endpoint to `http://localhost:8181`. If **Standard OTLP**, set endpoint to `http://localhost:4318`. If **Other**, the user types their endpoint.

Service name defaults to the repo directory name (infer from `basename $(git rev-parse --show-toplevel)` or equivalent). Don't ask — just use it.

## 4. Write settings

Claude Code ignores OTEL exporter vars at project level — they must be in the **global** settings (`~/.claude/settings.json`). Only `OTEL_SERVICE_NAME` works per-project.

### Global settings (`~/.claude/settings.json`)

Read the file if it exists (preserve existing keys). Merge into the `env` block:

```json
{
  "env": {
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "<endpoint>",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "http/json",
    "OTEL_LOG_TOOL_DETAILS": "true",
    "OTEL_LOG_TOOL_CONTENT": "true"
  }
}
```

### Per-project settings (`.claude/settings.json`)

Read the file if it exists (preserve existing keys). Merge into the `env` block:

```json
{
  "env": {
    "OTEL_SERVICE_NAME": "<service-name>"
  }
}
```

Do not overwrite other keys in `env` or elsewhere in either file.

## 5. Verify connectivity

Send a test trace to confirm the collector is reachable. Use `curl` to POST a minimal OTLP JSON payload to the traces endpoint:

```bash
curl -sf -o /dev/null -w "%{http_code}" \
  -X POST "${ENDPOINT}/v1/traces" \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"'"${SERVICE_NAME}"'"}}]},"scopeSpans":[{"scope":{"name":"harness.setup"},"spans":[{"traceId":"00000000000000000000000000000001","spanId":"0000000000000001","name":"setup-telemetry.verify","kind":1,"startTimeUnixNano":"'"$(date +%s)000000000"'","endTimeUnixNano":"'"$(date +%s)000000000"'","attributes":[{"key":"test","value":{"boolValue":true}}]}]}]}]}'
```

Interpret the result:

| HTTP status | Meaning |
|---|---|
| `200`, `202` | Collector is reachable and accepted the trace. |
| `000` or connection refused | Collector is not running or endpoint is wrong. Warn the user but still write the config — they may start the collector later. |
| `4xx` | Auth or path problem. Show the status and suggest checking the endpoint URL or auth headers. |

Report the result clearly: either "Test trace accepted (HTTP <status>)" or "Collector not reachable — config saved, traces will ship once the collector is up."

## 6. Record

Write `docs/agents/telemetry.md` using the template at `${CLAUDE_PLUGIN_ROOT}/skills/setup/setup-telemetry/telemetry.md`. Fill in the chosen values.

Add a `### Telemetry` sub-block to the `## Agent skills` section in `CLAUDE.md` (or `AGENTS.md`):

If tracing is enabled:

```markdown
### Telemetry

OTLP tracing → `<endpoint>`. See `docs/agents/telemetry.md`.
```

If tracing is disabled:

```markdown
### Telemetry

Disabled. See `docs/agents/telemetry.md`.
```

## 7. Done

Tell the user the telemetry config is written. Mention:
- Traces ship automatically on every Claude Code session.
- Global exporter config lives in `~/.claude/settings.json`; per-project service name in `.claude/settings.json`.
- To set up a local collector stack, `ccusage` or a Grafana LGTM stack are good starting points.
- If traces don't appear, run `claude --debug-file debug.log` and look for `[3P telemetry]` entries.
