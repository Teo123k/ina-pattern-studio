import test from "node:test";
import assert from "node:assert/strict";
import { validatePatternConstruction, validateReleaseGate } from "./validate-pattern.mjs";

test("selects the nearest compatible stitch count", () => {
  const result = validatePatternConstruction({
    frameDiameterCm: 30,
    gaugeStitchesPer10Cm: 14,
    motifRepeatStitches: 12,
    fitTolerancePercent: 3
  });
  assert.equal(result.valid, true);
  assert.equal(result.selected.stitchCount % 12, 0);
});

test("rejects a construction without a compatible repeat", () => {
  const result = validatePatternConstruction({
    frameDiameterCm: 30,
    gaugeStitchesPer10Cm: 14,
    motifRepeatStitches: 37,
    fitTolerancePercent: 0.1
  });
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /No stitch count/);
});

test("holds a release until all evidence is complete", () => {
  const result = validateReleaseGate({
    ivanaApproval: true,
    prototypeCount: 2,
    testerCount: 2,
    criticalIssuesOpen: 0,
    finalPdfPath: "patterns/INA-01-v1.0.pdf",
    etsyDraftReviewed: true
  });
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /three independent/);
});

test("passes only a fully approved release", () => {
  const result = validateReleaseGate({
    ivanaApproval: true,
    prototypeCount: 2,
    testerCount: 3,
    criticalIssuesOpen: 0,
    finalPdfPath: "patterns/INA-01-v1.0.pdf",
    etsyDraftReviewed: true
  });
  assert.equal(result.valid, true);
});

test("requires an explicit bounded fit tolerance", () => {
  const missing = validatePatternConstruction({ frameDiameterCm: 30, gaugeStitchesPer10Cm: 14, motifRepeatStitches: 12 });
  const excessive = validatePatternConstruction({ frameDiameterCm: 30, gaugeStitchesPer10Cm: 14, motifRepeatStitches: 12, fitTolerancePercent: 11 });
  assert.equal(missing.valid, false);
  assert.match(missing.errors[0], /fitTolerancePercent/);
  assert.equal(excessive.valid, false);
  assert.match(excessive.errors[0], /must not exceed/);
});
