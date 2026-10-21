# Telemetry

## Status

**Tracing:** <enabled / disabled>

## OTLP configuration

| Setting | Value | Location |
|---|---|---|
| `CLAUDE_CODE_ENABLE_TELEMETRY` | `1` | Global (`~/.claude/settings.json`) |
| Endpoint | `<endpoint or n/a>` | Global |
| Protocol | `http/json` | Global |
| Service name | `<service-name or n/a>` | Per-project (`.claude/settings.json`) |

**Scope rule:** Claude Code ignores OTEL exporter vars at project level. All exporter config must be in `~/.claude/settings.json`. Only `OTEL_SERVICE_NAME` works per-project.

## What is traced

Claude Code's built-in OpenTelemetry export ships:

- **API requests** — model, token counts (input / output / cache-read / cache-create), latency
- **Tool calls** — tool name, duration, success/failure
- **Session lifecycle** — start, end, permission decisions
- **Subagent spawns** — agent type, duration (when available)

Detail level is controlled by env vars in `~/.claude/settings.json`:

| Var | Effect |
|---|---|
| `OTEL_LOG_TOOL_DETAILS` | Include tool input parameters |
| `OTEL_LOG_TOOL_CONTENT` | Include tool result content |

Both default to off. Set to `true` for richer traces (larger payloads).

## Changing the config

- **Exporter settings** (endpoint, protocol, enable): edit `~/.claude/settings.json` → `env` block.
- **Service name**: edit `.claude/settings.json` → `env` block (per-project).

Changes take effect on the next Claude Code session.

To disable tracing entirely, remove `CLAUDE_CODE_ENABLE_TELEMETRY` from the global `env` block, or re-run `/harness:setup-telemetry`.
