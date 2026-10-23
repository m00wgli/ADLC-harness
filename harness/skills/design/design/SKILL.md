---
name: design
description: "Run the design phase: take any input (a brainstorm, notes, files, a folder, a SoW or RFP, a URL or an issue), grill it, model the domain, and produce a spec (PRD) with security requirements. Hand off to /harness:plan to cut tickets."
argument-hint: "[idea text, @file, @folder, URL, #issue, or nothing to brainstorm]"
disable-model-invocation: true
---

Work has arrived and needs to be understood before it can be planned. It can come in any shape: a sentence typed into the chat, a brainstorm, a notes file, a folder of documents, a Statement of Work, an RFP, a web page, an issue someone else wrote. The design phase doesn't care about the shape. It has a fixed order: gather the **sources**, sharpen what they ask for by **grilling** it, and synthesise the result into a **spec**. This skill walks that order so the user never has to remember it.

The skills underneath do the real work. This one only decides which step is next, runs it, and stops at the points where the user must agree before going on.

## Sources are facts, the user owns decisions

A source document answers questions; it doesn't make decisions. Anything a source states is a **fact** you look up yourself, never a question for the user. What the sources leave open, contradict, or only imply is a **decision**, and that goes to the user in the grilling. A 40-page RFP should shorten the grilling, not lengthen it.

## Keep it in one window

Run the grilling and the spec in **one unbroken context window**. The spec is a synthesis of the grilling; a summary of it is a worse source than the conversation itself. Don't compact or clear until the spec is published.

## Process

### 1. Find where we are

Check the repo before asking the user anything:

- No `docs/agents/issue-tracker.md` → the repo isn't set up. Read [setup-harness-skills](${CLAUDE_PLUGIN_ROOT}/skills/setup/setup-harness-skills/SKILL.md) and follow it first.
- An open issue labelled `prd` for this work:
  - **with no `## Security Requirements` section** → resume at step 6.
  - **with a `## Security Requirements` section** → design is done. Tell the user to run `/harness:plan #<spec>` to cut tickets, and stop.
- Otherwise start at step 2.

Tell the user which step you're starting from, and why.

### 2. Gather the sources

Take whatever the arguments point at, and read it yourself:

- **Text in the chat**: that's the source.
- **A file**: read it. PDFs page by page; Word, PowerPoint and spreadsheets through the matching document skill, or by converting to text first.
- **A folder**: list it, read what is relevant, and say what you skipped.
- **A URL or an issue**: fetch it.
- **Nothing**: ask the user to describe the idea in their own words, and treat the answer as the source.

Keep the originals where they are. Don't copy them into the repo; refer to them by path or link.

Then give the user a short **source brief**, in the conversation, not in a file:

- what is being asked for, in a few lines;
- the hard constraints the sources state (scope, deadlines, budget, compliance, technology);
- what the sources leave **open** or **contradict**: the agenda for the grilling.

**Too big for one spec?** A SoW or RFP often holds several independent pieces of work. If so, list them and ask which one to design now. Each becomes its own spec, designed in its own run of this skill. If even one piece is too foggy to grill in a single session, say so and design the clearest part first.

### 3. Grill

Call the Skill tool twice, for "harness:grilling" and "harness:domain-modeling". Grill from the source brief until every branch of the design tree is settled, starting with what the sources leave open. The sources' vocabulary is the first candidate for the glossary; challenge it where it is fuzzy or overloaded. Glossary terms and ADRs land as they are decided, not at the end.

As part of the grilling, identify the **testing seams**: the points in the architecture where tests will observe the feature's behaviour. Existing seams should be preferred to new ones. Use the highest seam possible. The fewer seams across the codebase, the better — the ideal number is one. Confirm the seams with the user before moving on.

### 4. Checkpoint

Summarise what was decided in a handful of lines, in the glossary's language, and ask: **"Ready to write the spec?"** Go on only on a yes. A no means more grilling.

### 5. Spec

Read [to-spec](${CLAUDE_PLUGIN_ROOT}/skills/design/to-spec/SKILL.md) and follow it. Under **Further Notes**, list the sources it came from (paths, links, sections), so later readers can trace a requirement back. It publishes the spec as an issue labelled `prd`; note its number.

### 6. Security requirements

If `docs/agents/security-level.md` does not exist or the level is `none`, skip this step. Note that the user can run `/harness:setup-security-level` (or `/harness:setup`) to set a security level.

Otherwise, read [security-asvs](${CLAUDE_PLUGIN_ROOT}/skills/design/security-asvs/SKILL.md) and follow it, passing the PRD issue number from step 5. It will suggest applicable chapters based on the grilling and spec, map requirements, write the checklist, and update the PRD with a Security Requirements section.

### 7. Hand off

Report the spec **by name and number**. Then point at the plan phase: `/harness:plan #<spec>` to cut tickets.

If step 2 split the sources into several pieces of work, list the ones still undesigned.

The issue tracker should have been provided to you. If not, tell the user to run `/harness:setup-harness-skills`.
