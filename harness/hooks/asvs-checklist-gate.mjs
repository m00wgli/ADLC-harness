#!/usr/bin/env node
// PreToolUse hook: blocks writes to asvs-checklist.json when the content
// doesn't match the deterministic asvs-filter.mjs output.
//
// Enforces:
// - req_id set matches filter output exactly (no hallucinated, no missing)
// - req_description matches the ASVS source data verbatim
// - level matches security-level.md
// - chapter_id and chapter_name match the source data
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

// Level must match security-level.md
if (checklist.level !== filterOutput.level) {
  block(`Checklist level "${checklist.level}" does not match security-level.md level "${filterOutput.level}".`);
}

// Build lookup from canonical filter output
const canonical = new Map(filterOutput.requirements.map((r) => [r.req_id, r]));
const checklistReqs = checklist.requirements || [];
const checklistIds = checklistReqs.map((r) => r.req_id);
const errors = [];

// No hallucinated requirements
const hallucinated = checklistIds.filter((id) => !canonical.has(id));
if (hallucinated.length) {
  errors.push(
    `${hallucinated.length} req(s) not in filter output: ${hallucinated.slice(0, 10).join(", ")}${hallucinated.length > 10 ? "..." : ""}`,
  );
}

// No missing requirements
const checklistIdSet = new Set(checklistIds);
const missing = [...canonical.keys()].filter((id) => !checklistIdSet.has(id));
if (missing.length) {
  errors.push(
    `${missing.length} req(s) from filter output missing: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "..." : ""}`,
  );
}

// req_description, chapter_id, chapter_name must match source data verbatim
for (const req of checklistReqs) {
  const src = canonical.get(req.req_id);
  if (!src) continue;

  if (req.req_description !== src.req_description) {
    errors.push(`${req.req_id}: req_description does not match ASVS source data — copy it verbatim from the filter output`);
  }
  if (req.chapter_id !== src.chapter_id) {
    errors.push(`${req.req_id}: chapter_id "${req.chapter_id}" should be "${src.chapter_id}"`);
  }
  if (req.chapter_name !== src.chapter_name) {
    errors.push(`${req.req_id}: chapter_name "${req.chapter_name}" should be "${src.chapter_name}"`);
  }
}

if (errors.length) {
  block(
    `asvs-checklist.json validation failed (${errors.length} error${errors.length > 1 ? "s" : ""}):\n` +
      errors.map((e) => `  - ${e}`).join("\n") +
      "\n\nThe checklist must contain exactly the requirements from asvs-filter.mjs with verbatim req_description, chapter_id, and chapter_name. Only applies, scope, and rationale may differ.",
  );
}

pass();
