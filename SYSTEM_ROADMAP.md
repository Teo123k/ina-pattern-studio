# INA system roadmap

This is the canonical roadmap and status tracker for software delivery. `EXECUTION.md` tracks business validation and Ivana's making work. Existing Hermes build prompts describe earlier implementation stages; use this roadmap for current build priorities.

Release-level readiness is tracked here; individual implementation tickets and their evidence are tracked only in [build/STATUS.md](build/STATUS.md). Use [build/README.md](build/README.md) to run one bounded coding iteration at a time.

## Working arrangement

- Development, review, testing and GitHub changes happen in this repository through the user and Codex.
- Hermes uses the deployed INA service through the restricted MCP toolset and reads repository guidance. It is not responsible for changing or pushing the application code.
- Ivana owns measurement confirmations, design decisions, physical tests and release approvals.
- User reports Hermes is connected to Telegram and can read GitHub. Its live INA MCP connection has not been verified here.

## Target outcome

An original sketch/photo and confirmed measurements become a tested digital crochet pattern, approved educational content, a reviewable two-minute tutorial, and directly published Etsy and blog pages after Ivana approves their exact versions. See [END_TO_END_BUILD_PLAN.md](END_TO_END_BUILD_PLAN.md) for the full maker workflow and release acceptance criteria. This extends the earlier draft-only target; publishing is planned, not currently implemented.

```text
Telegram → Hermes → INA MCP → INA service → PostgreSQL / private object storage
                                ↓
                     pattern validation and versioned evidence
                                ↓
                  pattern PDF → content → video draft → Etsy draft
```

## Current baseline

Reviewed baseline: commit `5f94e9d`. Last recorded verification: 20 passing tests. These exercise local adapters and MCP discovery; they do not prove production PostgreSQL, S3, Telegram delivery or pattern accuracy.

Implemented foundations:

- HTTP tool service and stdio MCP bridge with 11 named tools.
- Local intake, sender allowlist, sequential duplicate-message handling and unconfirmed measurements.
- Deterministic circumference/stitch-repeat validation.
- Basic pattern draft and release gates.
- PostgreSQL migration/repository and S3 adapter source.
- Synthetic Telegram mapper, tests and GitHub CI configuration.

Important limitations found in the current implementation:

- PostgreSQL intake inserts source assets before the parent project, conflicting with the foreign key. Intake is not one atomic database transaction.
- Concurrent duplicate deliveries and concurrent project updates are not protected adequately.
- Attachment failure cleanup covers staged storage; it is not full database rollback.
- Approval strings/booleans supplied by the model are not verified human approval evidence.
- Tester counts can be incremented repeatedly and are not tied to unique makers or the released pattern version.
- Measurement changes do not yet invalidate prior validation or downstream release evidence.
- The Telegram mapper is tested synthetically; normal media captions and chat-scoped message identity need coverage.
- Tester packs and Etsy drafts currently have placeholder behavior; no actual PDF or Etsy draft is produced.
- Legacy file-based project records and production database records describe competing sources of live truth. Retire file writes for deployed use; keep knowledge files as reference/templates.

## Delivery stages

| Stage | Status | Scope | Required proof before completion |
|---|---|---|---|
| 1. Local intake | Local checkpoint complete; production hardening pending | Preserve original input, unconfirmed facts and missing-field prompts | Existing intake tests plus invalid payload and failure-path coverage |
| 2. Confirmed construction | Next; basic code exists | Strict numeric/string validation, measurement history, stale-version rejection, confirmed-input binding, invalidation after changes | Invalid/negative gauge and dimensions rejected; changed measurements block old drafts; validator cannot substitute unconfirmed inputs |
| 3. Durable records | Pending; adapters exist | Atomic intake, correct asset insertion order, database transactions, concurrency, idempotency, bounded uploads and restart persistence | Real PostgreSQL integration tests; concurrent replay creates one project; failures leave no partial records; private storage round trip |
| 4. Verified approvals and tests | Pending; basic gates exist | Actor identity, project ownership, one-time/version-bound approvals, unique maker evidence and issue tracking | Model-supplied approval cannot authorize release; duplicate tester feedback cannot increase counts; new pattern version cannot inherit old approval |
| 5. Live Hermes workflow | Pending verification; bridge exists | Register MCP, connect the existing Hermes Telegram gateway, securely download original media, map confirmations and return project status | Fresh Telegram session uses correct project context; real photo/caption stored once; confirmed callback updates only its intended project/version |
| 6. Materials and concepts | Pending; empty library/query scaffold | Source-backed yarn/frame facts, measured weight/usage, material and concept selection, optional image-generation adapter | Recommendations cite recorded sources; unknown quantities stay unknown; Ivana selects a versioned concept/material |
| 7. Pattern generation and PDF | Pending; draft persistence exists | Structured start-to-finish instructions, UK/US terminology choice, per-row arithmetic, diagrams, PDF renderer and tester pack | Schema and arithmetic checks pass; rendered PDF reviewed; physical prototypes and independent tester results recorded |
| 8. Educational content | Pending | Blog, tips/FAQ, captions and tutorial script using approved pattern and actual making notes | Every asset links to approved pattern/source versions and has a review state |
| 9. Two-minute video | Pending | Clip inventory, 120-second edit decision list, captions, preview render and Ivana review | Render verified for duration, sound, captions and source rights; original clips preserved |
| 10. Etsy and blog publication | Pending; Etsy draft scaffold exists | OAuth, exact-version approval, digital draft/uploads/readback, controlled Etsy activation, one CMS adapter and separate channel status | Verified approvals produce correct live URLs; stale/replayed approvals rejected; retries cannot duplicate listings/posts |
| 11. Pilot and operations | Pending | Process supervision, secrets, backups/restore, monitoring, request limits, model budgets and runbook | Restart/restore drill and one complete real non-commercial project pass before paid release |

Stages 2–5 establish a reliable operational workflow. Stages 6–7 establish the pattern product. Content, video and commerce follow the verified pattern workflow.

## Token-efficiency requirements

- Run calculations, validation, command routing and gate checks in code.
- Retrieve compact active-project context; fetch long patterns/media only when needed.
- Keep source files out of prompts until a task requires them.
- Configure the model/provider through environment/configuration rather than hardcoded model names.
- Limit model calls, image generations, retries and output size per task; record actual usage and cost when supplied by the provider.
- Reuse approved pattern versions and content facts; do not regenerate them for every Telegram message.

## Next build ticket

Implement Stage 2: confirmed measurements and deterministic construction validation. Include tests for invalid values, missing gauge, stale versions, changed measurements, specification overrides and attempts to save a draft using stale validation. Preserve current intake behavior and the MCP allowlist.

After Stage 2, fix and integration-test durable PostgreSQL intake before treating the service as production-ready.

## Update policy

After each delivery, update this file with the completed stage, commit/evidence and remaining gaps. A passing local test marks local behavior verified; live integrations require their own recorded acceptance result. Do not mark physical testing, approvals or deployment complete from code alone.
