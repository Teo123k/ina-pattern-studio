import { ToolError, requireValue } from "../../service/src/domain/errors.mjs";

export const SUPPORTED_OPERATIONS = new Set(["ch", "slst", "sc", "hdc", "dc", "tr", "shell", "inc", "dec"]);

export function validateStructuredPattern(draft) {
  requireValue(draft && typeof draft === "object" && !Array.isArray(draft), "invalid_pattern_draft", "A structured pattern draft is required.");
  requireValue(typeof draft.title === "string" && draft.title.trim(), "invalid_pattern_draft", "Pattern title is required.");
  requireValue(Array.isArray(draft.rows) && draft.rows.length > 0, "invalid_pattern_draft", "At least one numbered row or round is required.");
  requireValue(draft.materials && typeof draft.materials === "object", "invalid_pattern_draft", "Pattern materials are required.");
  requireValue(draft.frame && typeof draft.frame === "object", "invalid_pattern_draft", "Pattern frame dimensions are required.");
  requireValue(draft.repeat && Number.isInteger(draft.repeat.stitches) && draft.repeat.stitches > 0, "invalid_pattern_draft", "A positive stitch repeat is required.");
  let previousNumber = 0;
  for (const row of draft.rows) {
    requireValue(Number.isInteger(row.number) && row.number === previousNumber + 1, "invalid_pattern_draft", "Rows must be numbered consecutively.");
    requireValue(typeof row.instruction === "string" && row.instruction.trim(), "invalid_pattern_draft", "Each row needs a clear instruction.");
    requireValue(Number.isInteger(row.stitchCount) && row.stitchCount > 0, "invalid_pattern_draft", "Each row needs a positive stitch count.");
    for (const operation of row.operations ?? []) requireValue(SUPPORTED_OPERATIONS.has(operation), "unsupported_pattern_operation", `Unsupported crochet operation: ${operation}.`);
    previousNumber = row.number;
  }
  requireValue(typeof draft.finishing === "string" && draft.finishing.trim(), "invalid_pattern_draft", "Finishing instructions are required.");
  return structuredClone({ ...draft, status: "not_for_sale" });
}
