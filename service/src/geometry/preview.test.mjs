import test from "node:test";
import assert from "node:assert/strict";
import { buildGeometryPreview } from "./preview.mjs";

test("produces a labelled GLB and deterministic aperture/clearance report", () => {
  const geometry = { version: 1, status: "CONFIRMED", frame: { topRingInnerDiameterCm: 14, bottomRingInnerDiameterCm: 20, shadeHeightCm: 18 }, bulb: { identity: "LED", maxDiameterCm: 6, heightCm: 10, radialOffsetCm: 0, topRelativeToTopRingCm: 2 }, calculated: { topClearanceCm: 2 }, lighting: { airflowOpenTextilePercent: { minimum: 60, maximum: 70 } } };
  const result = buildGeometryPreview({ geometry, geometryVersion: 1, surface: { stitchesAround: 72, rows: 20, rowHeightCm: 0.8, repeatStitches: 12, calibration: "swatch_calibrated", apertures: [{ widthCm: 0.5, heightCm: 0.8, count: 48 }] } });
  assert.equal(result.report.status, "CALIBRATED_DIGITAL_PROTOTYPE");
  assert.equal(result.report.clearanceMap[0].radialClearanceCm, 4);
  assert.equal(result.glb.subarray(0, 4).toString(), "glTF");
});
