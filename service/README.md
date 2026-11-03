# INA tool service

The INA tool service is the durable, restricted boundary between Hermes and project data. Hermes may call its allowlisted tools; it must not receive generic filesystem, terminal, database-query, Etsy-publish or social-posting tools.

## Local development

```sh
npm install
cp service/.env.example service/.env
docker compose up -d postgres
npm run migrate
npm test
ALLOWED_TELEGRAM_IDS=123456789 npm start
```

Run the disposable PostgreSQL integration suite with:

```sh
INA_TEST_DATABASE_URL=postgres://ina:development-only-change-me@127.0.0.1:54329/ina_pattern_studio_test npm run test:integration
```

It refuses database names that do not end in `_test` before truncating test tables.

The current HTTP service intentionally binds to `127.0.0.1`. Put it behind an authenticated private gateway before exposing it to Hermes on another host.

## HTTP contract

`POST /v1/tools/<approved-tool-name>` accepts JSON and, if configured, requires `Authorization: Bearer $SERVICE_API_KEY`.

Allowed tools are listed in `hermes/TELEGRAM_DIRECT_BUILD.md`. Unknown tool names fail with `tool_not_allowed`.

## Hermes MCP bridge

Run the HTTP service, then start the stdio bridge:

```sh
INA_TOOL_SERVICE_URL=http://127.0.0.1:3030 \
INA_TOOL_SERVICE_API_KEY="$SERVICE_API_KEY" \
npm run mcp
```

Use [the Hermes MCP example](../hermes/INA_TOOL_SERVICE_MCP.example.yaml) as the deployment configuration. The bridge exposes only the exact INA tool allowlist. It does not grant Hermes a shell, filesystem or database-query tool.

## Telegram adapter boundary

`src/telegram/map-update.mjs` converts a Telegram `/new` update plus a downloaded source file into the same intake contract used by the tool service. It deliberately does not contain a bot token, webhook or public listener. See [the synthetic test](../hermes/TELEGRAM_SYNTHETIC_TEST.md).

## Storage modes

- Automated tests use in-memory persistence and a temporary local object store.
- Current local server uses in-memory records and `LOCAL_MEDIA_DIR` for development proof only.
- Set `DATABASE_URL` to select the PostgreSQL repository. Run migrations before starting it.
- Set `OBJECT_STORAGE_DRIVER=s3` plus all `S3_*` values to select the S3-compatible object store. Production mode refuses to start without both PostgreSQL and S3 configuration.

## Deliberate exclusions

There is no Etsy publish endpoint, no social-posting endpoint, no generic shell endpoint, no arbitrary HTTP endpoint and no generic SQL endpoint.
