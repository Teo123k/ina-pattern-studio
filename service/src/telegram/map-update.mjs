import { ToolError, requireValue } from "../domain/errors.mjs";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function sourceFile(message) {
  if (Array.isArray(message.photo) && message.photo.length) return { kind: "photo", file_id: message.photo.at(-1).file_id };
  if (message.video?.file_id) return { kind: "video", file_id: message.video.file_id };
  if (message.document?.file_id) return { kind: message.document.mime_type === "application/pdf" ? "pdf" : "sketch", file_id: message.document.file_id };
  return null;
}

export async function mapNewProjectUpdate(update, loadFile, { allowedTelegramIds = [], maxBytes = MAX_ATTACHMENT_BYTES } = {}) {
  const message = update?.message;
  requireValue(message?.message_id, "unsupported_telegram_update", "A Telegram message update is required.");
  requireValue(message?.from?.id, "unsupported_telegram_update", "Telegram sender ID is required.");
  if (allowedTelegramIds.length) requireValue(allowedTelegramIds.map(String).includes(String(message.from.id)), "sender_not_allowed", "This Telegram account is not allowed to use INA.");
  const commandText = (message.caption ?? message.text ?? "").trim();
  requireValue(/^\/new(?:\s|$)/.test(commandText), "unsupported_telegram_update", "Only /new intake messages are handled by this mapper.");
  const file = sourceFile(message);
  requireValue(file, "missing_attachment", "A /new message must include a photo, sketch, PDF or video.");
  const loaded = await loadFile(file.file_id);
  requireValue(typeof loaded?.content_base64 === "string" && loaded.content_base64.length > 0, "attachment_download_failed", "Telegram attachment could not be downloaded.");
  requireValue(!loaded.size_bytes || loaded.size_bytes <= maxBytes, "attachment_too_large", "Telegram attachment exceeds the allowed size.");
  requireValue(!loaded.mime_type || ["image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf"].includes(loaded.mime_type), "unsupported_attachment_type", "Telegram attachment type is not supported.");
  const result = {
    bot_id: String(update?.bot_id ?? "ina_pattern_studio"),
    chat_id: String(message.chat?.id ?? message.from.id),
    message_id: String(message.message_id),
    sender_id: String(message.from.id),
    text: commandText.replace(/^\/new(?:\s+|$)/, ""),
    attachments: [{ kind: file.kind, content_base64: loaded.content_base64 }]
  };
  if (message.reply_to_message?.message_id) result.reply_to_message_id = String(message.reply_to_message.message_id);
  return result;
}

export async function mapNewProjectMediaGroup(messages, loadFile, options = {}) {
  requireValue(Array.isArray(messages) && messages.length > 0, "unsupported_telegram_update", "A Telegram media group is required.");
  const first = messages.find((item) => (item.caption ?? item.text ?? "").trim()) ?? messages[0];
  const base = await mapNewProjectUpdate({ ...options.update, message: first }, loadFile, options);
  const attachments = [];
  for (const update of messages) {
    const mapped = await mapNewProjectUpdate({ ...options.update, message: { ...update, caption: "/new" } }, loadFile, options);
    attachments.push(...mapped.attachments);
  }
  return { ...base, attachments };
}

export function formatTelegramStatus(result) {
  return [
    `Project: ${result.project_id ?? result.projectId}`,
    `State: ${result.state}`,
    `Next: ${result.next_allowed_action ?? result.nextAllowedAction}`
  ].join("\n");
}
