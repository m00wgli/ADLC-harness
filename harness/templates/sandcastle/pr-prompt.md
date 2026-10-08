# TASK

Write the pull request description for ticket #{{TASK_ID}} on branch `{{BRANCH}}`. It already passed its tests and code review. A human will review it.

Read the ticket (`gh issue view {{TASK_ID}}`) and the changes (`git diff {{TARGET_BRANCH}}...{{BRANCH}}`, `git log {{TARGET_BRANCH}}..{{BRANCH}} --oneline`).

Call the Skill tool with `harness:pr` and follow it for the structure. Also include:

- which acceptance criteria from the ticket are met, as a checklist;
- the test command and that it passed;
- the parent PRD: #{{PRD}} (skip this line if it is empty).

Do not add a "Closes" line; the loop adds it. Do not create the PR yourself.

Write only the markdown body to `/tmp/pr-body.md` (outside the repo; do not commit it).

Then output <promise>COMPLETE</promise>.
