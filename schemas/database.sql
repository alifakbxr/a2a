-- A2A database schema v1; runtime applies idempotently.
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, canonical_path TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, current_revision_id TEXT);
CREATE TABLE IF NOT EXISTS revisions (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, git_head TEXT, snapshot_sha TEXT NOT NULL, environment_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, FOREIGN KEY(workspace_id) REFERENCES workspaces(id));
CREATE INDEX IF NOT EXISTS revisions_by_ws ON revisions(workspace_id,created_at DESC);
CREATE TABLE IF NOT EXISTS files (workspace_id TEXT NOT NULL, path TEXT NOT NULL, content_sha TEXT NOT NULL, language TEXT, bytes INTEGER NOT NULL, revision_id TEXT NOT NULL, mtime_ms REAL, PRIMARY KEY(workspace_id,path));
CREATE TABLE IF NOT EXISTS nodes (workspace_id TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, file_path TEXT, line INTEGER, basis TEXT NOT NULL DEFAULT 'source', revision_id TEXT NOT NULL, PRIMARY KEY(workspace_id,id));
CREATE INDEX IF NOT EXISTS nodes_search ON nodes(workspace_id,label);
CREATE TABLE IF NOT EXISTS edges (workspace_id TEXT NOT NULL, id TEXT NOT NULL, source TEXT NOT NULL, target TEXT NOT NULL, kind TEXT NOT NULL, basis TEXT NOT NULL, state TEXT NOT NULL, source_file TEXT, revision_id TEXT NOT NULL, PRIMARY KEY(workspace_id,id));
CREATE INDEX IF NOT EXISTS edges_source ON edges(workspace_id,source);
CREATE INDEX IF NOT EXISTS edges_target ON edges(workspace_id,target);
CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, revision_id TEXT NOT NULL, criterion_id TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('passed','failed','blocked','inconclusive')), evidence_type TEXT NOT NULL, artifact_path TEXT NOT NULL, artifact_sha TEXT NOT NULL, metadata_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS evidence_lookup ON evidence(workspace_id,criterion_id,created_at DESC);
CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, revision_id TEXT NOT NULL, verdict TEXT NOT NULL, criteria_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS incidents (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, title TEXT NOT NULL, root_cause TEXT NOT NULL, state TEXT NOT NULL, revision_id TEXT NOT NULL, related_paths_json TEXT NOT NULL, criteria_json TEXT NOT NULL, evidence_ids_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS incidents_lookup ON incidents(workspace_id,created_at DESC);
CREATE TABLE IF NOT EXISTS hypotheses (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, incident_id TEXT, description TEXT NOT NULL, status TEXT NOT NULL, experiment TEXT, evidence_ids_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS telemetry (workspace_id TEXT NOT NULL, tool_name TEXT NOT NULL, action TEXT NOT NULL, raw_scope_tokens INTEGER NOT NULL DEFAULT 0, response_tokens INTEGER NOT NULL DEFAULT 0, tokens_saved INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS telemetry_by_ws ON telemetry(workspace_id,created_at DESC);
CREATE TABLE IF NOT EXISTS side_questions (id TEXT PRIMARY KEY, workspace_id TEXT, conversation_id TEXT NOT NULL, parent_conversation_id TEXT, title TEXT, question TEXT NOT NULL, summary TEXT, status TEXT NOT NULL DEFAULT 'resolved', transcript_path TEXT, metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS side_q_conv ON side_questions(conversation_id);
CREATE INDEX IF NOT EXISTS side_q_parent ON side_questions(parent_conversation_id);
CREATE INDEX IF NOT EXISTS side_q_ws ON side_questions(workspace_id);
CREATE TABLE IF NOT EXISTS artifact_versions (id TEXT PRIMARY KEY, workspace_id TEXT, conversation_id TEXT NOT NULL, artifact_name TEXT NOT NULL, version_number INTEGER NOT NULL, content_sha TEXT NOT NULL, content TEXT NOT NULL, diff_from_previous TEXT, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS artifact_v_lookup ON artifact_versions(conversation_id, artifact_name, version_number DESC);
CREATE INDEX IF NOT EXISTS artifact_v_conv ON artifact_versions(conversation_id);
CREATE INDEX IF NOT EXISTS artifact_v_ws ON artifact_versions(workspace_id);


-- A2A model recovery: only sanitized model/category metadata, never raw errors.
CREATE TABLE IF NOT EXISTS model_recovery_state (
  workspace_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  model_name TEXT,
  incident_category TEXT,
  incident_confidence TEXT,
  incident_at TEXT,
  notice_signature TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(workspace_id, conversation_id)
);
CREATE INDEX IF NOT EXISTS model_recovery_recent ON model_recovery_state(workspace_id,updated_at DESC);
-- Checkpoints are explicit opt-in summaries, not automatic transcript copies.
CREATE TABLE IF NOT EXISTS recovery_checkpoints (
  workspace_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  revision_id TEXT,
  task_summary TEXT NOT NULL,
  completed_json TEXT NOT NULL,
  next_steps_json TEXT NOT NULL,
  decisions_json TEXT NOT NULL DEFAULT '[]',
  pending_tests_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(workspace_id, conversation_id)
);
CREATE INDEX IF NOT EXISTS recovery_recent ON recovery_checkpoints(workspace_id,updated_at DESC);
