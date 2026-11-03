import { z } from "zod";
import { confirmedMeasurementsSchema, constructionValidationSchema, intakeMeasurementsSchema } from "./measurement-schema.mjs";

const attachment = z.object({
  kind: z.enum(["photo", "sketch", "pdf", "video"]),
  content_base64: z.string().optional()
});

const record = z.record(z.string(), z.unknown());
const approval = z.object({ approval_id: z.string().uuid() });

export const toolDefinitions = [
  {
    name: "create_project_from_telegram",
    description: "Create a brief-stage INA project from an allowlisted Telegram message after original attachments have been downloaded.",
    schema: { bot_id: z.string().min(1), chat_id: z.string().min(1), message_id: z.string().min(1), sender_id: z.string().min(1), text: z.string().optional(), attachments: z.array(attachment).min(1), measurements: intakeMeasurementsSchema.optional() }
  },
  { name: "get_project", description: "Return the compact current context for one INA project.", schema: { project_id: z.string().regex(/^INA-\d+$/) } },
  { name: "prepare_approval", description: "Prepare a one-time Ivana Telegram confirmation for an exact project action. This does not approve or execute the action.", schema: { project_id: z.string().regex(/^INA-\d+$/), operation: z.enum(["confirm_measurements", "select_material", "create_tester_pack", "approve_release"]), subject: record } },
  {
    name: "save_measurements",
    description: "Save Ivana-confirmed construction measurements as the next immutable version.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), expected_measurement_version: z.number().int().nonnegative(), measurement_version: z.number().int().positive(), confirmed_values: confirmedMeasurementsSchema, approval_id: approval.shape.approval_id }
  },
  { name: "find_material_options", description: "List source-backed material options for a project.", schema: { project_id: z.string().regex(/^INA-\d+$/) } },
  {
    name: "save_material_selection",
    description: "Record Ivana's selection of an existing material option.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), material_option_id: z.string().min(1), approval_id: approval.shape.approval_id }
  },
  {
    name: "validate_pattern",
    description: "Run deterministic stitch-repeat validation against confirmed measurements.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), construction_spec: constructionValidationSchema }
  },
  {
    name: "save_pattern_draft",
    description: "Save a validator-approved, not-for-sale pattern draft.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/), validation_id: z.string().uuid(), draft: record }
  },
  {
    name: "create_tester_pack",
    description: "Create a tester-pack record only after Ivana approves the draft version.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/), approval_id: approval.shape.approval_id }
  },
  {
    name: "record_tester_feedback",
    description: "Record structured prototype or independent tester feedback for one pattern version.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/), feedback: record }
  },
  {
    name: "check_release_gate",
    description: "Evaluate release evidence and report exactly what remains blocked.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/) }
  },
  {
    name: "create_etsy_draft",
    description: "Create a reviewable digital Etsy draft only after all release gates pass. It cannot publish a listing.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/), listing_payload: record }
  }
];
