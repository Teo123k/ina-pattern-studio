import pg from "pg";
import { ToolError } from "../domain/errors.mjs";

export class PostgresRepository {
  constructor(connectionString) {
    this.pool = new pg.Pool({ connectionString });
  }

  async getProject(id) {
    const result = await this.pool.query("SELECT data, revision FROM projects WHERE id = $1", [id]);
    if (!result.rowCount) throw new ToolError("project_not_found", `Project ${id} was not found.`, 404);
    return { ...result.rows[0].data, revision: result.rows[0].revision };
  }

  async saveProject(project, eventType, actor = "system") {
    return this.#transaction(async (client) => {
      const now = new Date().toISOString();
      const expectedRevision = project.revision;
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
        throw new ToolError("concurrent_update", "Project update is missing a valid revision.", 409);
      }
      const next = { ...project, revision: expectedRevision + 1, updatedAt: now };
      const update = await client.query(
        `UPDATE projects
         SET state = $2, data = $3::jsonb, revision = revision + 1, updated_at = now()
         WHERE id = $1 AND revision = $4
         RETURNING revision`,
        [next.id, next.state, JSON.stringify(next), expectedRevision]
      );
      if (!update.rowCount) throw new ToolError("concurrent_update", "Project changed before this update could be saved.", 409);
      next.revision = update.rows[0].revision;
      await client.query(
        "INSERT INTO project_events (project_id, event_type, payload, actor) VALUES ($1, $2, $3::jsonb, $4)",
        [next.id, eventType, JSON.stringify({ state: next.state, revision: next.revision }), actor]
      );
      return next;
    });
  }

  async createIntake({ project, assets, telegramEvent, actor = "system" }) {
    return this.#transaction(async (client) => {
      const event = await client.query(
        `INSERT INTO telegram_events (bot_id, chat_id, message_id, sender_id, payload_checksum, result, received_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
         ON CONFLICT (bot_id, chat_id, message_id) DO NOTHING
         RETURNING payload_checksum`,
        [telegramEvent.botId, telegramEvent.chatId, telegramEvent.messageId, telegramEvent.senderId, telegramEvent.checksum, JSON.stringify(telegramEvent.result), telegramEvent.receivedAt]
      );
      if (!event.rowCount) {
        const existing = await client.query(
          "SELECT payload_checksum, result FROM telegram_events WHERE bot_id = $1 AND chat_id = $2 AND message_id = $3",
          [telegramEvent.botId, telegramEvent.chatId, telegramEvent.messageId]
        );
        if (!existing.rowCount) throw new Error("Telegram event conflict could not be read.");
        if (existing.rows[0].payload_checksum !== telegramEvent.checksum) {
          throw new ToolError("telegram_event_conflict", "Telegram event identity was reused with a different payload.", 409);
        }
        return { created: false, result: existing.rows[0].result };
      }
      const next = { ...project, revision: 0 };
      await client.query(
        "INSERT INTO projects (id, owner_telegram_id, state, data, revision) VALUES ($1, $2, $3, $4::jsonb, $5)",
        [next.id, next.ownerTelegramId, next.state, JSON.stringify(next), next.revision]
      );
      for (const asset of assets) {
        await client.query(
          "INSERT INTO source_assets (id, project_id, message_id, kind, storage_key) VALUES ($1, $2, $3, $4, $5)",
          [asset.id, asset.projectId, asset.messageId, asset.kind, asset.storageKey]
        );
      }
      await client.query(
        "INSERT INTO project_events (project_id, event_type, payload, actor) VALUES ($1, $2, $3::jsonb, $4)",
        [next.id, "project_created", JSON.stringify({ state: next.state, revision: next.revision }), actor]
      );
      return { created: true, result: telegramEvent.result };
    });
  }

  async listMaterials() {
    const result = await this.pool.query("SELECT data FROM material_options ORDER BY created_at ASC");
    return result.rows.map((row) => row.data);
  }

  async addMaterial(material) {
    await this.pool.query(
      "INSERT INTO material_options (id, data, source_checked_at) VALUES ($1, $2::jsonb, $3)",
      [material.id, JSON.stringify(material), material.sourceCheckedAt ?? null]
    );
  }

  async close() {
    await this.pool.end();
  }

  async #transaction(work) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const value = await work(client);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
