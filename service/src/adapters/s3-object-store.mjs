import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash, randomUUID } from "node:crypto";

export class S3ObjectStore {
  constructor({ endpoint, region, bucket, accessKeyId, secretAccessKey }) {
    this.bucket = bucket;
    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: Boolean(endpoint)
    });
  }

  async store({ projectId, messageId, kind, contentBase64 = "" }) {
    const safeKind = ["photo", "sketch", "pdf", "video"].includes(kind) ? kind : "file";
    const key = `${projectId}/${messageId}/${randomUUID()}.${safeKind}`;
    const body = Buffer.from(contentBase64, "base64");
    const checksum = createHash("sha256").update(body).digest("hex");
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, Metadata: { sha256: checksum } }));
    return { storageKey: key, checksum };
  }

  async remove({ storageKey }) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }
}
