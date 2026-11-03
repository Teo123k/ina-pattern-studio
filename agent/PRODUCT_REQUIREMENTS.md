# INA Pattern Studio: agreed function scope

## Founder workflow

Ivana sends a sketch or photo plus measurements through Telegram. The agent opens or updates one design project, confirms the information it can and cannot reliably read, recommends appropriate materials from a maintained material library, drafts a complete pattern, supports prototype and tester feedback, and creates approved marketing assets. It creates an Etsy draft only after Ivana approves the tested final pattern.

Telegram is the input and approval channel. It is not the system of record. The project record must persist the original media, measured values, pattern version, material choice, test evidence, approvals and final assets.

## Functional requirements

| ID | Function | Required behaviour | Human gate |
|---|---|---|---|
| F1 | Telegram project intake | Accept text, photos, sketches, PDFs and short videos; create a project ID and preserve the source media | Ivana confirms a new project or update |
| F2 | Measurement confirmation | Extract stated dimensions; flag missing values, ambiguous units, image-perspective distortion and unknown frame details | Ivana confirms every frame and gauge measurement before pattern drafting |
| F3 | Material recommendation | Compare recorded yarn options by fibre, weight, metres/grams, stated yarn weight, cost, availability and prototype evidence | Ivana chooses materials; agent does not make unsupported heat, safety or fire claims |
| F4 | Constrained concept creation | Generate 3–6 visual directions that fit the chosen frame, yarn and skill level; explain likely stitch construction | Ivana selects one concept |
| F5 | Construction and pattern drafting | Use actual dimensions, gauge and a stitch repeat; generate clear start-to-finish instructions, charts/schematics and a materials list | Mathematical validator must pass; Ivana makes prototype |
| F6 | Testing and correction | Generate tester pack, collect structured feedback, find recurring failure points and version the correction log | Ivana approves release candidate after evidence is complete |
| F7 | Blog and educational content | Generate a how-to post, tips, FAQs and captions only from the approved pattern and confirmed making notes | Ivana reviews before publication |
| F8 | Tutorial-video assistant | Analyse submitted finished-product footage, create a 120-second edit decision list, captions, voiceover script and cover-frame recommendation | Ivana approves source clips and final cut before posting |
| F9 | Etsy draft creator | Create a draft digital-download listing using approved assets and final PDF version | Ivana reviews draft; publication is a separate explicit action |

## Telegram conversation design

Use buttons and short confirmation prompts instead of a long free-form interview. The agent should show the current project ID and current state in every substantial reply.

| Trigger | Agent response |
|---|---|
| `/new` plus photo/sketch | Creates `INA-XX`, stores source, asks for frame shape, diameter, height, fitting, yarn preference and target skill level |
| Photo/sketch with measurements | Extracts a proposed table, marks every estimate, and asks Ivana to correct or approve it |
| `/materials INA-XX` | Shows 2–3 material options from the library with known facts, trade-offs and unknowns |
| `/concepts INA-XX` | Generates constrained visual concepts only after dimensions and material direction are confirmed |
| `/pattern INA-XX` | Produces construction specification and runs the deterministic repeat validator before drafting |
| `/test INA-XX` | Creates versioned tester pack and feedback prompts |
| `/content INA-XX` | Creates blog/tutorial draft only from approved pattern version and actual making notes |
| `/etsy-draft INA-XX` | Creates a reviewable digital-listing draft after release approval |

The agent must never estimate a measurement from a photo and treat it as confirmed. If a ruler is visible, it may offer an estimate labelled `unconfirmed`; Ivana must confirm it. Required values for the initial drum-frame product are diameter, height, fitting description, yarn weight, hook size and a real gauge swatch.

## Materials module

Do not let a model casually recommend material based on style alone. Maintain a source-backed material library containing fields such as:

```text
supplier, product, fibre composition, yarn weight, grams per ball,
metres per ball, recommended hook range, stated care guidance,
price and date checked, source URL, prototype notes, availability status
```

For each recommendation, the agent should say what is known and what still needs physical testing. A lightweight result is assessed through sample weight, drape and the actual frame; it cannot be guaranteed by a text prompt. Product-specific safety and heat suitability remain separate evidence requirements.

## Pattern package

The release PDF should contain:

1. Finished-product photograph and exact supported frame dimensions.
2. Skill level, terminology, gauge swatch instructions and abbreviation key.
3. Materials list with quantities measured from prototypes.
4. Numbered rows/rounds, stitch totals after every row/round and clear repeat boundaries.
5. A schematic showing attachment to the exact frame.
6. Assembly, finishing, care and only evidence-supported use instructions.
7. Troubleshooting from real tester questions.
8. Pattern version, date and correction contact route.

## Tutorial-video module

The first version should produce an **edit decision list**, not automatically publish a finished video. It should:

1. Sort uploaded clips into: reveal, materials, signature stitch, attachment, close-up and final lit room.
2. Select clips that prove the real process; flag missing steps.
3. Draft a 120-second timeline, on-screen captions, voiceover and cover image.
4. Export a reviewable draft through a separate video-processing service, once chosen.
5. Preserve source clips and record the final tutorial's relation to the pattern version.

Example two-minute structure: 0–5 seconds finished reveal; 5–20 materials/frame; 20–85 signature construction; 85–110 attachment and finishing; 110–120 lit-room reveal and pattern call to action. The final cut must not imply that every step is shown if it is a shortened tutorial.

## High-value additions

Add these after the core loop works:

| Addition | Why it matters | Trigger |
|---|---|---|
| Project memory and version history | Prevents a new edit from overwriting a working pattern | Required from day one |
| Gauge-photo review | Helps catch an unusable swatch before calculations | First prototype |
| Tester portal/form | Turns feedback into structured defects instead of scattered messages | Before first paid release |
| Pattern PDF renderer | Keeps diagrams, photos and instructions consistent | After pattern format stabilises |
| Sourcing watch | Alerts when a proven yarn/frame becomes unavailable | After first sale |
| FAQ and support-draft assistant | Reduces repetitive responses while preserving Ivana's judgement | After 10 paid customers |
| Analytics review | Links content source, visits, purchases, refunds and support time | After Etsy launch |
| Content calendar | Reuses one completed project for posts, blog and tutorial | After the first approved pattern |

Do not add automatic physical-product orders, custom-size promises, universal bulb guidance, automatic public replies, paid ads or Etsy publication in version one.

## Phased build

### Phase 1 — reliable pattern studio

- Local project records, design brief, material-library template and deterministic validator.
- Telegram intake and approval messages.
- One fixed drum-frame product.
- No Etsy connection; no automatic video rendering.

### Phase 2 — testing and content

- Tester feedback form and release gate.
- Pattern-PDF generation.
- Blog post, tips/FAQ, tutorial script and 120-second edit decision list.
- Ivana reviews every public asset.

### Phase 3 — commerce draft workflow

- Etsy developer app registration and OAuth connection.
- Upload approved digital PDF and create a draft listing only.
- Final-screen confirmation includes title, price, tags, preview images and pattern version.

### Phase 4 — optional production services

- Connect a chosen video-rendering service for a reviewable draft export.
- Add availability checks for approved materials.
- Add dashboard metrics and support insights.

## Success checks for the agent

- No project reaches `pattern_draft` with unconfirmed frame dimensions or gauge.
- Every pattern-revision change has a reason and version number.
- Three testers can complete the pattern without an unresolved critical issue.
- Every blog and tutorial references the correct approved pattern version.
- Every Etsy draft is explicitly digital-only and includes the approved file.
- No listing becomes active without a separate explicit approval and final review.
