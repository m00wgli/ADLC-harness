#!/usr/bin/env node
// PreToolUse hook: blocks writes to asvs-checklist.json when the requirements
// don't match what asvs-filter.mjs produces for the given level and chapters.
//
// Ensures the agent can't hallucinate or omit requirements — only the
// deterministic filter output is accepted as the canonical requirement set.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FILTER_SCRIPT = resolve(SCRIPT_DIR, "../scripts/asvs-filter.mjs");

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
const toolName = String(input?.tool_name ?? "");
const filePath = String(input?.tool_input?.file_path ?? "");

if (!filePath.endsWith("asvs-checklist.json")) pass();
if (toolName !== "Write") pass();

const content = String(input?.tool_input?.content ?? "");

let checklist;
try {
  checklist = JSON.parse(content);
} catch {
  block("asvs-checklist.json content is not valid JSON.");
}

if (!checklist.level || checklist.level === "none") pass();

if (!Array.isArray(checklist.chapters) || checklist.chapters.length === 0) {
  block("asvs-checklist.json must have a non-empty 'chapters' array when level is not 'none'.");
}

let filterOutput;
try {
  const raw = execFileSync("node", [FILTER_SCRIPT, "--chapters", checklist.chapters.join(",")], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  filterOutput = JSON.parse(raw);
} catch (e) {
  block(`Failed to run asvs-filter.mjs for validation: ${e.stderr || e.message}`);
}

if (checklist.level !== filterOutput.level) {
  block(`Checklist level "${checklist.level}" does not match security-level.md level "${filterOutput.level}".`);
}

const validIds = new Set(filterOutput.requirements.map((r) => r.req_id));
const checklistIds = (checklist.requirements || []).map((r) => r.req_id);

const hallucinated = checklistIds.filter((id) => !validIds.has(id));
if (hallucinated.length) {
  block(
    `${hallucinated.length} requirement(s) in checklist not in ASVS filter output for ${checklist.level} + [${checklist.chapters.join(", ")}]:\n` +
      `  ${hallucinated.slice(0, 10).join(", ")}${hallucinated.length > 10 ? "..." : ""}\n\n` +
      `Only requirements from asvs-filter.mjs may appear in the checklist.`,
  );
}

const checklistIdSet = new Set(checklistIds);
const missing = [...validIds].filter((id) => !checklistIdSet.has(id));
if (missing.length) {
  block(
    `${missing.length} requirement(s) from ASVS filter output missing from checklist:\n` +
      `  ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "..." : ""}\n\n` +
      `Every requirement from the filter must appear (with applies: true or false).`,
  );
}

pass();
