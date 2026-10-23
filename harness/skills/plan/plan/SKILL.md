---
name: plan
description: "Run the plan phase: take a published spec (PRD) and cut it into buildable tickets on the issue tracker. Run /harness:design first to produce the spec."
argument-hint: "#<spec issue number>"
disable-model-invocation: true
---

A spec (PRD) is on the issue tracker and needs to become buildable tickets. The plan phase reads the spec and cuts it into ordered, dependency-aware tickets that the build phase can pick up one by one.

## Keep it in one window

Run the ticket cutting in **one unbroken context window** with the spec loaded. Don't compact or clear until the tickets are published.

## Process

### 1. Find where we are

Check the repo before asking the user anything:

- No `docs/agents/issue-tracker.md` → the repo isn't set up. Read [setup-harness-skills](${CLAUDE_PLUGIN_ROOT}/skills/setup/setup-harness-skills/SKILL.md) and follow it first.
- No spec number in the arguments → use the open `prd` issue if there is exactly one; ask if there are several.
- The spec has no `## Security Requirements` section and `docs/agents/security-level.md` exists with a level other than `none` → tell the user to run `/harness:design #<spec>` to add security requirements first.
- The spec already has tickets → planning is done. Tell the user to run `/harness:build #<spec>` and stop.

Tell the user which step you're starting from, and why.

### 2. Load the spec

Fetch the spec issue from the tracker. Read it fully — requirements, acceptance criteria, security requirements, glossary, ADRs, testing seams. This is your input.

### 3. Cut tickets

Read [to-tickets](${CLAUDE_PLUGIN_ROOT}/skills/plan/to-tickets/SKILL.md) and follow it for the spec's number. Its quiz on the breakdown is the **checkpoint**: the user approves the slices and their blocking edges before anything is published.

### 4. Hand off

Report the spec and its tickets **by name**, marking which ones are unblocked now. Then point at the build phase: `/harness:build #<spec>`.

If there are other specs still waiting for tickets, list them.

The issue tracker should have been provided to you. If not, tell the user to run `/harness:setup-harness-skills`.
