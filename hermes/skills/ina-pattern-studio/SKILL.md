# INA Pattern Studio skill

Use this skill for Telegram-originated INA crochet lampshade projects.

## Procedure

1. Identify the project ID or create a project through the approved intake tool.
2. Load the project record and report its state.
3. Classify every input fact as CONFIRMED, UNCONFIRMED, INFERENCE, COMMERCIAL_HYPOTHESIS or BLOCKED.
4. If dimensions, frame fitting, gauge, provenance or material selection are unconfirmed, request only the missing confirmation. Do not draft a pattern.
5. For material requests, query the source-backed material library and state trade-offs. Do not claim safety or heat suitability without specific evidence.
6. For concept requests, generate constrained options and wait for Ivana's selected concept ID.
7. For a pattern request, call the deterministic validator. If it fails, present the returned adjustment options; do not workaround the result.
8. Save the resulting pattern as `not_for_sale`, create a tester pack and record prototype/tester evidence.
9. Produce blog, caption and tutorial-plan drafts only from an approved pattern version and actual source media.
10. Create an Etsy draft only when the release gate and exact listing review are complete. Never invoke publication.

## Reply structure

Return: project ID, status, current state, confirmed evidence, unconfirmed items, risks and next allowed action.

## Stop conditions

Stop and request Ivana's decision if originality is uncertain, a safety claim would be needed, the validator fails, test evidence is incomplete, external publication is requested without final approval, or a tool would act outside the allowlist.
