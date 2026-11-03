import test from "node:test";
import assert from "node:assert/strict";
import { mapNewProjectMediaGroup, mapNewProjectUpdate, formatTelegramStatus } from "../src/telegram/map-update.mjs";

test("maps a synthetic /new photo message to the approved intake contract", async () => {
  const mapped = await mapNewProjectUpdate({
    message: { message_id: 45, from: { id: 101 }, text: "/new soft shell shade", photo: [{ file_id: "small" }, { file_id: "large" }] }
  }, async (fileId) => ({ content_base64: `encoded-${fileId}` }));
  assert.deepEqual(mapped, {
    bot_id: "ina_pattern_studio",
    chat_id: "101",
    message_id: "45",
    sender_id: "101",
    text: "soft shell shade",
    attachments: [{ kind: "photo", content_base64: "encoded-large" }]
  });
});

test("maps a captioned Telegram photo and rejects a longer command", async () => {
  const update = { message: { message_id: 47, from: { id: 101 }, chat: { id: 202 }, caption: "/new linen shade", photo: [{ file_id: "photo" }] } };
  const mapped = await mapNewProjectUpdate(update, async () => ({ content_base64: "YQ==" }));
  assert.equal(mapped.chat_id, "202");
  assert.equal(mapped.text, "linen shade");
  await assert.rejects(
    () => mapNewProjectUpdate({ message: { ...update.message, caption: "/newspaper shade" } }, async () => ({ content_base64: "YQ==" })),
    { code: "unsupported_telegram_update" }
  );
});

test("rejects an intake update without a source attachment", async () => {
  await assert.rejects(
    () => mapNewProjectUpdate({ message: { message_id: 46, from: { id: 101 }, text: "/new" } }, async () => ({ content_base64: "x" })),
    { code: "missing_attachment" }
  );
});

test("checks sender before downloading and enforces media limits", async () => {
  let downloads = 0;
  await assert.rejects(() => mapNewProjectUpdate({ message: { message_id: 48, from: { id: 999 }, text: "/new", photo: [{ file_id: "photo" }] } }, async () => { downloads += 1; return { content_base64: "YQ==" }; }, { allowedTelegramIds: ["101"] }), { code: "sender_not_allowed" });
  assert.equal(downloads, 0);
  await assert.rejects(() => mapNewProjectUpdate({ message: { message_id: 49, from: { id: 101 }, text: "/new", photo: [{ file_id: "photo" }] } }, async () => ({ content_base64: "YQ==", size_bytes: 11 }), { maxBytes: 10 }), { code: "attachment_too_large" });
});

test("maps a media group into one intake with multiple original attachments", async () => {
  const mapped = await mapNewProjectMediaGroup([
    { message_id: 51, from: { id: 101 }, chat: { id: 202 }, caption: "/new shell", photo: [{ file_id: "a" }] },
    { message_id: 52, from: { id: 101 }, chat: { id: 202 }, photo: [{ file_id: "b" }] }
  ], async (fileId) => ({ content_base64: fileId }), { allowedTelegramIds: ["101"] });
  assert.equal(mapped.attachments.length, 2);
  assert.equal(mapped.text, "shell");
});

test("formats each Telegram status with project, state and next action", () => {
  assert.equal(formatTelegramStatus({ project_id: "INA-1", state: "brief", next_allowed_action: "Confirm measurements." }), "Project: INA-1\nState: brief\nNext: Confirm measurements.");
});
