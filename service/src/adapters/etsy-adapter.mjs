import { createHash } from "node:crypto";
import { ToolError, requireValue } from "../domain/errors.mjs";

export class EtsyAdapter {
  constructor({ apiKey, apiSecret, accessToken, shopId, fetchImpl = fetch, baseUrl = "https://api.etsy.com" }) {
    this.apiKey = apiKey; this.apiSecret = apiSecret; this.accessToken = accessToken; this.shopId = String(shopId); this.fetch = fetchImpl; this.baseUrl = baseUrl;
  }

  async createDraft({ listing, pdfBytes, fileName }) {
    requireValue(this.apiKey && this.apiSecret && this.accessToken && this.shopId, "etsy_not_configured", "Etsy OAuth and shop configuration is incomplete.", undefined);
    const headers = { "x-api-key": `${this.apiKey}:${this.apiSecret}`, Authorization: `Bearer ${this.accessToken}` };
    const body = new URLSearchParams({ quantity: "1", title: listing.title, description: listing.description, price: String(listing.price), who_made: "i_did", when_made: "made_to_order", taxonomy_id: String(listing.taxonomy_id), type: "download" });
    const created = await this.fetch(`${this.baseUrl}/v3/application/shops/${this.shopId}/listings`, { method: "POST", headers: { ...headers, "content-type": "application/x-www-form-urlencoded" }, body });
    if (!created.ok) throw new ToolError("etsy_create_failed", `Etsy draft request failed with HTTP ${created.status}.`, 502);
    const draft = await created.json();
    requireValue(draft.listing_id, "etsy_create_failed", "Etsy did not return a listing ID.", undefined);
    const form = new FormData(); form.append("file", new Blob([pdfBytes], { type: "application/pdf" }), fileName);
    const upload = await this.fetch(`${this.baseUrl}/v3/application/shops/${this.shopId}/listings/${draft.listing_id}/files`, { method: "POST", headers, body: form });
    if (!upload.ok) throw new ToolError("etsy_file_upload_failed", `Etsy file upload failed with HTTP ${upload.status}.`, 502);
    const typeUpdate = await this.fetch(`${this.baseUrl}/v3/application/shops/${this.shopId}/listings/${draft.listing_id}`, { method: "PATCH", headers: { ...headers, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ type: "download" }) });
    if (!typeUpdate.ok) throw new ToolError("etsy_type_update_failed", `Etsy listing type update failed with HTTP ${typeUpdate.status}.`, 502);
    const readback = await this.fetch(`${this.baseUrl}/v3/application/shops/${this.shopId}/listings/${draft.listing_id}`, { headers });
    if (!readback.ok) throw new ToolError("etsy_readback_failed", `Etsy draft readback failed with HTTP ${readback.status}.`, 502);
    const listingReadback = await readback.json();
    requireValue(String(listingReadback.listing_id) === String(draft.listing_id) && listingReadback.type === "download", "etsy_readback_failed", "Etsy draft readback did not match the requested digital listing.", undefined);
    return { listingId: String(draft.listing_id), state: listingReadback.state ?? "draft", type: listingReadback.type, fingerprint: createHash("sha256").update(JSON.stringify(listing)).digest("hex") };
  }
}
