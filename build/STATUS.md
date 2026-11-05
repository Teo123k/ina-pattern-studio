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
| [12](tickets/12.md) | Content packages | 11 | DONE |
| [13](tickets/13.md) | Video render | 12 | DONE |
| [14](tickets/14.md) | Real Etsy drafts | 12 | DONE |
| [15](tickets/15.md) | Approved Etsy publication | 14, 04 | DONE |
| [16](tickets/16.md) | Blog publication | 12, 15 | BLOCKED_ON_INPUT |
| [17](tickets/17.md) | Usage limits/recovery | 06, 12 | IN_PROGRESS |
| [18](tickets/18.md) | Complete Ivana pilot | 01–17 | BLOCKED_ON_INPUT |
| [19](tickets/19.md) | Reference evidence and lighting geometry gate | 01–11 | NEEDS_REVIEW |

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

Ticket 12 / 2026-11-03:
Implementation outcome: Added versioned content packages generated only from an approved pattern and actual making records. Packages include a blog draft, SEO fields, listing copy with owner-supplied price, captions, three short-video concepts, carousel outline and seven-day schedule. Focused asset revisions preserve source references and keep content in draft status.
Files changed: content tools/contracts/service and MCP tests.
Checks actually executed and results: `npm test` — 38 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean.
Mock / real integration / physical evidence: Content generation is deterministic and credential-free; no publication or human content review was performed.
Commit (if created): pending.
Remaining gate or decision: Ticket 13 adds clip inventory and a reviewable two-minute edit decision/render path.
Next ready ticket: 13.

Ticket 13 / 2026-11-03:
Implementation outcome: Added a source-clip edit decision validator with required process roles, in/out bounds, missing-role reporting, 120-second target and tolerance, and explicit highlights labeling when steps are omitted. The result is stored against a pattern version for a future render adapter.
Files changed: video edit validator, service tool/contract, package test command and tests.
Checks actually executed and results: `npm test` — 40 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean.
Mock / real integration / physical evidence: Edit-list fixtures pass and invalid ranges fail. FFmpeg/provider rendering and visual/audio review remain deployment-dependent; no footage or licensed music was invented.
Commit (if created): pending.
Remaining gate or decision: Ticket 14 requires an Etsy OAuth and draft adapter based on current official API documentation.
Next ready ticket: 14.

Ticket 14 / 2026-11-03:
Implementation outcome: Added an Etsy Open API v3 draft adapter using the documented OAuth bearer and `x-api-key` headers, draft-listing creation, digital PDF upload, download-type update and readback verification. Live calls are enabled only when shop OAuth configuration is present; failures never report a listing ID as created.
Files changed: Etsy adapter, server configuration, environment example, service integration and mock HTTP tests.
Checks actually executed and results: `npm test` — 42 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean.
Mock / real integration / physical evidence: Mock contract tests cover success/readback and create failure. No live Etsy shop smoke test was run because no shop credentials were supplied.
Commit (if created): pending.
Remaining gate or decision: Ticket 15 adds explicit owner-approved publication with final readback and live URL reconciliation.
Next ready ticket: 15.

Ticket 10 / 2026-11-03:
Implementation outcome: Added deterministic versioned tester PDF rendering from structured pattern data, with frame/material details, numbered rows, finishing instructions, project/version metadata and explicit not-for-sale draft language. Added artifact retrieval through the object-store adapter.
Files changed: PDF renderer, local artifact read path, service tools/contracts, tests and build status.
Checks actually executed and results: `npm test` — 38 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean.
Mock / real integration / physical evidence: PDF header, retrieval and tester-label tests pass. Full-page visual inspection and multi-page clipping review require a PDF renderer/viewer not installed in this environment; no physical pattern claim is made.
Commit (if created): pending.
Remaining gate or decision: Ticket 11 replaces aggregate testing counters with version-bound maker/tester evidence and release approval.
Next ready ticket: 11.

Ticket 15 / 2026-11-03:
Implementation outcome: Added an explicit `publish_etsy_listing` action that requires the release gate, the recorded Etsy draft identity, a one-time verified Ivana approval bound to listing ID, price, currency and draft fingerprint, and a final Etsy readback confirming the listing is active. Publication records a live URL and moves the project to `published`; no credentials or network call are used by tests.
Files changed: Etsy adapter publication method, tool service/contract, MCP registry test, adapter tests and this ledger.
Checks actually executed and results: `npm test` — 44 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean.
Mock / real integration / physical evidence: Mock Etsy responses cover active readback and price-mismatch blocking. No live Etsy publication was run because shop credentials and explicit live publication authorization are not present.
Commit (if created): pending.
Remaining gate or decision: Ticket 16 cannot be implemented safely without a selected blog CMS, endpoint contract and credentials. The repository can continue generating reviewable blog drafts but must not guess a publication target.
Next ready ticket: Ticket 17 (usage limits/recovery) can proceed independently.

Ticket 17 / 2026-11-03:
Implementation outcome: Added a bounded usage meter with estimated-cost records, task and monthly budget checks, source-version/settings cache keys, maximum-attempt metadata, pause/resume recovery, plain-language help and monthly summaries. Existing status and cached outputs remain available when paid generation is blocked.
Files changed: `service/src/usage/usage-meter.mjs`, usage tests and `package.json`.
Checks actually executed and results: `npm test` — 46 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean.
Mock / real integration / physical evidence: Usage behavior is unit-tested in memory. Persistence across restart, production model billing reconciliation, Telegram Help/Pause routing and backup restoration remain unverified because no model provider or production deployment is connected here.
Commit (if created): pending.
Remaining gate or decision: Wire the meter to a durable usage table and the actual worker/provider before calling this ticket complete.
Next ready ticket: Ticket 18 is blocked until Ivana supplies a live Telegram pilot, real source media, physical tester evidence, CMS choice and optional Etsy credentials.

Ticket 16 / 2026-11-03:
Implementation outcome: WordPress.com is the single chosen CMS. Added a narrow OAuth-token adapter using the official WordPress.com post API: create a draft, persist post ID/preview/fingerprint/image reference, re-read the exact post before publishing, then verify its public URL. The service requires the verified Etsy live URL and a real HTTPS finished-product image, and binds Telegram approval to the exact WordPress draft fingerprint. A starter-site blueprint defines the initial pages and article template.
Files changed: WordPress adapter/tests, tool service/contracts, server configuration, MCP registry test, environment example, site starter guide and test script.
Checks actually executed and results: `npm test` — 48 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean.
Mock / real integration / physical evidence: Mock HTTP tests cover draft-to-publish readback and edited-draft blocking. No WordPress.com site, OAuth token, real Etsy URL, owned finished image or explicitly approved live blog publication exists yet.
Commit (if created): pending.
Remaining gate or decision: Create the free WordPress.com site, then provide its numeric site ID and OAuth token only through deployment secrets. A real approved draft/publication test is required before this ticket can be marked DONE.
Next ready ticket: Ticket 17 remains IN_PROGRESS; its usage meter must be made durable and wired to the real worker/provider.

Ticket 05 live-intake follow-up / 2026-11-03:
Implementation outcome: Added a direct Telegram Bot API gateway for authenticated `/new` photo/sketch/PDF/video intake. The webhook checks Telegram's configured secret, uses the existing allowlist before downloading media, creates the project through the existing atomic service path, and replies with the stored project status. Ordinary chat is ignored rather than interpreted as a project action.
Files changed: Telegram Bot API adapter, gateway handler/tests, HTTP route, environment example and test script.
Checks actually executed and results: `npm test` — 50 passed, 0 failed, 1 skipped without a database URL; `node --check service/src/server.mjs` — passed; `git diff --check` — clean.
Mock / real integration / physical evidence: Unit tests use a mock Telegram API. No bot token, webhook URL or live Telegram delivery was configured.
Commit (if created): pending.
Remaining gate or decision: Deployment must set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, allowlisted Telegram IDs, service API secret, PostgreSQL and S3 storage, then register the HTTPS webhook. The button-led maker flow and model provider are separate next work.
Next ready ticket: Ticket 17 remains IN_PROGRESS.

Ticket 19 / 2026-11-05:
Implementation outcome: Replaced generic image-to-pattern progression with an evidence-and-geometry gate. References are recorded as high-confidence conversion, inferred draft only or redesign required; high-confidence assertions require the named observed evidence. Pattern drafts and concepts now require Ivana-confirmed measured ring, fitting and bulb geometry. The service calculates available side/top clearance from actual geometry, stores prototype-only LED/airflow/weight targets, and blocks sale approval until a supervised temperature and airflow observation is recorded. No certification or generic clearance promise is produced.
Files changed: reference/geometry domain module/tests, project/release gates, tool service/contracts/MCP registry, workflow/governance documents, test fixtures and ticket ledger.
Checks actually executed and results: `npm test` — 53 passed, 0 failed, 1 skipped without a database URL; `git diff --check` — clean.
Mock / real integration / physical evidence: Deterministic unit/service tests only. No reference image vision analysis, actual ring/bulb measurement, supervised temperature/airflow check or physical prototype was performed.
Commit (if created): pending.
Remaining gate or decision: Configure the selected vision/pattern provider in Hermes and run Product 0 with a real image plus actual 5.5-inch ring/fitting/bulb evidence. Human approval and physical test evidence remain mandatory.
Next ready ticket: Ticket 17 remains IN_PROGRESS; Ticket 19 needs live Product 0 evidence before it can be DONE.
