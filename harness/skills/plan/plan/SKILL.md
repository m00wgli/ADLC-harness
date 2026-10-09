---
name: plan
description: Run the whole plan phase in order, taking an idea to a spec and tickets on the issue tracker. Resumes where the last session stopped.
argument-hint: "[the idea, or @IDEA.md]"
disable-model-invocation: true
---

An idea has arrived and needs to become buildable work. The plan phase has a fixed order: sharpen the idea by **grilling** it, synthesise the result into a **spec**, then cut the spec into **tickets**. This skill walks that order so the user never has to remember it, and picks up wherever the last session stopped.

The skills underneath do the real work. This one only decides which step is next, runs it, and stops at the two points where the user must agree before going on.

## Keep it in one window

Run the grilling, the spec and the tickets in **one unbroken context window**. The spec is a synthesis of the grilling, and the tickets are cut from that same thinking; a summary of it is a worse source than the conversation itself. Don't compact or clear until the tickets are published.

## Process

### 1. Find where we are

Check the repo before asking the user anything:

- No `docs/agents/issue-tracker.md` → the repo isn't set up. Read [setup-harness-skills](${CLAUDE_PLUGIN_ROOT}/skills/setup/setup-harness-skills/SKILL.md) and follow it first.
- An open issue labelled `prd` for this idea:
  - **with no tickets** naming it as parent → resume at step 4;
  - **with tickets** → planning is done. Tell the user to run `/harness:build #<spec>` and stop.
- Otherwise start at step 2.

Tell the user which step you're starting from, and why.

### 2. Grill

Call the Skill tool twice, for "harness:grilling" and "harness:domain-modeling". Grill the idea from the arguments (read the file if one was given) until every branch of the design tree is settled. Glossary terms and ADRs land as they are decided, not at the end.

### 3. First checkpoint

Summarise what was decided in a handful of lines, in the glossary's language, and ask: **"Ready to write the spec?"** Go on only on a yes. A no means more grilling.

### 4. Spec

Read [to-spec](${CLAUDE_PLUGIN_ROOT}/skills/plan/to-spec/SKILL.md) and follow it. It publishes the spec as an issue labelled `prd`; note its number.

### 5. Tickets

Read [to-tickets](${CLAUDE_PLUGIN_ROOT}/skills/plan/to-tickets/SKILL.md) and follow it for the spec's number. Its quiz on the breakdown is the **second checkpoint**: the user approves the slices and their blocking edges before anything is published.

### 6. Hand off

Report the spec and its tickets **by name**, marking which ones are unblocked now. Then point at the build phase: `/harness:build #<spec>`.

The issue tracker should have been provided to you. If not, tell the user to run `/harness:setup-harness-skills`.
