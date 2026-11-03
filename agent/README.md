# INA Pattern Studio

INA Pattern Studio is an approval-gated agent for developing an original crochet lampshade pattern from a Telegram sketch, photo or measurement brief, producing a tester-ready draft, creating approved blog/tutorial assets, and preparing an Etsy digital-listing draft.

It does **not** determine whether a lampshade is physically safe, make a product, invent missing measurements, decide that another creator's design is original, or publish an Etsy listing. Ivana remains the maker, design owner and final approver.

## The first release

The initial agent supports one repeatable drum-frame design. It accepts a design brief through Telegram, requests confirmation of extracted measurements, uses a material library to make constrained recommendations, proposes concepts using an image model, converts the selected concept into a structured construction plan, drafts a pattern, runs deterministic stitch-repeat checks, and collects tester feedback before preparing content and an Etsy draft.

Keep the first product to one exact frame size, one yarn specification, one construction method and a limited set of verified colourways. A wider compatibility promise requires additional physical testing.

```mermaid
flowchart LR
  A[Telegram sketch, photo and measurements] --> B[Measurement confirmation]
  B --> C[Material recommendation]
  C --> D[Concept generation]
  D --> E[Ivana selects concept]
  E --> F[Construction specification]
  F --> G[Pattern draft and validation]
  G --> H[Prototype and tester loop]
  H --> I[Ivana release approval]
  I --> J[Blog, tutorial plan and Etsy draft]
  J --> K[Separate explicit publish approval]
```

## What is deterministic and what is not

The model may help produce ideas, readable instructions, descriptions and draft visuals. Code must calculate circumference, determine stitch-count compatibility, verify that required fields exist, and block release when evidence is missing. A generated image never supplies a stitch count or a safety claim. A photograph does not count as a measurement until Ivana confirms the extracted values.

Run the included validation test with:

```sh
node --test agent/tools/validate-pattern.test.mjs
```

The validator is deliberately small. It is a gate before physical testing, not a guarantee that the crochet cover fits or is safe.

## Agent states

`brief` → `concept_review` → `construction` → `pattern_draft` → `prototype` → `tester_review` → `release_candidate` → `approved` → `etsy_draft_created` → `published`

Only Ivana can move a project to `approved`. The agent must reject `published` unless a separate explicit publishing command is received after that approval. A listing draft can be created only for an approved digital pattern. It must remain `type: "download"`; no physical listing is included in this first release.

## Minimum integrations

1. **OpenAI Responses API:** use Structured Outputs for the brief, construction specification, pattern draft and listing draft; use function calls for local validation. OpenAI documents Structured Outputs for schema-conformant responses and recommends function calling when a model must call application tools. [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
2. **OpenAI image generation:** generate and iteratively edit concept images; use the image only as a visual reference. For new workflows, OpenAI currently recommends GPT Image 2.5 Sunburst when editing precision matters. [Image generation](https://developers.openai.com/api/docs/guides/image-generation).
3. **Etsy Open API v3:** create a draft digital listing and upload the verified PDF only after Ivana's approval. Etsy requires an app registration and OAuth write access for this; a listing becomes public only when its state is changed to active. [Etsy listing lifecycle](https://developers.etsy.com/documentation/tutorials/listings/), [Etsy OAuth](https://developers.etsy.com/documentation/essentials/oauth2/).

Do not put OpenAI or Etsy credentials into this repository. Store them in a deployment secret manager or local environment variables excluded from version control.

## Files

- [WORKFLOW.md](WORKFLOW.md): state-machine rules and acceptance gates.
- [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md): Telegram workflow, module scope and phased build.
- [prompts/pattern-studio-system.md](prompts/pattern-studio-system.md): system prompt for the reasoning agent.
- [schemas/design-brief.schema.json](schemas/design-brief.schema.json): input contract for a design project.
- [schemas/telegram-intake.schema.json](schemas/telegram-intake.schema.json): Telegram message and file intake contract.
- [schemas/pattern-release.schema.json](schemas/pattern-release.schema.json): release evidence contract.
- [tools/validate-pattern.mjs](tools/validate-pattern.mjs): repeat-count and release gate validator.
- [templates/etsy-draft.template.json](templates/etsy-draft.template.json): draft data to review before calling Etsy.

## Practical build order

Build the local workflow and pattern validator first. Run one non-commercial project through Ivana's own prototype and three testers. Then add Telegram intake, OpenAI generation and structured outputs. Add video processing only after a tutorial source-video workflow has been tested. Connect Etsy last, and initially allow `createDraftListing` only. Publishing remains a separate button or command with a confirmation displaying the final title, price, PDF version, images and tags.
