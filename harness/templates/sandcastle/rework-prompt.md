# TASK

A human reviewed PR #{{PR_NUMBER}} for ticket #{{TASK_ID}} and asked for changes. You are on its branch `{{BRANCH}}`. Address the feedback.

# FEEDBACK

Read all of it:

- `gh pr view {{PR_NUMBER}} --comments`
- `gh api repos/{owner}/{repo}/pulls/{{PR_NUMBER}}/comments` (line comments)
- `gh api repos/{owner}/{repo}/pulls/{{PR_NUMBER}}/reviews`

Also read the ticket (`gh issue view {{TASK_ID}}`), `GLOSSARY.md`, `docs/adr/` and `LEARNINGS.md` if it exists.

# EXECUTION

For each piece of feedback:

- If the reviewer is right, change the code. Use the `harness:tdd` skill for behaviour changes: test first.
- If a request is wrong or out of scope, do not change the code; reply on the PR (`gh pr comment {{PR_NUMBER}}`) explaining why.

Run `npm run typecheck` and `npm run test`, then commit with a message naming #{{TASK_ID}} and the feedback addressed.

# LEARNINGS

If the feedback teaches something general about this project (a convention, a preference, a mistake to avoid next time), append one line per lesson to `LEARNINGS.md` at the repo root, and commit it. Every future agent reads this file.

Do not push, merge or close anything; the loop does that.

Once done, output <promise>COMPLETE</promise>.
