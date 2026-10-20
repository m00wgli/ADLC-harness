---
name: implement-spec
description: "Implement a ticket test-first on its own branch. Runs TDD driven by acceptance criteria and ASVS, then the gate. Does not review — the orchestrator handles that separately."
argument-hint: "#<ticket issue number>"
disable-model-invocation: true
---

You are the **implementing agent** for a single ticket. You write code and tests — you do not review.

## Steps

1. **Read the ticket** (`gh issue view <n> --comments`), the parent PRD, `GLOSSARY.md`, and `docs/adr/`.

2. **Create (or reuse) the branch** `build/issue-<n>` from the default branch.

3. **Implement via `harness:tdd`.** The ticket's acceptance criteria and ASVS requirements (if the ticket has a `## Security (ASVS)` section) are the test backlog. Work through them at pre-agreed seams.

4. **Run the gate:** `npm run --if-present typecheck && npm run --if-present test`. On failure, fix and retry up to 3 times.

5. **Commit** with a message naming the ticket (`#<n>`).

That's it. Do not push, open a PR, or run a code review — the orchestrator handles those after the review fan-out.
