// PreToolUse hook: an agent may add new issues, PRs and comments on GitHub, but editing
// or deleting existing text needs explicit human approval. Inside a build-loop sandbox
// (HARNESS_SANDBOX=1) there is no human to ask, so the edit is blocked instead.
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const command = String(input?.tool_input?.command ?? "");

const rules = [
  // gh pr/issue edit that changes the title or body (label/assignee edits are fine)
  [/\bgh\s+(pr|issue)\s+edit\b[^|;&]*\s(--body|-b|--body-file|-F|--title|-t)\b/, "edit the title or description of an existing issue or PR"],
  // gh pr/issue comment --edit-last / --delete-last
  [/\bgh\s+(pr|issue)\s+comment\b[^|;&]*\s--(edit|delete)-last\b/, "edit or delete an existing comment"],
  // REST: PATCH/PUT/DELETE on issues, PRs or their comments
  [/\bgh\s+api\b(?=[^|;&]*(-X|--method)\s*(PATCH|PUT|DELETE)\b)(?=[^|;&]*\/(issues|pulls)(\/comments)?\/\d+)/i, "change or delete an existing issue, PR or comment through the API"],
  // GraphQL mutations that update or delete existing content
  [/\bgh\s+api\s+graphql\b[\s\S]*\b(update|delete)(Issue|IssueComment|PullRequest|PullRequestReview|PullRequestReviewComment)\b/, "change or delete existing issue/PR content through GraphQL"],
];

const hit = rules.find(([pattern]) => pattern.test(command));
if (!hit) process.exit(0);

const inSandbox = process.env.HARNESS_SANDBOX === "1";
const reason =
  `The agent wants to ${hit[1]} on GitHub. Existing text may have been written by a person ` +
  `and the change will appear under your GitHub account.\n\nCommand:\n${command}\n\n` +
  (inSandbox
    ? "Blocked: build-loop agents may only add new comments, never edit existing ones."
    : "Approve only if you have read the new text and the content being replaced is the agent's own.");

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: inSandbox ? "deny" : "ask",
      permissionDecisionReason: reason,
    },
  }),
);
