CREATE TABLE IF NOT EXISTS vault (
    id INTEGER PRIMARY KEY,
    password_hash TEXT NOT NULL,
    api_id TEXT NOT NULL,
    api_hash TEXT NOT NULL,
    encrypted_payload TEXT NOT NULL,
    salt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    key_secret TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME
);
