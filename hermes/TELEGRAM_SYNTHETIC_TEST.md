# INA Telegram synthetic test

This test verifies the adapter boundary without a live Telegram token.

1. Start the local INA service with an allowlisted synthetic account:

   ```sh
   ALLOWED_TELEGRAM_IDS=101 SERVICE_API_KEY=local-test npm start
   ```

2. Use `mapNewProjectUpdate` with a synthetic `/new` Telegram update and a fake attachment loader. Its output must be passed unchanged to `create_project_from_telegram`.
3. Verify the response contains `project_id`, `state: brief` and `measurement_confirmation_required: true`.
4. Replay the same `message_id`; it must return the original project with `duplicate: true`.
5. Try sender ID `999`; it must return `sender_not_allowed` and create no project.

For the live Telegram test, replace only the fake attachment loader with the Telegram file-download adapter. Preserve the same mapper and tool-service contract.
