# INA Pattern Studio workflow

## Hard rules

1. Never derive exact stitch counts, yarn quantities, frame fit, bulb guidance or safety claims from an image.
2. Never create a commercial pattern from a design that Ivana says was copied, substantially derived from, or practised from another seller's pattern.
3. Never call Etsy publish/update-to-active. Creating a draft is the maximum allowed integration action in this workflow.
4. Never proceed past a failed validator report. Surface missing measurements and request them.
5. Never identify a design as safety-tested or certified unless an uploaded evidence record supports the specific claim.
6. Keep a versioned audit record: source brief, concept selected, calculations, pattern version, tester issues, changes and approval.

## State transitions

| Current state | Required evidence | Next state | Actor allowed to move it |
|---|---|---|---|
| `brief` | Required brief fields | `concept_review` | Agent |
| `concept_review` | Ivana selected concept ID | `construction` | Ivana |
| `construction` | Frame, gauge, yarn and motif repeat known | `pattern_draft` | Agent after validator pass |
| `pattern_draft` | Prototype build logged | `prototype` | Ivana |
| `prototype` | Ivana reproduced the design | `tester_review` | Ivana |
| `tester_review` | Three completed independent tests; all critical issues resolved | `release_candidate` | Ivana |
| `release_candidate` | Release schema passes; physical safety evidence if a physical shade is offered | `approved` | Ivana only |
| `approved` | Final PDF, images, title, price and tags reviewed | `etsy_draft_created` | Agent may create a draft |
| `etsy_draft_created` | Separate explicit publish authorisation and final display review | `published` | Ivana or authorised operator only |

## Pattern validation protocol

For a drum frame:

1. Calculate frame circumference as `π × diameter_cm`.
2. Calculate the unrounded stitch requirement as `(circumference_cm ÷ 10) × gauge_stitches_per_10cm`.
3. Find a starting stitch count divisible by the motif repeat within the stated fit tolerance.
4. Reject the construction if no compatible count exists. The agent must ask for a new motif repeat, different gauge, adjusted frame size, or deliberately designed easing.
5. Log the selected count and percentage difference from unrounded gauge requirement.

The validator checks only the arithmetic and gate evidence. It cannot decide whether an ease percentage is aesthetically or structurally correct; Ivana validates that through a physical build.

## Etsy draft rule

For this initial digital product, a valid draft must state that it is a digital crochet pattern and that no finished lampshade, lamp base, bulb, frame or materials are supplied. Its attached file must be the final approved PDF version. Create a draft only after final review.

Etsy's documentation states that digital products use a download listing with a listing file uploaded. Its API requires app registration and OAuth access for listing writes. [Etsy listing tutorial](https://developers.etsy.com/documentation/tutorials/listings/).
