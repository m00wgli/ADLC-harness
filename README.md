# ADLC-harness

A custom agent harness for Claude Code, packaged as the `harness` plugin. Its skills and agents take a project from idea to GitHub tickets, and later through build and review.

```
harness/
├── .claude-plugin/plugin.json
├── agents/          code-reviewer, security-auditor, test-engineer, web-performance-auditor
├── skills/
│   ├── setup/       setup-harness-skills, setup-build-loop
│   ├── intake/      triage
│   ├── plan/        grill-with-docs, grilling, domain-modeling, to-spec, to-tickets
│   └── build/       implement, implement-spec, tdd, code-review, pr, diagnosing-bugs, codebase-design
└── templates/
    └── sandcastle/  build loop copied into each project by setup-build-loop
sandcastle/          fork of mattpocock/sandcastle (git submodule): runs the build loop in Docker sandboxes
reference/           source repos the harness borrows from (reference only)
```

Clone with submodules: `git clone --recurse-submodules https://github.com/m00wgli/ADLC-harness.git`. If you already cloned without them, run `git submodule update --init`.

To pull Matt's latest Sandcastle changes into the fork: `cd sandcastle && git fetch upstream && git merge upstream/main && git push`, then commit the updated submodule pointer here.

## Use

```bash
claude --plugin-dir ./harness                  # while developing the harness
```

Or install it in another project:

```
/plugin marketplace add m00wgli/ADLC-harness
/plugin install harness@adlc-ae-workflow
```

## Update

After a new version is pushed (bump `version` in `harness/.claude-plugin/plugin.json`, or the update is skipped):

```bash
claude plugin marketplace update adlc-ae-workflow
claude plugin update harness@adlc-ae-workflow
```

Or inside Claude Code: `/plugin` → Marketplaces → `adlc-ae-workflow` → Update. Then restart Claude Code.

Projects using the build loop also need the new harness inside their Docker image. Set `ARG HARNESS_VERSION` in `.sandcastle/Dockerfile` to the new version, then rebuild:

```bash
npx sandcastle docker build-image
```

## Flow

1. `/harness:setup-harness-skills`: once per project. Connects the GitHub issue tracker and labels.
2. `/harness:grill-with-docs`: sharpens the idea by interview and writes `GLOSSARY.md` and ADRs.
3. `/harness:to-spec`: publishes the PRD as a GitHub issue.
4. `/harness:to-tickets #<PRD>`: splits the PRD into GitHub issues with blocking links.
5. `/harness:setup-build-loop`: once per project. Sets up Sandcastle and the Docker image.
6. `/harness:implement-spec #<PRD>`: builds each unblocked ticket in its own sandbox (tdd → test gate → review) and opens a PR per ticket.
7. You review each PR: **merge** to approve (closes the ticket), or add the **`changes-requested`** label with comments to send it back. Run step 6 again to continue.

## Credits

The skills and agents are adapted from [mattpocock/skills](https://github.com/mattpocock/skills) and [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), both MIT; their licences are in `reference/`. The planned checkpoint and gate loop for the build phase is inspired by Shopify's [Helix](https://shopify.engineering/helix).
