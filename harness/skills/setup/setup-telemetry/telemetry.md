# Telemetry

## Status

**Tracing:** <enabled / disabled>

## OTLP configuration

| Variable | Value | Location |
|---|---|---|
| `CLAUDE_CODE_ENABLE_TELEMETRY` | `1` | Global (`~/.claude/settings.json`) |
| `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA` | `1` | Global |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `<endpoint or n/a>` | Global |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/json` | Global |
| `OTEL_METRICS_EXPORTER` | `otlp` | Global |
| `OTEL_LOGS_EXPORTER` | `otlp` | Global |
| `OTEL_TRACES_EXPORTER` | `otlp` | Global |
| `OTEL_LOG_USER_PROMPTS` | `1` | Global |
| `OTEL_LOG_TOOL_DETAILS` | `1` | Global |
| `OTEL_LOG_TOOL_CONTENT` | `1` | Global |
| `OTEL_SERVICE_NAME` | `<service-name or n/a>` | Per-project (`.claude/settings.json`) |

**Scope rule:** Claude Code ignores OTEL exporter vars at project level. All exporter config must be in `~/.claude/settings.json`. Only `OTEL_SERVICE_NAME` works per-project.

## What is traced

With `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA` enabled, Claude Code exports detailed spans:

- **API requests** — model, token counts (input / output / cache-read / cache-create), latency
- **Tool calls** — tool name, duration, success/failure, parameters, and full input/output content
- **User prompts** — conversation prompt text on interaction spans (`OTEL_LOG_USER_PROMPTS`)
- **Session lifecycle** — start, end, permission decisions
- **Subagent spawns** — agent type, duration (when available)

All detail vars are enabled by default in the harness setup. To reduce payload size, set any to `0` or `false` in `~/.claude/settings.json`.

## Changing the config

- **Exporter settings** (endpoint, protocol, enable): edit `~/.claude/settings.json` → `env` block.
- **Service name**: edit `.claude/settings.json` → `env` block (per-project).

Changes take effect on the next Claude Code session.

To disable tracing entirely, remove `CLAUDE_CODE_ENABLE_TELEMETRY` from the global `env` block, or re-run `/harness:setup-telemetry`.
