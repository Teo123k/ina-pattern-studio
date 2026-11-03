import { ToolError, requireValue } from "../domain/errors.mjs";

const requiredRoles = ["reveal", "materials", "signature_stitch", "attachment", "final_detail"];

export function validateEditDecision({ clips, targetSeconds = 120, toleranceSeconds = 5 }) {
  requireValue(Array.isArray(clips) && clips.length > 0, "invalid_video_edit", "At least one source clip is required.");
  const seenRoles = new Set();
  let total = 0;
  const timeline = clips.map((clip, index) => {
    requireValue(typeof clip.source_id === "string" && clip.source_id, "invalid_video_edit", "Each clip needs a source ID.");
    requireValue(Number.isFinite(clip.in_seconds) && Number.isFinite(clip.out_seconds) && clip.out_seconds > clip.in_seconds, "invalid_video_edit", "Clip ranges must be finite and increasing.");
    requireValue(typeof clip.role === "string", "invalid_video_edit", "Each clip needs a role.");
    seenRoles.add(clip.role); total += clip.out_seconds - clip.in_seconds;
    return { order: index + 1, ...clip };
  });
  const missingRoles = requiredRoles.filter((role) => !seenRoles.has(role));
  const durationValid = Math.abs(total - targetSeconds) <= toleranceSeconds;
  return { targetSeconds, toleranceSeconds, durationSeconds: Number(total.toFixed(2)), durationValid, missingRoles, label: missingRoles.length ? "HIGHLIGHTS - STEPS OMITTED" : "REVIEW DRAFT", timeline };
}
