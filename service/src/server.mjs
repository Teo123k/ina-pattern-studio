import { createServer } from "node:http";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { InaToolService } from "./app/tool-service.mjs";
import { MemoryRepository } from "./adapters/memory-repository.mjs";
import { PostgresRepository } from "./adapters/postgres-repository.mjs";
import { LocalObjectStore } from "./adapters/local-object-store.mjs";
import { S3ObjectStore } from "./adapters/s3-object-store.mjs";
import { ToolError } from "./domain/errors.mjs";

const port = Number(process.env.PORT ?? 3030);
const mediaDir = resolve(process.env.LOCAL_MEDIA_DIR ?? "service/.local-media");
const allowedTelegramIds = (process.env.ALLOWED_TELEGRAM_IDS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
const apiKey = process.env.SERVICE_API_KEY;
const approvalSecret = process.env.TELEGRAM_APPROVAL_SECRET;
if (process.env.NODE_ENV === "production" && (!apiKey || !approvalSecret || allowedTelegramIds.length === 0)) {
  throw new Error("SERVICE_API_KEY, TELEGRAM_APPROVAL_SECRET and ALLOWED_TELEGRAM_IDS are required in production.");
}
if (process.env.NODE_ENV === "production" && (!process.env.DATABASE_URL || process.env.OBJECT_STORAGE_DRIVER !== "s3")) {
  throw new Error("DATABASE_URL and OBJECT_STORAGE_DRIVER=s3 are required in production.");
}
await mkdir(mediaDir, { recursive: true });
const repository = process.env.DATABASE_URL ? new PostgresRepository(process.env.DATABASE_URL) : new MemoryRepository();
const objectStore = process.env.OBJECT_STORAGE_DRIVER === "s3"
  ? new S3ObjectStore({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      bucket: process.env.S3_BUCKET,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    })
  : new LocalObjectStore(mediaDir);
const service = new InaToolService({ repository, objectStore, allowedTelegramIds, approvalSecret });

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function bodyOf(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") return send(response, 200, { ok: true });
    if (request.method === "POST" && request.url === "/v1/gateway/telegram-callback") {
      if (!apiKey || request.headers.authorization !== `Bearer ${apiKey}`) return send(response, 401, { error: { code: "unauthorized" } });
      const result = await service.approve_gateway_callback(await bodyOf(request));
      return send(response, 200, { ok: true, result });
    }
    if (request.method !== "POST" || !request.url?.startsWith("/v1/tools/")) return send(response, 404, { error: { code: "not_found" } });
    if (apiKey && request.headers.authorization !== `Bearer ${apiKey}`) return send(response, 401, { error: { code: "unauthorized" } });
    const toolName = decodeURIComponent(request.url.slice("/v1/tools/".length));
    const result = await service.call(toolName, await bodyOf(request));
    return send(response, 200, { ok: true, result });
  } catch (error) {
    if (error instanceof ToolError) return send(response, error.status, { ok: false, error: { code: error.code, message: error.message, details: error.details } });
    if (error instanceof SyntaxError) return send(response, 400, { ok: false, error: { code: "invalid_json", message: "Request body must be JSON." } });
    console.error(error);
    return send(response, 500, { ok: false, error: { code: "internal_error", message: "Internal service error." } });
  }
});

server.listen(port, "127.0.0.1", () => console.log(`INA tool service listening on http://127.0.0.1:${port}`));

async function shutdown() {
  server.close();
  if (typeof repository.close === "function") await repository.close();
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
