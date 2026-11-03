import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

test("context builder rejects malformed project IDs", async () => {
  await assert.rejects(
    exec("node", ["tools/build-project-context.mjs", "../secrets"]),
    /Usage: node tools\/build-project-context\.mjs/
  );
});

test("project validator rejects unknown project IDs", async () => {
  await assert.rejects(
    exec("node", ["tools/validate-project-record.mjs", "IL-2026-999"]),
    /Project record not found/
  );
});

test("project creator requires an ID and title", async () => {
  await assert.rejects(
    exec("node", ["tools/create-project.mjs", "IL-2026-001"]),
    /Usage: node tools\/create-project\.mjs/
  );
});
