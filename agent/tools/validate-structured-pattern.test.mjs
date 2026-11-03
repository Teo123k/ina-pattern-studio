import test from "node:test";
import assert from "node:assert/strict";
import { validateStructuredPattern } from "./validate-structured-pattern.mjs";

const valid = { title: "Shell shade", frame: { diameterCm: 30, heightCm: 20, fittingDescription: "Drum frame with top ring" }, materials: { yarn: "Cotton DK", hookMm: 4, gauge: "14 stitches x 10 rows" }, repeat: { stitches: 12, count: 10 }, rows: [{ number: 1, instruction: "Ch 2, work 12 dc around.", stitchCount: 12, operations: ["ch", "dc"] }], finishing: "Fasten off and weave in ends." };

test("accepts the supported structured pattern fixture", () => assert.equal(validateStructuredPattern(valid).status, "not_for_sale"));
test("rejects empty rows, bad counts and unsupported operations", () => {
  assert.throws(() => validateStructuredPattern({ ...valid, rows: [] }), { code: "invalid_pattern_draft" });
  assert.throws(() => validateStructuredPattern({ ...valid, rows: [{ ...valid.rows[0], stitchCount: 0 }] }), { code: "invalid_pattern_draft" });
  assert.throws(() => validateStructuredPattern({ ...valid, rows: [{ ...valid.rows[0], operations: ["bobble"] }] }), { code: "unsupported_pattern_operation" });
});
