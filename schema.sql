-- 您需要在 Cloudflare D1 控制台执行此 SQL
DROP TABLE IF EXISTS GameRooms;

CREATE TABLE GameRooms (
    id TEXT PRIMARY KEY,
    created_date TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    room_name TEXT NOT NULL,
    room_code TEXT NOT NULL UNIQUE,
    rounds INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting', -- "waiting", "in_progress", "completed"
    player1_id TEXT NOT NULL,
    player2_id TEXT,
    -- 为了简化，我们将用户名称直接冗余存储，避免前端多次查询
    player1_full_name TEXT,
    player2_full_name TEXT,
    current_round INTEGER DEFAULT 1 NOT NULL,
    player1_numbers TEXT DEFAULT '[]' NOT NULL, -- 将数组存储为 JSON 字符串
    player2_numbers TEXT DEFAULT '[]' NOT NULL,
    player1_score INTEGER DEFAULT 0 NOT NULL,
    player2_score INTEGER DEFAULT 0 NOT NULL,
    winner_id TEXT
);

-- 为 room_code 和 status 创建索引以提高查询性能
CREATE INDEX idx_room_code_status ON GameRooms (room_code, status);
CREATE INDEX idx_status ON GameRooms (status);