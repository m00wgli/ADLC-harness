---
name: setup-preview-deploys
description: "Set up Vercel preview deploys for this repo, so every PR gets a URL a human can open to test it. Links the project, connects GitHub, sets preview env vars, proves it with a throwaway deploy, and records where to find a PR's preview. Run once per project."
disable-model-invocation: true
---

# Setup Preview Deploys

Adhere to the [core behaviors](${CLAUDE_PLUGIN_ROOT}/references/core-behaviors.md) throughout.

Give every pull request a **preview**: its branch, built and deployed by Vercel to its own URL. The human reviewing a PR opens the preview and tests the behaviour, instead of reading the code alone.

Vercel reports each preview back to GitHub as a **deployment** on the PR's branch. Everything downstream reads it from there, so after this setup nothing else needs to know about Vercel.

## 1. Check prerequisites

Stop with a clear instruction when something is missing:

- **Git repo with a GitHub remote**, and `docs/agents/issue-tracker.md` exists (else: run `/harness:setup-harness-skills`).
- **A web app Vercel can build**: a `package.json` with a framework or a `build` script. If the repo has no app yet, stop: there's nothing to preview.
- **Vercel CLI logged in**: `vercel whoami` prints a user. If the CLI is missing, `npm i -g vercel`. If not logged in, ask the user to run `vercel login` in their own terminal; it's interactive.

## 2. Link and connect

```bash
vercel link --yes
vercel git connect
```

`link` creates (or reuses) the Vercel project and writes `.vercel/`; confirm `git check-ignore .vercel` succeeds. `git connect` ties it to the GitHub repo, so every push gets a deploy. If it fails because the Vercel GitHub app can't see the repo, give the user the install link from the error and wait for them.

If `vercel.json` or the project settings already exist, keep them.

## 3. Preview env vars

Find what the app reads at runtime: `.env.example`, `.env*` files, and `process.env.X` / `import.meta.env.X` in the source. Compare with `vercel env ls preview`.

Show the user the missing ones, and ask for each: real value, test value, or not needed. Never point previews at production data unless the user says so.

Secrets go in through the user, not the conversation: ask them to run `vercel env add <NAME> preview` in their own terminal, or paste them in the Vercel dashboard. Non-secret values (feature flags, public URLs) you may add yourself.

## 4. Who can open a preview

Vercel protects previews by default: only members of the Vercel team can open them. Ask, recommending the first:

- **Keep protection**: fine when every reviewer is on the Vercel team.
- **Turn it off for previews**: anyone with the link can open it. The user changes this under Project → Settings → Deployment Protection.

## 5. Prove it

Push a throwaway branch and wait for its preview, without touching the working tree:

```bash
git push origin "$(git commit-tree HEAD^{tree} -p HEAD -m 'preview smoke test')":refs/heads/preview-smoke
```

Poll until the branch's deployment has a final state (builds take 1-5 minutes):

```bash
gh api "repos/{owner}/{repo}/deployments?ref=preview-smoke" --jq '.[0].id'
gh api "repos/{owner}/{repo}/deployments/<id>/statuses" --jq '.[0] | {state, environment_url, log_url}'
```

- `success` with an `environment_url` → open it with `curl -sI` and check it answers.
- `failure` or `error` → read the `log_url`, fix the cause (usually a missing env var or a wrong build command), push again.

Then delete the branch: `git push origin --delete preview-smoke`.

## 6. Record

Write `docs/agents/preview-deploys.md`:

```markdown
# Preview deploys

Every pushed branch gets a Vercel preview, reported to GitHub as a deployment on that branch.

## Find a PR's preview

1. `gh api "repos/{owner}/{repo}/deployments?ref=<head branch>" --jq '.[0].id'`
2. `gh api "repos/{owner}/{repo}/deployments/<id>/statuses" --jq '.[0]'`

| `state` | Meaning |
|---|---|
| `success` | Ready: open `environment_url` |
| `pending`, `in_progress`, `queued` | Still building: check again in a minute |
| `failure`, `error` | Build failed: see `log_url` |
| no deployment | Branch pushed before previews were set up; the next push creates one |

## Access

<protected: reviewers need a seat on the Vercel team | public: anyone with the link>
```

Add one line to the `## Agent skills` block in `CLAUDE.md` (or `AGENTS.md`):

```markdown
### Preview deploys

Every PR gets a Vercel preview. See `docs/agents/preview-deploys.md`.
```

## 7. Commit

Commit `docs/agents/preview-deploys.md`, the `CLAUDE.md` change, and `vercel.json` if one was created. Never `.vercel/`.

Tell the user that from now on every PR, including the build loop's, gets a preview link on GitHub.

## Verification

- [ ] Preview deploy config file exists and is valid
- [ ] `docs/agents/preview-deploys.md` committed
