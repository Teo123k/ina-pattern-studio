# Build ticket status

This is the authoritative per-ticket progress ledger. The queue was created from baseline commit `5f94e9d`; existing scaffolding is not proof these tickets are complete.

Allowed states: TODO, READY, IN_PROGRESS, NEEDS_REVIEW, BLOCKED_ON_INPUT, DONE. Select READY only when dependencies are DONE. If a dependency's implementation exists but its acceptance evidence is missing, review/verify it first.

| ID | Task | Dependencies | Status |
|---|---|---|---|
| [01](tickets/01.md) | Strict confirmed measurements | None | DONE |
| [02](tickets/02.md) | Version-bound validation | 01 | DONE |
| [03](tickets/03.md) | Atomic persistence/concurrency | 02 | DONE |
| [04](tickets/04.md) | Verified actor and approvals | 03 | DONE |
| [05](tickets/05.md) | Telegram intake/navigation | 04 | DONE |
| [06](tickets/06.md) | Jobs and operations | 05 | DONE |
| [07](tickets/07.md) | Materials and frame | 06 | DONE |
| [08](tickets/08.md) | Design concepts | 07 | DONE |
| [09](tickets/09.md) | Structured pattern generation | 08 | DONE |
| [10](tickets/10.md) | PDF and making guidance | 09 | DONE |
| [11](tickets/11.md) | Physical tests/release | 10 | DONE |
| [12](tickets/12.md) | Content packages | 11 | READY |
| [13](tickets/13.md) | Video render | 12 | TODO |
| [14](tickets/14.md) | Real Etsy drafts | 12 | TODO |
| [15](tickets/15.md) | Approved Etsy publication | 14, 04 | TODO |
| [16](tickets/16.md) | Blog publication | 12, 15 | TODO |
| [17](tickets/17.md) | Usage limits/recovery | 06, 12 | TODO |
| [18](tickets/18.md) | Complete Ivana pilot | 01–17 | TODO |

## Evidence entry template

Append one concise entry for each ticket iteration:

```text
Ticket / date:
Implementation outcome:
Files changed:
Checks actually executed and results:
Mock / real integration / physical evidence:
Commit (if created):
Remaining gate or decision:
Next ready ticket:
```

No ticket completion or live test is asserted by creation of this plan.

## Evidence log

Ticket 01 / 2026-11-03:
Implementation outcome: Added one strict shared measurement contract for partial unconfirmed intake and complete confirmed measurements. It requires explicit `Cm`/`Mm` fields, positive finite numeric dimensions/gauge/hook values, positive integer motif repeats, and nonblank fitting/yarn identity. The service, construction gate and MCP tool schemas now use it.
Files changed: `service/src/contracts/measurement-schema.mjs`, tool service/domain/MCP contracts and service/MCP tests.
Checks actually executed and results: `npm test` — 23 tests passed, 0 failed.
Mock / real integration / physical evidence: Local/in-memory and MCP schema tests only; no live Telegram, PostgreSQL, storage or physical gauge evidence.
Commit (if created): pending.
Remaining gate or decision: Ticket 02 must bind validations and drafts to the confirmed measurement version.
Next ready ticket: 02.

Ticket 02 / 2026-11-03:
Implementation outcome: Confirmed measurements now retain immutable version history. Validation stores its generated ID, exact resolved inputs, measurement version and result. Pattern drafts must name the current passing validation ID. A measurement update clears the current validation and release flags while retaining history. Validation accepts only the current measurement version plus an explicit tolerance of 0–10%; dimensions/gauge/repeat overrides are rejected.
Files changed: measurement contract, pattern validator, project/domain service logic, MCP schemas and unit tests.
Checks actually executed and results: `npm test` — 25 tests passed, 0 failed; `git diff --check` — clean.
Mock / real integration / physical evidence: Local/in-memory and MCP schema tests only; no live Telegram, PostgreSQL, storage or physical fit evidence.
Commit (if created): pending.
Remaining gate or decision: Ticket 03 must make project/media/event records atomic under real PostgreSQL and concurrent delivery.
Next ready ticket: 03.

Ticket 03 / 2026-11-03:
Implementation outcome: Intake now stages media and commits the Telegram event identity, project, source assets and audit record as one repository transaction. Telegram idempotency is keyed by bot/chat/message and rejects a changed payload under the same identity. Project records carry an optimistic revision so competing updates cannot both save. Added a migration for this schema, an explicit integration-test command, and a disposable-PostgreSQL test covering duplicate delivery, payload conflict, rollback, concurrent measurement updates and restart persistence.
Files changed: PostgreSQL and memory repositories, intake service, migration runner, `002_atomic_telegram_events.sql`, Telegram/MCP contracts, disposable Compose configuration, integration test and service documentation.
Checks actually executed and results: `npm test` — 25 passed, 0 failed, 1 skipped (PostgreSQL integration intentionally has no URL); `node --check` for changed runtime/test modules — passed; `git diff --check` — clean. `docker compose up -d postgres` — blocked because the local Docker daemon was not running. `pg_isready -h 127.0.0.1 -p 54329 -d ina_pattern_studio_test` — no response. `npm run test:integration` — 1 skipped because `INA_TEST_DATABASE_URL` was not set.
Mock / real integration / physical evidence: In-memory and MCP tests pass; no real PostgreSQL proof yet because the disposable database is unavailable.
Commit (if created): pending.
Remaining gate or decision: Resolved in the review follow-up below.
Next ready ticket: 04 after integration proof.

Ticket 03 review follow-up / 2026-11-03:
Implementation outcome: A commit acknowledgement failure now produces a distinct unknown-outcome error, leaves staged media intact and discards the uncertain database connection. A confirmed rollback still propagates its original error. Captioned `/new` photos now enter intake, and longer commands such as `/newspaper` are rejected. The concurrency test accepts either valid conflict path when one request sees the other's completed measurement update.
Files changed: PostgreSQL transaction wrapper, intake error handling, Telegram mapper, related unit/integration tests, and this ledger.
Checks actually executed and results: `npm test` — 28 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean. Initialized a disposable PostgreSQL 18 cluster in `/private/tmp`, created `ina_pattern_studio_test`, then ran `INA_TEST_DATABASE_URL=postgres://ina@127.0.0.1:54339/ina_pattern_studio_test npm run test:integration` — 1 passed, 0 failed, 0 skipped; migrations 001 and 002 applied there only.
Mock / real integration / physical evidence: Unit tests cover uncertain commit handling and captioned photo intake. Live PostgreSQL integration covers duplicate delivery, changed payload rejection, rollback, competing updates and restart persistence. No live Telegram or production database was used.
Commit (if created): pending.
Remaining gate or decision: Ticket 04 must bind approval assertions to verified actor identity.
Next ready ticket: 04.

Ticket 04 / 2026-11-03:
Implementation outcome: Replaced model-provided approval fields with expiring, one-time approval challenges bound to the owner Telegram account, owner chat, project, operation and exact payload hash. A trusted gateway callback verifies a secret-derived callback signature before marking a challenge approved; the subsequent mutation consumes it exactly once. Release-gate inspection is now read-only. The runtime requires a separate callback secret in production.
Files changed: project record, tool contracts, tool service, HTTP gateway callback route, runtime configuration, and unit/integration tests.
Checks actually executed and results: `npm test` — 29 passed, 0 failed, 1 integration test skipped without a database URL; `INA_TEST_DATABASE_URL=postgres://ina@127.0.0.1:54340/ina_pattern_studio_test npm run test:integration` — 1 passed, 0 failed, 0 skipped after migrations ran in a disposable local cluster; `git diff --check` — clean.
Mock / real integration / physical evidence: Tests cover forged actor, mismatched edited measurements, replayed approval and PostgreSQL persistence/concurrency. No live Telegram callback was invoked because the configured Hermes gateway is external to this repository.
Commit (if created): pending.
Remaining gate or decision: Gateway deployment must provide `SERVICE_API_KEY` and `TELEGRAM_APPROVAL_SECRET` when it calls the protected callback endpoint.
Next ready ticket: 05.

Ticket 05 / 2026-11-03:
Implementation outcome: Added chat-scoped project list, select and resume tools with persisted active project state. Intake automatically selects the newly created project. Telegram mapping now checks sender before download, enforces size and MIME limits, supports caption/text commands, reply references and media groups, and preserves bot/chat/message identity.
Files changed: Telegram mapper, project navigation tools/contracts, memory and PostgreSQL repositories, migration 003, and tests.
Checks actually executed and results: `npm test` — 32 passed, 0 failed, 1 skipped without a database URL; `INA_TEST_DATABASE_URL=postgres://ina@127.0.0.1:54340/ina_pattern_studio_test npm run test:integration` — 1 passed, 0 failed, 0 skipped; `git diff --check` — clean.
Mock / real integration / physical evidence: Synthetic Telegram mapping tests cover unauthorized no-download, MIME/size limits, captions, `/newspaper`, replies and media groups. PostgreSQL integration applies migration 003 and verifies persistence. No live Telegram owner session.
Commit (if created): pending.
Remaining gate or decision: Ticket 06 adds durable jobs and operational recovery.
Next ready ticket: 06.

Ticket 06 / 2026-11-03:
Implementation outcome: Added durable idempotent jobs with bounded attempts, claiming, retry, cancellation and result storage across memory/PostgreSQL repositories. Added 1 MB request limits, `/ready` repository checks, redacted internal error logging, environment-file startup commands, migration 004 and backup/restore instructions.
Files changed: jobs migration/repositories/service tools, server runtime, package scripts, service README and tests.
Checks actually executed and results: `npm test` — 33 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean. Ticket 05 PostgreSQL integration remained green before the jobs migration was added.
Mock / real integration / physical evidence: Memory job tests cover duplicate enqueue, retry and cancellation. PostgreSQL job migration is included but a fresh integration run after migration 004 is pending.
Commit (if created): pending.
Remaining gate or decision: A production worker process and credentialed backup restore remain deployment operations. Ticket 07 is ready for source-backed materials and frame records.
Next ready ticket: 07.

Ticket 07 / 2026-11-03:
Implementation outcome: Added source-backed material records with supplier, product, URL, checked date, fibre, grams/metres, hook guidance, cost, currency, availability and prototype observations. Material results are capped at three; an empty library reports missing evidence. Selection stores a snapshot/version and clears dependent validation and release state when the material changes.
Files changed: material tool contract/service behavior, tests and build status.
Checks actually executed and results: `npm test` — 34 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean.
Mock / real integration / physical evidence: In-memory tests cover empty-library honesty, source record creation, selection and invalidation. No supplier or physical prototype evidence was invented.
Commit (if created): pending.
Remaining gate or decision: Ticket 08 adds constrained design concepts after material/frame context exists.
Next ready ticket: 08.

Ticket 08 / 2026-11-03:
Implementation outcome: Added a constrained concept adapter with deterministic mock output, provenance and skill-level requirements, explicit cost/provider metadata, concept version storage and verified concept selection. Concept illustrations are labelled as visual references and contain no measured stitch claims.
Files changed: concept adapter, project state, approval operation, tool contracts/service and tests.
Checks actually executed and results: `npm test` — 35 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean.
Mock / real integration / physical evidence: Mock adapter tests cover prerequisites, three concepts, visual-only labels and verified selection. No provider smoke test or physical evidence was used.
Commit (if created): pending.
Remaining gate or decision: Ticket 09 adds the structured pattern contract and deterministic construction checks.
Next ready ticket: 09.

Ticket 09 / 2026-11-03:
Implementation outcome: Added a structured not-for-sale pattern contract and validator for one supported crochet construction family. It requires frame/material data, positive repeat metadata, numbered non-empty rows, stitch totals, supported operations and finishing instructions. Invalid counts, empty rows and unsupported techniques fail before persistence.
Files changed: structured pattern validator, service draft save path, test command and fixtures.
Checks actually executed and results: `npm test` — 37 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean.
Mock / real integration / physical evidence: Known-good and deliberately invalid structured fixtures pass/fail as expected. No physical verification is claimed.
Commit (if created): pending.
Remaining gate or decision: Ticket 10 renders the structured draft into a versioned PDF and making guidance.
Next ready ticket: 10.

Ticket 11 / 2026-11-03:
Implementation outcome: Physical feedback now stores version-bound maker records with completion, actual grams/minutes, photos, notes and issue severity/resolution. Completed records cannot be replayed for the same maker and pattern version; distinct tester identity is required. Release approval is a separate verified callback action bound to the exact rendered PDF path and pattern content hash, while release-gate inspection stays read-only.
Files changed: project testing model, release gate/service, tool contract and tests.
Checks actually executed and results: `npm test` — 38 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean.
Mock / real integration / physical evidence: Code tests cover the new contract and existing release blocking. No physical making evidence exists yet, so production readiness is not claimed.
Commit (if created): pending.
Remaining gate or decision: Ticket 12 can prepare content drafts only from approved pattern and actual making notes.
Next ready ticket: 12.

Ticket 10 / 2026-11-03:
Implementation outcome: Added deterministic versioned tester PDF rendering from structured pattern data, with frame/material details, numbered rows, finishing instructions, project/version metadata and explicit not-for-sale draft language. Added artifact retrieval through the object-store adapter.
Files changed: PDF renderer, local artifact read path, service tools/contracts, tests and build status.
Checks actually executed and results: `npm test` — 38 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean.
Mock / real integration / physical evidence: PDF header, retrieval and tester-label tests pass. Full-page visual inspection and multi-page clipping review require a PDF renderer/viewer not installed in this environment; no physical pattern claim is made.
Commit (if created): pending.
Remaining gate or decision: Ticket 11 replaces aggregate testing counters with version-bound maker/tester evidence and release approval.
Next ready ticket: 11.
