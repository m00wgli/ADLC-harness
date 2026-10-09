# ADLC-harness

A custom agent harness for Claude Code, packaged as the `harness` plugin. Its skills take a project from idea to GitHub tickets, then build each ticket in a Docker sandbox and open a pull request for human review.

```
harness/
├── .claude-plugin/plugin.json
├── hooks/           guard-github-edits (approval before editing GitHub text), notify-record-changes (notice on ADR/glossary changes)
├── skills/
│   ├── setup/       setup-harness-skills, setup-build-loop
│   ├── intake/      triage
│   ├── plan/        plan, grill-with-docs, grilling, domain-modeling, research, prototype, to-spec, to-tickets
│   └── build/       build, implement, implement-spec, tdd, code-review, pr, diagnosing-bugs, codebase-design
└── templates/
    └── sandcastle/  build loop copied into each project by setup-build-loop
sandcastle/          fork of mattpocock/sandcastle (git submodule): runs the build loop in Docker sandboxes
reference/           source repos the harness borrows from (reference only)
```

Clone with submodules: `git clone --recurse-submodules https://github.com/m00wgli/ADLC-harness.git`. If you already cloned without them, run `git submodule update --init`.

To pull Matt's latest Sandcastle changes into the fork: `cd sandcastle && git fetch upstream && git merge upstream/main && git push`, then commit the updated submodule pointer here.

## Use

```bash
claude --plugin-dir ./harness                  # while developing the harness
```

Or install it in another project:

```
/plugin marketplace add m00wgli/ADLC-harness
/plugin install harness@adlc-ae-workflow
```

## Update

After a new version is pushed (bump `version` in `harness/.claude-plugin/plugin.json` **and** `ARG HARNESS_VERSION` in `harness/templates/sandcastle/Dockerfile` to the same value; `/harness:build` compares them to spot an outdated loop):

```bash
claude plugin marketplace update adlc-ae-workflow
claude plugin update harness@adlc-ae-workflow
```

Or inside Claude Code: `/plugin` → Marketplaces → `adlc-ae-workflow` → Update. Then restart Claude Code.

An install is per project **and** per scope (`local`, `project`, `user`), and each one updates separately. Run the update from the project's folder, once per scope it is installed in (`claude plugin update harness@adlc-ae-workflow --scope local`, then `--scope project`); a stale `local` install wins over a newer `project` one. `claude plugin list` shows what is active. To update once for every project, install with `--scope user` instead.

Projects using the build loop also need the new harness inside their Docker image. Set `ARG HARNESS_VERSION` in `.sandcastle/Dockerfile` to the new version, then rebuild:

```bash
npx sandcastle docker build-image
```

## Flow

Two commands, one per phase. Each walks its phase's skills in order and resumes where it left off.

1. **`/harness:plan <input>`**: takes any input (text, a brainstorm, `@file`, `@folder`, a SoW or RFP, a URL or `#issue`), sets the repo up on first use, reads the sources into a short brief, grills what they leave open (writing `GLOSSARY.md` and ADRs), publishes the spec as an issue labelled `prd`, and cuts it into tickets with blocking links. It stops twice for your approval: before the spec, and on the ticket breakdown.
2. **`/harness:build #<spec>`**: sets the build loop up on first use, then builds each unblocked ticket in its own sandbox (tdd → test gate → review) and opens a PR per ticket.
3. **You review each PR**: **merge** to approve (closes the ticket), or add the **`changes-requested`** label with comments to send it back. Run step 2 again to continue.

Each step can also be run on its own: `/harness:setup-harness-skills`, `/harness:grill-with-docs`, `/harness:to-spec`, `/harness:to-tickets #<spec>`, `/harness:setup-build-loop`, `/harness:implement-spec #<spec>`.

## Labels

| Label | On | Meaning | Created by |
|---|---|---|---|
| `prd` | Issue | The spec; never built directly | `setup-harness-skills` |
| `ready-for-agent` | Issue | Ticket the build loop may build | `setup-harness-skills` |
| `ready-for-human` | Issue | Needs a person (e.g. failed the loop) | `setup-harness-skills` |
| `needs-triage` | Issue | Incoming, not yet evaluated | `setup-harness-skills` |
| `needs-info` | Issue | Waiting for the reporter | `setup-harness-skills` |
| `wontfix` | Issue | Won't be done | `setup-harness-skills` |
| `bug` / `enhancement` | Issue | Category, set by triage | `setup-harness-skills` |
| `changes-requested` | PR | Send the PR back to the agents for rework | `setup-build-loop` |

Each ticket is built on the branch `sandcastle/issue-<n>`. In a project, `docs/agents/triage-labels.md` holds the label mapping; `gh label list` shows what exists on GitHub.

## Modifications

What the harness changes compared with the original Matt Pocock and Addy Osmani files in `reference/`.

**Behaviour changes**

| File | Change |
|---|---|
| `build/implement-spec` | Fully rewritten. The original ran subagents in local git worktrees with one review at the end; this one runs the Sandcastle loop and opens one PR per ticket. |
| `plan/to-spec` | The PRD gets the `prd` label instead of `ready-for-agent`, and the skill reports the PRD number. |
| `plan/to-tickets` | The `Parent` link to the PRD is always required. The breakdown quiz shows a layer line per ticket (`UI ✅ · API ✅ · Data ✅ · Tests ✅`) and flags cross-cutting tickets, to spot horizontal slices at a glance. |
| `setup/setup-harness-skills` | Renamed from `setup-matt-pocock-skills`. The label section always runs and creates the labels on GitHub, including `prd`. |
| `plan/grilling` | Asks the user first whether to be grilled **one question at a time** or **a round at a time** (the whole frontier per message, the original behaviour and the recommended default). |
| `setup/setup-build-loop` | New. |
| `plan/plan`, `build/build` | New. One entry command per phase, written in Matt Pocock's style; they sequence the existing skills and resume where the last session stopped. `build` never codes a ticket itself; everything goes through the loop. |
| `hooks/guard-github-edits` | New. Editing or deleting existing GitHub issues (specs, tickets), PRs or comments needs explicit human approval; blocked inside build-loop sandboxes. |
| `hooks/notify-record-changes` | New. Shows a notice whenever an agent creates, edits, overwrites or deletes an ADR or the glossary. Never blocks; the ADR and glossary flow stays as Matt designed it. In the build loop, the PR lists any ADR/glossary files it changes. |
| `templates/sandcastle/*` | New. Based on Sandcastle's `parallel-planner-with-review` template, with all prompts rewritten for the harness. |

**Name changes only** (skill references updated to the `harness:` namespace, e.g. `tdd` → `harness:tdd`): `grill-with-docs`, `triage`, `implement`, `tdd`, `code-review`.

**Unchanged:** `domain-modeling`, `research`, `prototype`, `pr`, `diagnosing-bugs`, `codebase-design`.

**Removed:** Addy Osmani's four agents (`code-reviewer`, `security-auditor`, `test-engineer`, `web-performance-auditor`). Nothing in the harness used them; they remain in `reference/addy-osmani/agents/`.

## Credits

The skills are adapted from [mattpocock/skills](https://github.com/mattpocock/skills) and [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), both MIT; their licences are in `reference/`.
