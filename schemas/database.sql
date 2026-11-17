-- VerifyKit database schema v1; runtime applies idempotently.
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, canonical_path TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS revisions (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, git_head TEXT, snapshot_sha TEXT NOT NULL, environment_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, FOREIGN KEY(workspace_id) REFERENCES workspaces(id));
CREATE INDEX IF NOT EXISTS revisions_by_ws ON revisions(workspace_id,created_at DESC);
CREATE TABLE IF NOT EXISTS files (workspace_id TEXT NOT NULL, path TEXT NOT NULL, content_sha TEXT NOT NULL, language TEXT, bytes INTEGER NOT NULL, revision_id TEXT NOT NULL, PRIMARY KEY(workspace_id,path));
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

