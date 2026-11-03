# INA Pattern Studio

This workspace supports research, decisions, and eventual execution for Ivana's London-based crochet business.

Current stage: business plan prepared following the user's request to proceed. Execution and customer validation are not yet complete.

Confirmed founder context: Ivana is practising her first lampshade; estimated production time is 8–10 hours per shade. Finished shades cannot be the only main income source. Launch budget, weekly availability, original-design experience, audience size, and income target remain unknown.

Read [the market research and options](research/2026-11-03-market-research.md). Prices, fees, and policies are a dated snapshot; all proposed prices and validation thresholds are hypotheses.

Start with [the business plan](BUSINESS_PLAN.md), then use [the execution tracker](EXECUTION.md). The plan contains provisional capacity and spending assumptions; these are not confirmed founder commitments.

The research brief is retained as a historical record. The business plan is the current strategic reference; the execution tracker is the single source of truth for task status and measured results.

The first technical foundation for the approval-gated pattern agent is in [agent/README.md](agent/README.md). It is intentionally designed to prepare Etsy drafts only; publishing remains a separate action after Ivana's explicit approval.

The agreed Telegram-to-pattern requirements and recommended additions are in [agent/PRODUCT_REQUIREMENTS.md](agent/PRODUCT_REQUIREMENTS.md).

The Hermes-ready project pack, designed for a controlled deployment rather than an automatic public-sales bot, is in [hermes/HERMES_GUIDELINE.md](hermes/HERMES_GUIDELINE.md).

INA uses a direct Hermes Telegram bot, not n8n. The specific direct-integration deployment plan is [hermes/TELEGRAM_DIRECT_BUILD.md](hermes/TELEGRAM_DIRECT_BUILD.md).

To have Hermes implement the local tool-service foundation, use the staged [Hermes build prompt](hermes/INA_HERMES_BUILD_PROMPT.md). It builds and proves the internal workflow before any external account connection or deployment.

## Tool service

The production-oriented INA tool-service foundation is in [service/README.md](service/README.md). It exposes only the approved pattern-studio tools, keeps Telegram intake idempotent, and blocks Etsy publication by design. Use `npm test` to run the repository checks.

This is the canonical repository for INA, Ivana's approval-gated crochet lampshade pattern studio agent.

## Token-efficient Hermes use

Hermes should not receive all product, market and workflow documents for every Telegram message. It should use a small retrieval sequence:

```text
Telegram message
  → identify project ID
  → build compact context packet from project.json
  → retrieve only the relevant material or template
  → use the model for reasoning/writing
  → write structured facts back to project.json
```

Start with [AGENTS.md](AGENTS.md) and [knowledge/README.md](knowledge/README.md). The initial templates are intentionally empty: Ivana's confirmed measurements, material choice and tester evidence must be recorded rather than invented.

## Verification

```sh
node --test agent/tools/validate-pattern.test.mjs tools/build-project-context.test.mjs
```

Create the first real project only after Ivana provides its confirmed brief:

```sh
node tools/create-project.mjs IL-2026-001 "First drum-frame lampshade"
```
