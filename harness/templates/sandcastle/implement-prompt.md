# TASK

Build ticket #{{TASK_ID}}: {{ISSUE_TITLE}}

Read it with `gh issue view {{TASK_ID}} --comments`. If it names a parent PRD, read that too.

Only work on this ticket. You are on branch `{{BRANCH}}`.

# CONTEXT

Read before writing code:

- `GLOSSARY.md`: use these terms in code, tests and commit messages.
- `docs/adr/`: decisions you must respect.

Recent commits:

!`git log -n 10 --format="%h %s" --date=short`

# EXECUTION

Call the Skill tool with `harness:tdd` and follow it: one failing test, then just enough code to pass, repeat until the acceptance criteria in the ticket are met.

The loop gates every ticket on `npm run typecheck` and `npm run test`. If either script is missing, or `test` is npm's placeholder (`echo "Error: no test specified" && exit 1`), set up the smallest real one that fits the ADRs as part of this ticket.

# COMMIT

Commit with a message that names the ticket (`#{{TASK_ID}}`), the key decisions, and anything the next ticket should know.

Do not push, open a PR or close the issue; the loop opens the PR, and merging it closes the issue. If you cannot finish, comment on the issue with what was done and what blocks you.

Once done, output <promise>COMPLETE</promise>.
