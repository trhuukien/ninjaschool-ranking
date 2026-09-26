import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;

  const dataDir = path.join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "app.db");

  db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_name TEXT UNIQUE NOT NULL,
      owner TEXT,
      class TEXT,
      level TEXT,
      pt TEXT,
      note TEXT,
      elo REAL NOT NULL DEFAULT 1000,
      games_played INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      draws INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      played_at TEXT NOT NULL DEFAULT (datetime('now')),
      result TEXT NOT NULL CHECK(result IN ('A','B','DRAW')),
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS match_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id),
      member_id INTEGER NOT NULL REFERENCES members(id),
      team TEXT NOT NULL CHECK(team IN ('A','B')),
      elo_before REAL NOT NULL,
      elo_after REAL NOT NULL,
      elo_change REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_match_participants_match ON match_participants(match_id);
    CREATE INDEX IF NOT EXISTS idx_match_participants_member ON match_participants(member_id);
  `);

  migrate(db);

  return db;
}

// `CREATE TABLE IF NOT EXISTS` above doesn't add columns to a table that
// already exists from before this field was introduced — that needs an
// explicit ALTER TABLE, guarded by checking the column isn't already there.
function migrate(db: DatabaseSync) {
  const existing = new Set(
    (db.prepare("PRAGMA table_info(members)").all() as { name: string }[]).map((c) => c.name),
  );
  const newColumns: Record<string, string> = {
    icon: "INTEGER",
    avatar_id: "INTEGER",
    skill_ids: "TEXT",
    item_ids: "TEXT",
  };
  for (const [name, type] of Object.entries(newColumns)) {
    if (!existing.has(name)) {
      db.exec(`ALTER TABLE members ADD COLUMN ${name} ${type}`);
    }
  }
}
