-- Twitter Alert Bot Database Schema

-- Users table: Telegram chat IDs
CREATE TABLE IF NOT EXISTS users (
    chat_id INTEGER PRIMARY KEY,
    username TEXT,
    whatsapp_number TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Watched Twitter accounts
CREATE TABLE IF NOT EXISTS watched_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    twitter_username TEXT NOT NULL,
    twitter_user_id TEXT,
    last_tweet_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id) ON DELETE CASCADE,
    UNIQUE(chat_id, twitter_username)
);

-- Keywords to track
CREATE TABLE IF NOT EXISTS keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    is_case_sensitive INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id) ON DELETE CASCADE,
    UNIQUE(chat_id, keyword)
);

-- User settings
CREATE TABLE IF NOT EXISTS settings (
    chat_id INTEGER PRIMARY KEY,
    alert_retweets INTEGER DEFAULT 1,
    alert_mentions INTEGER DEFAULT 1,
    alert_quotes INTEGER DEFAULT 1,
    alert_replies INTEGER DEFAULT 0,
    keywords_only INTEGER DEFAULT 0,
    is_paused INTEGER DEFAULT 0,
    whatsapp_enabled INTEGER DEFAULT 1,
    telegram_enabled INTEGER DEFAULT 1,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id) ON DELETE CASCADE
);

-- Alert history (for avoiding duplicates)
CREATE TABLE IF NOT EXISTS alert_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    tweet_id TEXT NOT NULL,
    sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id) ON DELETE CASCADE,
    UNIQUE(chat_id, tweet_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_watched_accounts_chat_id ON watched_accounts(chat_id);
CREATE INDEX IF NOT EXISTS idx_keywords_chat_id ON keywords(chat_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_tweet_id ON alert_history(tweet_id);
