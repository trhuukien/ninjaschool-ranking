CREATE TABLE members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_name TEXT UNIQUE NOT NULL,
  owner TEXT,
  class TEXT,
  level TEXT,
  pt TEXT,
  note TEXT,
  icon INTEGER,
  avatar_id INTEGER,
  skill_ids TEXT,
  item_ids TEXT,
  elo REAL NOT NULL DEFAULT 1000,
  games_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  played_at TEXT NOT NULL DEFAULT (datetime('now')),
  result TEXT NOT NULL CHECK(result IN ('A','B','DRAW')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE match_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES matches(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  team TEXT NOT NULL CHECK(team IN ('A','B')),
  elo_before REAL NOT NULL,
  elo_after REAL NOT NULL,
  elo_change REAL NOT NULL
);

CREATE INDEX idx_match_participants_match ON match_participants(match_id);
CREATE INDEX idx_match_participants_member ON match_participants(member_id);
