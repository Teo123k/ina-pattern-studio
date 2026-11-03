export async function callInaHttpTool({ baseUrl, apiKey, toolName, input, fetchImpl = fetch }) {
  const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/v1/tools/${encodeURIComponent(toolName)}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify(input)
  });
  const body = await response.json();
  return { ok: response.ok, body };
}

export function mcpResult({ ok, body }) {
  return {
    isError: !ok,
    content: [{ type: "text", text: JSON.stringify(body, null, 2) }]
  };
}
