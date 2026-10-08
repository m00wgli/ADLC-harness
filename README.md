# ADLC-harness

A custom agent harness for Claude Code, packaged as the `harness` plugin. Its skills and agents take a project from idea to GitHub tickets, and later through build and review.

```
harness/
├── .claude-plugin/plugin.json
├── hooks/           guard-github-edits (approval before editing existing GitHub text)
├── agents/          code-reviewer, security-auditor, test-engineer, web-performance-auditor
├── skills/
│   ├── setup/       setup-harness-skills, setup-build-loop
│   ├── intake/      triage
│   ├── plan/        grill-with-docs, grilling, domain-modeling, to-spec, to-tickets
│   └── build/       implement, implement-spec, tdd, code-review, pr, diagnosing-bugs, codebase-design
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

After a new version is pushed (bump `version` in `harness/.claude-plugin/plugin.json`, or the update is skipped):

```bash
claude plugin marketplace update adlc-ae-workflow
claude plugin update harness@adlc-ae-workflow
```

Or inside Claude Code: `/plugin` → Marketplaces → `adlc-ae-workflow` → Update. Then restart Claude Code.

Projects using the build loop also need the new harness inside their Docker image. Set `ARG HARNESS_VERSION` in `.sandcastle/Dockerfile` to the new version, then rebuild:

```bash
npx sandcastle docker build-image
```

## Flow

1. `/harness:setup-harness-skills`: once per project. Connects the GitHub issue tracker and labels.
2. `/harness:grill-with-docs`: sharpens the idea by interview and writes `GLOSSARY.md` and ADRs.
3. `/harness:to-spec`: publishes the PRD as a GitHub issue.
4. `/harness:to-tickets #<PRD>`: splits the PRD into GitHub issues with blocking links.
5. `/harness:setup-build-loop`: once per project. Sets up Sandcastle and the Docker image.
6. `/harness:implement-spec #<PRD>`: builds each unblocked ticket in its own sandbox (tdd → test gate → review) and opens a PR per ticket.
7. You review each PR: **merge** to approve (closes the ticket), or add the **`changes-requested`** label with comments to send it back. Run step 6 again to continue.

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
| `plan/to-tickets` | The `Parent` link to the PRD is always required. |
| `setup/setup-harness-skills` | Renamed from `setup-matt-pocock-skills`. The label section always runs and creates the labels on GitHub, including `prd`. |
| `setup/setup-build-loop` | New. |
| `hooks/guard-github-edits` | New. Editing or deleting existing GitHub issues, PRs or comments needs explicit human approval; inside build-loop sandboxes it is blocked. |
| `templates/sandcastle/*` | New. Based on Sandcastle's `parallel-planner-with-review` template, with all prompts rewritten for the harness. |

**Name changes only** (skill references updated to the `harness:` namespace, e.g. `tdd` → `harness:tdd`): `grill-with-docs`, `triage`, `implement`, `tdd`, `code-review`, and the four agents (link to Addy's agents doc only).

**Unchanged:** `grilling`, `domain-modeling`, `pr`, `diagnosing-bugs`, `codebase-design`, and the content of the four agents.

## Credits

The skills and agents are adapted from [mattpocock/skills](https://github.com/mattpocock/skills) and [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), both MIT; their licences are in `reference/`. The gated build loop is inspired by Shopify's [Helix](https://shopify.engineering/helix).
