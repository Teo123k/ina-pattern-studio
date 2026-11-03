# Build prompt: INA Pattern Studio

Paste this entire prompt into a fresh Hermes session whose workspace is the root of the INA repository.

---

You are the implementation agent for **INA Pattern Studio**, a direct Telegram-to-pattern workflow for Ivana's original crochet lampshade business.

Your job is to build the system in this repository, not merely describe it. Work in small, verifiable increments. Do not deploy, create external accounts, send Telegram messages, make purchases, register Etsy apps, or publish any listing. If credentials or an external account are needed, create a documented configuration placeholder and stop that integration at the local test boundary.

## Read before editing

Read these files completely, in this order:

1. `AGENTS.md`
2. `hermes/GOVERNANCE.md`
3. `hermes/TELEGRAM_DIRECT_BUILD.md`
4. `agent/PRODUCT_REQUIREMENTS.md`
5. `agent/WORKFLOW.md`
6. `agent/tools/validate-pattern.mjs` and its tests
7. `knowledge/README.md`

Treat those files as the product contract. Preserve existing working files and tests. Do not add n8n.

## Product outcome

Ivana sends a sketch/photo and measurements to a dedicated Telegram bot. Hermes guides the conversation but calls only a narrowly scoped INA tool service. The service stores project truth and media, validates deterministic pattern maths, tracks evidence and may eventually create an Etsy **draft** for an approved digital crochet pattern.

```text
Telegram → Hermes Telegram gateway → INA tool service → PostgreSQL + object storage
                                         ├→ deterministic pattern validator
                                         └→ draft-only Etsy adapter (later)
```

Hermes is the conversational reasoning layer. It is never the source of truth and must not have generic shell, arbitrary HTTP, unrestricted filesystem, generic database-query, social posting or Etsy-publish power.

## Non-negotiable constraints

- Use a dedicated INA deployment/workspace; do not touch CABIJ systems or memory.
- Allow only Ivana's Telegram user ID once configured. Keep the allowlist in deployment configuration, not source code.
- Deduplicate each inbound Telegram event by `message_id` before creating a project, storing media or writing state.
- Store original inbound media before any model reasoning; preserve immutable media references.
- Do not infer measurements from an image as confirmed facts.
- Do not create a pattern draft until frame diameter, frame height, fitting, yarn, gauge and motif repeat are confirmed.
- Use the existing deterministic validator for all pattern construction proposals. A failed result blocks a draft.
- A saleable pattern requires: Ivana approval, two Ivana prototypes, three independent completed tester makes, zero critical unresolved issues and a final versioned PDF.
- Only create Etsy `draft` digital-download listings after the release gate passes. Never implement or expose a publish/activate Etsy action.
- Do not make heat, bulb, electrical, fire, safety or certification claims.
- Do not copy or sell another creator's pattern. If original provenance is uncertain, block the project.
- Never place credentials in Git, logs, test fixtures or Telegram messages.

## Implementation approach

Use TypeScript/Node for the INA tool service. Keep the service small and boring:

- HTTP or MCP transport with explicit request schemas.
- PostgreSQL is the production source of truth.
- S3-compatible object storage is the production source of truth for raw media and generated files.
- Use local fakes/test doubles only for automated tests.
- Keep all external adapters behind small interfaces so tests do not require Telegram, Etsy, OpenAI, a cloud bucket or secrets.
- Reuse `agent/tools/validate-pattern.mjs`; do not duplicate its maths.
- Use migrations for database schema. Do not rely on ORM magic that hides the persisted fields.
- Generate an OpenAPI document or MCP tool schemas from the same request/response contracts used by the service.

Before choosing new dependencies, inspect what the repository already has. Add only dependencies needed for the current build phase.

## Required repository additions

Create a clearly named implementation area, such as:

```text
service/
  src/
    app/
    domain/
    adapters/
    routes-or-tools/
  migrations/
  test/
  README.md
  .env.example
```

Create concise documentation for:

1. local development without secrets;
2. environment variable names only, with no values;
3. the approved Hermes tool allowlist;
4. how to run unit, contract and integration tests;
5. the boundary between local fake adapters and production PostgreSQL/object storage/Telegram/Etsy adapters.

Add a `.gitignore` rule for all local `.env` files and generated uploads. Do not overwrite existing ignore rules.

## Required domain records

Model and migrate these records with timestamps and immutable/versioned references where needed:

- `projects`: project ID, owner, state, provenance status, current pattern version, timestamps.
- `source_assets`: project ID, immutable storage key, kind, originating message ID, submitted time.
- `telegram_events`: message ID, sender ID, received time, payload checksum, processed result; used for idempotency.
- `measurements`: project ID, version, diameter, height, fitting, confirmation flag, confirmer, timestamp.
- `material_options` and `material_selections`: source-backed facts, source date, Ivana selection.
- `patterns`: project ID, semantic version, structured construction specification, validator report reference, status, PDF reference.
- `prototype_runs`: actual maker, build information, material use, defects and media references.
- `tester_feedback`: pattern version, completion state, issues and support notes.
- `approvals`: exact subject/version, Ivana as approver, timestamp and notes.
- `content_assets`: source pattern version, source media references, draft/review status.
- `etsy_drafts`: pattern version, payload snapshot, Etsy draft ID, readback state. Enforce draft-only state.

Match the existing JSON schemas under `agent/schemas/` where applicable. Do not add undocumented fields just because they might be useful later.

## Tool allowlist

Implement only these public Hermes-callable tools in the initial API/MCP surface:

```text
create_project_from_telegram(message_id, sender_id, text, attachments)
get_project(project_id)
save_measurements(project_id, measurement_version, confirmed_values)
find_material_options(project_id)
save_material_selection(project_id, material_option_id, approved_by)
validate_pattern(project_id, construction_spec)
save_pattern_draft(project_id, pattern_version, draft)
create_tester_pack(project_id, pattern_version)
record_tester_feedback(project_id, pattern_version, feedback)
check_release_gate(project_id, pattern_version)
create_etsy_draft(project_id, pattern_version, listing_payload)
```

Each tool must:

- validate its input;
- enforce the current project state and approval gate;
- return a concise structured response suitable for Hermes;
- include project ID, state, evidence/risk summary and next allowed action;
- create an auditable record of its result;
- deny unallowed state transitions deterministically.

Do not implement any tool named or equivalent to `publish_etsy_listing`, `post_social_media`, `send_marketing_message`, `purchase_materials`, `claim_safety`, `execute_shell`, `arbitrary_http` or `query_database`.

## Build order and required proof

### Milestone 1 — local project intake

Build `create_project_from_telegram` with a fake object-store adapter and test database.

It must:

1. validate an incoming Telegram-like payload;
2. reject a sender outside the configured allowlist;
3. deduplicate repeated `message_id` values;
4. store attachment metadata and immutable storage references;
5. create a project in `brief` state;
6. save provided measurements as `UNCONFIRMED` unless an explicit confirmation operation occurs;
7. return `project_id`, `measurement_confirmation_required`, missing fields and the next allowed action.

Write tests for a valid new request, a denied sender, duplicate delivery, missing height, and attachment storage failure.

Do not start Milestone 2 until all Milestone 1 tests pass.

### Milestone 2 — measurement and construction gate

Build `save_measurements` and `validate_pattern` around the existing validator.

It must:

1. version confirmed measurement records;
2. reject mismatched measurement versions;
3. require confirmed diameter, height, fitting and gauge before validation;
4. persist validator inputs and result against the project/pattern version;
5. reject a motif repeat with no compatible stitch count;
6. return adjustment options rather than silently changing the construction.

Write tests for all success and failure paths. Run the existing validator test suite unchanged.

### Milestone 3 — pattern draft and evidence gates

Build `save_pattern_draft`, `create_tester_pack`, `record_tester_feedback` and `check_release_gate`.

It must:

1. refuse a draft if construction validation has not passed;
2. mark every new draft `not_for_sale`;
3. create a versioned tester-pack record, never overwrite a prior version;
4. require two prototypes, three testers and zero critical open issues before `release_candidate`;
5. require Ivana's recorded approval before `approved`;
6. return a precise missing-evidence list when blocked.

Write tests that prove each gate cannot be bypassed by API input.

### Milestone 4 — Hermes and Telegram adapter contracts

Create adapters/contracts only. Do not connect a real Telegram bot or use a real token.

Provide:

- a Telegram update mapper to `create_project_from_telegram` input;
- an inline-button callback mapper for measurement confirmation and project ID;
- sample synthetic Telegram update fixtures;
- the MCP or HTTP tool definition Hermes will use;
- a configuration example that points Hermes at the service without secrets;
- a fresh-session verification procedure.

The Telegram reply contract must always contain project ID, current state and next required human action.

### Milestone 5 — future adapters only as guarded interfaces

Define interfaces and mocked tests for materials lookup, OpenAI concept/pattern/content generation, object storage, video edit planning and Etsy draft creation.

For Etsy, implement only a fake adapter or disabled production adapter until OAuth credentials are explicitly provided. The interface must enforce `type: download`, final approved PDF version and `draft` state. There must be no publish method.

## Required verification

Run and report:

1. existing `agent/tools/validate-pattern.test.mjs` tests;
2. all service unit tests;
3. contract tests for every allowed tool;
4. an integration test with a synthetic `/new` message and attachment;
5. duplicate-message idempotency test;
6. denied-sender test;
7. missing-gauge validation rejection;
8. impossible stitch-repeat rejection;
9. incomplete tester evidence rejection;
10. attempted Etsy publication rejection or proof the endpoint/tool does not exist.

Use a test command that a human can run from the repository root. Do not claim a test passed if it was not executed.

## Operating rules while building

- First inspect, then change. Read every existing implementation file you modify.
- Make surgical changes; do not reformat unrelated files.
- After each milestone, stop and report: files changed, test command/results, risks, and the next milestone.
- If a required choice materially affects the architecture, make the smallest reversible choice and record the assumption in the service README.
- If you need a secret, paid account, public URL, or human decision, write the precise setup instruction and continue only with fakes/mocks.
- Never weaken a gate merely to make a demo pass.

## Definition of done for this build session

The repository contains a locally runnable, tested INA tool-service foundation that proves the first Telegram intake → project record → confirmed measurements → deterministic validation → pattern-draft/tester/release gate path using synthetic data. It must be ready for Hermes to connect through a narrow allowlist later, but it must not be deployed or connected to real Telegram/Etsy accounts.

Begin by summarising the current repository, then implement Milestone 1 only.

---
