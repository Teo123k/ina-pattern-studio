import { z } from "zod";
import { ToolError } from "../domain/errors.mjs";

const positiveNumber = z.number().finite().positive();
const nonBlankText = z.string().trim().min(1);

export const MAX_FIT_TOLERANCE_PERCENT = 10;

export const confirmedMeasurementFields = {
  diameterCm: positiveNumber,
  heightCm: positiveNumber,
  fittingDescription: nonBlankText,
  yarnIdentity: nonBlankText,
  hookMm: positiveNumber,
  gaugeStitchesPer10Cm: positiveNumber,
  gaugeRowsPer10Cm: positiveNumber,
  motifRepeatStitches: z.number().finite().int().positive()
};

export const confirmedMeasurementsSchema = z.object(confirmedMeasurementFields).strict();
export const intakeMeasurementsSchema = confirmedMeasurementsSchema.partial().strict();
export const constructionValidationSchema = z.object({
  measurementVersion: z.number().int().nonnegative(),
  fitTolerancePercent: z.number().finite().positive().max(MAX_FIT_TOLERANCE_PERCENT)
}).strict();
export const measurementFieldNames = Object.freeze(Object.keys(confirmedMeasurementFields));

function parseMeasurements(schema, measurements, message) {
  const parsed = schema.safeParse(measurements);
  if (!parsed.success) {
    throw new ToolError("invalid_measurements", message, 400, {
      issues: parsed.error.issues.map(({ path, message: issue }) => ({ path: path.join("."), message: issue }))
    });
  }
  return parsed.data;
}

export function parseIntakeMeasurements(measurements) {
  return parseMeasurements(intakeMeasurementsSchema, measurements, "Measurements must use supported fields with positive numeric centimetre/mm values.");
}

export function parseConfirmedMeasurements(measurements) {
  return parseMeasurements(confirmedMeasurementsSchema, measurements, "Confirmed measurements must include all required positive numeric centimetre/mm values and nonblank text fields.");
}

export function parseConstructionValidation(specification) {
  return parseMeasurements(constructionValidationSchema, specification, `Construction validation requires a confirmed measurement version and an explicit fit tolerance between 0 and ${MAX_FIT_TOLERANCE_PERCENT} percent.`);
}
