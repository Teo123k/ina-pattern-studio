# Build ticket status

This is the authoritative per-ticket progress ledger. The queue was created from baseline commit `5f94e9d`; existing scaffolding is not proof these tickets are complete.

Allowed states: TODO, READY, IN_PROGRESS, NEEDS_REVIEW, BLOCKED_ON_INPUT, DONE. Select READY only when dependencies are DONE. If a dependency's implementation exists but its acceptance evidence is missing, review/verify it first.

| ID | Task | Dependencies | Status |
|---|---|---|---|
| [01](tickets/01.md) | Strict confirmed measurements | None | DONE |
| [02](tickets/02.md) | Version-bound validation | 01 | DONE |
| [03](tickets/03.md) | Atomic persistence/concurrency | 02 | READY |
| [04](tickets/04.md) | Verified actor and approvals | 03 | TODO |
| [05](tickets/05.md) | Telegram intake/navigation | 04 | TODO |
| [06](tickets/06.md) | Jobs and operations | 05 | TODO |
| [07](tickets/07.md) | Materials and frame | 06 | TODO |
| [08](tickets/08.md) | Design concepts | 07 | TODO |
| [09](tickets/09.md) | Structured pattern generation | 08 | TODO |
| [10](tickets/10.md) | PDF and making guidance | 09 | TODO |
| [11](tickets/11.md) | Physical tests/release | 10 | TODO |
| [12](tickets/12.md) | Content packages | 11 | TODO |
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
