import test from "node:test";
import assert from "node:assert/strict";
import { PostgresRepository } from "../src/adapters/postgres-repository.mjs";
import { TransactionOutcomeUnknownError } from "../src/domain/errors.mjs";

test("an uncertain commit is reported without treating the transaction as rolled back", async () => {
  const repository = new PostgresRepository("postgres://unused");
  const queries = [];
  let discarded = null;
  repository.pool = {
    async connect() {
      return {
        async query(sql) {
          queries.push(sql);
          if (sql.startsWith("UPDATE projects")) return { rowCount: 1, rows: [{ revision: 1 }] };
          if (sql === "COMMIT") throw new Error("connection lost after commit request");
          return { rowCount: 1, rows: [] };
        },
        release(discard) { discarded = discard; }
      };
    }
  };

  await assert.rejects(
    () => repository.saveProject({ id: "INA-1", revision: 0, state: "brief" }, "updated"),
    TransactionOutcomeUnknownError
  );
  assert.equal(queries.includes("ROLLBACK"), false);
  assert.equal(discarded, true);
});
