# TASK

Merge these branches into the current branch. Each one already passed its tests and review:

{{BRANCHES}}

For each branch:

1. `git merge <branch> --no-edit`
2. Resolve any conflict by reading both sides and keeping both behaviours.
3. Run `npm run typecheck` and `npm run test`. Fix any failure before the next branch.

# CLOSE ISSUES

For each merged branch, close its ticket:

`gh issue close <number> --comment "Built and merged by the ADLC harness build loop."`

Tickets:

{{ISSUES}}

Once everything that can be merged is merged, output <promise>COMPLETE</promise>.
