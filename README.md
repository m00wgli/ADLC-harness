# Agent skills

## The harness

The harness is a Claude Code plugin in [harness/](harness/), listed in the local marketplace [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json).

```
harness/
├── .claude-plugin/plugin.json   "skills": ["./skills/setup/", "./skills/plan/"]
├── agents/                      code-reviewer, security-auditor, test-engineer, web-performance-auditor
└── skills/
    ├── setup/                   setup-harness-skills
    └── plan/                    grill-with-docs, grilling, domain-modeling, to-spec, to-tickets
```

- **Try it while developing:** `claude --plugin-dir ./harness`
- **Install it:** `/plugin marketplace add <path to this repo>`, then `/plugin install harness@adlc-ae-workflow`
- **Commands are namespaced:** `/harness:grill-with-docs`, `/harness:to-spec`, `/harness:to-tickets`, `/harness:setup-harness-skills`
- **Validate:** `claude plugin validate ./harness`

## Reference material

This README covers the 27 Matt Pocock skills in [reference/matt-pocock/skills/](reference/matt-pocock/skills/). A second set (25 skills + 4 agents) from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) lives in [reference/addy-osmani/](reference/addy-osmani/). Both are **reference material only**, not part of the harness.

Not sure which skill fits? Run **`/ask-matt`**: it routes you to the right skill or flow.

- **User-invoked**: only runs when you type `/<name>` (`disable-model-invocation: true`).
- **Model-invoked**: the agent loads it on its own when the situation matches. You can still type `/<name>`.

## Typical flow

```
0. /setup-matt-pocock-skills        once per repo
        │
1. /grill-with-docs                 sharpen the idea → GLOSSARY.md + ADRs
        │   └─ open question needs running code?
        │        /handoff → /prototype (new session) → /handoff back
        │
2. multi-session build?
        ├─ no  → /implement         in the same context
        └─ yes → /to-spec → /to-tickets
                    ├─ /implement per ticket  (/clear between tickets)
                    └─ /implement-spec        (all tickets, parallel subagents)
        │   (both drive /tdd and finish with /code-review; /pr writes the PR body)
        │
3. /retro                           improve the agent's environment for next time
```

1. **Set up (once per repo).** Run `/setup-matt-pocock-skills`. It records your issue tracker (GitHub, GitLab or local `.scratch/`), triage labels and doc layout. `/to-spec`, `/to-tickets`, `/triage` and `/code-review` depend on this setup.
2. **Sharpen the idea.** Run `/grill-with-docs` and answer its questions. As terms and decisions settle, it writes them to `GLOSSARY.md` and `docs/adr/`. If a question can only be answered by running code, detour through `/prototype`, using `/handoff` to move between sessions.
3. **Plan.** For small work, go straight to `/implement`. For a build that spans sessions, run `/to-spec` and then `/to-tickets`. Keep steps 2 and 3 in one unbroken context window.
4. **Build.** Run `/implement` once per ticket (`/clear` in between), or `/implement-spec` to build every ticket in one orchestrated run. The build is test-first via `/tdd` and ends with `/code-review`. `/pr` writes the pull request body.
5. **Look back.** Run `/retro` in the same session before you clear. It suggests checks, coding standards and pointers for the next build.

**Other ways in:** incoming issues go through `/triage` and then `/implement`. For a hard bug, start with `/diagnosing-bugs`. For work too big or unclear for one session, use `/wayfinder`, then continue at `/to-spec`. For upkeep, run `/improve-codebase-architecture`, which feeds ideas back into `/grill-with-docs`.

## Skills

### Setup and routing

| Skill | Invoked | What it does | Output | Calls |
|---|---|---|---|---|
| `setup-matt-pocock-skills` | User | One-time repo config: issue tracker, triage labels, domain doc layout | `docs/agents/*.md`, `## Agent skills` section in CLAUDE.md/AGENTS.md | – |
| `ask-matt` | User | Router: tells you which skill or flow fits your situation | Advice only | – |

### Main flow

| Skill | Invoked | What it does | Output | Calls |
|---|---|---|---|---|
| `grill-with-docs` | User | Interviews you to sharpen a plan and records decisions as they settle | `GLOSSARY.md`, `docs/adr/*` | `grilling`, `domain-modeling` |
| `to-spec` | User | Turns the current conversation into a spec (no new interview) | Spec on the issue tracker | – |
| `to-tickets` | User | Splits a spec/plan into tracer-bullet tickets, each listing what blocks it | Tickets on the tracker, or `.scratch/<feature>/issues/NN-*.md` | – |
| `implement` | User | Builds one spec or ticket, then commits | Code + commit on current branch | `tdd`, `code-review` |
| `implement-spec` | User | Builds a whole spec: parallel subagents work the ticket graph | Integration branch (+ draft PR if tracker uses PRs) | `tdd`, `code-review` |
| `tdd` | Model | Red → green test-first loop, one slice at a time | Tests + code | `codebase-design` (when interface shape is unclear) |
| `code-review` | Model | Reviews the diff since a commit/branch on two axes (standards, spec) in parallel subagents | Review report | – |
| `pr` | Model | Writes a PR body: smallest visual, before/after evidence, one-way/two-way door call | PR description | – |
| `retro` | User | Retrospective on a session; suggests changes to the environment, not the code | Ranked suggestions | `writing-for-agents` |

### On-ramps

| Skill | Invoked | What it does | Output | Calls |
|---|---|---|---|---|
| `triage` | User | Moves incoming issues/PRs through triage roles, verifies, writes agent briefs | Labels, comments, agent briefs on tracker | `grilling`, `domain-modeling` |
| `diagnosing-bugs` | Model | Hard-bug loop: get a command that reproduces the failure first, then find the cause, then fix | Fix + regression test | Hands off to `improve-codebase-architecture` when the code has no good place to test the bug |
| `wayfinder` | User | For work too big or unclear for one session: tracks open decisions as tickets and settles them one per session | Map + decision tickets on tracker | `grilling`, `domain-modeling`, `research`, `prototype` |

### Codebase health and vocabulary

| Skill | Invoked | What it does | Output | Calls |
|---|---|---|---|---|
| `improve-codebase-architecture` | User | Scans for deepening opportunities, then grills the one you pick | HTML report in OS temp dir; `GLOSSARY.md`/ADRs | `codebase-design`, `grilling`, `domain-modeling` |
| `codebase-design` | Model | Terms for module design: module, interface, depth, seam, adapter | Reference only | – |
| `domain-modeling` | Model | Challenges unclear domain terms; keeps the glossary and ADRs current | `GLOSSARY.md`, `docs/adr/*` (only created when there's something to write) | – |

### Standalone

| Skill | Invoked | What it does | Output | Calls |
|---|---|---|---|---|
| `grilling` | Model | The interview primitive behind all grill skills | Conversation only | – |
| `grill-me` | User | Same interview as `grill-with-docs`, but writes no files (for use outside a repo) | Conversation only | `grilling` |
| `prototype` | Model | Throwaway code to answer one logic or UI question | Prototype on a `prototype/<name>` branch | – |
| `handoff` | User | Summarises the session for another agent, harness, directory or colleague | Markdown file in OS temp dir | – |
| `research` | Model | Background agent reads primary sources (docs, source code, specs) and cites them | Markdown file in the repo | – |
| `to-questionnaire` | User | Turns an unanswered question into a questionnaire for someone else to fill in | `to-questionnaire-<slug>.md` | – |
| `wizard` | Model | Generates an interactive bash script for steps only a human can do (creds, dashboards) | Bash script → writes `.env` / GitHub secrets | – |
| `wait-what` | User | Re-explains the last message in plain English, using the glossary's terms | Conversation only | – |
| `teach` | User | Teaches a concept over several sessions, keeping progress in the current directory | `MISSION.md`, `lessons/*.html`, `reference/*.html`, `learning-records/*.md` | – |
| `writing-for-agents` | Model | Style guide for writing skills, AGENTS.md, CLAUDE.md | Reference only | – |

## Between phases

At the end of a phase (grilling done, implementation done, etc.), pick the first option that applies:

1. **Continue:** the next phase needs this context verbatim and there's room.
2. **`/clear`:** nothing in this context matters for what's next.
3. **`/handoff`:** switching harness, directory or colleague, or forking a side task.
4. **Subagent:** the task can run with no steering from you (e.g. a review).
5. **`/compact`:** the default fallback; pass it a hint (`/compact we're going to QA this`).

Details: [ask-matt/PHASE-BOUNDARIES.md](reference/matt-pocock/skills/ask-matt/PHASE-BOUNDARIES.md).
