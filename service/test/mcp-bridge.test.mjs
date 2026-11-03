import test from "node:test";
import assert from "node:assert/strict";
import { callInaHttpTool, mcpResult } from "../src/mcp/bridge.mjs";

test("MCP bridge sends only the requested INA tool path and bearer secret", async () => {
  let request;
  const result = await callInaHttpTool({
    baseUrl: "http://127.0.0.1:3030/",
    apiKey: "test-secret",
    toolName: "get_project",
    input: { project_id: "INA-1" },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ ok: true, result: { project_id: "INA-1" } }) };
    }
  });
  assert.equal(request.url, "http://127.0.0.1:3030/v1/tools/get_project");
  assert.equal(request.options.headers.authorization, "Bearer test-secret");
  assert.deepEqual(result.body.result, { project_id: "INA-1" });
  assert.deepEqual(mcpResult(result), { isError: false, content: [{ type: "text", text: JSON.stringify(result.body, null, 2) }] });
});
