import { createHash } from "node:crypto";
import { ToolError, requireValue } from "../domain/errors.mjs";

export class UsageMeter {
  constructor({ monthlyLimitPence = 0, taskLimits = {}, maxAttempts = 3, now = () => new Date().toISOString() } = {}) {
    this.monthlyLimitPence = monthlyLimitPence;
    this.taskLimits = { ...taskLimits };
    this.maxAttempts = maxAttempts;
    this.now = now;
    this.paused = false;
    this.records = [];
    this.cache = new Map();
  }

  cacheKey({ sourceVersion, task, settings = {} }) {
    return createHash("sha256").update(JSON.stringify({ sourceVersion, task, settings })).digest("hex");
  }

  getCached(input) { return structuredClone(this.cache.get(this.cacheKey(input)) ?? null); }
  setCached(input, result) { this.cache.set(this.cacheKey(input), structuredClone(result)); return structuredClone(result); }

  reserve({ task, estimatedCostPence = 0 }) {
    requireValue(!this.paused, "generation_paused", "Generation is paused. Use the operator recovery action to resume it.");
    const month = this.now().slice(0, 7);
    const spent = this.records.filter((record) => record.month === month).reduce((sum, record) => sum + record.costPence, 0);
    const taskCount = this.records.filter((record) => record.month === month && record.task === task && record.status === "succeeded").length;
    requireValue(!this.monthlyLimitPence || spent + estimatedCostPence <= this.monthlyLimitPence, "usage_limit_exceeded", "The monthly generation budget is exhausted. Status and existing drafts remain available.", { month, spentPence: spent, limitPence: this.monthlyLimitPence });
    requireValue(!this.taskLimits[task] || taskCount < this.taskLimits[task], "task_limit_exceeded", `The ${task} generation limit has been reached for this month.`);
    return { month, task, estimatedCostPence, maxAttempts: this.maxAttempts };
  }

  record({ task, provider = "unknown", model = "unknown", estimatedCostPence = 0, durationMs = 0, status, errorCode = null, publication = null }) {
    requireValue(["succeeded", "failed", "cancelled"].includes(status), "invalid_usage_status", "Usage status is invalid.");
    const record = { task, provider, model, costPence: estimatedCostPence, durationMs, status, errorCode, publication, month: this.now().slice(0, 7), createdAt: this.now() };
    this.records.push(record);
    return structuredClone(record);
  }

  pause() { this.paused = true; return { paused: true, nextAction: "An operator must review usage and resume generation." }; }
  resume() { this.paused = false; return { paused: false }; }
  help() { return { commands: ["/help", "/retry", "/pause"], retry: "Retry the failed job with the same idempotency key.", pause: "Pause paid generation; existing status and drafts remain available." }; }
  monthlySummary(month = this.now().slice(0, 7)) {
    const records = this.records.filter((record) => record.month === month);
    return { month, totalEstimatedCostPence: records.reduce((sum, record) => sum + record.costPence, 0), succeeded: records.filter((record) => record.status === "succeeded").length, failed: records.filter((record) => record.status === "failed").length, cancelled: records.filter((record) => record.status === "cancelled").length };
  }
}
