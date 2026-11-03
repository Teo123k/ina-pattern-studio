import test from "node:test";
import assert from "node:assert/strict";
import { handleTelegramUpdate } from "./gateway.mjs";

test("handles only /new intake and sends the verified project status", async () => {
  const sent = [];
  const service = { async create_project_from_telegram(input) { assert.equal(input.sender_id, "101"); return { project_id: "INA-1", state: "brief", next_allowed_action: "Confirm measurements." }; } };
  const telegram = { async downloadFile() { return { content_base64: "aGVsbG8=", size_bytes: 5, mime_type: "image/jpeg" }; }, async sendMessage(chatId, text) { sent.push({ chatId, text }); } };
  const result = await handleTelegramUpdate({ update: { bot_id: "ina", message: { message_id: 1, from: { id: 101 }, chat: { id: 202 }, text: "/new soft shade", photo: [{ file_id: "small" }] } }, service, telegram, allowedTelegramIds: ["101"] });
  assert.equal(result.handled, true);
  assert.match(sent[0].text, /Project: INA-1/);
});

test("does not treat ordinary chat as a project intake", async () => {
  const result = await handleTelegramUpdate({ update: { message: { text: "hello" } }, service: {}, telegram: {}, allowedTelegramIds: [] });
  assert.deepEqual(result, { handled: false });
});
