# AE Harness

A Claude Code plugin that takes a project from idea to pull request. Four phases — **setup**, **design**, **plan**, **build** — each with its own entry command. The human stays in control: every spec needs approval before tickets are cut, and every PR needs a merge before the next ticket is built.

```
/harness:setup   → configure the repo (once)
/harness:design  → idea → spec (PRD)
/harness:plan    → spec → tickets
/harness:build   → tickets → PRs
```

## Install

```bash
# While developing the harness
claude --plugin-dir ./harness

# Or install from the marketplace
/plugin marketplace add m00wgli/ADLC-harness
/plugin install harness@adlc-ae-workflow
```

Clone with submodules:

```bash
git clone --recurse-submodules https://github.com/m00wgli/ADLC-harness.git
# Already cloned without them?
git submodule update --init
```

## Flow

```
         ┌──────────┐
         │  Setup   │  one-time: repo, labels, telemetry, security level
         └────┬─────┘
              ▼
         ┌──────────┐
         │  Design  │  sources → grill → domain model → spec (PRD)
         └────┬─────┘
              ▼           ← user approves spec
         ┌──────────┐
         │   Plan   │  spec → tickets with blocking edges
         └────┬─────┘
              ▼           ← user approves breakdown
         ┌──────────┐
    ┌───▶│  Build   │  implement → review (3 personas) → fix → PR
    │    └────┬─────┘
    │         ▼
    │    human reviews PR
    │    ├── merge      → closes ticket, unblocks next
    │    └── changes-requested → rework on next run
    └────────┘
```

Each phase resumes where the last session stopped. Run `/harness:build #<spec>` again after reviewing PRs to continue with the next unblocked ticket.

## Skills

### Setup

Run once per project. `/harness:setup-all` runs all of them.

| Skill | What it does |
|-------|-------------|
| **setup-all** | Full setup: issue tracker, labels, domain docs, previews, security level, telemetry |
| **setup-harness-skills** | Issue tracker, triage labels, and domain docs |
| **setup-preview-deploys** | Vercel preview URLs on every PR |
| **setup-security-level** | Set the OWASP ASVS compliance level |
| **setup-telemetry** | OTLP tracing for Claude Code sessions |

### Design

`/harness:design <input>` orchestrates these in order. Input can be text, `@file`, `@folder`, a URL, or `#issue`.

| Skill | What it does |
|-------|-------------|
| **design** | Orchestrator — sources → grill → checkpoint → spec → security requirements |
| **grilling** | Stress-test a plan or idea with relentless questions |
| **grill-with-docs** | Same grilling, writes ADRs and glossary entries as decisions land |
| **domain-modeling** | Build and sharpen `GLOSSARY.md` and ADRs |
| **research** | Investigate a question against primary sources |
| **prototype** | Throwaway prototype to answer a design question |
| **to-spec** | Turn the conversation into a spec, publish as a `prd` issue |
| **security-asvs** | Map OWASP ASVS requirements to the spec |

### Plan

`/harness:plan #<spec>` orchestrates these.

| Skill | What it does |
|-------|-------------|
| **plan** | Orchestrator — load spec → cut tickets with blocking edges |
| **to-tickets** | Break a spec into tracer-bullet tickets, publish to the tracker |

### Build

`/harness:build #<spec>` orchestrates these. Each ticket runs: implement → review → fix → PR.

| Skill | What it does |
|-------|-------------|
| **build** | Orchestrator — per ticket: implement → 3-persona review → fix → PR |
| **implement-spec** | TDD a single ticket on its own branch, runs browser testing for UI tickets |
| **implement** | Implement work from a spec or set of tickets |
| **tdd** | Red → green → refactor loop |
| **code-review** | Two-axis review: Standards + Spec compliance |
| **browser-testing** | Chrome automation for UI verification (visual, console, network, a11y) |
| **pr** | Write the PR body |
| **diagnosing-bugs** | Structured diagnosis loop for hard bugs |
| **codebase-design** | Interface design, seam placement, testability vocabulary |

### Meta

| Skill | What it does |
|-------|-------------|
| **triage** | Move incoming issues through a triage state machine |

## Agents

Three review personas run in parallel during the build phase. Each produces an independent report on the same diff.

| Persona | Role | Runs when |
|---------|------|-----------|
| **code-reviewer** | Senior Staff Engineer — correctness, readability, architecture, security, performance | Every ticket |
| **security-auditor** | Security Engineer — ASVS checklist verification, vulnerability scan | Tickets with `## Security (ASVS)` |
| **test-engineer** | QA Engineer — acceptance criteria coverage, test quality | Every ticket |

Personas do not call each other. The build orchestrator fans them out and merges results.

## Hooks

| Hook | Event | Effect |
|------|-------|--------|
| **guard-github-edits** | PreToolUse | Blocks editing/deleting GitHub issues, PRs, or comments without human approval |
| **asvs-checklist-gate** | PreToolUse | Blocks writes to `asvs-checklist.json` unless content matches deterministic filter |
| **asvs-count-gate** | PreToolUse | Blocks issue creation when ASVS verification hasn't passed |
| **notify-record-changes** | PostToolUse | Notifies when an ADR or glossary changes (never blocks) |

## References

| File | Purpose |
|------|---------|
| **core-behaviors.md** | Six rules every agent and skill must follow: surface assumptions, manage confusion, push back, enforce simplicity, scope discipline, verify don't assume |

## Labels

Created by `setup-harness-skills` on first run.

| Label | Meaning |
|-------|---------|
| `prd` | The spec — never built directly |
| `ready-for-agent` | Ticket the build phase may pick up |
| `ready-for-human` | Needs a person |
| `needs-triage` | Incoming, not yet evaluated |
| `needs-info` | Waiting on the reporter |
| `changes-requested` | Send the PR back for rework |
| `bug` / `enhancement` | Category, set by triage |
| `wontfix` | Won't be done |

## Maintainable files

Files that must be kept in sync when skills, agents, hooks, or references change.

| File | Synced with | What to check |
|------|------------|---------------|
| `README.md` — Skills tables | `harness/skills/*/SKILL.md` | New/removed/renamed skills reflected in tables |
| `README.md` — Agents table | `harness/agents/*.md` | New/removed personas reflected |
| `README.md` — Hooks table | `harness/hooks/hooks.json` | New/removed hooks reflected |
| `README.md` — References table | `harness/references/` | New/removed reference files reflected |
| `README.md` — Project Structure | all folders above | Tree matches actual layout |
| `harness/.claude-plugin/plugin.json` | `harness/skills/`, `harness/agents/` | `skills` and `agents` arrays list every folder/file |
| `setup-harness-skills/SKILL.md` — Skill routing tree | all `SKILL.md` files | New/removed skills appear in the routing tree |
| `setup-harness-skills/SKILL.md` — CLAUDE.md template | same | Phase table and routing tree written to target repos |
| `harness/references/asvs/asvs-5.0.0.flat.json` | [OWASP ASVS releases](https://github.com/OWASP/ASVS) | Update when ASVS publishes a new version |
| `harness/references/core-behaviors.md` | all `SKILL.md` files | Every skill links to this; changes affect all phases |
| `harness/hooks/hooks.json` | `harness/hooks/*.mjs` | Entry for every hook script, events match |
| `harness/skills/*/agents/openai.yaml` | each skill's `SKILL.md` | Agent model/config matches what the skill expects |

## Update

Bump `version` in `harness/.claude-plugin/plugin.json`, push, then:

```bash
claude plugin marketplace update adlc-ae-workflow
claude plugin update harness@adlc-ae-workflow
```

Or inside Claude Code: `/plugin` → Marketplaces → `adlc-ae-workflow` → Update.

## Project Structure

```
harness/
├── .claude-plugin/plugin.json    manifest
├── agents/                       code-reviewer, security-auditor, test-engineer
├── hooks/                        guard-github-edits, asvs gates, notify-record-changes
├── references/                   core-behaviors
├── skills/
│   ├── setup/                    setup-all, setup-harness-skills, setup-preview-deploys, setup-security-level, setup-telemetry
│   ├── design/                   design, grilling, grill-with-docs, domain-modeling, research, prototype, to-spec, security-asvs
│   ├── plan/                     plan, to-tickets
│   ├── build/                    build, implement, implement-spec, tdd, code-review, browser-testing, pr, diagnosing-bugs, codebase-design
│   └── meta/                     triage
└── templates/
    └── sandcastle/               build loop template

sandcastle/       mattpocock/sandcastle fork (git submodule)
reference/        source repos (Addy Osmani, Matt Pocock) — reference only
```

## Credits

Skills adapted from [mattpocock/skills](https://github.com/mattpocock/skills) and [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), both MIT. Licences in `reference/`.
