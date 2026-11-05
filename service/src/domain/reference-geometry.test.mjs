import test from "node:test";
import assert from "node:assert/strict";
import { validateGeometrySpec, validateReferenceEvidence } from "./reference-geometry.mjs";

test("requires evidence before accepting high-confidence conversion", () => {
  assert.throws(() => validateReferenceEvidence({ classification: "high_confidence_conversion", observations: ["clear_crochet_object"], limitations: [] }), { code: "insufficient_reference_evidence" });
});

test("calculates clearance only from actual measured geometry", () => {
  const result = validateGeometrySpec({ frame: { topRingInnerDiameterCm: 14, bottomRingInnerDiameterCm: 20, shadeHeightCm: 18, fittingDescription: "centred E27 frame" }, bulb: { identity: "LED globe", maxDiameterCm: 6, radialOffsetCm: 0, topRelativeToTopRingCm: 2 }, manufacturerInstructionsAcknowledged: true });
  assert.equal(result.calculated.sideClearanceCm, 4);
  assert.equal(result.lighting.powerWatts.maximum, 8);
});
