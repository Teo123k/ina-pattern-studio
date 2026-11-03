import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { InaToolService } from "../src/app/tool-service.mjs";
import { LocalObjectStore } from "../src/adapters/local-object-store.mjs";
import { PostgresRepository } from "../src/adapters/postgres-repository.mjs";
import { createProject } from "../src/domain/project.mjs";
import { runMigrations } from "../src/migrate.mjs";

const connectionString = process.env.INA_TEST_DATABASE_URL;

async function makeService() {
  return new InaToolService({
    repository: new PostgresRepository(connectionString),
    objectStore: new LocalObjectStore(await mkdtemp(join(tmpdir(), "ina-postgres-test-"))),
    allowedTelegramIds: ["101"],
    now: () => "2026-11-03T10:00:00.000Z"
  });
}

function intake(messageId, text = "My lamp") {
  return { bot_id: "ina-test", chat_id: "chat-101", message_id: messageId, sender_id: "101", text, attachments: [{ kind: "photo", content_base64: "aGVsbG8=" }] };
}

async function counts(pool) {
  const result = await pool.query("SELECT (SELECT count(*) FROM projects)::int AS projects, (SELECT count(*) FROM source_assets)::int AS assets, (SELECT count(*) FROM telegram_events)::int AS events, (SELECT count(*) FROM project_events)::int AS audit");
  return result.rows[0];
}

test("PostgreSQL intake is atomic and versioned under concurrent deliveries", { skip: !connectionString }, async () => {
  const databaseName = new URL(connectionString).pathname.replace(/^\//, "");
  assert.match(databaseName, /_test$/, "INA_TEST_DATABASE_URL must point at a disposable *_test database");
  await runMigrations({ connectionString });
  const pool = new pg.Pool({ connectionString });
  await pool.query("TRUNCATE project_events, source_assets, telegram_events, projects RESTART IDENTITY CASCADE");
  const first = await makeService();
  const second = await makeService();
  try {
    const [one, two] = await Promise.all([first.call("create_project_from_telegram", intake("same-message")), second.call("create_project_from_telegram", intake("same-message"))]);
    assert.equal([one, two].filter((result) => result.duplicate).length, 1);
    assert.deepEqual(await counts(pool), { projects: 1, assets: 1, events: 1, audit: 1 });
    const created = one.duplicate ? two : one;
    await assert.rejects(() => first.call("create_project_from_telegram", intake("same-message", "Changed payload")), { code: "telegram_event_conflict" });
    assert.deepEqual(await counts(pool), { projects: 1, assets: 1, events: 1, audit: 1 });

    const repository = new PostgresRepository(connectionString);
    const rollbackProject = createProject({ projectId: "INA-rollback", ownerTelegramId: "101", text: "rollback", attachments: [], now: "2026-11-03T10:00:00.000Z" });
    await assert.rejects(() => repository.createIntake({
      project: rollbackProject,
      assets: [
        { id: "asset-a", projectId: rollbackProject.id, messageId: "rollback", kind: "photo", storageKey: "duplicate-key" },
        { id: "asset-b", projectId: rollbackProject.id, messageId: "rollback", kind: "photo", storageKey: "duplicate-key" }
      ],
      telegramEvent: { botId: "ina-test", chatId: "chat-101", messageId: "rollback", senderId: "101", checksum: "rollback", result: { project_id: rollbackProject.id }, receivedAt: "2026-11-03T10:00:00.000Z" }
    }));
    await repository.close();
    assert.deepEqual(await counts(pool), { projects: 1, assets: 1, events: 1, audit: 1 });

    const measurement = { project_id: created.project_id, expected_measurement_version: 0, measurement_version: 1, confirmed_by: "ivana", confirmed_values: { diameterCm: 30, heightCm: 20, fittingDescription: "frame", yarnIdentity: "cotton", hookMm: 4, gaugeStitchesPer10Cm: 14, gaugeRowsPer10Cm: 10, motifRepeatStitches: 12 } };
    const updates = await Promise.allSettled([first.call("save_measurements", measurement), second.call("save_measurements", measurement)]);
    assert.equal(updates.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(updates.filter((result) => result.status === "rejected" && ["concurrent_update", "measurement_version_conflict"].includes(result.reason.code)).length, 1);

    await first.repository.close();
    const restarted = new PostgresRepository(connectionString);
    const persisted = await restarted.getProject(created.project_id);
    assert.equal(persisted.measurements.version, 1);
    assert.equal(persisted.revision, 1);
    await restarted.close();
  } finally {
    await second.repository.close();
    await pool.end();
  }
});
