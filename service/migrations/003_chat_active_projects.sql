CREATE TABLE IF NOT EXISTS active_chat_projects (
  chat_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
