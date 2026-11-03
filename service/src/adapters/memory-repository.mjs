import { ToolError } from "../domain/errors.mjs";

export class MemoryRepository {
  constructor() {
    this.projects = new Map();
    this.telegramEvents = new Map();
    this.materials = new Map();
    this.assets = new Map();
    this.events = [];
    this.intakeTail = Promise.resolve();
    this.activeProjects = new Map();
    this.jobs = new Map();
    this.jobsByKey = new Map();
  }

  async getProject(id) {
    const project = this.projects.get(id);
    if (!project) throw new ToolError("project_not_found", `Project ${id} was not found.`, 404);
    return structuredClone(project);
  }

  async saveProject(project, eventType, actor = "system") {
    const now = new Date().toISOString();
    const current = this.projects.get(project.id);
    if (current && project.revision !== current.revision) {
      throw new ToolError("concurrent_update", "Project changed before this update could be saved.", 409);
    }
    const next = structuredClone({ ...project, revision: current ? current.revision + 1 : 0, updatedAt: now });
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

  async createIntake({ project, assets, telegramEvent, actor = "system" }) {
    const run = async () => {
      const key = telegramEventKey(telegramEvent);
      const existing = this.telegramEvents.get(key);
      if (existing) {
        if (existing.checksum !== telegramEvent.checksum) {
          throw new ToolError("telegram_event_conflict", "Telegram event identity was reused with a different payload.", 409);
        }
        return { created: false, result: structuredClone(existing.result) };
      }
      if (this.projects.has(project.id)) throw new ToolError("project_conflict", "Project identifier already exists.", 409);
      const now = new Date().toISOString();
      const nextProject = structuredClone({ ...project, revision: 0, updatedAt: now });
      this.projects.set(project.id, nextProject);
      if (nextProject.ownerChatId) this.activeProjects.set(nextProject.ownerChatId, nextProject.id);
      for (const asset of assets) this.assets.set(asset.id, structuredClone(asset));
      this.events.push({ projectId: project.id, eventType: "project_created", actor, createdAt: now });
      this.telegramEvents.set(key, structuredClone(telegramEvent));
      return { created: true, result: structuredClone(telegramEvent.result) };
    };
    const queued = this.intakeTail.then(run, run);
    this.intakeTail = queued.catch(() => {});
    return queued;
  }

  async listMaterials() {
    return [...this.materials.values()].map((item) => structuredClone(item));
  }

  async addMaterial(material) {
    this.materials.set(material.id, structuredClone(material));
  }

  async listProjectsByChat(chatId) {
    return [...this.projects.values()].filter((project) => project.ownerChatId === String(chatId)).map((project) => structuredClone(project));
  }

  async setActiveProject(chatId, projectId) {
    const project = this.projects.get(projectId);
    if (!project || project.ownerChatId !== String(chatId)) throw new ToolError("project_not_found", "Project was not found for this Telegram chat.", 404);
    this.activeProjects.set(String(chatId), projectId);
    return structuredClone(project);
  }

  async getActiveProject(chatId) {
    const projectId = this.activeProjects.get(String(chatId));
    return projectId ? this.getProject(projectId) : null;
  }

  async enqueueJob({ id, idempotencyKey, kind, payload, maxAttempts = 3 }) {
    const existingId = this.jobsByKey.get(idempotencyKey);
    if (existingId) return structuredClone(this.jobs.get(existingId));
    const job = { id, idempotencyKey, kind, payload: structuredClone(payload), status: "queued", attempts: 0, maxAttempts, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.jobs.set(id, job); this.jobsByKey.set(idempotencyKey, id);
    return structuredClone(job);
  }

  async getJob(id) { const job = this.jobs.get(id); if (!job) throw new ToolError("job_not_found", "Job was not found.", 404); return structuredClone(job); }

  async claimJob(kind) {
    const job = [...this.jobs.values()].find((item) => item.status === "queued" && (!kind || item.kind === kind));
    if (!job) return null;
    job.status = "running"; job.attempts += 1; job.updatedAt = new Date().toISOString();
    return structuredClone(job);
  }

  async completeJob(id, result) { const job = await this.getJob(id); job.status = "succeeded"; job.result = structuredClone(result); job.updatedAt = new Date().toISOString(); this.jobs.set(id, job); return structuredClone(job); }
  async failJob(id, error) { const job = await this.getJob(id); job.status = job.attempts < job.maxAttempts ? "queued" : "failed"; job.lastError = String(error).slice(0, 500); job.updatedAt = new Date().toISOString(); this.jobs.set(id, job); return structuredClone(job); }
  async cancelJob(id) { const job = await this.getJob(id); if (["queued", "running"].includes(job.status)) job.status = "cancelled"; job.updatedAt = new Date().toISOString(); this.jobs.set(id, job); return structuredClone(job); }
}

function telegramEventKey({ botId, chatId, messageId }) {
  return `${botId}:${chatId}:${messageId}`;
}
