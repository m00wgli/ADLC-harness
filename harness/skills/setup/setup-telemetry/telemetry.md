# Telemetry

## Status

**Tracing:** <enabled / disabled>

## OTLP configuration

| Setting | Value | Location |
|---|---|---|
| `CLAUDE_CODE_ENABLE_TELEMETRY` | `1` | Global (`~/.claude/settings.json`) |
| Endpoint | `<endpoint or n/a>` | Global |
| Protocol | `http/json` | Global |
| `OTEL_LOG_TOOL_DETAILS` | `true` | Global |
| `OTEL_LOG_TOOL_CONTENT` | `true` | Global |
| Service name | `<service-name or n/a>` | Per-project (`.claude/settings.json`) |

**Scope rule:** Claude Code ignores OTEL exporter vars at project level. All exporter config must be in `~/.claude/settings.json`. Only `OTEL_SERVICE_NAME` works per-project.

## What is traced

Claude Code's built-in OpenTelemetry export ships:

- **API requests** — model, token counts (input / output / cache-read / cache-create), latency
- **Tool calls** — tool name, duration, success/failure
- **Session lifecycle** — start, end, permission decisions
- **Subagent spawns** — agent type, duration (when available)

Detail vars `OTEL_LOG_TOOL_DETAILS` and `OTEL_LOG_TOOL_CONTENT` are enabled by default in the harness setup, so traces include tool input parameters and result content. To reduce payload size, set either to `false` in `~/.claude/settings.json`.

## Changing the config

- **Exporter settings** (endpoint, protocol, enable): edit `~/.claude/settings.json` → `env` block.
- **Service name**: edit `.claude/settings.json` → `env` block (per-project).

Changes take effect on the next Claude Code session.

To disable tracing entirely, remove `CLAUDE_CODE_ENABLE_TELEMETRY` from the global `env` block, or re-run `/harness:setup-telemetry`.
