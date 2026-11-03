import pg from "pg";
import { ToolError } from "../domain/errors.mjs";

export class PostgresRepository {
  constructor(connectionString) {
    this.pool = new pg.Pool({ connectionString });
  }

  async getProject(id) {
    const result = await this.pool.query("SELECT data FROM projects WHERE id = $1", [id]);
    if (!result.rowCount) throw new ToolError("project_not_found", `Project ${id} was not found.`, 404);
    return result.rows[0].data;
  }

  async saveProject(project, eventType, actor = "system") {
    const now = new Date().toISOString();
    const next = { ...project, updatedAt: now };
    await this.pool.query(
      `INSERT INTO projects (id, owner_telegram_id, state, data)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, data = EXCLUDED.data, updated_at = now()`,
      [next.id, next.ownerTelegramId, next.state, JSON.stringify(next)]
    );
    await this.pool.query(
      "INSERT INTO project_events (project_id, event_type, payload, actor) VALUES ($1, $2, $3::jsonb, $4)",
      [next.id, eventType, JSON.stringify({ state: next.state }), actor]
    );
    return next;
  }

  async findTelegramEvent(messageId) {
    const result = await this.pool.query("SELECT result FROM telegram_events WHERE message_id = $1", [String(messageId)]);
    return result.rowCount ? result.rows[0] : null;
  }

  async saveTelegramEvent(messageId, event) {
    await this.pool.query(
      `INSERT INTO telegram_events (message_id, sender_id, payload_checksum, result, received_at)
       VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [String(messageId), event.senderId, event.checksum, JSON.stringify(event.result), event.receivedAt]
    );
  }

  async storeAsset(asset) {
    await this.pool.query(
      "INSERT INTO source_assets (id, project_id, message_id, kind, storage_key) VALUES ($1, $2, $3, $4, $5)",
      [asset.id, asset.projectId, asset.messageId, asset.kind, asset.storageKey]
    );
    return asset;
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
}
