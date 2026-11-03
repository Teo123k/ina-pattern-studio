# Ivana's Telegram experience

## Design rules

Ivana uses the existing Hermes Telegram chat. She should not need terminal commands, JSON, GitHub, database terminology or project IDs. Use friendly project names, preview links, downloadable files and short buttons. Keep internal IDs in stored metadata. Ask one missing question at a time; allow a message with several answers to be parsed and confirmed together.

Use deterministic menus/status messages. AI interprets ideas and writes drafts; code validates data, remembers progress and enforces approvals. Show at most three choices per prompt where practical. Preserve the active project across restarts; when multiple projects are possible, ask which project before saving an upload.

## Home

```text
Hi Ivana. What would you like to work on?
[New design] [My projects] [Help]
```

Project card:

```text
Soft Shell Shade
Stage: Ready for your gauge swatch
Next: Measure stitches and rows across 10 cm.
[Add measurements] [See instructions] [Back]
```

Persist the actual stage and next action in the service; do not let the model invent completed work. Commands may remain as an accessibility/debug fallback, not the normal maker interface.

## Conversation steps

| Screen | Prompt/output | Buttons and behavior |
|---|---|---|
| New design | Name, original sketch/photo, originality question | Save draft; continue later |
| Frame | Diameter, height, fitting, frame photo when useful | Confirm values; edit; explain measuring |
| Materials | Up to three documented options with trade-offs | Choose; enter my yarn; back |
| Gauge | Short swatch instructions; measured stitches/rows and hook | Add results; help; confirm |
| Design | Up to three labelled concepts | Select; request change; keep text concept |
| Pattern | Draft PDF plus materials and first step | Start making; download; report problem |
| Making | One understandable step at a time | Next; repeat; add note/photo; pause |
| Prototype | Actual usage/time and defects | Save build; revise pattern; start next build |
| Testers | Distinct tester records and pending issues | Add report; review issues; export tester pack |
| Release | Evidence summary and final PDF preview | Approve exact pattern; request changes |
| Content | Choose article/caption/carousel/video | Preview; revise this item; approve this version |
| Etsy | Listing preview with price/currency, digital file and images | Edit; approve publication; cancel |
| Blog | Final article preview containing actual Etsy link | Edit; approve publication; cancel |
| Results | Per-channel status and verified live URLs | Open listing; open blog; download social assets |

Buttons use opaque server-issued action references, expire, and are tied to actor/project/version. A callback must be verified by the gateway before it can record approval. Typing "approved_by: ivana" into chat or a model argument is never authorization.

## Content throughout making

Offer one filming/photo reminder at useful milestones: materials, swatch, signature stitch, attachment, finished detail. Let Ivana switch reminders off. Save her actual notes for later tips/troubleshooting.

WIP captions may say she is testing a design. Finished tutorials/sales copy use the approved pattern and evidence. Do not publish automatically because an upload looks finished.

## Long tasks, errors and pause

```text
I'm preparing your pattern preview. You can leave this chat.
[Check progress] [Cancel]
```

Completion shows an accessible artifact, not just "done". If storage/model/rendering fails, show the cause in plain language and a safe retry. Do not display stack traces or API keys. Cancellation before publication cancels queued work; after a confirmed remote publication, report the real state and offer an operator correction route rather than claiming it was undone.

Every project has Continue and Pause. Reopening it restores the last confirmed step. An expired button offers a fresh preview. Changing yarn, dimensions or pattern alerts Ivana that dependent checks/approvals need updating and preserves the previous version for reference.

## Launch flow

1. Show final Etsy preview; Ivana approves publication of that version.
2. Publish and verify Etsy. Return its live URL.
3. Insert that URL into the blog and show the final blog preview.
4. Ivana approves the blog; publish and verify it.
5. Deliver social/video assets for posting. Automatic social publishing is a later, separately configured integration.

If one channel fails, show which succeeded and retry only the failed channel. Never force Ivana to repeat the entire launch.

## Acceptance script

Have Ivana perform these without developer instructions:

1. Create a named project from a captioned photo and enter partial dimensions.
2. Close/reopen the chat and resume the correct question.
3. Correct a measurement; see that confirmation is requested again.
4. Select material/concept, download draft and follow making steps.
5. Report an issue with a photo; review a corrected pattern version.
6. Record real prototype/tester results and approve the release when eligible.
7. Preview a blog/caption/video and request one focused revision.
8. Review price/files/images and explicitly approve the specific Etsy listing.
9. Preview the blog with its live purchase link and explicitly approve it.
10. Retrieve the live URLs and social assets; recover from one staged failure without duplicate publication.

Record confusion, failed steps and observed results. Synthetic test evidence cannot substitute for real tester makes or live publication confirmation.
