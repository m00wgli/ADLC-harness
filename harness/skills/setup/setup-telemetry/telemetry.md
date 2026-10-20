# Telemetry

## Status

**Tracing:** <enabled / disabled>

## OTLP configuration

| Setting | Value |
|---|---|
| Endpoint | `<endpoint or n/a>` |
| Service name | `<service-name or n/a>` |
| Protocol | OTLP/HTTP (JSON) |

## What is traced

Claude Code's built-in OpenTelemetry export ships:

- **API requests** — model, token counts (input / output / cache-read / cache-create), latency
- **Tool calls** — tool name, duration, success/failure
- **Session lifecycle** — start, end, permission decisions
- **Subagent spawns** — agent type, duration (when available)

Detail level is controlled by env vars in `.claude/settings.json`:

| Var | Effect |
|---|---|
| `OTEL_LOG_TOOL_DETAILS` | Include tool input parameters |
| `OTEL_LOG_TOOL_CONTENT` | Include tool result content |

Both default to off. Set to `true` for richer traces (larger payloads).

## Changing the config

Edit `.claude/settings.json` → `env` block. Changes take effect on the next Claude Code session.

To disable tracing entirely, remove `OTEL_EXPORTER_OTLP_ENDPOINT` from the `env` block, or re-run `/harness:setup-telemetry`.
