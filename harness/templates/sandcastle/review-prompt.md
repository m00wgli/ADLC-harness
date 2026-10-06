# TASK

Review ticket #{{TASK_ID}} on branch `{{BRANCH}}` against `{{TARGET_BRANCH}}`.

Call the Skill tool with `harness:code-review`. The fixed point is `{{TARGET_BRANCH}}`; the spec is issue #{{TASK_ID}} and its parent PRD (`gh issue view {{TASK_ID}}`).

# FIX

Fix every finding the review marks as a real problem: wrong behaviour, a missed acceptance criterion, a security issue, or a standards violation. Ignore pure style preferences.

After fixing, run `npm run typecheck` and `npm run test`, then commit.

If there is nothing to fix, change nothing.

Once done, output <promise>COMPLETE</promise>.
