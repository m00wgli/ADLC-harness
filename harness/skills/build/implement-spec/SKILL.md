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
   - Runs the gate: `npm run --if-present typecheck && npm run --if-present test`. On failure, fix and retry up to 3 times.
   - Calls `harness:code-review` against the default branch. Fixes real findings. Runs the gate again.
   - Commits with a message naming the ticket (`#<n>`).
   - Pushes with `git push -u origin build/issue-<n>`.
   - Opens a PR: `gh pr create --base <default-branch> --head build/issue-<n> --title "#<n>: <title>"` with `Closes #<n>` in the body. If the ticket has a `## Security (ASVS)` section, include a **Security** section in the PR body listing each ASVS requirement, what control was implemented, and where (file or test). Keep it short — one line per requirement:

     ```
     ### Security (ASVS)

     | Req | Control | Evidence |
     |-----|---------|----------|
     | V1.2.1 | Input decoded to common format before validation | `src/middleware/input.ts`, `tests/input.test.ts` |
     | V6.1.1 | Parameterised queries only, no string concatenation | `src/db/queries.ts`, `tests/db.test.ts` |
     ```

4. **For each ticket sent back** (PR labelled `changes-requested`):
   - Check out the existing branch.
   - Read the PR's review comments (`gh pr view`, `gh api repos/{owner}/{repo}/pulls/<pr>/comments`, `gh api repos/{owner}/{repo}/pulls/<pr>/reviews`).
   - Address each piece of feedback. Use `harness:tdd` for behaviour changes.
   - Run the gate, then `harness:code-review`, then the gate again.
   - Push to the same branch and remove the `changes-requested` label.
   - Comment on the PR that feedback has been addressed. If the rework changed any ASVS controls, update the PR body's Security table to reflect the current implementation.

5. **When the pass ends**, report:
   - PRs opened or updated, with links;
   - tickets that failed, with the reason;
   - tickets waiting on review or blocked.

   Then tell the user what to do next: review the PRs, merge to approve or label `changes-requested` to send back, and run `/harness:build #<PRD>` again to continue.

The issue tracker should have been provided to you. If not, tell the user to run `/harness:setup-harness-skills`.
