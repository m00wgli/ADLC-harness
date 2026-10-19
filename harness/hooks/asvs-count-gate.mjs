// PreToolUse hook: blocks `gh issue create` for specs and tickets when the ASVS
// checklist exists but verification hasn't passed yet.
//
// How it works:
// - Detects `gh issue create` commands with `prd` or `ready-for-agent` labels
// - Reads the --body or --body-file content
// - Counts ASVS requirement references (V\d+.\d+.\d+)
// - Compares to docs/agents/asvs-checklist.json
// - Blocks with a clear error if counts don't match
//
// If no checklist exists (level: none, or not yet generated), the hook passes through.
import { readFileSync, existsSync } from "node:fs";

const CHECKLIST_PATH = "docs/agents/asvs-checklist.json";
const ASVS_REQ_PATTERN = /V\d+\.\d+\.\d+/g;

function pass() {
  process.exit(0);
}

function block(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

const input = JSON.parse(readFileSync(0, "utf8"));
const command = String(input?.tool_input?.command ?? "");

const isIssueCreate = /\bgh\s+issue\s+create\b/.test(command);
if (!isIssueCreate) pass();

const isPrd = /--label\s+[^\s]*\bprd\b/.test(command) || /--label\s+"[^"]*\bprd\b/.test(command);
const isTicket = /--label\s+[^\s]*\bready-for-agent\b/.test(command) || /--label\s+"[^"]*\bready-for-agent\b/.test(command);
if (!isPrd && !isTicket) pass();

if (!existsSync(CHECKLIST_PATH)) pass();

let checklist;
try {
  checklist = JSON.parse(readFileSync(CHECKLIST_PATH, "utf8"));
} catch {
  pass();
}

if (checklist.level === "none") pass();

const applicableIds = (checklist.requirements || []).filter((r) => r.applies === true).map((r) => r.req_id);
if (applicableIds.length === 0) pass();

let body = "";
const bodyFileMatch = command.match(/--body-file\s+(\S+)/);
const bodyMatch = command.match(/--body\s+"([\s\S]*?)"/);

if (bodyFileMatch && existsSync(bodyFileMatch[1])) {
  try {
    body = readFileSync(bodyFileMatch[1], "utf8");
  } catch {
    pass();
  }
} else if (bodyMatch) {
  body = bodyMatch[1];
} else {
  pass();
}

const bodyReqIds = [...new Set(body.match(ASVS_REQ_PATTERN) || [])];

if (isPrd) {
  const missing = applicableIds.filter((id) => !bodyReqIds.includes(id));
  const extra = bodyReqIds.filter((id) => !applicableIds.includes(id));

  if (missing.length || extra.length) {
    const parts = [];
    if (missing.length) parts.push(`${missing.length} missing from spec: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "..." : ""}`);
    if (extra.length) parts.push(`${extra.length} extra in spec: ${extra.slice(0, 5).join(", ")}${extra.length > 5 ? "..." : ""}`);
    block(
      `ASVS count mismatch: checklist has ${applicableIds.length} applicable requirements, spec body has ${bodyReqIds.length}.\n` +
        `${parts.join("\n")}\n\n` +
        `Run: node \${CLAUDE_PLUGIN_ROOT}/scripts/asvs-verify.mjs verify-checklist\n` +
        `Fix the spec body to match the checklist, then retry.`,
    );
  }
}

if (isTicket && bodyReqIds.length === 0 && applicableIds.length > 0) {
  // Individual tickets may legitimately have zero ASVS reqs if they don't touch security.
  // The full distribution check is done by verify-tickets after all tickets are created.
  pass();
}

pass();
