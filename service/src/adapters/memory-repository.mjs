import { ToolError } from "../domain/errors.mjs";

export class MemoryRepository {
  constructor() {
    this.projects = new Map();
    this.telegramEvents = new Map();
    this.materials = new Map();
    this.assets = new Map();
    this.events = [];
  }

  async getProject(id) {
    const project = this.projects.get(id);
    if (!project) throw new ToolError("project_not_found", `Project ${id} was not found.`, 404);
    return structuredClone(project);
  }

  async saveProject(project, eventType, actor = "system") {
    const now = new Date().toISOString();
    const next = structuredClone({ ...project, updatedAt: now });
    this.projects.set(project.id, next);
    this.events.push({ projectId: project.id, eventType, actor, createdAt: now });
    return structuredClone(next);
  }

  async findTelegramEvent(messageId) {
    return structuredClone(this.telegramEvents.get(String(messageId)) ?? null);
  }

  async saveTelegramEvent(messageId, event) {
    this.telegramEvents.set(String(messageId), structuredClone(event));
  }

  async storeAsset(asset) {
    this.assets.set(asset.id, structuredClone(asset));
    return structuredClone(asset);
  }

  async listMaterials() {
    return [...this.materials.values()].map((item) => structuredClone(item));
  }

  async addMaterial(material) {
    this.materials.set(material.id, structuredClone(material));
  }
}
