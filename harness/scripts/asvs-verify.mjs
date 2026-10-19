#!/usr/bin/env node
// Deterministic ASVS count-chain verification.
//
//   node asvs-verify.mjs verify-checklist [--checklist path]
//   node asvs-verify.mjs verify-spec <issue-number> [--checklist path]
//   node asvs-verify.mjs verify-tickets <prd-number> [--checklist path]
//
// Exits 0 on pass, 1 on mismatch, 2 on missing input.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const ASVS_REQ_PATTERN = /V\d+\.\d+\.\d+/g;

function die(msg, code = 1) {
  console.error(`ASVS verify: ${msg}`);
  process.exit(code);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const flags = {};
  let positional = null;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--checklist" && args[i + 1]) {
      flags.checklist = args[++i];
    } else if (!positional) {
      positional = args[i];
    }
  }

  flags.checklist = flags.checklist || "docs/agents/asvs-checklist.json";
  return { command, positional, flags };
}

function readChecklist(path) {
  if (!existsSync(path)) die(`Checklist not found at ${path}. Run the ASVS mapping agent after your first grilling.`, 2);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    die(`Checklist at ${path} is not valid JSON: ${e.message}`);
  }
}

function gh(...args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function extractReqIds(text) {
  const matches = text.match(ASVS_REQ_PATTERN) || [];
  return [...new Set(matches)];
}

// -- verify-checklist: internal consistency of the JSON --

function verifyChecklist(checklist) {
  const reqs = checklist.requirements || [];
  const applicable = reqs.filter((r) => r.applies === true);
  const notApplicable = reqs.filter((r) => r.applies === false);
  const errors = [];

  if (checklist.counts.applicable !== applicable.length) {
    errors.push(`counts.applicable is ${checklist.counts.applicable} but ${applicable.length} requirements have applies:true`);
  }
  if (checklist.counts.not_applicable !== notApplicable.length) {
    errors.push(`counts.not_applicable is ${checklist.counts.not_applicable} but ${notApplicable.length} requirements have applies:false`);
  }
  if (checklist.counts.applicable + checklist.counts.not_applicable !== reqs.length) {
    errors.push(`applicable (${checklist.counts.applicable}) + not_applicable (${checklist.counts.not_applicable}) != total requirements (${reqs.length})`);
  }

  const ids = reqs.map((r) => r.req_id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) errors.push(`Duplicate req IDs: ${[...new Set(dupes)].join(", ")}`);

  if (errors.length) {
    die(`Checklist internal inconsistency:\n  - ${errors.join("\n  - ")}`);
  }

  console.log(`ASVS verify-checklist: OK — ${applicable.length} applicable, ${notApplicable.length} N/A, ${reqs.length} total`);
}

// -- verify-spec: spec issue ASVS count matches checklist --

function verifySpec(issueNumber, checklist) {
  const body = gh("issue", "view", issueNumber, "--json", "body", "--jq", ".body");
  const specIds = extractReqIds(body);
  const applicableIds = (checklist.requirements || []).filter((r) => r.applies === true).map((r) => r.req_id);
  const errors = [];

  const missingFromSpec = applicableIds.filter((id) => !specIds.includes(id));
  const extraInSpec = specIds.filter((id) => !applicableIds.includes(id));

  if (missingFromSpec.length) {
    errors.push(`${missingFromSpec.length} requirements in checklist but missing from spec: ${missingFromSpec.join(", ")}`);
  }
  if (extraInSpec.length) {
    errors.push(`${extraInSpec.length} requirements in spec but not in checklist: ${extraInSpec.join(", ")}`);
  }

  if (errors.length) {
    die(`Spec #${issueNumber} ASVS count mismatch (checklist: ${applicableIds.length}, spec: ${specIds.length}):\n  - ${errors.join("\n  - ")}`);
  }

  console.log(`ASVS verify-spec: OK — spec #${issueNumber} has ${specIds.length} requirements, matches checklist (${applicableIds.length})`);
}

// -- verify-tickets: all tickets for a PRD distribute every applicable requirement exactly once --

function verifyTickets(prdNumber, checklist) {
  const tickets = JSON.parse(
    gh("issue", "list", "--state", "all", "--label", "ready-for-agent", "--limit", "200", "--json", "number,title,body"),
  );

  const prdTickets = tickets.filter((t) => {
    const parentMatch = t.body?.match(/##\s*Parent\s*\n+.*?#(\d+)/);
    return parentMatch && parentMatch[1] === String(prdNumber);
  });

  if (!prdTickets.length) die(`No tickets found for PRD #${prdNumber}`, 2);

  const applicableIds = (checklist.requirements || []).filter((r) => r.applies === true).map((r) => r.req_id);
  const ticketMap = new Map();
  const allTicketIds = [];

  for (const ticket of prdTickets) {
    const ids = extractReqIds(ticket.body || "");
    for (const id of ids) {
      allTicketIds.push(id);
      if (!ticketMap.has(id)) ticketMap.set(id, []);
      ticketMap.get(id).push(`#${ticket.number}`);
    }
  }

  const errors = [];
  const missing = applicableIds.filter((id) => !ticketMap.has(id));
  const duplicated = [...ticketMap.entries()].filter(([, tickets]) => tickets.length > 1);
  const extra = [...ticketMap.keys()].filter((id) => !applicableIds.includes(id));

  if (missing.length) {
    errors.push(`${missing.length} requirements not on any ticket: ${missing.join(", ")}`);
  }
  if (duplicated.length) {
    errors.push(`${duplicated.length} requirements on multiple tickets: ${duplicated.map(([id, ts]) => `${id} → ${ts.join(", ")}`).join("; ")}`);
  }
  if (extra.length) {
    errors.push(`${extra.length} requirements on tickets but not in checklist: ${extra.join(", ")}`);
  }

  if (errors.length) {
    die(`Ticket distribution for PRD #${prdNumber} (checklist: ${applicableIds.length}, distributed: ${ticketMap.size}):\n  - ${errors.join("\n  - ")}`);
  }

  console.log(`ASVS verify-tickets: OK — ${prdTickets.length} tickets distribute ${ticketMap.size} requirements across PRD #${prdNumber}, matches checklist (${applicableIds.length})`);
}

// -- main --

const { command, positional, flags } = parseArgs();
const checklist = readChecklist(flags.checklist);

switch (command) {
  case "verify-checklist":
    verifyChecklist(checklist);
    break;
  case "verify-spec":
    if (!positional) die("Usage: verify-spec <issue-number>", 2);
    verifySpec(positional, checklist);
    break;
  case "verify-tickets":
    if (!positional) die("Usage: verify-tickets <prd-number>", 2);
    verifyTickets(positional, checklist);
    break;
  default:
    die(`Unknown command: ${command}. Use verify-checklist, verify-spec, or verify-tickets.`, 2);
}
