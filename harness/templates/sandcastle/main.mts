// ADLC harness build loop, based on Sandcastle's parallel-planner-with-review template.
//
//   npx tsx .sandcastle/main.mts [prdNumber]
//
// Each iteration: plan the unblocked ready-for-agent tickets, build each one in
// its own Docker sandbox (harness:tdd), gate it on the project's tests, review it
// (harness:code-review), then merge the passing branches and close their issues.
import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { z } from "zod";

// Set by /harness:setup-build-loop. Use a plain Claude model id with a
// subscription token, or the gateway's model id when going through an LLM gateway.
const MODEL = "claude-sonnet-5-5";

// Iterations of plan → build → merge. Each one picks up newly unblocked tickets.
const MAX_ITERATIONS = 5;

// Attempts to get one ticket through the test gate before giving up on it.
const MAX_GATE_ATTEMPTS = 3;

// Optional: only build tickets whose parent is this PRD issue.
const PRD = process.argv[2] ?? "";

const planSchema = z.object({
  issues: z.array(
    z.object({ id: z.string(), title: z.string(), branch: z.string() }),
  ),
});

const hooks = {
  sandbox: { onSandboxReady: [{ command: "npm install", timeoutMs: 300_000 }] },
};
const copyToWorktree = ["node_modules"];
const agent = () => sandcastle.claudeCode(MODEL);

// The project's own checks. `--if-present` skips a script the project doesn't have yet.
const GATE_COMMAND = "npm run --if-present typecheck && npm run --if-present test";

type Outcome = { id: string; title: string; branch: string; passed: boolean; reason?: string };

async function buildTicket(issue: { id: string; title: string; branch: string }): Promise<Outcome> {
  const sandbox = await sandcastle.createSandbox({
    branch: issue.branch,
    sandbox: docker(),
    hooks,
    copyToWorktree,
  });
  try {
    const implement = await sandbox.run({
      name: `implement-${issue.id}`,
      maxIterations: 50,
      agent: agent(),
      promptFile: "./.sandcastle/implement-prompt.md",
      promptArgs: { TASK_ID: issue.id, ISSUE_TITLE: issue.title, BRANCH: issue.branch },
    });
    if (implement.commits.length === 0) {
      return { ...issue, passed: false, reason: "implementer made no commits" };
    }

    // Gate: the tests decide, not the agent.
    let gate = await sandbox.exec(GATE_COMMAND);
    for (let attempt = 2; gate.exitCode !== 0 && attempt <= MAX_GATE_ATTEMPTS; attempt++) {
      console.log(`  #${issue.id}: gate failed, fix attempt ${attempt}/${MAX_GATE_ATTEMPTS}`);
      await sandbox.run({
        name: `fix-${issue.id}-${attempt}`,
        maxIterations: 20,
        agent: agent(),
        prompt:
          `You are working on issue #${issue.id} (${issue.title}) on branch ${issue.branch}. ` +
          `The project's checks failed. Fix the code (not the tests, unless a test is genuinely wrong), ` +
          `rerun \`${GATE_COMMAND}\` until it passes, and commit. Failure output:\n\n` +
          `${gate.stdout}\n${gate.stderr}\n\nThen output <promise>COMPLETE</promise>.`,
      });
      gate = await sandbox.exec(GATE_COMMAND);
    }
    if (gate.exitCode !== 0) {
      return { ...issue, passed: false, reason: `checks still failing after ${MAX_GATE_ATTEMPTS} attempts` };
    }

    await sandbox.run({
      name: `review-${issue.id}`,
      maxIterations: 10,
      agent: agent(),
      promptFile: "./.sandcastle/review-prompt.md",
      promptArgs: { TASK_ID: issue.id, BRANCH: issue.branch },
    });

    // The review may have changed code, so gate again before merging.
    const finalGate = await sandbox.exec(GATE_COMMAND);
    if (finalGate.exitCode !== 0) {
      return { ...issue, passed: false, reason: "checks failed after review fixes" };
    }
    return { ...issue, passed: true };
  } finally {
    await sandbox.close();
  }
}

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  const plan = await sandcastle.run({
    hooks,
    sandbox: docker(),
    name: "planner",
    maxIterations: 1,
    agent: agent(),
    promptFile: "./.sandcastle/plan-prompt.md",
    promptArgs: { PRD },
    output: sandcastle.Output.object({ tag: "plan", schema: planSchema }),
  });

  const issues = plan.output.issues;
  if (issues.length === 0) {
    console.log("No unblocked tickets left. Done.");
    break;
  }
  console.log(`Building ${issues.length} ticket(s) in parallel:`);
  for (const issue of issues) console.log(`  #${issue.id}: ${issue.title} → ${issue.branch}`);

  const settled = await Promise.allSettled(issues.map(buildTicket));
  const outcomes: Outcome[] = settled.map((s: PromiseSettledResult<Outcome>, i: number) =>
    s.status === "fulfilled" ? s.value : { ...issues[i]!, passed: false, reason: String(s.reason) },
  );

  for (const o of outcomes) {
    console.log(`  ${o.passed ? "✓" : "✗"} #${o.id} ${o.title}${o.reason ? ` (${o.reason})` : ""}`);
  }

  const passed = outcomes.filter((o) => o.passed);
  if (passed.length === 0) {
    console.log("No ticket passed its gates this iteration. Stopping so a human can look.");
    break;
  }

  await sandcastle.run({
    hooks,
    sandbox: docker(),
    name: "merger",
    maxIterations: 1,
    agent: agent(),
    promptFile: "./.sandcastle/merge-prompt.md",
    promptArgs: {
      BRANCHES: passed.map((o) => `- ${o.branch}`).join("\n"),
      ISSUES: passed.map((o) => `- #${o.id}: ${o.title}`).join("\n"),
    },
  });
  console.log("Merged.");
}

console.log("\nAll done.");
