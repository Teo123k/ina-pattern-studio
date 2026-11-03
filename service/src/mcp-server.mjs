import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { toolDefinitions } from "./contracts/tool-definitions.mjs";
import { callInaHttpTool, mcpResult } from "./mcp/bridge.mjs";

const baseUrl = process.env.INA_TOOL_SERVICE_URL ?? "http://127.0.0.1:3030";
const apiKey = process.env.INA_TOOL_SERVICE_API_KEY;
const server = new McpServer({ name: "ina-pattern-studio", version: "0.1.0" });

for (const definition of toolDefinitions) {
  server.tool(definition.name, definition.description, definition.schema, async (input) => {
    try {
      return mcpResult(await callInaHttpTool({ baseUrl, apiKey, toolName: definition.name, input }));
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: JSON.stringify({ ok: false, error: { code: "tool_service_unavailable", message: error.message } }) }] };
    }
  });
}

await server.connect(new StdioServerTransport());
