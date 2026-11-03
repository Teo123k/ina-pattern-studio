import test from "node:test";
import assert from "node:assert/strict";
import { EtsyAdapter } from "./etsy-adapter.mjs";

test("creates a digital draft, uploads the PDF and verifies readback", async () => {
  const calls = [];
  const responses = [
    { ok: true, async json() { return { listing_id: 42 }; } },
    { ok: true, async json() { return { listing_file_id: 9 }; } },
    { ok: true, async json() { return { listing_id: 42, type: "download" }; } },
    { ok: true, async json() { return { listing_id: 42, type: "download", state: "draft" }; } }
  ];
  const adapter = new EtsyAdapter({ apiKey: "key", apiSecret: "secret", accessToken: "token", shopId: "7", fetchImpl: async (...args) => { calls.push(args); return responses.shift(); }, baseUrl: "https://etsy.test" });
  const result = await adapter.createDraft({ listing: { title: "Digital shade", description: "Pattern", price: 12, taxonomy_id: 1 }, pdfBytes: Buffer.from("pdf"), fileName: "pattern.pdf" });
  assert.equal(result.listingId, "42");
  assert.equal(calls.length, 4);
});

test("does not report a draft when Etsy returns an error", async () => {
  const adapter = new EtsyAdapter({ apiKey: "key", apiSecret: "secret", accessToken: "token", shopId: "7", fetchImpl: async () => ({ ok: false, status: 401 }) });
  await assert.rejects(() => adapter.createDraft({ listing: { title: "x", description: "x", price: 1, taxonomy_id: 1 }, pdfBytes: Buffer.from("pdf"), fileName: "x.pdf" }), { code: "etsy_create_failed" });
});
