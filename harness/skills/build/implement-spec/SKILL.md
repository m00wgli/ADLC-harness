---
name: implement-spec
description: "Implement the result of /harness:to-spec and /harness:to-tickets by running the Sandcastle build loop: each unblocked ticket is built test-first in its own Docker sandbox, gated on the project's checks and a code review, and opened as a pull request for human review."
argument-hint: "#<PRD issue number>"
disable-model-invocation: true
---

You have been given a spec (a PRD issue) whose tickets describe how to implement it. You are the **orchestrator**: you run the build loop and report; you do not write the code yourself.

## How the loop works

`.sandcastle/main.mts` makes one pass over the PRD's open `ready-for-agent` tickets. It picks tickets in plain code, not by asking an agent:

| Ticket state | What the loop does |
|---|---|
| Unblocked, no PR yet | Builds it in its own sandbox on `sandcastle/issue-<n>` with `harness:tdd`, then runs the **gate**: `npm run typecheck` and `npm run test`, with up to 3 fix attempts. Then `harness:code-review` and fixes, the gate again, a PR description via `harness:pr`, push, and a **PR with `Closes #<n>`**. |
| Has a PR labelled `changes-requested` | **Reworks** it from the PR's review comments, gates and reviews it again, pushes to the same PR, and removes the label. |
| Has an open PR without that label | Waits for human review and skips it. |
| Blocked by an open ticket | Skips it until its blockers are merged. |

**The human is the quality gate.** Nothing is merged and no issue is closed by the agents:

- **Merge the PR = approve.** GitHub closes the ticket through `Closes #<n>`, and the next run builds what it unblocked.
- **Add the `changes-requested` label (plus comments) = send it back.** The next run reworks it. A PR's author can't formally request changes on their own PR, hence the label.

Until its PR is merged, all work for a ticket stays on that ticket's branch and PR.

## Steps

1. **Check setup.** `.sandcastle/main.mts` must exist and Docker must be running (`docker version`). If either is missing, tell the user to run `/harness:setup-build-loop` and stop.

2. **Start from an up-to-date default branch.** Check out the default branch (usually `main`), `git pull`, and make sure `git status` is clean. Ticket branches are cut from it, so merged tickets must be in it.

3. **Read the spec.** Get the PRD number from the arguments; ask if none was given. Read it with `gh issue view <n>`. List its tickets (open `ready-for-agent` issues that name it as parent). For each one, show whether it is unblocked, blocked, or already has a PR. Read blockers from GitHub's native dependencies, `gh api repos/{owner}/{repo}/issues/<n> --jq .issue_dependencies_summary.blocked_by` (open blockers), plus the ticket's `## Blocked by` section; `gh issue view --json` does not show them. The PRD must carry the `prd` label, not `ready-for-agent`.

4. **Run the loop in the background:**

   ```bash
   npx tsx .sandcastle/main.mts <PRD number>
   ```

   It prints what it will build, rework, skip and why. Each sandbox prints its log path under `.sandcastle/logs/`.

5. **Monitor.** Follow progress from the loop's output and logs, not by reading the sandboxes' code.

6. **When it ends**, report:
   - PRs opened or updated, with links;
   - tickets that failed, with the reason the loop printed;
   - tickets waiting on review or blocked.

   Then tell the user what to do next: review the PRs, merge to approve or label `changes-requested` to send back, and run `/harness:implement-spec #<PRD>` again to continue.

7. **Failed tickets.** Read the failing ticket's log and branch, summarise what went wrong, and offer to rerun (the loop reuses the branch) or to hand it to a human with the `ready-for-human` label.

The issue tracker should have been provided to you. If not, tell the user to run `/harness:setup-harness-skills`.
