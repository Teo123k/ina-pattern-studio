import { validatePatternConstruction, validateReleaseGate } from "../../../agent/tools/validate-pattern.mjs";
import { ToolError, requireValue } from "./errors.mjs";

export const PROJECT_STATES = new Set([
  "brief", "construction", "pattern_draft", "prototype", "tester_review", "release_candidate", "approved", "etsy_draft_created"
]);

export function createProject({ projectId, ownerTelegramId, text, attachments, measurements = {}, now }) {
  return {
    id: projectId,
    state: "brief",
    ownerTelegramId: String(ownerTelegramId),
    createdAt: now,
    updatedAt: now,
    source: { text: text ?? "", attachments },
    measurements: { version: 0, status: "UNCONFIRMED", confirmed: false, values: structuredClone(measurements) },
    material: null,
    latestValidation: null,
    patterns: [],
    testing: { prototypeCount: 0, testerCount: 0, criticalIssuesOpen: 0 },
    release: { ivanaApproval: false, finalPdfPath: null, etsyDraftReviewed: false },
    audit: []
  };
}

export function assertConfirmedConstruction(project) {
  const values = project.measurements?.values ?? {};
  const missing = ["diameterCm", "heightCm", "fittingDescription", "gaugeStitchesPer10Cm", "motifRepeatStitches"]
    .filter((key) => values[key] === undefined || values[key] === null || values[key] === "");
  if (!project.measurements?.confirmed || missing.length) {
    throw new ToolError("needs_measurement", "Confirmed frame dimensions, fitting, gauge and motif repeat are required.", 409, { missing });
  }
  return values;
}

export function validateConstruction(project, specification) {
  const values = assertConfirmedConstruction(project);
  const result = validatePatternConstruction({
    frameDiameterCm: specification.frameDiameterCm ?? values.diameterCm,
    gaugeStitchesPer10Cm: specification.gaugeStitchesPer10Cm ?? values.gaugeStitchesPer10Cm,
    motifRepeatStitches: specification.motifRepeatStitches ?? values.motifRepeatStitches,
    fitTolerancePercent: specification.fitTolerancePercent ?? 2
  });
  return result;
}

export function assertPatternCanBeSaved(project, version) {
  requireValue(project.latestValidation?.valid === true, "validation_required", "A passing deterministic construction validation is required.");
  requireValue(typeof version === "string" && /^\d+\.\d+$/.test(version), "invalid_pattern_version", "Pattern version must use major.minor form, for example 1.0.");
  requireValue(!project.patterns.some((pattern) => pattern.version === version), "duplicate_pattern_version", "Pattern version already exists.");
}

export function releaseGate(project) {
  return validateReleaseGate({
    ivanaApproval: project.release.ivanaApproval,
    prototypeCount: project.testing.prototypeCount,
    testerCount: project.testing.testerCount,
    criticalIssuesOpen: project.testing.criticalIssuesOpen,
    finalPdfPath: project.release.finalPdfPath,
    etsyDraftReviewed: project.release.etsyDraftReviewed
  });
}

export function compactProject(project) {
  return {
    projectId: project.id,
    state: project.state,
    measurements: project.measurements,
    material: project.material,
    latestValidation: project.latestValidation,
    currentPattern: project.patterns.at(-1) ?? null,
    testing: project.testing,
    release: project.release,
    nextAllowedAction: nextAllowedAction(project)
  };
}

export function nextAllowedAction(project) {
  if (!project.measurements.confirmed) return "Confirm frame dimensions, fitting, gauge and motif repeat.";
  if (!project.latestValidation?.valid) return "Validate the selected construction.";
  if (!project.patterns.length) return "Save a not-for-sale pattern draft.";
  if (project.testing.prototypeCount < 2) return "Log two Ivana prototypes.";
  if (project.testing.testerCount < 3) return "Record three completed independent tester makes.";
  if (project.testing.criticalIssuesOpen !== 0) return "Resolve critical tester issues.";
  if (!project.release.ivanaApproval) return "Record Ivana's final approval.";
  return "Review the digital Etsy draft data before draft creation.";
}
