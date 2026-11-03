# Build INA one ticket at a time

Goal: Ivana runs design, making guidance, pattern testing, content review and approved Etsy/blog publication through her existing Hermes Telegram chat.

This folder is the implementation queue. `END_TO_END_BUILD_PLAN.md` describes the product; `SYSTEM_ROADMAP.md` describes release-level readiness. `build/STATUS.md` is the single source for individual ticket progress. All earlier claims of production readiness are superseded by the explicit acceptance checks here.

## Start

1. Give the coding model `build/BUILDER_PROMPT.md`.
2. Select the first ready ticket in `build/STATUS.md`.
3. Load that ticket and its listed files. Implement and test only that ticket.
4. Record evidence and review the diff before selecting the next ticket.

Coding happens here. Hermes is the runtime assistant; it does not need GitHub write access. The coding model may be inexpensive, but publication/authentication/data-loss changes need a separate code review before release. Small tickets and tests reduce mistakes; they do not guarantee any model's correctness.

## Sequence and user-visible results

| Tickets | Ivana gains |
|---|---|
| 01–06 | A persistent project, reliable measurements and easy Telegram navigation |
| 07–10 | Material choices, design concepts, pattern PDF and guided making steps |
| 11 | A tested pattern with traceable corrections |
| 12–13 | Blog/social content and a two-minute video preview |
| 14–16 | Etsy and blog preview, approval and direct publication |
| 17–18 | Spending limits, understandable recovery and a verified full pilot |

Implement the dependency order in each ticket. Ticket 17 can proceed while waiting for the blog CMS choice in ticket 16. Start physical making as soon as ticket 10 works; physical tester completion is independent of coding speed.

## Fixed implementation decisions

- Extend existing Node ESM `.mjs` code; no TypeScript rewrite or new frontend.
- PostgreSQL owns deployed project state; private object storage owns media/artifacts.
- Repository `knowledge/` contains reference material and templates. Legacy JSON creation tools are offline fixtures until retired; do not dual-write production state there.
- Reuse Hermes's existing Telegram gateway and the existing MCP bridge.
- Confirm current gateway hooks before implementing callbacks; do not invent config fields.
- First product: one original drum-frame digital crochet pattern. Ivana makes physical prototypes.
- Publish only exact versions approved through verified owner actions. Models cannot assert approval.
- Blog adapter: one provider, chosen before ticket 16. Social content export first; direct social posting is outside this queue.
- Current functionality is scaffold/local proof. Existing unit tests do not certify real database, remote storage or publication workflows.

## Completion

All ticket acceptance criteria pass, required live checks have evidence, and Ivana completes the pilot in `build/TELEGRAM_EXPERIENCE.md` without technical assistance for daily actions. Unavailable credentials or physical evidence remain explicit pending gates.
