import test from "node:test";
import assert from "node:assert/strict";
import { UsageMeter } from "./usage-meter.mjs";

test("enforces monthly limits while keeping cached outputs available", () => {
  const meter = new UsageMeter({ monthlyLimitPence: 10, now: () => "2026-11-03T12:00:00.000Z" });
  const input = { sourceVersion: "1.0", task: "concepts", settings: { style: "lace" } };
  meter.setCached(input, { concepts: ["cached"] });
  assert.deepEqual(meter.getCached(input), { concepts: ["cached"] });
  meter.reserve({ task: "concepts", estimatedCostPence: 10 });
  meter.record({ task: "concepts", estimatedCostPence: 10, status: "succeeded", durationMs: 20 });
  assert.throws(() => meter.reserve({ task: "concepts", estimatedCostPence: 1 }), { code: "usage_limit_exceeded" });
  assert.deepEqual(meter.monthlySummary(), { month: "2026-11", totalEstimatedCostPence: 10, succeeded: 1, failed: 0, cancelled: 0 });
});

test("pause and recovery return plain-language next actions", () => {
  const meter = new UsageMeter();
  assert.equal(meter.pause().paused, true);
  assert.throws(() => meter.reserve({ task: "content" }), { code: "generation_paused" });
  assert.equal(meter.resume().paused, false);
  assert.equal(meter.help().commands.includes("/retry"), true);
});
