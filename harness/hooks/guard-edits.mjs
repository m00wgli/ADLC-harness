// PreToolUse hook: agents may add, but changing or deleting existing shared records needs
// explicit human approval:
//   - GitHub: issues (specs, tickets), PRs and comments
//   - Repo:   ADRs (docs/adr/) and the glossary (GLOSSARY.md, GLOSSARY-MAP.md)
// Adding is free: new issues/PRs/comments, new ADR files, new glossary entries.
// Inside a build-loop sandbox (HARNESS_SANDBOX=1) there is no human to ask, so it blocks.
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const tool = String(input?.tool_name ?? "");
const ti = input?.tool_input ?? {};
const cwd = String(input?.cwd ?? process.cwd());

const PROTECTED = /(^|[\\/])(docs[\\/]adr[\\/][^\\/]+|GLOSSARY(-MAP)?\.md)$/i;
const PROTECTED_IN_COMMAND = /(docs[\\/]adr[\\/]|GLOSSARY(-MAP)?\.md)/i;

const githubRules = [
  [/\bgh\s+(pr|issue)\s+edit\b[^|;&]*\s(--body|-b|--body-file|-F|--title|-t)\b/, "edit the title or description of an existing GitHub issue or PR (spec, ticket or PR)"],
  [/\bgh\s+(pr|issue)\s+comment\b[^|;&]*\s--(edit|delete)-last\b/, "edit or delete an existing GitHub comment"],
  [/\bgh\s+api\b(?=[^|;&]*(-X|--method)\s*(PATCH|PUT|DELETE)\b)(?=[^|;&]*\/(issues|pulls)(\/comments)?\/\d+)/i, "change or delete an existing GitHub issue, PR or comment through the API"],
  [/\bgh\s+api\s+graphql\b[\s\S]*\b(update|delete)(Issue|IssueComment|PullRequest|PullRequestReview|PullRequestReviewComment)\b/, "change or delete existing GitHub issue/PR content through GraphQL"],
];

const fileCommandRules = [
  [/\b(rm|del|git\s+rm|mv|git\s+mv)\b/, "delete or move an ADR or the glossary"],
  [/\bsed\b[^|;&]*\s-i/, "rewrite an ADR or the glossary in place"],
  [/(^|[^>])>(?!>)\s*\S*(docs[\\/]adr[\\/]|GLOSSARY)/i, "overwrite an ADR or the glossary"],
  [/\b(Remove-Item|Move-Item|Set-Content|Out-File)\b/i, "delete, move or overwrite an ADR or the glossary"],
];

function check() {
  if (tool === "Bash" || tool === "PowerShell") {
    const command = String(ti.command ?? "");
    const gh = githubRules.find(([p]) => p.test(command));
    if (gh) return { what: gh[1], detail: `Command:\n${command}` };
    if (PROTECTED_IN_COMMAND.test(command)) {
      const f = fileCommandRules.find(([p]) => p.test(command));
      if (f) return { what: f[1], detail: `Command:\n${command}` };
    }
    return null;
  }

  const filePath = String(ti.file_path ?? ti.notebook_path ?? "");
  if (!filePath || !PROTECTED.test(filePath)) return null;
  const abs = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
  if (!existsSync(abs)) return null; // creating a new ADR or glossary is fine

  const isGlossary = /GLOSSARY(-MAP)?\.md$/i.test(filePath);
  if (tool === "Edit" || tool === "MultiEdit") {
    const edits = tool === "Edit" ? [ti] : (ti.edits ?? []);
    // Pure additions to the glossary (old text kept, new text added) are fine.
    const onlyAdds = edits.every((e) => String(e.new_string ?? "").includes(String(e.old_string ?? "\u0000")));
    if (isGlossary && onlyAdds) return null;
    return { what: isGlossary ? "change an existing glossary entry" : "change an existing ADR", detail: `File: ${filePath}` };
  }
  if (tool === "Write" || tool === "NotebookEdit") {
    return { what: isGlossary ? "overwrite the existing glossary" : "overwrite an existing ADR", detail: `File: ${filePath}` };
  }
  return null;
}

const hit = check();
if (!hit) process.exit(0);

const inSandbox = process.env.HARNESS_SANDBOX === "1";
const reason =
  `The agent wants to ${hit.what}. This is a shared record that a person may have written or agreed to; ` +
  `changes made on GitHub appear under your account.\n\n${hit.detail}\n\n` +
  (inSandbox
    ? "Blocked: build-loop agents may add records, never change or delete existing ones. Mention the conflict in the PR instead."
    : "Approve only if you have read the change and agree with it.");

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: inSandbox ? "deny" : "ask",
      permissionDecisionReason: reason,
    },
  }),
);
