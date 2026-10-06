# TASK

Build ticket #{{TASK_ID}}: {{ISSUE_TITLE}}

Read it with `gh issue view {{TASK_ID}} --comments`. If it names a parent PRD, read that too.

Only work on this ticket. You are on branch `{{BRANCH}}`.

# CONTEXT

Read before writing code:

- `GLOSSARY.md`: use these terms in code, tests and commit messages.
- `docs/adr/`: decisions you must respect.
- `LEARNINGS.md`, if it exists: feedback from earlier human reviews.

Recent commits:

!`git log -n 10 --format="%h %s" --date=short`

# EXECUTION

Call the Skill tool with `harness:tdd` and follow it: one failing test, then just enough code to pass, repeat until the acceptance criteria in the ticket are met.

If the project has no test setup yet, add the smallest one that fits the ADRs, plus `test` and `typecheck` scripts in `package.json`. The loop gates every ticket on `npm run typecheck` and `npm run test`.

# COMMIT

Commit with a message that names the ticket (`#{{TASK_ID}}`), the key decisions, and anything the next ticket should know.

Do not close the issue; the merge step does that. If you cannot finish, comment on the issue with what was done and what blocks you.

Once done, output <promise>COMPLETE</promise>.
