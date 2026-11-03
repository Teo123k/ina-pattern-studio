import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { toolDefinitions } from "../src/contracts/tool-definitions.mjs";

test("MCP server exposes exactly the approved INA tools", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["service/src/mcp-server.mjs"],
    env: { ...process.env, INA_TOOL_SERVICE_URL: "http://127.0.0.1:3999" },
    stderr: "pipe"
  });
  const client = new Client({ name: "ina-mcp-test", version: "1.0.0" });
  await client.connect(transport);
  try {
    const result = await client.listTools();
    const names = result.tools.map((tool) => tool.name).sort();
    assert.deepEqual(names, [
      "add_material_option",
      "approve_release",
      "cancel_job",
      "check_release_gate",
      "create_etsy_draft",
      "create_project_from_telegram",
      "create_tester_pack",
      "enqueue_job",
      "find_material_options",
      "generate_concepts",
      "get_job",
      "get_pattern_pdf",
      "get_project",
      "list_projects",
      "prepare_approval",
      "record_tester_feedback",
      "render_pattern_pdf",
      "resume_project",
      "save_material_selection",
      "save_measurements",
      "save_pattern_draft",
      "select_concept",
      "select_project",
      "validate_pattern"
    ]);
    assert.equal(names.includes("publish_etsy_listing"), false);
    assert.equal(names.includes("execute_shell"), false);
  } finally {
    await client.close();
  }
});

test("MCP measurement schemas reject numeric strings and unknown fields", () => {
  const intake = toolDefinitions.find((tool) => tool.name === "create_project_from_telegram");
  const confirm = toolDefinitions.find((tool) => tool.name === "save_measurements");
  const validate = toolDefinitions.find((tool) => tool.name === "validate_pattern");
  assert.equal(intake.schema.measurements.safeParse({ diameterCm: "30" }).success, false);
  assert.equal(intake.schema.measurements.safeParse({ unknown: 1 }).success, false);
  assert.equal(confirm.schema.confirmed_values.safeParse({
    diameterCm: 30,
    heightCm: 20,
    fittingDescription: "frame",
    yarnIdentity: "cotton",
    hookMm: 4,
    gaugeStitchesPer10Cm: 14,
    gaugeRowsPer10Cm: 10,
    motifRepeatStitches: 12
  }).success, true);
  assert.equal(validate.schema.construction_spec.safeParse({ measurementVersion: 1, fitTolerancePercent: 3 }).success, true);
  assert.equal(validate.schema.construction_spec.safeParse({ measurementVersion: 1, fitTolerancePercent: 3, motifRepeatStitches: 12 }).success, false);
  assert.equal(validate.schema.construction_spec.safeParse({ measurementVersion: 1 }).success, false);
});
