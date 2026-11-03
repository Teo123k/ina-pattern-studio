import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { ToolError, TransactionOutcomeUnknownError, requireValue } from "../domain/errors.mjs";
import { assertPatternCanBeSaved, compactProject, createProject, releaseGate, validateConstruction } from "../domain/project.mjs";
import { measurementFieldNames, parseConfirmedMeasurements, parseConstructionValidation, parseIntakeMeasurements } from "../contracts/measurement-schema.mjs";
import { MockConceptAdapter } from "../adapters/concept-adapter.mjs";
import { renderPatternPdf } from "../render/pattern-pdf.mjs";
import { validateEditDecision } from "../video/edit-decision.mjs";
import { validateStructuredPattern } from "../../../agent/tools/validate-structured-pattern.mjs";

const allowedTools = new Set([
    "create_project_from_telegram", "get_project", "list_projects", "select_project", "resume_project", "enqueue_job", "get_job", "cancel_job", "prepare_approval", "save_measurements", "find_material_options", "add_material_option", "save_material_selection", "generate_concepts", "select_concept", "validate_pattern", "save_pattern_draft", "render_pattern_pdf", "get_pattern_pdf", "create_tester_pack", "record_tester_feedback", "check_release_gate", "approve_release", "generate_content_package", "revise_content_asset", "prepare_video_edit", "create_etsy_draft", "publish_etsy_listing"
]);

export class InaToolService {
  constructor({ repository, objectStore, allowedTelegramIds = [], now = () => new Date().toISOString(), etsyEnabled = false, etsyAdapter = null, approvalSecret, conceptAdapter = new MockConceptAdapter({ now }) }) {
    this.repository = repository;
    this.objectStore = objectStore;
    this.allowedTelegramIds = new Set(allowedTelegramIds.map(String));
    this.now = now;
    this.etsyEnabled = etsyEnabled;
    this.etsyAdapter = etsyAdapter;
    this.approvalSecret = approvalSecret ?? null;
    this.conceptAdapter = conceptAdapter;
  }

  async call(toolName, input) {
    if (!allowedTools.has(toolName)) throw new ToolError("tool_not_allowed", `Tool ${toolName} is not allowed.`, 403);
    return this[toolName](input);
  }

  async create_project_from_telegram(input = {}) {
    requireValue(input && typeof input === "object" && !Array.isArray(input), "invalid_payload", "Telegram intake payload must be an object.");
    const { bot_id, chat_id, message_id, sender_id, text = "", attachments = [], measurements = {} } = input;
    requireValue(typeof bot_id === "string" && bot_id.trim(), "invalid_message", "bot_id is required.");
    requireValue(typeof chat_id === "string" && chat_id.trim(), "invalid_message", "chat_id is required.");
    requireValue(message_id, "invalid_message", "message_id is required.");
    requireValue(this.allowedTelegramIds.has(String(sender_id)), "sender_not_allowed", "This Telegram account is not allowed to use INA.");
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
      const project = createProject({ projectId, ownerTelegramId: sender_id, ownerChatId: chat_id, text, attachments: storedAssets, measurements: parsedMeasurements, now });
      const missingFields = measurementFieldNames.filter((key) => parsedMeasurements[key] === undefined);
      const result = {
        project_id: projectId,
        state: project.state,
        measurement_confirmation_required: true,
        missing_fields: missingFields,
        next_allowed_action: "Confirm frame dimensions, fitting, gauge and motif repeat."
      };
      const intake = await this.repository.createIntake({
        project,
        assets: storedAssets,
        actor: String(sender_id),
        telegramEvent: {
          botId: bot_id,
          chatId: chat_id,
          messageId: String(message_id),
          result,
          senderId: String(sender_id),
          checksum: createHash("sha256").update(JSON.stringify({ text, attachments, measurements: parsedMeasurements })).digest("hex"),
          receivedAt: now
        }
      });
      if (!intake.created) {
        await removeStagedAssets(this.objectStore, storedAssets);
        return { ...intake.result, duplicate: true };
      }
      if (typeof this.repository.setActiveProject === "function") await this.repository.setActiveProject(chat_id, projectId);
      return intake.result;
    } catch (error) {
      if (!(error instanceof TransactionOutcomeUnknownError)) await removeStagedAssets(this.objectStore, storedAssets);
      throw error;
    }
  }

  async get_project({ project_id }) {
    return compactProject(await this.repository.getProject(project_id));
  }

  async list_projects({ chat_id }) {
    const projects = await this.repository.listProjectsByChat(chat_id);
    return { chat_id: String(chat_id), projects: projects.map((project) => ({ project_id: project.id, state: project.state, updated_at: project.updatedAt, next_action: project.measurements?.confirmed ? "Continue the current project." : "Confirm measurements." })) };
  }

  async select_project({ chat_id, project_id }) {
    const project = await this.repository.setActiveProject(chat_id, project_id);
    return { project_id: project.id, state: project.state, selected: true, next_action: project.measurements?.confirmed ? "Continue the current project." : "Confirm measurements." };
  }

  async resume_project({ chat_id }) {
    const project = await this.repository.getActiveProject(chat_id);
    if (!project) return { chat_id: String(chat_id), selected: false, next_action: "Choose a project or send /new with a source image." };
    return { project_id: project.id, state: project.state, selected: true, next_action: project.measurements?.confirmed ? "Continue the current project." : "Confirm measurements." };
  }

  async enqueue_job({ idempotency_key, kind, payload = {}, max_attempts = 3 }) {
    requireValue(typeof idempotency_key === "string" && idempotency_key.length <= 200, "invalid_job", "A bounded idempotency key is required.");
    requireValue(typeof kind === "string" && kind.length <= 100, "invalid_job", "A bounded job kind is required.");
    requireValue(Number.isInteger(max_attempts) && max_attempts > 0 && max_attempts <= 5, "invalid_job", "max_attempts must be between 1 and 5.");
    return this.repository.enqueueJob({ id: randomUUID(), idempotencyKey: idempotency_key, kind, payload, maxAttempts: max_attempts });
  }

  async get_job({ job_id }) { return this.repository.getJob(job_id); }
  async cancel_job({ job_id }) { return this.repository.cancelJob(job_id); }

  async prepare_approval({ project_id, operation, subject }) {
    requireValue(this.approvalSecret, "approval_not_configured", "Approval callbacks are not configured.", undefined);
    const project = await this.repository.getProject(project_id);
    requireValue(["confirm_measurements", "select_material", "select_concept", "create_tester_pack", "approve_release", "publish_etsy"].includes(operation), "invalid_approval_operation", "This action cannot be confirmed through an approval callback.");
    const subjectHash = hash(subject);
    const challenge = { id: randomUUID(), operation, subjectHash, actorId: project.ownerTelegramId, chatId: project.ownerChatId, expiresAt: new Date(Date.parse(this.now()) + 15 * 60_000).toISOString(), status: "pending", createdAt: this.now() };
    project.approvalChallenges = [...(project.approvalChallenges ?? []), challenge];
    await this.repository.saveProject(project, "approval_prepared", "system");
    return { project_id, approval_id: challenge.id, expires_at: challenge.expiresAt, callback_data: callbackData(project_id, challenge.id, this.approvalSecret), next_allowed_action: "Ivana must confirm this exact action in Telegram." };
  }

  async approve_gateway_callback({ project_id, callback_data, actor_id, chat_id }) {
    requireValue(this.approvalSecret, "approval_not_configured", "Approval callbacks are not configured.");
    const project = await this.repository.getProject(project_id);
    const challengeId = verifiedCallbackId(project_id, callback_data, this.approvalSecret);
    const challenge = project.approvalChallenges?.find((item) => item.id === challengeId);
    requireValue(challenge, "approval_not_found", "Approval request was not found.");
    requireValue(challenge.status === "pending", "approval_replayed", "Approval request has already been used.");
    requireValue(Date.parse(challenge.expiresAt) >= Date.parse(this.now()), "approval_expired", "Approval request has expired.");
    requireValue(String(actor_id) === project.ownerTelegramId && String(chat_id) === project.ownerChatId, "approval_actor_mismatch", "Only Ivana can confirm this project action.");
    challenge.status = "approved";
    challenge.approvedAt = this.now();
    await this.repository.saveProject(project, "approval_confirmed", String(actor_id));
    return { project_id, approval_id: challenge.id, operation: challenge.operation, approved: true };
  }

  async save_measurements({ project_id, expected_measurement_version, measurement_version, confirmed_values, approval_id }) {
    const project = await this.repository.getProject(project_id);
    requireValue(expected_measurement_version === project.measurements.version, "measurement_version_conflict", "expected_measurement_version must match the current version.", { expected: project.measurements.version });
    requireValue(measurement_version === project.measurements.version + 1, "measurement_version_conflict", "measurement_version must be exactly one greater than the current version.", { expected: project.measurements.version + 1 });
    const parsedMeasurements = parseConfirmedMeasurements(confirmed_values);
    consumeApproval(project, approval_id, "confirm_measurements", { project_id, expected_measurement_version, measurement_version, confirmed_values }, this.now());
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
    const options = (await this.repository.listMaterials()).slice(0, 3);
    return { project_id, state: project.state, options, next_allowed_action: options.length ? "Ivana selects a recorded material option or adds source-backed material data." : "No source-backed materials are recorded yet. Add a yarn source and check it before selecting." };
  }

  async add_material_option(input) {
    const material = { id: input.id, supplier: input.supplier, product: input.product, sourceUrl: input.source_url, sourceCheckedAt: input.checked_at, fibre: input.fibre, gramsPerBall: input.grams_per_ball, metresPerBall: input.metres_per_ball, hookGuidance: input.hook_guidance, cost: input.cost, currency: input.currency, availability: input.availability, prototypeObservations: input.prototype_observations ?? null, evidenceStatus: "source_recorded" };
    await this.repository.addMaterial(material);
    return material;
  }

  async generate_concepts({ project_id, provenance, skill_level, visual_direction, avoid = [] }) {
    const project = await this.repository.getProject(project_id);
    requireValue(project.measurements?.confirmed, "needs_measurement", "Confirm measurements before generating concepts.");
    requireValue(project.material?.snapshot, "needs_material", "Select a source-backed material before generating concepts.");
    const generated = await this.conceptAdapter.generate({ brief: { projectId: project_id, provenance, skillLevel: skill_level, visualDirection: visual_direction, avoid, frame: project.measurements.values, material: project.material.snapshot } });
    project.concepts = [...(project.concepts ?? []), { version: (project.concepts?.length ?? 0) + 1, provenance, skillLevel: skill_level, visualDirection: visual_direction, generated, createdAt: this.now() }];
    project.state = "concept_review";
    await this.repository.saveProject(project, "concepts_generated", "system");
    return { project_id, state: project.state, concept_version: project.concepts.at(-1).version, ...generated, next_allowed_action: "Ivana selects one concept for construction." };
  }

  async select_concept({ project_id, concept_id, approval_id }) {
    const project = await this.repository.getProject(project_id);
    const version = project.concepts?.at(-1);
    requireValue(version?.generated?.concepts?.some((concept) => concept.id === concept_id), "concept_not_found", "Concept was not found in the current concept version.");
    consumeApproval(project, approval_id, "select_concept", { project_id, concept_id }, this.now());
    project.selectedConcept = { version: version.version, conceptId: concept_id, selectedAt: this.now(), status: "verified" };
    project.state = "construction";
    await this.repository.saveProject(project, "concept_selected", "ivana");
    return compactProject(project);
  }

  async save_material_selection({ project_id, material_option_id, approval_id }) {
    const project = await this.repository.getProject(project_id);
    consumeApproval(project, approval_id, "select_material", { project_id, material_option_id }, this.now());
    const materials = await this.repository.listMaterials();
    const option = materials.find((material) => material.id === material_option_id);
    requireValue(option, "material_not_found", "Material option was not found.");
    const changedMaterial = project.material?.id !== option.id;
    project.material = { id: option.id, version: option.sourceCheckedAt ?? option.source_checked_at, snapshot: structuredClone(option), selectedBy: "ivana", selectedAt: this.now() };
    if (changedMaterial) {
      project.latestValidation = null;
      project.release = { ivanaApproval: false, finalPdfPath: null, etsyDraftReviewed: false };
    }
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
    const validatedDraft = validateStructuredPattern(draft);
    project.patterns.push({ version: pattern_version, status: "not_for_sale", validationId: validation_id, measurementVersion: project.measurements.version, draft: validatedDraft, createdAt: this.now() });
    project.state = "pattern_draft";
    await this.repository.saveProject(project, "pattern_draft_saved", "system");
    return compactProject(project);
  }

  async render_pattern_pdf({ project_id, pattern_version }) {
    const project = await this.repository.getProject(project_id);
    const pattern = project.patterns.find((item) => item.version === pattern_version);
    requireValue(pattern, "pattern_not_found", "Pattern version was not found.");
    const bytes = renderPatternPdf({ project, pattern });
    const stored = await this.objectStore.store({ projectId: project_id, messageId: `pattern-${pattern_version}`, kind: "pdf", contentBase64: bytes.toString("base64") });
    pattern.pdfPath = stored.storageKey; pattern.pdfChecksum = stored.checksum; pattern.artifactLabel = "TESTER DRAFT";
    await this.repository.saveProject(project, "pattern_pdf_rendered", "system");
    return { project_id, pattern_version, artifact_path: stored.storageKey, checksum: stored.checksum, label: "TESTER DRAFT", next_allowed_action: "Download the tester draft and report corrections." };
  }

  async get_pattern_pdf({ project_id, pattern_version }) {
    const project = await this.repository.getProject(project_id);
    const pattern = project.patterns.find((item) => item.version === pattern_version);
    requireValue(pattern?.pdfPath, "pattern_pdf_not_found", "Render the pattern PDF before retrieving it.");
    requireValue(typeof this.objectStore.read === "function", "artifact_retrieval_unavailable", "Artifact retrieval is not configured.");
    return { project_id, pattern_version, content_base64: (await this.objectStore.read(pattern.pdfPath)).toString("base64"), checksum: pattern.pdfChecksum, label: pattern.artifactLabel };
  }

  async create_tester_pack({ project_id, pattern_version, approval_id }) {
    const project = await this.repository.getProject(project_id);
    consumeApproval(project, approval_id, "create_tester_pack", { project_id, pattern_version }, this.now());
    requireValue(project.patterns.some((pattern) => pattern.version === pattern_version), "pattern_not_found", "Pattern version was not found.");
    project.state = "prototype";
    await this.repository.saveProject(project, "tester_pack_created", "ivana");
    return { project_id, pattern_version, state: project.state, tester_pack_status: "created", next_allowed_action: "Log two Ivana prototypes, then collect independent tester feedback." };
  }

  async record_tester_feedback({ project_id, pattern_version, feedback }) {
    const project = await this.repository.getProject(project_id);
    requireValue(project.patterns.some((pattern) => pattern.version === pattern_version), "pattern_not_found", "Pattern version was not found.");
    requireValue(feedback && typeof feedback === "object", "invalid_feedback", "Structured tester feedback is required.");
    requireValue(["prototype", "tester"].includes(feedback.kind), "invalid_feedback", "Feedback kind must be prototype or tester.");
    requireValue(typeof feedback.maker_id === "string" && feedback.maker_id.trim(), "invalid_feedback", "A stable maker_id is required.");
    const duplicate = (project.testing.records ?? []).some((record) => record.patternVersion === pattern_version && record.makerId === feedback.maker_id && record.completed === true);
    requireValue(!duplicate, "duplicate_tester_feedback", "This maker's completed feedback is already recorded for this pattern version.");
    project.testing.records = [...(project.testing.records ?? []), { kind: feedback.kind, makerId: feedback.maker_id, patternVersion: pattern_version, completed: feedback.completed === true, actualGrams: feedback.actual_grams ?? null, actualMinutes: feedback.actual_minutes ?? null, photos: feedback.photos ?? [], issues: feedback.issues ?? [], notes: feedback.notes ?? "", recordedAt: this.now() }];
    project.state = "tester_review";
    await this.repository.saveProject(project, "tester_feedback_recorded", feedback.kind ?? "tester");
    return compactProject(project);
  }

  async check_release_gate({ project_id, pattern_version }) {
    const project = await this.repository.getProject(project_id);
    requireValue(project.patterns.some((pattern) => pattern.version === pattern_version), "pattern_not_found", "Pattern version was not found.");
    const gate = releaseGate(project);
    return { project_id, pattern_version, state: project.state, ...gate, next_allowed_action: gate.valid ? "Create a reviewable Etsy digital draft." : "Provide the missing release evidence." };
  }

  async approve_release({ project_id, pattern_version, final_pdf_path, pattern_hash, approval_id }) {
    const project = await this.repository.getProject(project_id);
    const pattern = project.patterns.find((item) => item.version === pattern_version);
    requireValue(pattern, "pattern_not_found", "Pattern version was not found.");
    requireValue(pattern.pdfPath === final_pdf_path && pattern.pdfChecksum, "invalid_release_artifact", "Release must name the rendered PDF artifact for this pattern version.");
    consumeApproval(project, approval_id, "approve_release", { project_id, pattern_version, final_pdf_path, pattern_hash }, this.now());
    requireValue(pattern_hash === hashValue(pattern.draft), "invalid_pattern_hash", "Release approval does not match the current pattern content.");
    const gate = releaseGate(project);
    requireValue(gate.valid, "release_gate_blocked", "Physical testing evidence is incomplete.", gate);
    project.release = { ivanaApproval: true, finalPdfPath: final_pdf_path, finalPatternHash: pattern_hash, etsyDraftReviewed: false };
    project.state = "approved";
    await this.repository.saveProject(project, "release_approved", "ivana");
    return { project_id, pattern_version, state: project.state, ...gate, approved: true };
  }

  async generate_content_package({ project_id, pattern_version, public_excerpt = "", owner_price, currency }) {
    const project = await this.repository.getProject(project_id);
    const pattern = project.patterns.find((item) => item.version === pattern_version);
    requireValue(pattern && project.release.ivanaApproval, "content_gate_blocked", "Content requires the approved pattern version.");
    requireValue(project.testing?.records?.length > 0, "content_gate_blocked", "Content requires actual making records.");
    const sourceReferences = { patternVersion: pattern_version, patternHash: project.release.finalPatternHash, makingRecordCount: project.testing.records.length };
    const packageVersion = (project.contentVersions?.length ?? 0) + 1;
    const facts = { title: pattern.draft.title, frame: pattern.draft.frame, materials: pattern.draft.materials, finishing: pattern.draft.finishing, price: owner_price ?? null, currency: currency ?? null };
    const content = {
      version: packageVersion,
      status: "draft",
      sourceReferences,
      blog: { title: `Making ${facts.title}`, seoTitle: `${facts.title} crochet lampshade pattern`, seoDescription: "A digital crochet pattern draft for a tested lampshade design.", headings: ["What you will make", "Materials and frame", "Making notes", "Download the pattern"], body: `This draft describes Ivana's ${facts.title}. The design was made and tested from the approved pattern version ${pattern_version}. Measurements and making observations are retained in the project record.`, altText: `Crochet lampshade based on ${facts.title}` },
      listing: { title: `${facts.title} digital crochet pattern`, description: "Digital download only. No finished lampshade, lamp base, bulb, frame or materials are supplied.", tags: ["crochet pattern", "lampshade pattern", "digital download"], price: facts.price, currency: facts.currency, pdfVersion: pattern_version },
      captions: [`A new ${facts.title} design is ready for a making preview.`, "Filming the texture, frame and finishing details.", "The tested digital pattern will be available after final review."],
      videoConcepts: [{ title: "From frame to texture", clips: ["finished reveal", "materials", "signature stitch", "attachment", "final detail"], durationSeconds: 120 }, { title: "One repeat explained", clips: ["swatch", "repeat close-up", "finishing", "room reveal"], durationSeconds: 120 }, { title: "What I learned making it", clips: ["prototype", "correction note", "final shade"], durationSeconds: 120 }],
      carousel: { slides: ["Finished design", "Frame and yarn", "Signature texture", "Making observation", "Digital pattern preview", "Review status"], altText: `Step-by-step preview of ${facts.title}` },
      schedule: Array.from({ length: 7 }, (_, index) => ({ day: index + 1, asset: ["blog", "captions", "carousel", "videoConcepts", "listing", "captions", "blog"][index], status: "suggested" }))
    };
    project.contentVersions = [...(project.contentVersions ?? []), content];
    await this.repository.saveProject(project, "content_package_generated", "system");
    return { project_id, content_version: packageVersion, status: "draft", ...content };
  }

  async revise_content_asset({ project_id, content_version, asset, instruction }) {
    const project = await this.repository.getProject(project_id);
    const content = project.contentVersions?.find((item) => item.version === content_version);
    requireValue(content, "content_not_found", "Content version was not found.");
    requireValue(Object.hasOwn(content, asset), "content_not_found", "Content asset was not found.");
    content[asset] = { ...content[asset], revisionInstruction: instruction, revisedAt: this.now() };
    content.status = "draft";
    await this.repository.saveProject(project, "content_asset_revised", "system");
    return { project_id, content_version, asset, status: "draft", sourceReferences: content.sourceReferences, result: content[asset] };
  }

  async prepare_video_edit({ project_id, pattern_version, clips, target_seconds = 120, tolerance_seconds = 5 }) {
    const project = await this.repository.getProject(project_id);
    requireValue(project.patterns.some((pattern) => pattern.version === pattern_version), "pattern_not_found", "Pattern version was not found.");
    const edit = validateEditDecision({ clips, targetSeconds: target_seconds, toleranceSeconds: tolerance_seconds });
    requireValue(edit.durationValid, "invalid_video_duration", "Clip timeline is outside the requested duration tolerance.", edit);
    const record = { id: randomUUID(), patternVersion: pattern_version, sourceIds: clips.map((clip) => clip.source_id), edit, status: "review_draft", createdAt: this.now() };
    project.videoEdits = [...(project.videoEdits ?? []), record];
    await this.repository.saveProject(project, "video_edit_prepared", "system");
    return { project_id, pattern_version, ...record };
  }

  async create_etsy_draft({ project_id, pattern_version, listing_payload }) {
    const project = await this.repository.getProject(project_id);
    const gate = releaseGate(project);
    requireValue(gate.valid && project.state === "approved", "release_gate_blocked", "Release evidence and Ivana approval are required before an Etsy draft.", gate);
    requireValue(listing_payload?.type === "download", "invalid_listing_type", "Only digital download listings are allowed.");
    requireValue(listing_payload?.pdf_path === project.release.finalPdfPath, "invalid_listing_pdf", "Listing must use the approved final PDF version.");
    if (!this.etsyEnabled || !this.etsyAdapter) throw new ToolError("etsy_not_configured", "Etsy adapter is disabled until OAuth credentials and a reviewed draft adapter are configured.", 503);
    requireValue(typeof this.objectStore.read === "function", "etsy_not_configured", "Approved PDF retrieval is not configured.", undefined);
    const etsyResult = await this.etsyAdapter.createDraft({ listing: listing_payload, pdfBytes: await this.objectStore.read(project.release.finalPdfPath), fileName: `${projectIdSafe(project.id)}-${pattern_version}.pdf` });
    project.etsyDraft = etsyResult;
    project.state = "etsy_draft_created";
    await this.repository.saveProject(project, "etsy_draft_created", "system");
    return { project_id, pattern_version, state: project.state, etsy_state: "draft", next_allowed_action: "Ivana reviews the Etsy draft. Publication is unavailable." };
  }

  async publish_etsy_listing({ project_id, pattern_version, listing_id, price, currency, approval_id }) {
    const project = await this.repository.getProject(project_id);
    const gate = releaseGate(project);
    requireValue(gate.valid && project.state === "etsy_draft_created", "publication_gate_blocked", "A reviewed Etsy draft and valid release evidence are required before publication.", gate);
    requireValue(project.etsyDraft?.listingId === String(listing_id), "etsy_listing_mismatch", "The requested Etsy listing is not the draft recorded for this project.");
    consumeApproval(project, approval_id, "publish_etsy", { project_id, pattern_version, listing_id: String(listing_id), price, currency, fingerprint: project.etsyDraft.fingerprint }, this.now());
    requireValue(this.etsyEnabled && this.etsyAdapter?.publishDraft, "etsy_not_configured", "Etsy publication is not configured.");
    const publication = await this.etsyAdapter.publishDraft({ listingId: String(listing_id), expectedPrice: price, expectedCurrency: currency });
    project.etsyPublication = { ...publication, patternVersion: pattern_version, publishedAt: this.now(), approvedBy: "ivana" };
    project.state = "published";
    await this.repository.saveProject(project, "etsy_published", "ivana");
    return { project_id, pattern_version, state: project.state, live_url: publication.liveUrl, listing_id: publication.listingId };
  }
}

function projectIdSafe(projectId) { return String(projectId).replace(/[^A-Za-z0-9_-]/g, "_"); }

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function hashValue(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

function callbackData(projectId, challengeId, secret) {
  const signature = createHmac("sha256", secret).update(`${projectId}:${challengeId}`).digest("hex").slice(0, 24);
  return `ina:${challengeId}:${signature}`;
}

function verifiedCallbackId(projectId, callbackDataValue, secret) {
  const match = /^ina:([0-9a-f-]{36}):([0-9a-f]{24})$/.exec(callbackDataValue ?? "");
  requireValue(match, "invalid_approval_callback", "Approval callback is invalid.");
  const expected = callbackData(projectId, match[1], secret);
  requireValue(timingSafeEqual(Buffer.from(expected), Buffer.from(callbackDataValue)), "invalid_approval_callback", "Approval callback is invalid.");
  return match[1];
}

function consumeApproval(project, approvalId, operation, subject, now) {
  const challenge = project.approvalChallenges?.find((item) => item.id === approvalId);
  requireValue(challenge, "approval_required", "A verified Ivana approval is required.");
  requireValue(challenge.status === "approved", "approval_required", "A verified Ivana approval is required.");
  requireValue(challenge.operation === operation && challenge.subjectHash === hash(subject), "approval_mismatch", "Approval does not match this exact action.");
  requireValue(Date.parse(challenge.expiresAt) >= Date.parse(now), "approval_expired", "Approval request has expired.");
  challenge.status = "consumed";
  challenge.consumedAt = now;
}

async function removeStagedAssets(objectStore, assets) {
  if (typeof objectStore.remove !== "function") return;
  for (const asset of assets) {
    try {
      await objectStore.remove(asset);
    } catch {
      // A database failure remains the useful error; cleanup can be retried from object-store lifecycle rules.
    }
  }
}
