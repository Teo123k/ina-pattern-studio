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

`/health` checks process liveness. `/ready` checks repository readiness. Request bodies are limited to 1 MB and internal errors are logged without request payloads.

For a test database backup and restore drill:

```sh
pg_dump "$DATABASE_URL" --format=custom --file=/tmp/ina-test.dump
createdb ina_pattern_studio_restore_test
pg_restore --clean --if-exists --dbname=ina_pattern_studio_restore_test /tmp/ina-test.dump
```

Keep backup files private and remove them after the drill. Run the service under a supervisor such as systemd or PM2, with restart-on-failure and the environment file loaded by the start command.

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

## Telegram intake boundary

`src/telegram/map-update.mjs` converts a Telegram `/new` update plus a downloaded source file into the same intake contract used by the tool service. `src/telegram/gateway.mjs` may be enabled with `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` to receive direct Bot API webhooks; leave it disabled when Hermes remains the Telegram gateway.

## Storage modes

- Automated tests use in-memory persistence and a temporary local object store.
- Current local server uses in-memory records and `LOCAL_MEDIA_DIR` for development proof only.
- Set `DATABASE_URL` to select the PostgreSQL repository. Run migrations before starting it.
- Set `OBJECT_STORAGE_DRIVER=s3` plus all `S3_*` values to select the S3-compatible object store. Production mode refuses to start without both PostgreSQL and S3 configuration.

## Deliberate exclusions

There is no social-posting endpoint, generic shell endpoint, arbitrary HTTP endpoint or generic SQL endpoint. Etsy and WordPress publication tools are narrow, approval-gated integrations and remain disabled until their credentials are configured.
