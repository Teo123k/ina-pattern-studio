# INA working memory

This folder is intentionally small, structured and retrieval-first. It reduces model cost by keeping repeatable facts in files and providing one compact context packet per project.

## Layout

- `projects/index.json` is the project directory.
- `projects/<project-id>/project.json` holds facts, state, approvals and references.
- `projects/<project-id>/patterns/` holds versioned pattern specifications and final files.
- `materials/material-library.json` holds approved material options and evidence references.
- `templates/` holds creation contracts, not live project data.

## Rules

- Store a fact once, with its confirmation status and source.
- Keep a reference to original photos/videos instead of embedding them.
- A pattern is not an approved product until the release gate is satisfied.
- Use the context builder rather than pasting all repository documents into a model prompt.

## Create a project

```sh
node tools/create-project.mjs IL-2026-001 "First drum-frame lampshade"
node tools/validate-project-record.mjs IL-2026-001
node tools/build-project-context.mjs IL-2026-001
```
