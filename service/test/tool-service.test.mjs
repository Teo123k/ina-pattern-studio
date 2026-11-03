import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InaToolService } from "../src/app/tool-service.mjs";
import { MemoryRepository } from "../src/adapters/memory-repository.mjs";
import { LocalObjectStore } from "../src/adapters/local-object-store.mjs";
import { TransactionOutcomeUnknownError } from "../src/domain/errors.mjs";

async function makeService() {
  return new InaToolService({
    repository: new MemoryRepository(),
    objectStore: new LocalObjectStore(await mkdtemp(join(tmpdir(), "ina-tool-service-"))),
    allowedTelegramIds: ["101"],
    approvalSecret: "test-approval-secret",
    now: () => "2026-11-03T10:00:00.000Z"
  });
}

async function createProject(service) {
  return service.call("create_project_from_telegram", {
    bot_id: "ina-test", chat_id: "chat-101", message_id: "m-1", sender_id: "101", text: "My lamp", attachments: [{ kind: "photo", content_base64: "aGVsbG8=" }]
  });
}

async function confirmMeasurements(service, projectId, { expectedVersion = 0, measurementVersion = 1, values = {} } = {}) {
  const confirmed_values = {
    diameterCm: 30,
    heightCm: 20,
    fittingDescription: "standard drum frame",
    yarnIdentity: "cotton DK",
    hookMm: 4,
    gaugeStitchesPer10Cm: 14,
    gaugeRowsPer10Cm: 10,
    motifRepeatStitches: 12,
    ...values
  };
  const approval = await service.call("prepare_approval", { project_id: projectId, operation: "confirm_measurements", subject: { project_id: projectId, expected_measurement_version: expectedVersion, measurement_version: measurementVersion, confirmed_values } });
  await service.approve_gateway_callback({ project_id: projectId, callback_data: approval.callback_data, actor_id: "101", chat_id: "chat-101" });
  return service.call("save_measurements", {
    project_id: projectId,
    expected_measurement_version: expectedVersion,
    measurement_version: measurementVersion,
    approval_id: approval.approval_id,
    confirmed_values
  });
}

test("creates an internal project and deduplicates Telegram delivery", async () => {
  const service = await makeService();
  const first = await createProject(service);
  const second = await createProject(service);
  assert.match(first.project_id, /^INA-\d+$/);
  assert.equal(second.duplicate, true);
  assert.equal(second.project_id, first.project_id);
});

test("consumes only one verified owner approval for the exact action", async () => {
  const service = await makeService();
  const project = await createProject(service);
  const values = { diameterCm: 30, heightCm: 20, fittingDescription: "frame", yarnIdentity: "cotton", hookMm: 4, gaugeStitchesPer10Cm: 14, gaugeRowsPer10Cm: 10, motifRepeatStitches: 12 };
  const prepared = await service.call("prepare_approval", { project_id: project.project_id, operation: "confirm_measurements", subject: { project_id: project.project_id, expected_measurement_version: 0, measurement_version: 1, confirmed_values: values } });
  await assert.rejects(() => service.approve_gateway_callback({ project_id: project.project_id, callback_data: prepared.callback_data, actor_id: "999", chat_id: "chat-101" }), { code: "approval_actor_mismatch" });
  await service.approve_gateway_callback({ project_id: project.project_id, callback_data: prepared.callback_data, actor_id: "101", chat_id: "chat-101" });
  await assert.rejects(() => service.call("save_measurements", { project_id: project.project_id, expected_measurement_version: 0, measurement_version: 1, confirmed_values: { ...values, heightCm: 21 }, approval_id: prepared.approval_id }), { code: "approval_mismatch" });
  await service.call("save_measurements", { project_id: project.project_id, expected_measurement_version: 0, measurement_version: 1, confirmed_values: values, approval_id: prepared.approval_id });
  await assert.rejects(() => service.call("save_measurements", { project_id: project.project_id, expected_measurement_version: 1, measurement_version: 2, confirmed_values: values, approval_id: prepared.approval_id }), { code: "approval_required" });
});

test("stores provided measurements as unconfirmed and reports missing height", async () => {
  const service = await makeService();
  const result = await service.call("create_project_from_telegram", {
    bot_id: "ina-test", chat_id: "chat-101", message_id: "m-measurements",
    sender_id: "101",
    text: "Diameter 30 cm",
    measurements: { diameterCm: 30 },
    attachments: [{ kind: "photo", content_base64: "aGVsbG8=" }]
  });
  assert.equal(result.measurement_confirmation_required, true);
  assert.deepEqual(result.missing_fields, ["heightCm", "fittingDescription", "yarnIdentity", "hookMm", "gaugeStitchesPer10Cm", "gaugeRowsPer10Cm", "motifRepeatStitches"]);
  const project = await service.call("get_project", { project_id: result.project_id });
  assert.equal(project.measurements.confirmed, false);
  assert.equal(project.measurements.status, "UNCONFIRMED");
  assert.equal(project.measurements.values.diameterCm, 30);
});

test("cleans up staged object-store references when attachment storage fails", async () => {
  const repository = new MemoryRepository();
  const stored = [];
  const objectStore = {
    async store(input) {
      if (input.kind === "sketch") throw new Error("object storage unavailable");
      const reference = { storageKey: `${input.projectId}/${input.messageId}/${input.kind}`, checksum: "checksum" };
      stored.push(reference);
      return reference;
    },
    async remove(reference) {
      stored.splice(stored.findIndex((item) => item.storageKey === reference.storageKey), 1);
    }
  };
  const service = new InaToolService({ repository, objectStore, allowedTelegramIds: ["101"] });
  await assert.rejects(() => service.call("create_project_from_telegram", {
    bot_id: "ina-test", chat_id: "chat-101", message_id: "m-storage-failure",
    sender_id: "101",
    attachments: [{ kind: "photo", content_base64: "aA==" }, { kind: "sketch", content_base64: "eA==" }]
  }), /object storage unavailable/);
  assert.equal(repository.projects.size, 0);
  assert.equal(repository.telegramEvents.size, 0);
  assert.equal(repository.assets.size, 0);
  assert.equal(stored.length, 0);
});

test("preserves staged media when the database commit outcome is unknown", async () => {
  const staged = [];
  const objectStore = {
    async store() {
      const asset = { storageKey: "staged-photo", checksum: "checksum" };
      staged.push(asset);
      return asset;
    },
    async remove(asset) {
      staged.splice(staged.indexOf(asset), 1);
    }
  };
  const repository = {
    async createIntake() {
      throw new TransactionOutcomeUnknownError("Transaction commit outcome is unknown.", new Error("connection lost"));
    }
  };
  const service = new InaToolService({ repository, objectStore, allowedTelegramIds: ["101"] });
  await assert.rejects(() => createProject(service), TransactionOutcomeUnknownError);
  assert.equal(staged.length, 1);
});

test("rejects malformed or incomplete confirmed measurements without changing project state", async () => {
  const invalidCases = [
    { label: "missing row gauge", values: { diameterCm: 30, heightCm: 20, fittingDescription: "frame", yarnIdentity: "cotton", hookMm: 4, gaugeStitchesPer10Cm: 14, motifRepeatStitches: 12 } },
    { label: "zero diameter", values: { diameterCm: 0, heightCm: 20, fittingDescription: "frame", yarnIdentity: "cotton", hookMm: 4, gaugeStitchesPer10Cm: 14, gaugeRowsPer10Cm: 10, motifRepeatStitches: 12 } },
    { label: "negative hook", values: { diameterCm: 30, heightCm: 20, fittingDescription: "frame", yarnIdentity: "cotton", hookMm: -4, gaugeStitchesPer10Cm: 14, gaugeRowsPer10Cm: 10, motifRepeatStitches: 12 } },
    { label: "numeric string", values: { diameterCm: "30", heightCm: 20, fittingDescription: "frame", yarnIdentity: "cotton", hookMm: 4, gaugeStitchesPer10Cm: 14, gaugeRowsPer10Cm: 10, motifRepeatStitches: 12 } },
    { label: "blank fitting", values: { diameterCm: 30, heightCm: 20, fittingDescription: "   ", yarnIdentity: "cotton", hookMm: 4, gaugeStitchesPer10Cm: 14, gaugeRowsPer10Cm: 10, motifRepeatStitches: 12 } },
    { label: "non-finite gauge", values: { diameterCm: 30, heightCm: 20, fittingDescription: "frame", yarnIdentity: "cotton", hookMm: 4, gaugeStitchesPer10Cm: Infinity, gaugeRowsPer10Cm: 10, motifRepeatStitches: 12 } },
    { label: "unknown field", values: { diameterCm: 30, heightCm: 20, fittingDescription: "frame", yarnIdentity: "cotton", hookMm: 4, gaugeStitchesPer10Cm: 14, gaugeRowsPer10Cm: 10, motifRepeatStitches: 12, guessed: true } }
  ];
  for (const { label, values } of invalidCases) {
    const service = await makeService();
    const project = await createProject(service);
    await assert.rejects(
      () => service.call("save_measurements", { project_id: project.project_id, expected_measurement_version: 0, measurement_version: 1, confirmed_by: "ivana", confirmed_values: values }),
      { code: "invalid_measurements" },
      label
    );
    const saved = await service.call("get_project", { project_id: project.project_id });
    assert.equal(saved.state, "brief", label);
    assert.equal(saved.measurements.confirmed, false, label);
  }
});

test("rejects unsupported or non-numeric partial intake measurements", async () => {
  const service = await makeService();
  const input = { bot_id: "ina-test", chat_id: "chat-101", message_id: "m-invalid-intake", sender_id: "101", attachments: [{ kind: "photo", content_base64: "aGVsbG8=" }] };
  await assert.rejects(() => service.call("create_project_from_telegram", { ...input, measurements: { diameterCm: "30" } }), { code: "invalid_measurements" });
  await assert.rejects(() => service.call("create_project_from_telegram", { ...input, measurements: { unknown: 1 } }), { code: "invalid_measurements" });
});

test("rejects a non-allowlisted Telegram sender", async () => {
  const service = await makeService();
  await assert.rejects(() => service.call("create_project_from_telegram", { bot_id: "ina-test", chat_id: "chat-999", message_id: "m-2", sender_id: "999", attachments: [{ kind: "photo" }] }), { code: "sender_not_allowed" });
});

test("blocks construction validation until measurements are confirmed", async () => {
  const service = await makeService();
  const project = await createProject(service);
  await assert.rejects(() => service.call("validate_pattern", { project_id: project.project_id, construction_spec: { measurementVersion: 0, fitTolerancePercent: 3 } }), { code: "needs_measurement" });
});

test("rejects an incompatible stitch repeat and permits a valid pattern draft", async () => {
  const service = await makeService();
  const project = await createProject(service);
  await confirmMeasurements(service, project.project_id, { values: { motifRepeatStitches: 37 } });
  const failed = await service.call("validate_pattern", { project_id: project.project_id, construction_spec: { measurementVersion: 1, fitTolerancePercent: 0.1 } });
  assert.equal(failed.valid, false);
  await confirmMeasurements(service, project.project_id, { expectedVersion: 1, measurementVersion: 2, values: { motifRepeatStitches: 12 } });
  const passed = await service.call("validate_pattern", { project_id: project.project_id, construction_spec: { measurementVersion: 2, fitTolerancePercent: 3 } });
  assert.equal(passed.valid, true);
  const saved = await service.call("save_pattern_draft", { project_id: project.project_id, pattern_version: "1.0", validation_id: passed.validation_id, draft: { title: "First lampshade", steps: [] } });
  assert.equal(saved.currentPattern.status, "not_for_sale");
});

test("holds release and Etsy draft creation until all evidence is present", async () => {
  const service = await makeService();
  const project = await createProject(service);
  await confirmMeasurements(service, project.project_id);
  const validation = await service.call("validate_pattern", { project_id: project.project_id, construction_spec: { measurementVersion: 1, fitTolerancePercent: 3 } });
  await service.call("save_pattern_draft", { project_id: project.project_id, pattern_version: "1.0", validation_id: validation.validation_id, draft: { steps: [] } });
  const blocked = await service.call("check_release_gate", { project_id: project.project_id, pattern_version: "1.0" });
  assert.equal(blocked.valid, false);
  await assert.rejects(() => service.call("create_etsy_draft", { project_id: project.project_id, pattern_version: "1.0", listing_payload: { type: "download" } }), { code: "release_gate_blocked" });
});

test("refuses tools outside the explicit allowlist", async () => {
  const service = await makeService();
  await assert.rejects(() => service.call("publish_etsy_listing", {}), { code: "tool_not_allowed" });
});

test("binds validations and pattern drafts to the current immutable measurement version", async () => {
  const service = await makeService();
  const project = await createProject(service);
  await confirmMeasurements(service, project.project_id);
  const versionOneValidation = await service.call("validate_pattern", { project_id: project.project_id, construction_spec: { measurementVersion: 1, fitTolerancePercent: 3 } });
  await assert.rejects(
    () => service.call("validate_pattern", { project_id: project.project_id, construction_spec: { measurementVersion: 1, fitTolerancePercent: 3, motifRepeatStitches: 6 } }),
    { code: "invalid_measurements" }
  );
  await assert.rejects(
    () => service.call("validate_pattern", { project_id: project.project_id, construction_spec: { measurementVersion: 1, fitTolerancePercent: 11 } }),
    { code: "invalid_measurements" }
  );
  await confirmMeasurements(service, project.project_id, { expectedVersion: 1, measurementVersion: 2, values: { heightCm: 22 } });
  const afterChange = await service.call("get_project", { project_id: project.project_id });
  assert.equal(afterChange.measurements.version, 2);
  assert.equal(afterChange.measurements.history.length, 2);
  assert.equal(afterChange.measurements.history[0].values.heightCm, 20);
  assert.equal(afterChange.latestValidation, null);
  await assert.rejects(
    () => service.call("save_pattern_draft", { project_id: project.project_id, pattern_version: "1.0", validation_id: versionOneValidation.validation_id, draft: { steps: [] } }),
    { code: "validation_required" }
  );
  await assert.rejects(
    () => service.call("save_measurements", { project_id: project.project_id, expected_measurement_version: 1, measurement_version: 3, confirmed_by: "ivana", confirmed_values: afterChange.measurements.values }),
    { code: "measurement_version_conflict" }
  );
});
