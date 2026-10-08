// ADLC harness build loop, built on Sandcastle.
//
//   npx tsx .sandcastle/main.mts [prdNumber]
//
// One pass over the PRD's tickets. Ticket selection is plain code, not an agent:
//   - unblocked ticket with no PR yet        → build it (harness:tdd), gate, review, open a PR
//   - PR labelled `changes-requested`         → rework it from the review comments, gate, push
//     (or a PR whose review decision is CHANGES_REQUESTED)
//   - PR open without that label             → waiting for human review, skip
// A human merging the PR is the approval; "Closes #N" then closes the ticket, and the
// next run picks up the tickets it unblocked. Run this from an up-to-date main.
import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Set by /harness:setup-build-loop. Use a plain Claude model id with a
// subscription token, or the gateway's model id when going through an LLM gateway.
const MODEL = "claude-sonnet-5-5";

// Attempts to get one ticket through the test gate before giving up on it.
const MAX_GATE_ATTEMPTS = 3;

// Label a human puts on a PR to send it back to the agents.
const CHANGES_LABEL = "changes-requested";

// Optional: only work on tickets whose parent is this PRD issue.
const PRD = process.argv[2]?.replace("#", "") ?? "";

// The project's own checks. `--if-present` skips a script the project doesn't have yet.
const GATE_COMMAND = "npm run --if-present typecheck && npm run --if-present test";

const hooks = {
  sandbox: { onSandboxReady: [{ command: "npm install", timeoutMs: 300_000 }] },
};
const copyToWorktree = ["node_modules"];
const agent = () => sandcastle.claudeCode(MODEL);

const sh = (cmd: string, args: string[]) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const gh = (...args: string[]) => sh("gh", args);
const ghJson = <T,>(...args: string[]): T => JSON.parse(gh(...args)) as T;

type Ticket = { id: string; title: string; branch: string };
type OpenPr = { number: number; url: string; reviewDecision: string; labels: { name: string }[] };
type Outcome = Ticket & { status: "pr-opened" | "pr-updated" | "failed"; detail: string };

// ---------- Selecting work (deterministic) ----------

const defaultBranch = gh("repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name");
const currentBranch = sh("git", ["branch", "--show-current"]);
if (currentBranch !== defaultBranch) {
  throw new Error(`Run the build loop from ${defaultBranch} (currently on ${currentBranch}).`);
}

const issues = ghJson<{ number: number; title: string; body: string; labels: { name: string }[] }[]>(
  "issue", "list", "--state", "open", "--label", "ready-for-agent", "--limit", "100",
  "--json", "number,title,body,labels",
);

const toBuild: Ticket[] = [];
const toRework: (Ticket & { pr: OpenPr })[] = [];
const waiting: string[] = [];
const blocked: string[] = [];

for (const issue of issues) {
  if (issue.labels.some((l) => l.name === "prd")) continue;
  if (PRD && !new RegExp(`#${PRD}\\b`).test(issue.body)) continue;

  const ticket: Ticket = { id: String(issue.number), title: issue.title, branch: `sandcastle/issue-${issue.number}` };
  const prs = ghJson<OpenPr[]>(
    "pr", "list", "--state", "open", "--head", ticket.branch, "--json", "number,url,reviewDecision,labels",
  );
  const pr = prs[0];

  if (pr) {
    const wantsChanges = pr.reviewDecision === "CHANGES_REQUESTED" || pr.labels.some((l) => l.name === CHANGES_LABEL);
    if (wantsChanges) toRework.push({ ...ticket, pr });
    else waiting.push(`#${ticket.id} → ${pr.url}`);
    continue;
  }

  const openBlockers = Number(gh("api", `repos/{owner}/{repo}/issues/${issue.number}`, "--jq", ".issue_dependencies_summary.blocked_by // 0"));
  if (openBlockers > 0) {
    blocked.push(`#${ticket.id}`);
    continue;
  }
  toBuild.push(ticket);
}

console.log(`Build:    ${toBuild.map((t) => `#${t.id}`).join(", ") || "-"}`);
console.log(`Rework:   ${toRework.map((t) => `#${t.id}`).join(", ") || "-"}`);
console.log(`Waiting for human review: ${waiting.join(", ") || "-"}`);
console.log(`Blocked:  ${blocked.join(", ") || "-"}`);

// ---------- Building one ticket ----------

async function passGate(sandbox: Awaited<ReturnType<typeof sandcastle.createSandbox>>, t: Ticket): Promise<boolean> {
  let gate = await sandbox.exec(GATE_COMMAND);
  for (let attempt = 2; gate.exitCode !== 0 && attempt <= MAX_GATE_ATTEMPTS; attempt++) {
    console.log(`  #${t.id}: checks failed, fix attempt ${attempt}/${MAX_GATE_ATTEMPTS}`);
    await sandbox.run({
      name: `fix-${t.id}-${attempt}`,
      maxIterations: 20,
      agent: agent(),
      prompt:
        `You are working on issue #${t.id} (${t.title}) on branch ${t.branch}. ` +
        `The project's checks failed. Fix the code (not the tests, unless a test is genuinely wrong), ` +
        `rerun \`${GATE_COMMAND}\` until it passes, and commit. Failure output:\n\n` +
        `${gate.stdout}\n${gate.stderr}\n\nThen output <promise>COMPLETE</promise>.`,
    });
    gate = await sandbox.exec(GATE_COMMAND);
  }
  return gate.exitCode === 0;
}

async function review(sandbox: Awaited<ReturnType<typeof sandcastle.createSandbox>>, t: Ticket): Promise<boolean> {
  await sandbox.run({
    name: `review-${t.id}`,
    maxIterations: 10,
    agent: agent(),
    promptFile: "./.sandcastle/review-prompt.md",
    promptArgs: { TASK_ID: t.id, BRANCH: t.branch },
  });
  // The review may have changed code, so gate again.
  return (await sandbox.exec(GATE_COMMAND)).exitCode === 0;
}

function push(t: Ticket) {
  sh("git", ["push", "--force-with-lease", "-u", "origin", t.branch]);
}

async function buildTicket(t: Ticket): Promise<Outcome> {
  const sandbox = await sandcastle.createSandbox({ branch: t.branch, sandbox: docker(), hooks, copyToWorktree });
  try {
    const implement = await sandbox.run({
      name: `implement-${t.id}`,
      maxIterations: 50,
      agent: agent(),
      promptFile: "./.sandcastle/implement-prompt.md",
      promptArgs: { TASK_ID: t.id, ISSUE_TITLE: t.title, BRANCH: t.branch },
    });
    if (implement.commits.length === 0) return { ...t, status: "failed", detail: "implementer made no commits" };
    if (!(await passGate(sandbox, t))) return { ...t, status: "failed", detail: `checks still failing after ${MAX_GATE_ATTEMPTS} attempts` };
    if (!(await review(sandbox, t))) return { ...t, status: "failed", detail: "checks failed after review fixes" };

    // The agent writes the PR description to /tmp/pr-body.md inside the sandbox (not the repo).
    await sandbox.run({
      name: `pr-body-${t.id}`,
      maxIterations: 1,
      agent: agent(),
      promptFile: "./.sandcastle/pr-prompt.md",
      promptArgs: { TASK_ID: t.id, BRANCH: t.branch, PRD },
    });
    const body = await sandbox.exec("cat /tmp/pr-body.md");
    const description =
      body.exitCode === 0 && body.stdout.trim() ? body.stdout.trim() : `Implements #${t.id}: ${t.title}.`;

    push(t);
    const bodyFile = join(mkdtempSync(join(tmpdir(), "harness-pr-")), "body.md");
    writeFileSync(bodyFile, `${description}\n\nCloses #${t.id}\n`);
    const url = gh("pr", "create", "--base", defaultBranch, "--head", t.branch, "--title", `#${t.id}: ${t.title}`, "--body-file", bodyFile);
    return { ...t, status: "pr-opened", detail: url };
  } finally {
    await sandbox.close();
  }
}

async function reworkTicket(t: Ticket & { pr: OpenPr }): Promise<Outcome> {
  const sandbox = await sandcastle.createSandbox({ branch: t.branch, sandbox: docker(), hooks, copyToWorktree });
  try {
    await sandbox.run({
      name: `rework-${t.id}`,
      maxIterations: 50,
      agent: agent(),
      promptFile: "./.sandcastle/rework-prompt.md",
      promptArgs: { TASK_ID: t.id, BRANCH: t.branch, PR_NUMBER: String(t.pr.number) },
    });
    if (!(await passGate(sandbox, t))) return { ...t, status: "failed", detail: "checks failing after rework" };
    if (!(await review(sandbox, t))) return { ...t, status: "failed", detail: "checks failed after review fixes" };

    push(t);
    gh("pr", "edit", String(t.pr.number), "--remove-label", CHANGES_LABEL);
    gh("pr", "comment", String(t.pr.number), "--body", "Review feedback addressed by the ADLC harness build loop. Ready for another look.");
    return { ...t, status: "pr-updated", detail: t.pr.url };
  } finally {
    await sandbox.close();
  }
}

// ---------- Run ----------

const settled = await Promise.allSettled([...toBuild.map(buildTicket), ...toRework.map(reworkTicket)]);
const all = [...toBuild, ...toRework];
const outcomes: Outcome[] = settled.map((s: PromiseSettledResult<Outcome>, i: number) =>
  s.status === "fulfilled" ? s.value : { ...all[i]!, status: "failed", detail: String(s.reason) },
);

console.log("\nResult:");
for (const o of outcomes) {
  const mark = o.status === "failed" ? "✗" : "✓";
  console.log(`  ${mark} #${o.id} ${o.title}: ${o.status} ${o.detail}`);
}
if (outcomes.length === 0) console.log("  Nothing to build or rework.");
console.log("\nReview the PRs on GitHub. Merge to approve; add the `changes-requested` label to send one back.");
