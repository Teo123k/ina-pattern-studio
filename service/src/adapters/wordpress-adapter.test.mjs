import test from "node:test";
import assert from "node:assert/strict";
import { WordPressAdapter } from "./wordpress-adapter.mjs";

test("creates a draft and verifies the exact reviewed content before publication", async () => {
  const title = "Making Soft Shell";
  const content = "<p>Pattern: <a href=\"https://etsy.test/listing/42\">Etsy</a></p>";
  const image = "https://images.test/finished.jpg";
  const draftContent = `<figure><img src="${image}" alt="Crochet lampshade by Ivana"></figure>${content}`;
  const responses = [
    { ok: true, async json() { return { id: 12, status: "draft", link: "https://ina.wordpress.com/?p=12" }; } },
    { ok: true, async json() { return { id: 12, status: "draft", title: { rendered: title }, content: { rendered: draftContent } }; } },
    { ok: true, async json() { return { id: 12, status: "publish" }; } },
    { ok: true, async json() { return { id: 12, status: "publish", link: "https://ina.wordpress.com/soft-shell" }; } }
  ];
  const adapter = new WordPressAdapter({ accessToken: "token", siteId: "99", fetchImpl: async () => responses.shift(), baseUrl: "https://wordpress.test" });
  const draft = await adapter.createDraft({ title, content, featuredImageUrl: image });
  const published = await adapter.publishDraft({ postId: draft.postId, expectedFingerprint: draft.fingerprint });
  assert.equal(published.liveUrl, "https://ina.wordpress.com/soft-shell");
});

test("refuses publication if the approved WordPress draft was edited", async () => {
  const adapter = new WordPressAdapter({ accessToken: "token", siteId: "99", fetchImpl: async () => ({ ok: true, async json() { return { id: 12, status: "draft", title: { rendered: "Changed" }, content: { rendered: "<p>Changed</p>" } }; } }), baseUrl: "https://wordpress.test" });
  await assert.rejects(() => adapter.publishDraft({ postId: "12", expectedFingerprint: "a".repeat(64) }), { code: "wordpress_publication_mismatch" });
});
