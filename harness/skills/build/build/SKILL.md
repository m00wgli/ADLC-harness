---
name: build
description: Run the build phase for a spec, turning its tickets into pull requests through the Sandcastle build loop. Sets the loop up on first use; run it again after each round of PR review.
argument-hint: "#<spec issue number>"
disable-model-invocation: true
---

A spec and its tickets are on the issue tracker, and the tickets need to become code. The build phase runs them through the **build loop**: each unblocked ticket is built test-first in its own Docker sandbox, gated on the project's checks and a code review, and opened as a **pull request**. The human reviews each PR; merging it is the approval.

This skill is the entry point. It finds where the build stands, sets the loop up if this repo has never run it, and hands over to the loop.

## Never build a ticket yourself

All ticket code goes through the loop, never through this session. The loop is what gives every ticket its own branch, sandbox, gate, review and PR. Writing a ticket's code here skips all of that, even when it looks quicker. If the user asks for one ticket, run the loop anyway: it only picks the tickets that are ready.

## Process

### 1. Find where we are

- No `docs/agents/issue-tracker.md`, or no open issue labelled `prd` → there's nothing to build yet. Tell the user to run `/harness:plan` and stop.
- No spec number in the arguments → use the open `prd` issue if there is exactly one; ask if there are several.
- The spec has no tickets naming it as parent → tell the user to run `/harness:plan` to cut them, and stop.
- No `.sandcastle/main.mts` → the loop isn't set up. Read [setup-build-loop](${CLAUDE_PLUGIN_ROOT}/skills/setup/setup-build-loop/SKILL.md) and follow it first.

### 2. Show the frontier

List the spec's tickets **by name**, each with its state:

- **ready**: unblocked, no PR yet;
- **blocked**: waiting on another ticket's PR to merge;
- **in review**: PR open, waiting on the human;
- **sent back**: PR labelled `changes-requested`;
- **done**: closed.

If nothing is ready or sent back, say what the user is waiting on (usually PRs to review) and stop.

### 3. Run the loop

Read [implement-spec](${CLAUDE_PLUGIN_ROOT}/skills/build/implement-spec/SKILL.md) and follow it for the spec's number.

### 4. Hand back

When the loop ends, report the PRs it opened or updated, and any ticket that failed with its reason. Then tell the user the review rules:

- **merge** a PR to approve it; GitHub closes its ticket and the next run builds what that unblocks;
- add the **`changes-requested`** label, with comments, to send it back;
- run `/harness:build #<spec>` again to continue.

The issue tracker should have been provided to you. If not, tell the user to run `/harness:setup-harness-skills`.
