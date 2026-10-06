# TICKETS

Open tickets labelled `ready-for-agent` (PRDs, labelled `prd`, are already excluded):

<issues-json>

!`gh issue list --state open --label ready-for-agent --limit 100 --json number,title,body,labels --jq '[.[] | select(([.labels[].name] | index("prd")) | not) | {number, title, body, labels: [.labels[].name]}]'`

</issues-json>

PRD filter: `{{PRD}}`. If this is a number, keep only tickets whose body names `#{{PRD}}` as their parent. If it is empty, keep all tickets above.

# TASK

Decide which tickets are **unblocked** right now.

1. For each ticket, read its open blockers from GitHub: `gh api repos/{owner}/{repo}/issues/<number> --jq .issue_dependencies_summary.blocked_by`. A value above 0 means it is blocked.
2. Also read the ticket's `## Blocked by` section. A ticket is blocked if any issue listed there is still open (`gh issue view <n> --json state --jq .state`).
3. Do not invent extra dependencies. The tickets were cut with explicit blocking edges; trust them.

For each unblocked ticket, use the branch name `sandcastle/issue-{number}` exactly, so re-planning the same ticket reuses its branch.

# OUTPUT

Output your plan as JSON inside `<plan>` tags:

<plan>
{"issues": [{"id": "42", "title": "Fix auth bug", "branch": "sandcastle/issue-42"}]}
</plan>

Include only unblocked tickets. Always emit the tags. If nothing is unblocked, output `<plan>{"issues": []}</plan>`.
