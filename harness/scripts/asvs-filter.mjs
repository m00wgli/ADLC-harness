#!/usr/bin/env node
// Deterministic ASVS filter: reads the project's security level and the ASVS
// reference data, filters requirements by level and selected chapters, and
// outputs the result as JSON to stdout.
//
//   node asvs-filter.mjs --chapters V1,V6,V13 [--security-level path]
//
// Exits 0 on success, 1 on error, 2 when level is "none".
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ASVS_DATA_PATH = resolve(SCRIPT_DIR, "../references/asvs/asvs-5.0.0.flat.json");

function die(msg, code = 1) {
  console.error(`ASVS filter: ${msg}`);
  process.exit(code);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = { securityLevel: "docs/agents/security-level.md", chapters: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--chapters" && args[i + 1]) {
      flags.chapters = args[++i].split(",").map((c) => c.trim()).filter(Boolean);
    } else if (args[i] === "--security-level" && args[i + 1]) {
      flags.securityLevel = args[++i];
    }
  }

  if (!flags.chapters || flags.chapters.length === 0) {
    die("--chapters is required (e.g. --chapters V1,V6,V13)");
  }

  return flags;
}

function readLevel(path) {
  let content;
  try {
    content = readFileSync(path, "utf8");
  } catch (e) {
    die(`Cannot read security-level file at ${path}: ${e.message}`);
  }

  const match = content.match(/^\*\*Level:\*\*\s*(none|L[123])/mi);
  if (!match) die(`Cannot parse ASVS level from ${path}. Expected a line like: **Level:** L2`);
  return match[1];
}

function readAsvsData() {
  try {
    return JSON.parse(readFileSync(ASVS_DATA_PATH, "utf8"));
  } catch (e) {
    die(`Cannot read ASVS reference data at ${ASVS_DATA_PATH}: ${e.message}`);
  }
}

const flags = parseArgs();
const level = readLevel(flags.securityLevel);

if (level === "none") {
  console.log(JSON.stringify({ level: "none", chapters: [], total_at_level: 0, filtered_count: 0, requirements: [] }, null, 2));
  process.exit(2);
}

const threshold = parseInt(level.replace("L", ""), 10);
const asvs = readAsvsData();
const chapterSet = new Set(flags.chapters);

const atLevel = asvs.requirements.filter((r) => parseInt(r.L, 10) <= threshold);
const filtered = atLevel.filter((r) => chapterSet.has(r.chapter_id));

const result = {
  level,
  chapters: flags.chapters.sort(),
  total_at_level: atLevel.length,
  filtered_count: filtered.length,
  requirements: filtered.map((r) => ({
    req_id: r.req_id,
    chapter_id: r.chapter_id,
    chapter_name: r.chapter_name,
    section_id: r.section_id,
    section_name: r.section_name,
    req_description: r.req_description,
    L: r.L,
  })),
};

console.log(JSON.stringify(result, null, 2));
