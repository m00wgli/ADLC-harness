---
name: research
description: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
---

Spin up a **background agent** to do the research, so you keep working while it reads.

Adhere to the [core behaviors](${CLAUDE_PLUGIN_ROOT}/references/core-behaviors.md) throughout.

Its job:

1. Investigate the question against **primary sources** (official docs, source code, specs, first-party APIs), not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where.

## Verification

Before finishing, confirm:

- [ ] All sources are official documentation, not blog posts or training data
- [ ] Framework/library versions identified from dependency file
- [ ] Anything unverified is explicitly flagged as such
- [ ] Findings are committed as a reference, not just in conversation
