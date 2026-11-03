import { mapNewProjectUpdate, formatTelegramStatus } from "./map-update.mjs";

export async function handleTelegramUpdate({ update, service, telegram, allowedTelegramIds }) {
  const text = (update?.message?.caption ?? update?.message?.text ?? "").trim();
  if (!/^\/new(?:\s|$)/.test(text)) return { handled: false };
  const intake = await mapNewProjectUpdate(update, (fileId) => telegram.downloadFile(fileId), { allowedTelegramIds });
  const result = await service.create_project_from_telegram(intake);
  await telegram.sendMessage(intake.chat_id, formatTelegramStatus(result));
  return { handled: true, result };
}
