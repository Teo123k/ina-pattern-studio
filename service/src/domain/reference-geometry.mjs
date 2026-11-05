import { ToolError, requireValue } from "./errors.mjs";

export const PROPOSED_LIGHTING_SPEC = Object.freeze({
  status: "prototype_target_not_safety_certification",
  bulb: "low-heat LED only for prototyping",
  powerWatts: { minimum: 4, maximum: 8 },
  excludedBulbs: ["incandescent", "halogen"],
  airflowOpenTextilePercent: { minimum: 60, maximum: 70 },
  crochetWeightTargetGrams: null,
  completeShadeWeightTargetGrams: null,
  manufacturerRule: "Fixture and bulb instructions override these generic prototype targets.",
  testingRule: "Perform a supervised real-world temperature and airflow check before sale approval."
});

export function validateReferenceEvidence(evidence) {
  requireValue(evidence && typeof evidence === "object", "invalid_reference_evidence", "A structured image evidence report is required.");
  const classification = evidence.classification;
  requireValue(["high_confidence_conversion", "inferred_draft_only", "redesign_required"].includes(classification), "invalid_reference_evidence", "Reference classification is invalid.");
  requireValue(Array.isArray(evidence.observations) && evidence.observations.length > 0, "invalid_reference_evidence", "Observed visual evidence is required.");
  requireValue(Array.isArray(evidence.limitations), "invalid_reference_evidence", "Evidence limitations are required.");
  if (classification === "high_confidence_conversion") requireValue(["clear_crochet_object", "multiple_views", "visible_stitch_detail", "known_measurement", "visible_frame_and_attachment"].every((item) => evidence.observations.includes(item)), "insufficient_reference_evidence", "High-confidence conversion requires clear object, multiple views, stitch detail, measurement, frame and attachment evidence.");
  if (classification === "inferred_draft_only") requireValue(["clear_photo", "known_ring_size", "partially_visible_stitch_pattern"].every((item) => evidence.observations.includes(item)), "insufficient_reference_evidence", "An inferred draft requires a clear photo, known ring size and partially visible stitch pattern.");
  if (classification === "redesign_required") requireValue(typeof evidence.buildable_character === "string" && evidence.buildable_character.trim(), "invalid_reference_evidence", "A redesign must preserve a stated visual character without claiming an exact copy.");
  return structuredClone(evidence);
}

export function validateGeometrySpec(spec) {
  requireValue(spec && typeof spec === "object", "invalid_geometry", "Measured frame and bulb geometry is required.");
  const frame = spec.frame ?? {};
  const bulb = spec.bulb ?? {};
  for (const [name, value] of Object.entries({ topRingInnerDiameterCm: frame.topRingInnerDiameterCm, bottomRingInnerDiameterCm: frame.bottomRingInnerDiameterCm, shadeHeightCm: frame.shadeHeightCm, bulbMaxDiameterCm: bulb.maxDiameterCm })) requireValue(Number.isFinite(value) && value > 0, "invalid_geometry", `${name} must be a positive measured number.`);
  requireValue(Number.isFinite(bulb.radialOffsetCm) && bulb.radialOffsetCm >= 0, "invalid_geometry", "bulb.radialOffsetCm must be a measured non-negative number.");
  requireValue(Number.isFinite(bulb.topRelativeToTopRingCm), "invalid_geometry", "bulb.topRelativeToTopRingCm must be measured from the actual fitting and bulb position.");
  requireValue(frame.fittingDescription?.trim() && bulb.identity?.trim(), "invalid_geometry", "Actual fitting and bulb identity are required.");
  requireValue(spec.manufacturerInstructionsAcknowledged === true, "manufacturer_instructions_required", "Confirm that fixture and bulb manufacturer instructions override generic prototype targets.");
  const narrowestRadiusCm = Math.min(frame.topRingInnerDiameterCm, frame.bottomRingInnerDiameterCm) / 2;
  const sideClearanceCm = narrowestRadiusCm - (bulb.maxDiameterCm / 2) - bulb.radialOffsetCm;
  const topClearanceCm = Math.abs(bulb.topRelativeToTopRingCm);
  requireValue(sideClearanceCm > 0, "unusable_geometry", "The measured bulb does not fit inside the available ring geometry.", { sideClearanceCm });
  return { ...structuredClone(spec), calculated: { narrowestRadiusCm, sideClearanceCm, topClearanceCm }, lighting: { ...PROPOSED_LIGHTING_SPEC, crochetWeightTargetGrams: spec.crochetWeightTargetGrams ?? null, completeShadeWeightTargetGrams: spec.completeShadeWeightTargetGrams ?? null } };
}

export function assertDesignGeometryReady(project) {
  requireValue(project.referenceEvidence, "reference_evidence_required", "Create an image evidence and confidence report before designing.");
  requireValue(project.referenceEvidence.classification !== "redesign_required", "redesign_required", "The reference needs a buildable redesign concept before pattern work.", project.referenceEvidence);
  requireValue(project.geometry?.status === "CONFIRMED", "geometry_required", "Confirm actual ring, fitting and bulb geometry before pattern work.");
  return project.geometry;
}

export function lightingTestGate(project) {
  const check = project.testing?.lightingPrototypeCheck;
  if (!check?.supervised || !check?.manufacturerInstructionsFollowed || !check?.airflowObserved || !check?.temperatureObservation) return "A supervised real-world LED temperature and airflow check is required.";
  return null;
}
