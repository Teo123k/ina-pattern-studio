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
  { name: "list_projects", description: "List projects belonging to one Telegram chat.", schema: { chat_id: z.string().min(1) } },
  { name: "select_project", description: "Select a project for the current Telegram chat.", schema: { chat_id: z.string().min(1), project_id: z.string().regex(/^INA-\d+$/) } },
  { name: "resume_project", description: "Resume the active project for a Telegram chat.", schema: { chat_id: z.string().min(1) } },
  { name: "enqueue_job", description: "Queue a retry-safe internal job with an idempotency key.", schema: { idempotency_key: z.string().min(1).max(200), kind: z.string().min(1).max(100), payload: record.optional(), max_attempts: z.number().int().min(1).max(5).optional() } },
  { name: "get_job", description: "Read the status of an internal job.", schema: { job_id: z.string().uuid() } },
  { name: "cancel_job", description: "Cancel a queued or running internal job.", schema: { job_id: z.string().uuid() } },
  { name: "prepare_approval", description: "Prepare a one-time Ivana Telegram confirmation for an exact project action. This does not approve or execute the action.", schema: { project_id: z.string().regex(/^INA-\d+$/), operation: z.enum(["confirm_measurements", "select_material", "select_concept", "create_tester_pack", "approve_release"]), subject: record } },
  {
    name: "save_measurements",
    description: "Save Ivana-confirmed construction measurements as the next immutable version.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), expected_measurement_version: z.number().int().nonnegative(), measurement_version: z.number().int().positive(), confirmed_values: confirmedMeasurementsSchema, approval_id: approval.shape.approval_id }
  },
  { name: "find_material_options", description: "List source-backed material options for a project.", schema: { project_id: z.string().regex(/^INA-\d+$/) } },
  { name: "add_material_option", description: "Store a source-backed material option with checked facts and prototype observations.", schema: { id: z.string().min(1), supplier: z.string().min(1), product: z.string().min(1), source_url: z.string().url(), checked_at: z.string().min(1), fibre: z.string().min(1), grams_per_ball: z.number().positive(), metres_per_ball: z.number().positive(), hook_guidance: z.string().min(1), cost: z.number().nonnegative(), currency: z.string().length(3), availability: z.string().min(1), prototype_observations: z.string().optional() } },
  { name: "generate_concepts", description: "Generate constrained, clearly labelled design concepts from confirmed project facts.", schema: { project_id: z.string().regex(/^INA-\d+$/), provenance: z.object({ is_original: z.literal(true), notes: z.string().min(20) }), skill_level: z.enum(["confident_beginner", "intermediate", "advanced"]), visual_direction: z.string().min(20), avoid: z.array(z.string()).default([]) } },
  { name: "select_concept", description: "Save Ivana's verified selection of one generated concept.", schema: { project_id: z.string().regex(/^INA-\d+$/), concept_id: z.string().min(1), approval_id: approval.shape.approval_id } },
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
  { name: "render_pattern_pdf", description: "Render a versioned tester PDF from a structured not-for-sale pattern draft.", schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/) } },
  { name: "get_pattern_pdf", description: "Retrieve the rendered tester PDF artifact for a fixed pattern version.", schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/) } },
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
    name: "approve_release",
    description: "Record Ivana's verified approval for the exact tested pattern PDF and hash.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/), final_pdf_path: z.string().min(1), pattern_hash: z.string().length(64), approval_id: approval.shape.approval_id }
  },
  { name: "generate_content_package", description: "Prepare reviewable blog, Etsy draft copy and social assets from an approved pattern and actual making records.", schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/), public_excerpt: z.string().max(500).optional(), owner_price: z.number().nonnegative().optional(), currency: z.string().length(3).optional() } },
  { name: "revise_content_asset", description: "Revise one generated content asset while preserving its source version and review status.", schema: { project_id: z.string().regex(/^INA-\d+$/), content_version: z.number().int().positive(), asset: z.enum(["blog", "listing", "captions", "video_concepts", "carousel"]), instruction: z.string().min(3).max(500) } },
  {
    name: "create_etsy_draft",
    description: "Create a reviewable digital Etsy draft only after all release gates pass. It cannot publish a listing.",
    schema: { project_id: z.string().regex(/^INA-\d+$/), pattern_version: z.string().regex(/^\d+\.\d+$/), listing_payload: record }
  }
];
