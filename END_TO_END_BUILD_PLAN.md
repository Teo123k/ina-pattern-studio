# INA: idea to product, content and publication

## Outcome and scope

Ivana operates through her existing Hermes Telegram conversation. She sends an original sketch or photo, confirms measurements and materials, makes and tests the shade, uploads making notes and footage, reviews the final pattern and content, then approves publication. The service publishes the approved digital pattern on Etsy and an accompanying blog post, and returns the live links.

The first sellable product is a digital pattern for one exact drum-frame size. Ivana makes the physical prototypes; the agent cannot physically manufacture or validate a shade. Finished-shade inventory, shipping and physical-product sales are a separate later scope.

This plan expands the earlier draft-only scope to direct, approval-gated Etsy and blog publishing. Existing runtime publishing restrictions remain until the publishing implementation and tests are complete. Planning publication does not authorize publishing any particular listing today.

Code is developed and reviewed here. Hermes uses deployed tools. `SYSTEM_ROADMAP.md` remains the software status tracker; this file defines the end-to-end delivery plan.

## The maker's workflow

| Step | Ivana does | System produces | Completion evidence |
|---|---|---|---|
| 1. Start | Sends original sketch/photo and known measurements | Project ID, stored original, short missing-information checklist | Source asset and unconfirmed brief saved |
| 2. Choose construction | Confirms frame, fitting, material and measured gauge swatch | 2–3 source-backed material options, weight/quantity estimates labelled as estimates, selected construction | Versioned confirmations |
| 3. Choose design | Reviews 2–3 concept directions | Visual references and proposed stitch construction | Selected concept/version |
| 4. Make prototype | Follows draft; reports issues and actual yarn usage | Complete draft instructions, row counts, schematic and progress checklist | Mathematical checks plus actual first build |
| 5. Test and correct | Repeats the prototype and collects three independent tester makes | Tester pack, issues, corrected versions and change log | Two Ivana builds, three distinct testers, zero critical unresolved issues |
| 6. Prepare release | Uploads real finished photos/video and approves final pattern | Versioned customer PDF, listing preview images and content pack | Approved pattern hash/version and measured specifications |
| 7. Review launch | Reviews price, listing, blog and video separately | Telegram preview links and version-specific approval buttons | Verified approvals bound to exact assets/destinations |
| 8. Publish | Approves Etsy publication, then the blog with the verified Etsy link | Live Etsy listing and live blog URLs; downloadable social content | Remote readback confirms each publication |
| 9. Improve | Reviews customer questions and outcomes | Support drafts, correction proposals and content ideas | Real support/sales evidence; revisions need fresh approval |

During making, the system may draft behind-the-scenes captions and filming prompts clearly labelled work in progress. Finished how-to instructions and sales claims must use the tested release. A two-minute video is a highlights tutorial, not a substitute for the full written pattern.

## Build sequence

### Release A — dependable project workflow

Build in order:

1. Strict confirmed-measurement schema, version history and stale-version rejection.
2. Bind each calculation to confirmed inputs; invalidate calculation, pattern and release approval after relevant edits.
3. Fix PostgreSQL intake order and commit project/assets/event atomically; protect concurrent duplicates and updates.
4. Define one source of live truth: PostgreSQL. Repository JSON files become templates/reference fixtures.
5. Download/store Telegram media through a trusted gateway path; scope events by bot/chat/message and validate actual captions.
6. Verify actor identity and project ownership for every mutation. Human confirmations must originate from verified callbacks, never a model-written `approved_by` string.
7. Configure MCP on the existing Hermes host; do not introduce a second Telegram poller competing with Hermes.

Acceptance: a real Telegram photo creates one durable project; replay/restart preserves the same project; unconfirmed or stale measurements cannot generate a valid draft. Test against real local PostgreSQL and a private test storage target.

### Release B — a pattern Ivana can make and test

Build:

- Material records with supplier URL, checked date, fibre, metres/grams, hook range and prototype observations.
- Originality record, confirmed frame dimensions, UK/US terminology selection and real gauge procedure.
- Configurable concept-generation adapter; images stay visual references.
- Structured construction and pattern generation with numbered rows/rounds, repeat boundaries, stitch totals, shaping, attachment, finishing and troubleshooting.
- Deterministic row/repeat checks and bounded calculation inputs; the existing circumference check alone is insufficient.
- Versioned PDF renderer, layout checks and tester pack export.
- Unique prototype/tester records tied to pattern version; issue resolution and retest decisions.

Acceptance: Ivana completes the agreed prototypes and three independent testers complete the same release candidate. PDF contents, fit and quantities match actual making evidence. Model output alone never passes this gate.

### Release C — reusable content studio

One approved product generates one coherent content package:

- Etsy title, description, tags, price field for Ivana to set, digital-only disclosure and preview assets.
- Blog article: introduction, materials, selected process explanation, measured tips, troubleshooting, real photos, alt text, search title/description and pattern purchase link.
- Three short-video concepts, captions and filming checklist.
- One carousel outline, launch caption and short content calendar.
- A 120-second edit decision list, captions, optional voiceover and reviewable rendered video.

The blog provides useful teaching without automatically reproducing the entire paid pattern. Ivana chooses which excerpts are public. Generated concept images must not be presented as photos of the finished product. Capture notes and footage while making; reuse those facts across assets.

Implement content assets with source pattern version, original media references, draft version, review state and approval hash. Editing an asset revokes its previous publication approval. Render video from approved clips using a worker; record missing footage rather than inventing demonstrations.

Acceptance: preview and export all assets from one real product; verify PDF/video output, captions and product facts; no content claims unsupported results.

### Release D — direct Etsy publication

Implement a dedicated Etsy adapter using the seller's registered app and OAuth credentials stored as secrets.

Sequence:

1. Check tested release, original-design record, approved price/listing and final PDF/image checksums.
2. Create a digital `download` draft; upload customer files and actual product/preview images.
3. Read back the listing and attachments; show Ivana the exact publish preview including price/currency and applicable charges where known.
4. Record a verified, single-use publication approval for that shop, listing and asset version.
5. A narrow publication worker sets the reviewed draft to `active`.
6. Read back the remote state and save the live URL. A timeout is an unknown outcome until reconciled; do not blindly create another listing.

Keep publication authority out of free-form model inputs. Expose prepare/status operations to Hermes and consume the verified approval in the controlled publisher. Revoked credentials, stale assets, reused approvals or mismatched shop/version must fail closed.

Acceptance: contract tests and simulated failures first; then one specifically approved live listing, correct download and price, duplicate requests producing no duplicate publication, and an operator procedure for deactivation/corrections.

Etsy confirms digital listings use `createDraftListing` with type `download`, `uploadListingFile`, and publication via `updateListing` with state `active`: https://developers.etsy.com/documentation/tutorials/listings/ . Recheck the official API contract at implementation time.

### Release E — blog publication and launch coordination

Select one existing blog platform before writing its adapter. Shopify was mentioned as a future shop; it is a possible destination, not a confirmed configured service. Do not build multiple CMS integrations initially.

Build provider operations for draft creation, preview, publication, readback and updates. Save CMS post IDs so retries update the same post. Use separate content approval for each version. Publish the approved Etsy listing first, insert its verified URL into the blog, show the final blog preview and obtain final approval, then publish.

Track channel status independently: Etsy can be live while the blog awaits approval or retry. A blog failure must not create another Etsy listing. Report partial success with links and a precise next action.

Social content initially exports as ready-to-post files/captions. Automatic social posting requires a chosen platform, permissions and a separate adapter; it is not assumed by content generation.

Acceptance: one approved blog post is publicly reachable, images and Etsy link work, retry cannot duplicate the post, and corrections require a new content approval.

### Release F — monitored pilot

Before regular commercial use, verify backups/restoration, process supervision, request/upload limits, secret handling, operational alerts and model spending limits. Record actions with project/version/actor/result without logging secrets or raw private media.

Run one complete original design from Telegram intake to tested pattern, content previews and explicitly approved Etsy/blog publication. Track actual making time, model cost, support time, failed steps and correction rate. Expand sizes and product types only after evidence supports them.

## Architecture and delivery locations

| Component | Repository location / responsibility |
|---|---|
| Hermes instructions and MCP setup | `hermes/` — concise operating rules and tool registration |
| API and business gates | `service/src/` — authorization, validation, project/version state |
| Persistence | `service/migrations/` and repository adapters — durable project and job records |
| Pattern contracts/checks | `agent/schemas/`, `agent/tools/` — structured pattern and deterministic validation |
| Reference knowledge | `knowledge/` — curated material/stitch references and templates |
| Output workers | Add within `service/` as needed for PDF, video and publication jobs |
| Provider adapters | Separate Etsy and selected CMS adapters with mocked contract tests |
| Progress | `SYSTEM_ROADMAP.md` — evidence-backed delivery status |

Persist long jobs with queued/running/needs-review/failed/succeeded states. Return a job ID promptly to Telegram and allow status retrieval. Use idempotency keys for external writes and reconcile ambiguous outcomes.

## Decisions and access needed at their relevant stage

- Now: implement Release A using local/test fixtures and the existing repo.
- Before live integration: Hermes host access/configuration, verified owner IDs, database and storage deployment settings.
- Before pattern generation: one exact frame, material/gauge, original design and terminology preference from Ivana.
- Before publishing adapters: confirm blog platform/domain and Etsy seller app/shop access.
- Before live publication: Ivana's price and explicit approval of the final listing and blog previews.

No delivery-date estimate is committed until infrastructure access and the first tested physical pattern are available. Software work and Ivana's making/testing proceed alongside each other.

## Completion definition

The system is complete for the first product when Ivana can operate the full workflow through Telegram, resume it after a restart, produce a physically tested pattern and content package, approve exact versions, and receive verified live Etsy and blog URLs without manually copying listing/post contents. Physical manufacture and approval remain human activities.
