---
name: implement-spec
description: "Implement the result of /harness:to-spec and /harness:to-tickets: each unblocked ticket is built test-first on its own branch, gated on the project's checks and a code review, and opened as a pull request for human review."
argument-hint: "#<PRD issue number>"
disable-model-invocation: true
---

You have been given a spec (a PRD issue) whose tickets describe how to implement it. You are the **orchestrator**: you run the build loop and report; you do not write the code yourself.

## How the loop works

One pass over the PRD's open `ready-for-agent` tickets:

| Ticket state | What the loop does |
|---|---|
| Unblocked, no PR yet | Builds it on its own branch with `harness:tdd`, then runs the **gate**: the project's typecheck and tests. Then `harness:code-review` and fixes, the gate again, a PR description via `harness:pr`, push, and a **PR with `Closes #<n>`**. |
| Has a PR labelled `changes-requested` | **Reworks** it from the PR's review comments, gates and reviews it again, pushes to the same PR, and removes the label. |
| Has an open PR without that label | Waits for human review and skips it. |
| Blocked by an open ticket | Skips it until its blockers are merged. |

**The human is the quality gate.** Nothing is merged and no issue is closed by the agents:

- **Merge the PR = approve.** GitHub closes the ticket through `Closes #<n>`, and the next run builds what it unblocked.
- **Add the `changes-requested` label (plus comments) = send it back.** The next run reworks it. A PR's author can't formally request changes on their own PR, hence the label.

Until its PR is merged, all work for a ticket stays on that ticket's branch and PR.

## Steps

1. **Read the spec.** Get the PRD number from the arguments; ask if none was given. Read it with `gh issue view <n>`. List its tickets (open `ready-for-agent` issues that name it as parent). For each one, show whether it is unblocked, blocked, or already has a PR. Read blockers from GitHub's native dependencies, `gh api repos/{owner}/{repo}/issues/<n> --jq .issue_dependencies_summary.blocked_by` (open blockers), plus the ticket's `## Blocked by` section; `gh issue view --json` does not show them. The PRD must carry the `prd` label, not `ready-for-agent`.

2. **Start from an up-to-date default branch.** Check out the default branch (usually `main`), `git pull`, and make sure `git status` is clean. Ticket branches are cut from it, so merged tickets must be in it.

3. **For each ready ticket**, spawn a sub-agent that:
   - Creates (or reuses) the branch `build/issue-<n>` from the default branch.
   - Reads the ticket (`gh issue view <n> --comments`), the parent PRD, `GLOSSARY.md`, and `docs/adr/`.
   - Calls `harness:tdd` and follows it: one failing test, then just enough code to pass, repeat until the acceptance criteria are met.
   - **Verify completeness** before running the gate. Walk both checklists from the ticket and confirm each item has code and a test:

     **Acceptance criteria** — read the ticket's acceptance criteria list. For each criterion, name the code that implements it and the test that covers it. If any criterion has no test at a pre-agreed seam, write one now. If any criterion has no implementation, implement it now via `harness:tdd`.

     **ASVS requirements** — if the ticket has a `## Security (ASVS)` section, read it. For each requirement marked as applicable, name the control that implements it and the test that verifies the control. Security controls without test coverage must get a test before proceeding. If a requirement is application-wide (scope: application) and the control lives outside this ticket's code, note where it is — do not duplicate it, but verify the existing control has a test.

     Only proceed to the gate when every acceptance criterion and every applicable ASVS requirement has both an implementation and a test.
   - Runs the gate: `npm run --if-present typecheck && npm run --if-present test`. On failure, fix and retry up to 3 times.
   - Calls `harness:code-review` against the default branch. Fixes real findings. Runs the gate again.
   - Commits with a message naming the ticket (`#<n>`).
   - Pushes with `git push -u origin build/issue-<n>`.
   - Opens a PR: `gh pr create --base <default-branch> --head build/issue-<n> --title "#<n>: <title>"` with `Closes #<n>` in the body.

4. **For each ticket sent back** (PR labelled `changes-requested`):
   - Check out the existing branch.
   - Read the PR's review comments (`gh pr view`, `gh api repos/{owner}/{repo}/pulls/<pr>/comments`, `gh api repos/{owner}/{repo}/pulls/<pr>/reviews`).
   - Address each piece of feedback. Use `harness:tdd` for behaviour changes.
   - Run the gate, then `harness:code-review`, then the gate again.
   - Push to the same branch and remove the `changes-requested` label.
   - Comment on the PR that feedback has been addressed.

5. **When the pass ends**, report:
   - PRs opened or updated, with links;
   - tickets that failed, with the reason;
   - tickets waiting on review or blocked.

   Then tell the user what to do next: review the PRs, merge to approve or label `changes-requested` to send back, and run `/harness:build #<PRD>` again to continue.

The issue tracker should have been provided to you. If not, tell the user to run `/harness:setup-harness-skills`.
