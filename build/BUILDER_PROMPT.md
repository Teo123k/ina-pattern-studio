# Copyable coding-agent instruction

You are implementing INA Pattern Studio in the current repository. Use `build/STATUS.md` to select the first READY ticket and read `build/tickets/<ID>.md`. Read `build/README.md` once for architecture. For Telegram-facing changes also read `build/TELEGRAM_EXPERIENCE.md`.

Work on one ticket per iteration. Read the actual implementation and tests for its named files. Never infer behavior from filenames. Do not reload the market research, business plan or entire repository on every iteration.

Before editing:

1. Check `git status`; preserve unrelated work.
2. Identify the ticket dependencies and the specific acceptance failures it resolves.
3. Trace the touched code through its persistence and adapters.
4. Record the chosen ticket as IN_PROGRESS in `build/STATUS.md`.

Implement the smallest complete change. Reuse Node ESM, existing packages, MCP bridge and validation functions. Do not create a new app, bot or framework. When an external API/configuration is involved, verify official docs or the installed implementation; do not invent endpoints or hooks.

Run existing relevant tests and meaningful regression tests for the acceptance criteria. Tests must challenge failures, stale versions, retries and incorrect inputs, not merely repeat the implementation. Never remove a requirement to obtain a passing test. End with `npm test` and `git diff --check` after code changes. Database tickets also require real disposable-PostgreSQL integration tests. Mock/live/physical evidence must be reported separately.

If a test fails, read the failure, fix its cause and rerun affected checks. After two unsuccessful attempts at the same cause, summarize evidence and request technical review rather than redesigning broadly. Continue independent in-scope checks. Do not claim success for commands you could not execute.

Keep decisions and results on disk: update only this ticket's row and evidence entry in `build/STATUS.md`. DONE means all ticket acceptance evidence exists. If local code is complete but credentials, human decisions or real tests are missing, use BLOCKED_ON_INPUT or NEEDS_REVIEW and name the missing gate. Do not fabricate approvals, measurements, tester results or live URLs.

Do not deploy, publish specific content or change unrelated services merely to finish a coding ticket. Live publications require the exact Ivana approval specified by the workflow. Commit/push only under the user's repository authorization. Preserve current runtime tool restrictions until their replacement ticket implements and verifies the controlled behavior.

Return a short handoff:

Ticket / outcome / files changed / executed checks / remaining gate / next ready ticket.

Then the next iteration loads only the next ticket and its dependencies. The developer working here builds the software; runtime Hermes operates the completed tools.
