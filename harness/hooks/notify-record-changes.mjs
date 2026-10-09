// PostToolUse hook: tell the user whenever an agent changes an ADR (docs/adr/) or the
// glossary (GLOSSARY.md, GLOSSARY-MAP.md). Informational only; it never blocks.
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const tool = String(input?.tool_name ?? "");
const ti = input?.tool_input ?? {};
const tr = input?.tool_response ?? {};

const RECORD = /(docs[\/]adr[\/][^\s"'`]+|GLOSSARY(-MAP)?\.md)/i;

let message = null;
if (tool === "Bash" || tool === "PowerShell") {
  const command = String(ti.command ?? "");
  const file = command.match(RECORD)?.[0];
  const changes = /\b(rm|del|git\s+rm|mv|git\s+mv|sed\b[^|;&]*\s-i|Remove-Item|Move-Item|Set-Content|Out-File|Add-Content)\b|>/i.test(command);
  if (file && changes) message = `Agent changed ${file} with a shell command: ${command.slice(0, 200)}`;
} else {
  const file = String(ti.file_path ?? ti.notebook_path ?? "");
  if (RECORD.test(file)) {
    const verb = tool === "Write" ? (tr.type === "create" ? "created" : "overwrote") : "edited";
    message = `Agent ${verb} ${file.replace(/^.*?(docs[\/]adr[\/]|GLOSSARY)/i, "$1")}`;
  }
}

if (message) process.stdout.write(JSON.stringify({ systemMessage: `📝 ${message}` }));
