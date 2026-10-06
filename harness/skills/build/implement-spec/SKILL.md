---
name: implement-spec
description: "Implement the result of /harness:to-spec and /harness:to-tickets in code, by running the Sandcastle build loop: parallel Docker sandboxes, test-first, gated on the project's checks and a code review."
argument-hint: "#<PRD issue number>"
disable-model-invocation: true
---

You have been given a spec (a PRD issue) whose tickets describe how to implement it. The goal: every unblocked `ready-for-agent` ticket under that PRD built, gated, merged into the current branch, and closed.

You are the **orchestrator**. You do not write the code yourself. The build loop in `.sandcastle/main.mts` does, in Docker sandboxes:

1. **Plan:** pick the tickets whose blockers are all closed (the **frontier**).
2. **Build:** one sandbox and branch (`sandcastle/issue-<n>`) per ticket, in parallel. Each agent uses `harness:tdd`.
3. **Gate:** the loop runs `npm run typecheck` and `npm run test` itself. A failing ticket gets up to 3 fix attempts, then it is left unmerged.
4. **Review:** `harness:code-review` against the ticket and PRD, fixes applied, gate rerun.
5. **Merge:** passing branches are merged into the current branch and their issues closed.
6. Repeat until no ticket is unblocked.

## Steps

1. **Check setup.** `.sandcastle/main.mts` must exist and Docker must be running (`docker version`). If either is missing, tell the user to run `/harness:setup-build-loop` and stop.

2. **Read the spec.** Get the PRD number from the arguments; ask if none was given. Read it with `gh issue view <n>` and list its tickets (open `ready-for-agent` issues that name it as parent). Show the user the tickets and which ones are unblocked now. The PRD itself must carry the `prd` label, not `ready-for-agent`, or the loop would try to build it.

3. **Start from a clean tree.** `git status` must be clean, because the loop merges into the current branch. If it isn't, ask the user to commit or stash first.

4. **Run the loop in the background:**

   ```bash
   npx tsx .sandcastle/main.mts <PRD number>
   ```

   Tell the user it has started, which tickets are in the first wave, and where the logs are (`.sandcastle/logs/`; each run prints its own log path).

5. **Monitor.** Check progress from the loop's output and logs, not by reading the sandboxes' code. Report when a wave finishes: which tickets passed (✓) and which did not (✗, with the reason the loop printed).

6. **When the loop ends**, report:
   - tickets merged and closed;
   - tickets left open, with why (gate failed, no commits, still blocked);
   - the commits added to the branch (`git log --oneline`).

   Do not push. The human reviews the merged result: this is the human quality gate. Suggest `git push` (or a PR) once they are happy.

7. **Failed tickets.** For a ticket that failed its gate, read its log and the branch `sandcastle/issue-<n>`, summarise what went wrong, and offer to rerun the loop, which reuses the branch, or to hand it to a human with the `ready-for-human` label.

The issue tracker should have been provided to you. If not, tell the user to run `/harness:setup-harness-skills`.
