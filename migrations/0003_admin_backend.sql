-- Admin-managed data replaces the Google Sheet import. Starts from scratch:
-- the old sheet-shaped tables (and every match/member in them) are dropped.

DROP TABLE IF EXISTS match_participants;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS members;

-- ---------------------------------------------------------------------------
-- Admin accounts and their login sessions.

CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  -- "pbkdf2$<iterations>$<salt b64>$<hash b64>", see src/lib/auth/password.ts
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE admin_sessions (
  -- SHA-256 of the random token kept in the visitor's cookie; the token
  -- itself is never stored.
  token_hash TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_admin_sessions_admin ON admin_sessions(admin_id);

-- ---------------------------------------------------------------------------
-- Character sprites: the pieces a standing character is assembled from.

CREATE TABLE sprites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('head', 'body', 'leg', 'yoroi')),
  name TEXT NOT NULL,
  -- JSON array of game icon ids, played in a loop (one id = no animation).
  frames TEXT NOT NULL,
  -- Position in sprite px relative to the body's top-left. offset_x is the
  -- sprite's left edge, except for a yoroi, whose frames differ in width and
  -- hang from one point: there it is the right edge.
  offset_x INTEGER NOT NULL DEFAULT 0,
  offset_y INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Members (characters) and the ranking numbers that matches keep updated.

CREATE TABLE members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_name TEXT NOT NULL UNIQUE,
  owner TEXT,
  class TEXT CHECK (class IN ('Kiếm', 'Tiêu', 'Kunai', 'Cung', 'Đao', 'Quạt')),
  level INTEGER,
  pt INTEGER,
  -- Clan-role badge icon (see ROLE_LABEL in src/components/GameAssets.tsx).
  icon INTEGER,
  avatar_id INTEGER,
  -- Comma-separated skill icon ids, in display order.
  skill_ids TEXT,
  elo REAL NOT NULL DEFAULT 1000,
  games_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- How the main body ("main") and the clone ("clone") look, plus their stats.
CREATE TABLE member_appearance (
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  holder TEXT NOT NULL CHECK (holder IN ('main', 'clone')),
  head_sprite_id INTEGER REFERENCES sprites(id) ON DELETE SET NULL,
  body_sprite_id INTEGER REFERENCES sprites(id) ON DELETE SET NULL,
  leg_sprite_id INTEGER REFERENCES sprites(id) ON DELETE SET NULL,
  yoroi_sprite_id INTEGER REFERENCES sprites(id) ON DELETE SET NULL,
  -- Free text for the panel's info box, one stat per line (HP, MP, ...).
  stats TEXT,
  PRIMARY KEY (member_id, holder)
);

-- One row per filled equipment slot, for the main body or the clone.
CREATE TABLE member_equipment (
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  holder TEXT NOT NULL CHECK (holder IN ('main', 'clone')),
  slot TEXT NOT NULL CHECK (slot IN (
    'hat', 'armor', 'gloves', 'pants', 'boots',
    'weapon', 'necklace', 'ring', 'jade', 'charm',
    'pet', 'mask', 'yoroi', 'clan', 'eye', 'book'
  )),
  item_icon INTEGER NOT NULL,
  -- "+N" upgrade level, -1 when the item has none.
  upgrade INTEGER NOT NULL DEFAULT -1 CHECK (upgrade BETWEEN -1 AND 16),
  -- Tinh luyện level, -1 when the item has none.
  refine INTEGER NOT NULL DEFAULT -1 CHECK (refine BETWEEN -1 AND 9),
  PRIMARY KEY (member_id, holder, slot)
);

-- ---------------------------------------------------------------------------
-- Matches. elo_* on participants are rewritten whenever history changes.

CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  played_at TEXT NOT NULL DEFAULT (datetime('now')),
  result TEXT NOT NULL CHECK (result IN ('A', 'B', 'DRAW')),
  note TEXT,
  created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE match_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id),
  team TEXT NOT NULL CHECK (team IN ('A', 'B')),
  elo_before REAL NOT NULL,
  elo_after REAL NOT NULL,
  elo_change REAL NOT NULL
);

CREATE INDEX idx_match_participants_match ON match_participants(match_id);
CREATE INDEX idx_match_participants_member ON match_participants(member_id);

-- ---------------------------------------------------------------------------
-- Starter sprite library (the pieces the equipment-panel demo was built from).

INSERT INTO sprites (kind, name, frames, offset_x, offset_y) VALUES
  ('head', 'Đầu tóc đen', '[432]', 16, 0),
  ('head', 'Đầu tóc vàng (mặt nạ 1602)', '[1588]', -4, -24),
  ('body', 'Áo giáp vàng', '[2334]', 0, 66),
  ('leg', 'Quần giáp vàng', '[2351]', 24, 107),
  ('yoroi', 'Yoroi đỏ', '[2029,2030,2031]', 94, 60),
  ('yoroi', 'Yoroi bạc', '[2032,2033,2034]', 94, 60),
  ('yoroi', 'Yoroi xanh', '[2035,2036,2037]', 94, 60);
