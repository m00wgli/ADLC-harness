---
name: setup-harness-skills
description: "Configure this repo for the engineering skills: set up its issue tracker, triage labels, domain docs, and optional preview deploys. Run once before first use of the other engineering skills."
disable-model-invocation: true
---

# Setup Harness Skills

Scaffold the per-repo configuration that the engineering skills assume. Adhere to the [core behaviors](${CLAUDE_PLUGIN_ROOT}/references/core-behaviors.md) throughout.

- **Issue tracker**: where issues live (GitHub by default; local markdown is also supported out of the box)
- **Triage labels**: the strings used for the five canonical triage roles
- **Domain docs**: where `GLOSSARY.md` and ADRs live, and the consumer rules for reading them
Preview deploys and security level are configured separately (via `/harness:setup-preview-deploys` and `/harness:setup-security-level`), or all at once via `/harness:setup`.

This is an interactive CLI-menu skill. Use `AskUserQuestion` for structured prompts, then execute the setup based on the answers.

## Process

### 1. Explore (silent)

Scan the repo to pre-fill defaults. Read whatever exists; don't assume. Do this silently — don't narrate the exploration, just gather the data.

- `git remote -v` and `.git/config`: is this a GitHub repo? GitLab? Which one?
- `AGENTS.md` and `CLAUDE.md` at the repo root: does either exist? Is there already an `## Agent skills` section in either?
- `GLOSSARY.md` and `GLOSSARY-MAP.md` at the repo root
- `docs/adr/` and any `src/*/docs/adr/` directories
- `docs/agents/`: does this skill's prior output already exist?
- `.scratch/`: a sign that a local-markdown issue tracker convention is already in use
- Monorepo signals: a `pnpm-workspace.yaml`, a `workspaces` field in `package.json`, or a populated `packages/*` with its own `src/`. These are present only in a genuinely large multi-package repo; their absence means single-context, which is almost every repo.
Print a one-line summary (e.g. "Detected GitHub repo `owner/name`, no existing agent config.") then move straight to the menu.

### 2. CLI menu

Use `AskUserQuestion` to collect all choices. Batch questions into calls of up to 4 questions each. Mark the recommended option first with `(Recommended)` in the label.

**Call 1 — Core setup** (2 questions):

Question 1 — **Issue tracker** (header: "Tracker"):
Choose the recommended option based on exploration: if remote points at GitHub, recommend GitHub; if GitLab, recommend GitLab; otherwise recommend Local markdown.
- `GitHub` — Issues live in GitHub Issues (uses `gh` CLI)
- `GitLab` — Issues live in GitLab Issues (uses `glab` CLI)
- `Local markdown` — Issues as files under `.scratch/` (good for solo / no remote)
- Options note: the user can pick "Other" (always available) to describe a custom workflow

Question 2 — **Triage labels** (header: "Labels"):
- `Keep defaults` — needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix
- `Customize` — Map your existing labels to these roles

**Domain docs**: If exploration found monorepo signals, add a 4th question about domain layout (single-context vs multi-context). If no monorepo signals, default to single-context silently — don't ask.

**Follow-up — Custom labels** (only if "Customize" was selected for triage labels):

Ask the user for their override strings. Use one `AskUserQuestion` per label role, or ask the user to type all overrides via the "Other" free-text option.

### 3. Summary and confirm

After all menu choices are collected, show a compact summary table of what will be written:

```
  Tracker:   GitHub (owner/repo)
  Labels:    defaults
  Domain:    single-context
```

Then ask one final confirmation question via `AskUserQuestion` (header: "Confirm"):
- `Looks good, go` — Write all files
- `Let me change something` — Re-run the menu

### 4. Execute

On confirmation, write everything without further questions.

**Issue tracker**: Record the choice in `docs/agents/issue-tracker.md`. The GitHub and GitLab templates carry a "PRs as a request surface" flag, defaulted **off**. Leave it off and don't raise it.

**Triage labels**: Write defaults or overrides to `docs/agents/triage-labels.md`.

**Domain docs**: Write `docs/agents/domain.md`. Default to single-context (one `GLOSSARY.md` + `docs/adr/` at the repo root). Use multi-context only if the user chose it.

### 5. Write

**Pick the file to edit:**

- If `CLAUDE.md` exists, edit it.
- Else if `AGENTS.md` exists, edit it.
- If neither exists, ask the user which one to create; don't pick for them.

Never create `AGENTS.md` when `CLAUDE.md` already exists (or vice versa); always edit the one that's already there.

If an `## Agent skills` block already exists in the chosen file, update its contents in-place rather than appending a duplicate. Don't overwrite user edits to the surrounding sections.

The block:

```markdown
## Agent skills

### Issue tracker

[one-line summary of where issues are tracked]. See `docs/agents/issue-tracker.md`.

### Triage labels

[one-line summary of the label vocabulary]. See `docs/agents/triage-labels.md`.

### Domain docs

[one-line summary of layout: "single-context" or "multi-context"]. See `docs/agents/domain.md`.
```

Always include the `### Triage labels` sub-block and write `docs/agents/triage-labels.md`.

Then write the docs files using the seed templates in this skill folder as a starting point:

- [issue-tracker-github.md](./issue-tracker-github.md): GitHub issue tracker
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md): GitLab issue tracker
- [issue-tracker-local.md](./issue-tracker-local.md): local-markdown issue tracker
- [triage-labels.md](./triage-labels.md): label mapping
- [domain.md](./domain.md): domain doc consumer rules + layout

For "other" issue trackers, write `docs/agents/issue-tracker.md` from scratch using the user's description.

**Create the labels on the tracker.** Skills fail when they apply a label that doesn't exist yet. For GitHub, create every state label from `docs/agents/triage-labels.md` plus the `bug` and `enhancement` category labels. `--force` makes this safe to re-run:

```bash
gh label create needs-triage    --color FBCA04 --description "Maintainer needs to evaluate this issue" --force
gh label create needs-info      --color D876E3 --description "Waiting on reporter for more information" --force
gh label create ready-for-agent --color 0E8A16 --description "Fully specified, ready for an AFK agent" --force
gh label create ready-for-human --color 1D76DB --description "Requires human implementation" --force
gh label create wontfix         --color FFFFFF --description "Will not be actioned" --force
gh label create prd             --color 5319E7 --description "Product requirements document; parent of tickets" --force
gh label create bug             --color D73A4A --description "Something is broken" --force
gh label create enhancement         --color A2EEEF --description "New feature or improvement" --force
gh label create changes-requested   --color D93F0B --description "PR needs rework by the build loop" --force
```

Use the user's override strings if Section B collected any. For GitLab, use `glab label create` with the same names. For local markdown, skip this step. Then list the labels (`gh label list`) and confirm each one exists.

**Protect the main branch.** For GitHub, enable branch protection on `main` so code only lands via reviewed PRs. Infer `OWNER/REPO` from `gh repo view --json nameWithOwner -q .nameWithOwner`:

```bash
gh api repos/OWNER/REPO/branches/main/protection -X PUT \
  --input - <<'EOF'
{
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "enforce_admins": false,
  "required_status_checks": null,
  "restrictions": null
}
EOF
```

If the API returns a 403 (plan doesn't support branch protection on private repos), log a warning and continue — the rest of the setup is still valid. For GitLab, use `glab api projects/:id/protected_branches -X POST -f name=main -f push_access_level=0 -f merge_access_level=30` (no direct push, maintainers merge). For local markdown, skip this step.

### 6. Done

Tell the user the setup is complete and which engineering skills will now read from these files. Mention they can edit `docs/agents/*.md` directly later; re-running this skill is only necessary if they want to switch issue trackers or restart from scratch.

## Verification

- [ ] `docs/agents/issue-tracker.md` exists and is valid
- [ ] CLAUDE.md (or AGENTS.md) references the harness skills
