// PreToolUse hook: an agent may add new issues, PRs and comments on GitHub, but editing
// or deleting existing text (specs, tickets, PRs, comments) needs explicit human approval.
// Inside a build-loop sandbox (HARNESS_SANDBOX=1) there is no human to ask, so it is blocked.
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const command = String(input?.tool_input?.command ?? "");

const rules = [
  [/\bgh\s+(pr|issue)\s+edit\b[^|;&]*\s(--body|-b|--body-file|-F|--title|-t)\b/, "edit the title or description of an existing GitHub issue or PR (spec, ticket or PR)"],
  [/\bgh\s+(pr|issue)\s+comment\b[^|;&]*\s--(edit|delete)-last\b/, "edit or delete an existing GitHub comment"],
  [/\bgh\s+api\b(?=[^|;&]*(-X|--method)\s*(PATCH|PUT|DELETE)\b)(?=[^|;&]*\/(issues|pulls)(\/comments)?\/\d+)/i, "change or delete an existing GitHub issue, PR or comment through the API"],
  [/\bgh\s+api\s+graphql\b[\s\S]*\b(update|delete)(Issue|IssueComment|PullRequest|PullRequestReview|PullRequestReviewComment)\b/, "change or delete existing GitHub issue/PR content through GraphQL"],
];

const hit = rules.find(([pattern]) => pattern.test(command));
if (!hit) process.exit(0);

const inSandbox = process.env.HARNESS_SANDBOX === "1";
const reason =
  `The agent wants to ${hit[1]}. Existing text may have been written by a person ` +
  `and the change will appear under your GitHub account.\n\nCommand:\n${command}\n\n` +
  (inSandbox
    ? "Blocked: build-loop agents may only add new comments, never edit existing ones."
    : "Approve only if you have read the new text and agree with it.");

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: inSandbox ? "deny" : "ask", permissionDecisionReason: reason },
}));
