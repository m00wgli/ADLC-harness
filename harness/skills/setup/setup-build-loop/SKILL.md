---
name: setup-build-loop
description: "Set up this repo's build loop: install Sandcastle, copy the harness loop template into .sandcastle/, write .env, and build the Docker image. Run once per project before /harness:implement-spec."
disable-model-invocation: true
---

# Setup Build Loop

Prepare this repo so `/harness:implement-spec` can build tickets in parallel Docker sandboxes with [Sandcastle](https://github.com/mattpocock/sandcastle).

The template lives at `${CLAUDE_PLUGIN_ROOT}/templates/sandcastle/`.

## 1. Check prerequisites

Check each one and stop with a clear instruction when something is missing:

- **Git repo with a GitHub remote** and `/harness:setup-harness-skills` already run (`docs/agents/issue-tracker.md` exists).
- **Docker engine running:** `docker version --format '{{.Server.Version}}'` prints a version. If not, ask the user to start Docker Desktop.
- **Node and npm** available. If there is no `package.json`, run `npm init -y`.
- **`gh` logged in:** `gh auth status`.

## 2. Install Sandcastle

```bash
npm install --save-dev @ai-hero/sandcastle zod tsx
```

If `scripts.test` in `package.json` is npm's placeholder (`echo "Error: no test specified" && exit 1`), remove it (`npm pkg delete scripts.test`). The loop's gate skips missing scripts, but a placeholder always fails. The first ticket sets up the real test and typecheck scripts.

## 3. Copy the template

If `.sandcastle/` already exists, keep its `.env` and ask the user before replacing the other files.

Copy these files from `${CLAUDE_PLUGIN_ROOT}/templates/sandcastle/` into `.sandcastle/`:

| Template file | Copy to |
|---|---|
| `main.mts`, `implement-prompt.md`, `review-prompt.md`, `pr-prompt.md`, `rework-prompt.md`, `Dockerfile` | same name |
| `env.example` | `.env.example` |
| `gitignore` | `.gitignore` |

Add `"build-loop": "tsx .sandcastle/main.mts"` to the `package.json` scripts, and make sure the root `.gitignore` contains `node_modules/`.

## 4. Choose how the sandboxes reach Claude

Ask the user, one question, recommending the first option that applies:

- **Claude subscription token:** they run `claude setup-token` on the host and paste the token into `.sandcastle/.env` as `CLAUDE_CODE_OAUTH_TOKEN` themselves. Keep `MODEL` in `main.mts` as a plain Claude model id.
- **Anthropic API key:** `ANTHROPIC_API_KEY` in `.sandcastle/.env`.
- **LLM gateway:** `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN` and `ANTHROPIC_DEFAULT_HAIKU_MODEL` in `.sandcastle/.env`, and set `MODEL` in `.sandcastle/main.mts` to the gateway's model id. Find the ids with `curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/models`.

Never echo a token back in the conversation. Ask the user to put secrets in `.env` themselves, or write values they already gave you without printing them.

Then add `GH_TOKEN` to `.sandcastle/.env` from `gh auth token`, without printing it.

Confirm `.sandcastle/.env` is git-ignored: `git check-ignore .sandcastle/.env`.

Create the label a reviewer uses to send a PR back to the agents:

```bash
gh label create changes-requested --color D93F0B --description "PR needs rework by the build loop" --force
```

## 5. Build the image

```bash
npx sandcastle docker build-image
```

The image installs the harness plugin from GitHub, so agents in the sandbox can use `harness:tdd` and `harness:code-review`. After a harness update, set `ARG HARNESS_VERSION` in `.sandcastle/Dockerfile` to the new plugin version and rebuild; the changed value makes Docker reinstall the plugin.

## 6. Smoke test

Run one read-only sandbox to prove Docker, the model and GitHub all work. Write this to `.sandcastle/smoke.mts`, run `npx tsx .sandcastle/smoke.mts`, then delete the file:

```ts
import { run, claudeCode } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

const result = await run({
  name: "smoke",
  sandbox: docker(),
  agent: claudeCode("<MODEL from main.mts>"),
  maxIterations: 1,
  branchStrategy: { type: "merge-to-head" },
  prompt:
    "Read-only smoke test: do not edit files, commit, or change issues. " +
    "Run `gh issue list --state open --label ready-for-agent --json number --jq length` and report the number. " +
    "Check the harness skills are available by listing skill names that start with `harness:`. " +
    "Then output <promise>COMPLETE</promise>.",
});
console.log("SMOKE commits:", result.commits.length, "signal:", result.completionSignal);
```

Pass when it reports zero commits, the completion signal, an issue count, and the `harness:` skills. Read the run's log under `.sandcastle/logs/` for the agent's answer.

## 7. Commit

Commit `.sandcastle/` (not `.env`), `package.json` and the lockfile. Tell the user to run `/harness:implement-spec #<PRD>` to start building.
