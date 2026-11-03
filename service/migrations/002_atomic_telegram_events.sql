ALTER TABLE projects ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 0;

ALTER TABLE telegram_events ADD COLUMN IF NOT EXISTS bot_id TEXT;
ALTER TABLE telegram_events ADD COLUMN IF NOT EXISTS chat_id TEXT;
UPDATE telegram_events SET bot_id = COALESCE(bot_id, 'legacy'), chat_id = COALESCE(chat_id, sender_id)
WHERE bot_id IS NULL OR chat_id IS NULL;
ALTER TABLE telegram_events ALTER COLUMN bot_id SET NOT NULL;
ALTER TABLE telegram_events ALTER COLUMN chat_id SET NOT NULL;
ALTER TABLE telegram_events DROP CONSTRAINT IF EXISTS telegram_events_pkey;
ALTER TABLE telegram_events ADD PRIMARY KEY (bot_id, chat_id, message_id);
