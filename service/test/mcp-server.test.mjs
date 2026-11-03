import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

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
      "check_release_gate",
      "create_etsy_draft",
      "create_project_from_telegram",
      "create_tester_pack",
      "find_material_options",
      "get_project",
      "record_tester_feedback",
      "save_material_selection",
      "save_measurements",
      "save_pattern_draft",
      "validate_pattern"
    ]);
    assert.equal(names.includes("publish_etsy_listing"), false);
    assert.equal(names.includes("execute_shell"), false);
  } finally {
    await client.close();
  }
});
