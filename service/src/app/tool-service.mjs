import { createHash, randomUUID } from "node:crypto";
import { ToolError, requireValue } from "../domain/errors.mjs";
import { assertPatternCanBeSaved, compactProject, createProject, releaseGate, validateConstruction } from "../domain/project.mjs";
import { measurementFieldNames, parseConfirmedMeasurements, parseConstructionValidation, parseIntakeMeasurements } from "../contracts/measurement-schema.mjs";

const allowedTools = new Set([
  "create_project_from_telegram", "get_project", "save_measurements", "find_material_options", "save_material_selection", "validate_pattern", "save_pattern_draft", "create_tester_pack", "record_tester_feedback", "check_release_gate", "create_etsy_draft"
]);

export class InaToolService {
  constructor({ repository, objectStore, allowedTelegramIds = [], now = () => new Date().toISOString(), etsyEnabled = false }) {
    this.repository = repository;
    this.objectStore = objectStore;
    this.allowedTelegramIds = new Set(allowedTelegramIds.map(String));
    this.now = now;
    this.etsyEnabled = etsyEnabled;
  }

  async call(toolName, input) {
    if (!allowedTools.has(toolName)) throw new ToolError("tool_not_allowed", `Tool ${toolName} is not allowed.`, 403);
    return this[toolName](input);
  }

  async create_project_from_telegram(input = {}) {
    requireValue(input && typeof input === "object" && !Array.isArray(input), "invalid_payload", "Telegram intake payload must be an object.");
    const { message_id, sender_id, text = "", attachments = [], measurements = {} } = input;
    requireValue(message_id, "invalid_message", "message_id is required.");
    requireValue(this.allowedTelegramIds.has(String(sender_id)), "sender_not_allowed", "This Telegram account is not allowed to use INA.");
    const existing = await this.repository.findTelegramEvent(message_id);
    if (existing) return { ...existing.result, duplicate: true };
    requireValue(Array.isArray(attachments) && attachments.length > 0, "missing_attachment", "At least one source attachment is required.");
    const parsedMeasurements = parseIntakeMeasurements(measurements);
    const projectId = `INA-${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const now = this.now();
    const storedAssets = [];
    try {
      for (const attachment of attachments) {
        requireValue(attachment && typeof attachment === "object" && !Array.isArray(attachment), "invalid_attachment", "Each attachment must be an object.");
        requireValue(["photo", "sketch", "pdf", "video"].includes(attachment.kind), "invalid_attachment", "Attachment kind must be photo, sketch, pdf or video.");
        const stored = await this.objectStore.store({ projectId, messageId: message_id, kind: attachment.kind, contentBase64: attachment.content_base64 });
        storedAssets.push({ id: randomUUID(), projectId, messageId: String(message_id), kind: attachment.kind, ...stored, createdAt: now });
      }
      for (const asset of storedAssets) await this.repository.storeAsset(asset);
      const project = createProject({ projectId, ownerTelegramId: sender_id, text, attachments: storedAssets, measurements: parsedMeasurements, now });
      await this.repository.saveProject(project, "project_created", String(sender_id));
      const missingFields = measurementFieldNames.filter((key) => parsedMeasurements[key] === undefined);
      const result = {
        project_id: projectId,
        state: project.state,
        measurement_confirmation_required: true,
        missing_fields: missingFields,
        next_allowed_action: "Confirm frame dimensions, fitting, gauge and motif repeat."
      };
      await this.repository.saveTelegramEvent(message_id, { result, senderId: String(sender_id), checksum: createHash("sha256").update(JSON.stringify({ text, attachments, measurements: parsedMeasurements })).digest("hex"), receivedAt: now });
      return result;
    } catch (error) {
      if (typeof this.objectStore.remove === "function") {
        for (const asset of storedAssets) await this.objectStore.remove(asset);
      }
      throw error;
    }
  }

  async get_project({ project_id }) {
    return compactProject(await this.repository.getProject(project_id));
  }

  async save_measurements({ project_id, expected_measurement_version, measurement_version, confirmed_values, confirmed_by }) {
    const project = await this.repository.getProject(project_id);
    requireValue(confirmed_by === "ivana", "approval_required", "Measurements must be confirmed by Ivana.", { confirmed_by });
    requireValue(expected_measurement_version === project.measurements.version, "measurement_version_conflict", "expected_measurement_version must match the current version.", { expected: project.measurements.version });
    requireValue(measurement_version === project.measurements.version + 1, "measurement_version_conflict", "measurement_version must be exactly one greater than the current version.", { expected: project.measurements.version + 1 });
    const parsedMeasurements = parseConfirmedMeasurements(confirmed_values);
    const confirmedAt = this.now();
    const measurementRecord = { version: measurement_version, status: "CONFIRMED", confirmed: true, values: structuredClone(parsedMeasurements), confirmedBy: "ivana", confirmedAt };
    project.measurements = { ...measurementRecord, history: [...(project.measurements.history ?? []), structuredClone(measurementRecord)] };
    if (project.latestValidation) project.validationHistory = [...(project.validationHistory ?? []), structuredClone(project.latestValidation)];
    project.latestValidation = null;
    project.release = { ivanaApproval: false, finalPdfPath: null, etsyDraftReviewed: false };
    project.state = "construction";
    await this.repository.saveProject(project, "measurements_confirmed", "ivana");
    return compactProject(project);
  }

  async find_material_options({ project_id }) {
    const project = await this.repository.getProject(project_id);
    return { project_id, state: project.state, options: await this.repository.listMaterials(), next_allowed_action: "Ivana selects a recorded material option or adds source-backed material data." };
  }

  async save_material_selection({ project_id, material_option_id, approved_by }) {
    const project = await this.repository.getProject(project_id);
    requireValue(approved_by === "ivana", "approval_required", "Material selection requires Ivana approval.");
    const materials = await this.repository.listMaterials();
    const option = materials.find((material) => material.id === material_option_id);
    requireValue(option, "material_not_found", "Material option was not found.");
    project.material = { id: option.id, selectedBy: "ivana", selectedAt: this.now() };
    await this.repository.saveProject(project, "material_selected", "ivana");
    return compactProject(project);
  }

  async validate_pattern({ project_id, construction_spec }) {
    const project = await this.repository.getProject(project_id);
    const parsedSpecification = parseConstructionValidation(construction_spec);
    const result = validateConstruction(project, parsedSpecification);
    const validation = { id: randomUUID(), ...result, measurementVersion: project.measurements.version, specification: parsedSpecification, validatedAt: this.now() };
    if (project.latestValidation) project.validationHistory = [...(project.validationHistory ?? []), structuredClone(project.latestValidation)];
    project.latestValidation = validation;
    if (result.valid) project.state = "construction";
    await this.repository.saveProject(project, result.valid ? "pattern_validated" : "pattern_validation_failed", "system");
    return { project_id, state: project.state, validation_id: validation.id, ...result, next_allowed_action: result.valid ? "Save a not-for-sale pattern draft using this validation ID." : "Adjust the construction and validate again." };
  }

  async save_pattern_draft({ project_id, pattern_version, validation_id, draft }) {
    const project = await this.repository.getProject(project_id);
    assertPatternCanBeSaved(project, pattern_version, validation_id);
    requireValue(draft && typeof draft === "object", "invalid_pattern_draft", "A structured pattern draft is required.");
    project.patterns.push({ version: pattern_version, status: "not_for_sale", validationId: validation_id, measurementVersion: project.measurements.version, draft: structuredClone(draft), createdAt: this.now() });
    project.state = "pattern_draft";
    await this.repository.saveProject(project, "pattern_draft_saved", "system");
    return compactProject(project);
  }

  async create_tester_pack({ project_id, pattern_version, approved_by }) {
    const project = await this.repository.getProject(project_id);
    requireValue(approved_by === "ivana", "approval_required", "Tester pack requires Ivana approval of the draft.");
    requireValue(project.patterns.some((pattern) => pattern.version === pattern_version), "pattern_not_found", "Pattern version was not found.");
    project.state = "prototype";
    await this.repository.saveProject(project, "tester_pack_created", "ivana");
    return { project_id, pattern_version, state: project.state, tester_pack_status: "created", next_allowed_action: "Log two Ivana prototypes, then collect independent tester feedback." };
  }

  async record_tester_feedback({ project_id, pattern_version, feedback }) {
    const project = await this.repository.getProject(project_id);
    requireValue(project.patterns.some((pattern) => pattern.version === pattern_version), "pattern_not_found", "Pattern version was not found.");
    requireValue(feedback && typeof feedback === "object", "invalid_feedback", "Structured tester feedback is required.");
    if (feedback.kind === "prototype" && feedback.completed === true) project.testing.prototypeCount += 1;
    if (feedback.kind === "tester" && feedback.completed === true) project.testing.testerCount += 1;
    if (Number.isInteger(feedback.criticalIssuesOpen)) project.testing.criticalIssuesOpen = feedback.criticalIssuesOpen;
    project.state = "tester_review";
    await this.repository.saveProject(project, "tester_feedback_recorded", feedback.kind ?? "tester");
    return compactProject(project);
  }

  async check_release_gate({ project_id, pattern_version, ivana_approval = false, final_pdf_path = null, etsy_draft_reviewed = false }) {
    const project = await this.repository.getProject(project_id);
    requireValue(project.patterns.some((pattern) => pattern.version === pattern_version), "pattern_not_found", "Pattern version was not found.");
    if (ivana_approval === true) project.release.ivanaApproval = true;
    if (final_pdf_path) project.release.finalPdfPath = final_pdf_path;
    if (etsy_draft_reviewed === true) project.release.etsyDraftReviewed = true;
    const gate = releaseGate(project);
    if (gate.valid) project.state = "approved";
    await this.repository.saveProject(project, gate.valid ? "release_approved" : "release_blocked", "ivana");
    return { project_id, pattern_version, state: project.state, ...gate, next_allowed_action: gate.valid ? "Create a reviewable Etsy digital draft." : "Provide the missing release evidence." };
  }

  async create_etsy_draft({ project_id, pattern_version, listing_payload }) {
    const project = await this.repository.getProject(project_id);
    const gate = releaseGate(project);
    requireValue(gate.valid && project.state === "approved", "release_gate_blocked", "Release evidence and Ivana approval are required before an Etsy draft.", gate);
    requireValue(listing_payload?.type === "download", "invalid_listing_type", "Only digital download listings are allowed.");
    requireValue(listing_payload?.pdf_path === project.release.finalPdfPath, "invalid_listing_pdf", "Listing must use the approved final PDF version.");
    if (!this.etsyEnabled) throw new ToolError("etsy_not_configured", "Etsy adapter is intentionally disabled until OAuth credentials and a reviewed draft adapter are configured.", 503);
    project.state = "etsy_draft_created";
    await this.repository.saveProject(project, "etsy_draft_created", "system");
    return { project_id, pattern_version, state: project.state, etsy_state: "draft", next_allowed_action: "Ivana reviews the Etsy draft. Publication is unavailable." };
  }
}
