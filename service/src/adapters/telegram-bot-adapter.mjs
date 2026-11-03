import { ToolError, requireValue } from "../domain/errors.mjs";

export class TelegramBotAdapter {
  constructor({ token, fetchImpl = fetch }) { this.token = token; this.fetch = fetchImpl; }
  async downloadFile(fileId) {
    requireValue(this.token, "telegram_not_configured", "Telegram bot token is not configured.", undefined);
    const metadata = await this.#api("getFile", { file_id: fileId });
    const response = await this.fetch(`https://api.telegram.org/file/bot${this.token}/${metadata.file_path}`);
    if (!response.ok) throw new ToolError("attachment_download_failed", `Telegram file download failed with HTTP ${response.status}.`, 502);
    const bytes = Buffer.from(await response.arrayBuffer());
    return { content_base64: bytes.toString("base64"), size_bytes: bytes.length, mime_type: response.headers.get("content-type")?.split(";")[0] };
  }
  async sendMessage(chatId, text) { return this.#api("sendMessage", { chat_id: chatId, text }); }
  async #api(method, body) {
    requireValue(this.token, "telegram_not_configured", "Telegram bot token is not configured.", undefined);
    const response = await this.fetch(`https://api.telegram.org/bot${this.token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new ToolError("telegram_api_failed", `Telegram ${method} failed.`, 502);
    return result.result;
  }
}
