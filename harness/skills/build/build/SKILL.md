---
name: build
description: Run the build phase for a spec, turning its tickets into pull requests. Each unblocked ticket is built test-first, reviewed by three independent personas in parallel, and opened as a pull request for human review.
argument-hint: "#<spec issue number>"
disable-model-invocation: true
---

A spec and its tickets are on the issue tracker, and the tickets need to become code. The build phase orchestrates four stages per ticket: **implement → review → fix → PR**. Three independent review personas run in parallel in separate contexts, so the implementing agent never reviews its own code.

**The human is the quality gate.** Nothing is merged and no issue is closed by the agents:

- **Merge the PR = approve.** GitHub closes the ticket through `Closes #<n>`, and the next run builds what it unblocked.
- **Add the `changes-requested` label (plus comments) = send it back.** The next run reworks it.

Until its PR is merged, all work for a ticket stays on that ticket's branch and PR.

## Process

### 1. Find where we are

- No `docs/agents/issue-tracker.md` → tell the user to run `/harness:plan` and stop.
- No spec number in the arguments → use the open `prd` issue if there is exactly one; ask if there are several.
- The spec has no tickets → tell the user to run `/harness:plan` to cut them, and stop.

### 2. Show the frontier

List the spec's tickets **by name**, each with its state:

- **ready**: unblocked, no PR yet
- **blocked**: waiting on another ticket's PR to merge
- **in review**: PR open, waiting on the human
- **sent back**: PR labelled `changes-requested`
- **done**: closed

If nothing is ready or sent back, say what the user is waiting on and stop.

### 3. Start from an up-to-date default branch

Check out the default branch (usually `main`), `git pull`, and make sure `git status` is clean.

### 4. For each ready ticket

Run the four stages sequentially. **Stages 1 and 3 are sub-agents that write code. Stage 2 is three parallel sub-agents that only read and report. Stage 4 is the orchestrator (you).**

#### Stage 1 — Implement

Spawn a sub-agent that reads [implement-spec](${CLAUDE_PLUGIN_ROOT}/skills/build/implement-spec/SKILL.md) and follows it for ticket `#<n>`. It creates the branch, runs TDD driven by acceptance criteria + ASVS, runs the gate, and commits. It does **not** push, open a PR, or review.

#### Stage 2 — Review (parallel fan-out)

Spawn **three sub-agents in a single message** so they run in parallel. Each gets the diff (`git diff <default-branch>...build/issue-<n>`), the ticket body, and the parent PRD. Each produces an independent report.

**Sub-agent 1 — code-reviewer persona:**
> You are the `code-reviewer`. Review this diff using the `harness:code-review` skill (Standards + Spec axes). The diff, ticket, and PRD are attached. Report findings in the code-reviewer output format. Under 400 words per axis.

**Sub-agent 2 — security-auditor persona:**
> You are the `security-auditor`. The ticket's `## Security (ASVS)` section is attached. Walk every requirement: verify the control is implemented, verify it has a test (where testable). Also scan for general vulnerabilities. Report in the security-auditor output format.

_(Skip this sub-agent if the ticket has no `## Security (ASVS)` section.)_

**Sub-agent 3 — test-engineer persona:**
> You are the `test-engineer`. The ticket's acceptance criteria are attached. Walk every criterion: verify it has a test at a pre-agreed seam. Check test quality and coverage gaps. Report in the test-engineer output format.

#### Stage 3 — Fix

Merge the three reports. If there are Critical or Required findings:

Spawn a sub-agent on the same branch that:
- Reads the merged findings.
- Fixes each Critical and Required finding. Uses `harness:tdd` for behaviour gaps.
- Runs the gate again. On failure, fix and retry up to 3 times.
- Commits the fixes.

If no Critical or Required findings, skip this stage.

#### Stage 4 — PR

On the orchestrator (you):
- Push with `git push -u origin build/issue-<n>`.
- Write the PR description using `harness:pr`. Include the three review reports (summarised) in the PR body.
- Open the PR: `gh pr create --base <default-branch> --head build/issue-<n> --title "#<n>: <title>"` with `Closes #<n>` in the body.

### 5. For each ticket sent back

(PR labelled `changes-requested`):
- Check out the existing branch.
- Read the PR's review comments (`gh pr view`, `gh api repos/{owner}/{repo}/pulls/<pr>/comments`, `gh api repos/{owner}/{repo}/pulls/<pr>/reviews`).
- Spawn a sub-agent that addresses the feedback. Uses `harness:tdd` for behaviour changes. Runs the gate.
- Run the review fan-out again (Stage 2) on the updated diff.
- Fix any new findings (Stage 3).
- Push to the same branch and remove the `changes-requested` label.
- Comment on the PR that feedback has been addressed.

### 6. Report

When the pass ends, report:
- PRs opened or updated, with links
- Tickets that failed, with the reason
- Tickets waiting on review or blocked

Then tell the user: review the PRs, merge to approve or label `changes-requested` to send back, and run `/harness:build #<PRD>` again to continue.

The issue tracker should have been provided to you. If not, tell the user to run `/harness:setup-harness-skills`.
