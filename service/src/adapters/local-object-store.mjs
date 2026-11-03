import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";

export class LocalObjectStore {
  constructor(rootDirectory) {
    this.rootDirectory = resolve(rootDirectory);
  }

  async store({ projectId, messageId, kind, contentBase64 = "" }) {
    const safeKind = ["photo", "sketch", "pdf", "video"].includes(kind) ? kind : "file";
    const key = `${projectId}/${messageId}/${randomUUID()}.${safeKind}`;
    const absolutePath = resolve(this.rootDirectory, key);
    if (!absolutePath.startsWith(`${this.rootDirectory}/`)) throw new Error("Invalid object-storage key.");
    await mkdir(resolve(absolutePath, ".."), { recursive: true });
    const bytes = Buffer.from(contentBase64, "base64");
    await writeFile(absolutePath, bytes);
    return { storageKey: key, checksum: createHash("sha256").update(bytes).digest("hex") };
  }
}
