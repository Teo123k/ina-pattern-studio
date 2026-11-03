import { createHash } from "node:crypto";
import { ToolError, requireValue } from "../domain/errors.mjs";

export class WordPressAdapter {
  constructor({ accessToken, siteId, fetchImpl = fetch, baseUrl = "https://public-api.wordpress.com/wp/v2/sites" }) {
    this.accessToken = accessToken;
    this.siteId = String(siteId);
    this.fetch = fetchImpl;
    this.baseUrl = baseUrl;
  }

  async createDraft({ title, content, featuredImageUrl }) {
    const post = await this.request("POST", "", { title, content: `${imageHtml(featuredImageUrl)}${content}`, status: "draft" }, "wordpress_draft_failed");
    requireValue(post.id && post.status === "draft", "wordpress_draft_failed", "WordPress did not confirm a draft post.");
    return { postId: String(post.id), status: post.status, previewUrl: post.link ?? null, fingerprint: fingerprint({ title, content, featuredImageUrl }), featuredImageUrl };
  }

  async publishDraft({ postId, expectedFingerprint }) {
    const current = await this.request("GET", `/${postId}`, null, "wordpress_readback_failed");
    requireValue(current.status === "draft", "wordpress_publication_mismatch", "The WordPress post is no longer an unchanged draft.");
    const savedContent = rendered(current.content);
    const actualFingerprint = fingerprint({ title: rendered(current.title), content: stripFeaturedImage(savedContent), featuredImageUrl: imageFromContent(savedContent) });
    requireValue(actualFingerprint === expectedFingerprint, "wordpress_publication_mismatch", "The WordPress draft content changed after Ivana reviewed it.");
    await this.request("POST", `/${postId}`, { status: "publish" }, "wordpress_publish_failed");
    const published = await this.request("GET", `/${postId}`, null, "wordpress_readback_failed");
    requireValue(published.status === "publish" && published.link, "wordpress_publish_failed", "WordPress did not confirm a public post.");
    return { postId: String(postId), status: published.status, liveUrl: published.link };
  }

  async request(method, suffix, body, errorCode) {
    requireValue(this.accessToken && this.siteId, "wordpress_not_configured", "WordPress.com access token and site ID are required.", undefined);
    const response = await this.fetch(`${this.baseUrl}/${this.siteId}/posts${suffix}`, { method, headers: { Authorization: `Bearer ${this.accessToken}`, ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw new ToolError(errorCode, `WordPress request failed with HTTP ${response.status}.`, 502);
    return response.json();
  }
}

export function fingerprint(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function imageHtml(url) { return `<figure><img src="${url}" alt="Crochet lampshade by Ivana"></figure>`; }
function rendered(value) { return typeof value === "string" ? value : value?.rendered ?? ""; }
function imageFromContent(content) { return /<img src="([^"]+)"/.exec(content)?.[1] ?? null; }
function stripFeaturedImage(content) { return content.replace(/^<figure><img src="[^"]+" alt="Crochet lampshade by Ivana"><\/figure>/, ""); }
