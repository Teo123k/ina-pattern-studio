import test from "node:test";
import assert from "node:assert/strict";
import { mapNewProjectUpdate, formatTelegramStatus } from "../src/telegram/map-update.mjs";

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

test("rejects an intake update without a source attachment", async () => {
  await assert.rejects(
    () => mapNewProjectUpdate({ message: { message_id: 46, from: { id: 101 }, text: "/new" } }, async () => ({ content_base64: "x" })),
    { code: "missing_attachment" }
  );
});

test("formats each Telegram status with project, state and next action", () => {
  assert.equal(formatTelegramStatus({ project_id: "INA-1", state: "brief", next_allowed_action: "Confirm measurements." }), "Project: INA-1\nState: brief\nNext: Confirm measurements.");
});
