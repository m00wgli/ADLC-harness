# ADLC-harness

A custom agent harness for Claude Code, packaged as the `harness` plugin. Its skills and agents take a project from idea to GitHub tickets, and later through build and review.

```
harness/
├── .claude-plugin/plugin.json
├── agents/          code-reviewer, security-auditor, test-engineer, web-performance-auditor
└── skills/
    ├── setup/       setup-harness-skills
    └── plan/        grill-with-docs, grilling, domain-modeling, to-spec, to-tickets
reference/           source repos the harness borrows from (reference only)
```

## Use

```bash
claude --plugin-dir ./harness                  # while developing the harness
```

Or install it in another project:

```
/plugin marketplace add m00wgli/ADLC-harness
/plugin install harness@adlc-ae-workflow
```

## Plan flow

1. `/harness:setup-harness-skills`: once per project. Connects the GitHub issue tracker and labels.
2. `/harness:grill-with-docs`: sharpens the idea by interview and writes `GLOSSARY.md` and ADRs.
3. `/harness:to-spec`: publishes the PRD as a GitHub issue.
4. `/harness:to-tickets`: splits the PRD into GitHub issues with blocking links.

## Credits

The skills and agents are adapted from [mattpocock/skills](https://github.com/mattpocock/skills) and [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), both MIT; their licences are in `reference/`. The planned checkpoint and gate loop for the build phase is inspired by Shopify's [Helix](https://shopify.engineering/helix).
