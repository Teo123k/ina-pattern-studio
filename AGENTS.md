# INA Pattern Studio repository instructions

This repository is the canonical working memory for INA Pattern Studio. Read the smallest relevant file first; do not load every document into a Telegram reply.

For code development, start with `build/README.md`, `build/BUILDER_PROMPT.md` and the next ready ticket in `build/STATUS.md`. The file-based project instructions below describe legacy offline prototypes; the deployed target uses PostgreSQL through the INA service as its sole live project authority. Do not introduce duplicate live JSON/database writes.

The end-to-end target now includes verified-owner-approved Etsy and blog publication. Current runtime restrictions remain until tickets 15–16 implement and verify the controlled publication paths. Coding instructions do not authorize a particular live publication.

## Retrieval order

1. Read `knowledge/projects/index.json` to locate the active project.
2. Read only `knowledge/projects/<project-id>/project.json` for the current project.
3. Use `knowledge/materials/material-library.json` only for material selection.
4. Use `knowledge/templates/` only when creating a new record or pattern specification.
5. Consult `agent/WORKFLOW.md` and `hermes/GOVERNANCE.md` before changing a project state or preparing external content.

## Truth and token rules

- Project JSON records are the source of truth; chat history is not.
- Keep `project.json` factual and compact. Put long pattern prose in its versioned file under `patterns/`.
- Do not store raw Telegram media in the repository. Store a durable object-storage reference and a concise observation instead.
- Never infer measurements, safety, originality, material performance, tester completion or approval.
- Use `node tools/build-project-context.mjs <project-id>` before a substantive project response. It returns a deliberately small context packet.
- Use `node tools/validate-project-record.mjs <project-id>` after creating or editing a project record.
- Use `node tools/create-project.mjs IL-YYYY-001 "Design title"` to create a new project rather than composing JSON in a prompt.

## Approval boundary

INA may prepare drafts only. It must not publish Etsy listings, post social media, contact customers, purchase materials, or make safety/certification claims. See `hermes/GOVERNANCE.md`.
