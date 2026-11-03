# INA Hermes build plan

Historical build sequence: use [SYSTEM_ROADMAP.md](../SYSTEM_ROADMAP.md) for current status and priorities. Code development now happens through the user and Codex; Hermes uses the deployed INA tools and repository guidance.

## Recommended stack

- **Hermes:** conversational agent and tool caller.
- **Hermes Telegram gateway:** direct Telegram conversation runtime for the dedicated INA bot.
- **INA tool service:** media intake, idempotency, durable project writes, pattern validation and controlled Etsy calls.
- **PostgreSQL:** authoritative project and approval records.
- **Object storage:** uploaded photos/videos plus versioned PDF and content assets.
- **OpenAI:** structured design/pattern/content drafts and concept imagery.
- **Node service:** deterministic pattern validator and approved Etsy adapter.
- **Etsy Open API:** digital draft creation after approval.

This separation makes every external write deliberate, traceable and replaceable. Hermes is not responsible for durable storage or direct publish authority.

## First build ticket

Build `create_project_from_telegram` in the INA tool service with idempotency:

Input: Telegram message ID, sender, text, attachments and timestamp.

Process: validate → store original media → create or update project → extract a proposed measurement table → return a Telegram confirmation card.

Output: project ID, media IDs, `measurement_confirmation_required` state and a log record.

No image generation, pattern writing, blog generation, video rendering or Etsy action belongs in the first ticket.

## Second build ticket

Build `validate_pattern_construction` around `agent/tools/validate-pattern.mjs`:

Input: confirmed diameter, gauge, motif repeat and explicit fit tolerance.

Output: compatible stitch count/repeats or a rejection with adjustment options.

Persist validator input and output against the project/version record.

## Later tickets

1. Material-library query and selection approval.
2. Concept creation and concept approval.
3. Pattern JSON/PDF generation and tester pack.
4. Tester feedback and version correction loop.
5. Content package and video edit decision list.
6. Etsy OAuth and draft-only adapter.

## Hermes deployment checklist

1. Create a separate INA workspace/repository and copy the `hermes/AGENTS.md` content to its root.
2. Add the INA skill only after a fresh-session test confirms the root project instructions load.
3. Configure Hermes tools with the allowlist from `HERMES_GUIDELINE.md`.
4. Test in a non-production Telegram chat using synthetic files.
5. Verify database, storage and idempotency logs before connecting Etsy.
6. Connect Etsy only for `createDraftListing` and digital-file upload.
7. Keep publication unavailable until the draft-only workflow has passed acceptance tests.
