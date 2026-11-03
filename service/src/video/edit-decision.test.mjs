import test from "node:test";
import assert from "node:assert/strict";
import { validateEditDecision } from "./edit-decision.mjs";

const clips = [
  { source_id: "a", role: "reveal", in_seconds: 0, out_seconds: 5 },
  { source_id: "b", role: "materials", in_seconds: 0, out_seconds: 15 },
  { source_id: "c", role: "signature_stitch", in_seconds: 0, out_seconds: 65 },
  { source_id: "d", role: "attachment", in_seconds: 0, out_seconds: 25 },
  { source_id: "e", role: "final_detail", in_seconds: 0, out_seconds: 10 }
];

test("validates a two-minute edit decision list", () => {
  const edit = validateEditDecision({ clips });
  assert.equal(edit.durationValid, true);
  assert.deepEqual(edit.missingRoles, []);
});

test("rejects bad ranges and reports missing roles", () => {
  assert.throws(() => validateEditDecision({ clips: [{ source_id: "x", role: "reveal", in_seconds: 5, out_seconds: 5 }] }), { code: "invalid_video_edit" });
  const edit = validateEditDecision({ clips: clips.slice(0, 2), targetSeconds: 20 });
  assert.ok(edit.missingRoles.includes("attachment"));
});
