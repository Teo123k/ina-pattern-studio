import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InaToolService } from "../src/app/tool-service.mjs";
import { MemoryRepository } from "../src/adapters/memory-repository.mjs";
import { LocalObjectStore } from "../src/adapters/local-object-store.mjs";

async function makeService() {
  return new InaToolService({
    repository: new MemoryRepository(),
    objectStore: new LocalObjectStore(await mkdtemp(join(tmpdir(), "ina-tool-service-"))),
    allowedTelegramIds: ["101"],
    now: () => "2026-11-03T10:00:00.000Z"
  });
}

async function createProject(service) {
  return service.call("create_project_from_telegram", {
    message_id: "m-1", sender_id: "101", text: "My lamp", attachments: [{ kind: "photo", content_base64: "aGVsbG8=" }]
  });
}

async function confirmMeasurements(service, projectId) {
  return service.call("save_measurements", {
    project_id: projectId,
    measurement_version: 1,
    confirmed_by: "ivana",
    confirmed_values: { diameterCm: 30, heightCm: 20, fittingDescription: "standard drum frame", gaugeStitchesPer10Cm: 14, motifRepeatStitches: 12 }
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

test("rejects a non-allowlisted Telegram sender", async () => {
  const service = await makeService();
  await assert.rejects(() => service.call("create_project_from_telegram", { message_id: "m-2", sender_id: "999", attachments: [{ kind: "photo" }] }), { code: "sender_not_allowed" });
});

test("blocks construction validation until measurements are confirmed", async () => {
  const service = await makeService();
  const project = await createProject(service);
  await assert.rejects(() => service.call("validate_pattern", { project_id: project.project_id, construction_spec: {} }), { code: "needs_measurement" });
});

test("rejects an incompatible stitch repeat and permits a valid pattern draft", async () => {
  const service = await makeService();
  const project = await createProject(service);
  await confirmMeasurements(service, project.project_id);
  const failed = await service.call("validate_pattern", { project_id: project.project_id, construction_spec: { motifRepeatStitches: 37, fitTolerancePercent: 0.1 } });
  assert.equal(failed.valid, false);
  const passed = await service.call("validate_pattern", { project_id: project.project_id, construction_spec: {} });
  assert.equal(passed.valid, true);
  const saved = await service.call("save_pattern_draft", { project_id: project.project_id, pattern_version: "1.0", draft: { title: "First lampshade", steps: [] } });
  assert.equal(saved.currentPattern.status, "not_for_sale");
});

test("holds release and Etsy draft creation until all evidence is present", async () => {
  const service = await makeService();
  const project = await createProject(service);
  await confirmMeasurements(service, project.project_id);
  await service.call("validate_pattern", { project_id: project.project_id, construction_spec: {} });
  await service.call("save_pattern_draft", { project_id: project.project_id, pattern_version: "1.0", draft: { steps: [] } });
  const blocked = await service.call("check_release_gate", { project_id: project.project_id, pattern_version: "1.0" });
  assert.equal(blocked.valid, false);
  await assert.rejects(() => service.call("create_etsy_draft", { project_id: project.project_id, pattern_version: "1.0", listing_payload: { type: "download" } }), { code: "release_gate_blocked" });
});

test("refuses tools outside the explicit allowlist", async () => {
  const service = await makeService();
  await assert.rejects(() => service.call("publish_etsy_listing", {}), { code: "tool_not_allowed" });
});
