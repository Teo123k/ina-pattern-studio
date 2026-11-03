import { z } from "zod";
import { confirmedMeasurementsSchema, intakeMeasurementsSchema } from "./measurement-schema.mjs";

const attachment = z.object({
  kind: z.enum(["photo", "sketch", "pdf", "video"]),
  content_base64: z.string().optional()
});

const record = z.record(z.string(), z.unknown());

export const toolDefinitions = [
  {
    name: "create_project_from_telegram",
    description: "Create a brief-stage INA project from an allowlisted Telegram message after original attachments have been downloaded.",
    schema: { message_id: z.string().min(1), sender_id: z.string().min(1), text: z.string().optional(), attachments: z.array(attachment).min(1), measurements: intakeMeasurementsSchema.optional() }
  },
  { name: "get_project", description: "Return the compact current context for one INA project.", schema: { project_id: z.string().regex(/^INA-\d+$/) } },
  {
    name: "save_measurements",
    description: "Save Ivana-confirmed construction measurements as the next immutable version.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), measurement_version: z.number().int().positive(), confirmed_values: confirmedMeasurementsSchema, confirmed_by: z.literal("ivana") }
  },
  { name: "find_material_options", description: "List source-backed material options for a project.", schema: { project_id: z.string().regex(/^INA-\d+$/) } },
  {
    name: "save_material_selection",
    description: "Record Ivana's selection of an existing material option.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), material_option_id: z.string().min(1), approved_by: z.literal("ivana") }
  },
  {
    name: "validate_pattern",
    description: "Run deterministic stitch-repeat validation against confirmed measurements.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), construction_spec: record }
  },
  {
    name: "save_pattern_draft",
    description: "Save a validator-approved, not-for-sale pattern draft.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/), draft: record }
  },
  {
    name: "create_tester_pack",
    description: "Create a tester-pack record only after Ivana approves the draft version.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/), approved_by: z.literal("ivana") }
  },
  {
    name: "record_tester_feedback",
    description: "Record structured prototype or independent tester feedback for one pattern version.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/), feedback: record }
  },
  {
    name: "check_release_gate",
    description: "Evaluate release evidence and report exactly what remains blocked.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/), ivana_approval: z.boolean().optional(), final_pdf_path: z.string().optional(), etsy_draft_reviewed: z.boolean().optional() }
  },
  {
    name: "create_etsy_draft",
    description: "Create a reviewable digital Etsy draft only after all release gates pass. It cannot publish a listing.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/), listing_payload: record }
  }
];
