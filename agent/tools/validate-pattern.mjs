const TAU = Math.PI;
export const MAX_FIT_TOLERANCE_PERCENT = 10;

/**
 * Finds an integer stitch count that works with a motif repeat while staying
 * inside the caller's explicitly chosen fit tolerance. Physical testing still
 * decides whether that tolerance produces an acceptable fit.
 */
export function validatePatternConstruction({
  frameDiameterCm,
  gaugeStitchesPer10Cm,
  motifRepeatStitches,
  fitTolerancePercent
}) {
  const values = { frameDiameterCm, gaugeStitchesPer10Cm, motifRepeatStitches, fitTolerancePercent };
  for (const [name, value] of Object.entries(values)) {
    if (!Number.isFinite(value) || value <= 0) {
      return { valid: false, errors: [`${name} must be a positive number.`] };
    }
  }
  if (!Number.isInteger(motifRepeatStitches)) {
    return { valid: false, errors: ["motifRepeatStitches must be an integer."] };
  }
  if (fitTolerancePercent > MAX_FIT_TOLERANCE_PERCENT) {
    return { valid: false, errors: [`fitTolerancePercent must not exceed ${MAX_FIT_TOLERANCE_PERCENT}.`] };
  }

  const circumferenceCm = TAU * frameDiameterCm;
  const targetStitches = circumferenceCm * gaugeStitchesPer10Cm / 10;
  const lowerBound = targetStitches * (1 - fitTolerancePercent / 100);
  const upperBound = targetStitches * (1 + fitTolerancePercent / 100);
  const candidates = [];

  const firstCandidate = Math.ceil(lowerBound);
  const lastCandidate = Math.floor(upperBound);
  if (lastCandidate - firstCandidate > 10000) {
    return { valid: false, errors: ["Fit tolerance creates too many candidate stitch counts."], measurements: { circumferenceCm, targetStitches, lowerBound, upperBound } };
  }
  for (let stitches = firstCandidate; stitches <= lastCandidate; stitches += 1) {
    if (stitches % motifRepeatStitches === 0) {
      candidates.push({
        stitchCount: stitches,
        repeats: stitches / motifRepeatStitches,
        variancePercent: (stitches - targetStitches) / targetStitches * 100
      });
    }
  }

  candidates.sort((a, b) => Math.abs(a.variancePercent) - Math.abs(b.variancePercent));
  if (candidates.length === 0) {
    return {
      valid: false,
      errors: ["No stitch count matches the motif repeat inside the stated fit tolerance."],
      measurements: { circumferenceCm, targetStitches, lowerBound, upperBound },
      adjustmentOptions: [
        "Use a different motif repeat.",
        "Make and measure a new gauge swatch.",
        "Change the target frame size.",
        "Specify a deliberately tested easing method."
      ]
    };
  }

  return {
    valid: true,
    measurements: { circumferenceCm, targetStitches, lowerBound, upperBound },
    selected: candidates[0],
    alternatives: candidates.slice(1)
  };
}

export function validateReleaseGate(release) {
  const errors = [];
  if (release.ivanaApproval !== true) errors.push("Ivana approval is required.");
  if (!Number.isInteger(release.prototypeCount) || release.prototypeCount < 2) errors.push("At least two completed prototypes are required.");
  if (!Number.isInteger(release.testerCount) || release.testerCount < 3) errors.push("At least three independent completed tester makes are required.");
  if (release.criticalIssuesOpen !== 0) errors.push("All critical tester issues must be resolved.");
  if (!release.finalPdfPath) errors.push("A final versioned PDF path is required.");
  if (release.etsyDraftReviewed !== true) errors.push("The Etsy draft must be reviewed before creation.");
  return { valid: errors.length === 0, errors };
}
