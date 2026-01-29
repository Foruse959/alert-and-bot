const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { config } = require('../config');

let db = null;

/**
 * Initialize the database connection and create tables
 */
function initDatabase() {
    // Ensure data directory exists
    const dbDir = path.dirname(config.databasePath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(config.databasePath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    console.log('✅ Database initialized');
    return db;
}

/**
 * Get database instance
 */
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

// =====================
// USER OPERATIONS
// =====================

function createUser(chatId, username = null) {
    const stmt = getDb().prepare(`
    INSERT INTO users (chat_id, username) VALUES (?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET username = excluded.username, updated_at = CURRENT_TIMESTAMP
  `);
    stmt.run(chatId, username);

    // Create default settings
    const settingsStmt = getDb().prepare(`
    INSERT OR IGNORE INTO settings (chat_id) VALUES (?)
  `);
    settingsStmt.run(chatId);

    return getUser(chatId);
}

function getUser(chatId) {
    const stmt = getDb().prepare('SELECT * FROM users WHERE chat_id = ?');
    return stmt.get(chatId);
}

function getAllActiveUsers() {
    const stmt = getDb().prepare('SELECT * FROM users WHERE is_active = 1');
    return stmt.all();
}

function setWhatsAppNumber(chatId, phoneNumber) {
    const stmt = getDb().prepare('UPDATE users SET whatsapp_number = ?, updated_at = CURRENT_TIMESTAMP WHERE chat_id = ?');
    stmt.run(phoneNumber, chatId);
}

// =====================
// WATCHED ACCOUNTS
// =====================

function addWatchedAccount(chatId, twitterUsername, twitterUserId = null) {
    const username = twitterUsername.replace('@', '').toLowerCase();
    const stmt = getDb().prepare(`
    INSERT INTO watched_accounts (chat_id, twitter_username, twitter_user_id)
    VALUES (?, ?, ?)
    ON CONFLICT(chat_id, twitter_username) DO UPDATE SET twitter_user_id = excluded.twitter_user_id
  `);
    stmt.run(chatId, username, twitterUserId);
}

function removeWatchedAccount(chatId, twitterUsername) {
    const username = twitterUsername.replace('@', '').toLowerCase();
    const stmt = getDb().prepare('DELETE FROM watched_accounts WHERE chat_id = ? AND twitter_username = ?');
    const result = stmt.run(chatId, username);
    return result.changes > 0;
}

function getWatchedAccounts(chatId) {
    const stmt = getDb().prepare('SELECT * FROM watched_accounts WHERE chat_id = ?');
    return stmt.all(chatId);
}

function getAllWatchedAccounts() {
    const stmt = getDb().prepare('SELECT DISTINCT twitter_username, twitter_user_id FROM watched_accounts');
    return stmt.all();
}

function updateLastTweetId(chatId, twitterUsername, lastTweetId) {
    const username = twitterUsername.replace('@', '').toLowerCase();
    const stmt = getDb().prepare('UPDATE watched_accounts SET last_tweet_id = ? WHERE chat_id = ? AND twitter_username = ?');
    stmt.run(lastTweetId, chatId, username);
}

function getLastTweetId(twitterUsername) {
    const username = twitterUsername.replace('@', '').toLowerCase();
    const stmt = getDb().prepare('SELECT MAX(last_tweet_id) as last_tweet_id FROM watched_accounts WHERE twitter_username = ?');
    const result = stmt.get(username);
    return result?.last_tweet_id;
}

// =====================
// KEYWORDS
// =====================

function addKeyword(chatId, keyword, caseSensitive = false) {
    const kw = caseSensitive ? keyword : keyword.toLowerCase();
    const stmt = getDb().prepare(`
    INSERT INTO keywords (chat_id, keyword, is_case_sensitive)
    VALUES (?, ?, ?)
    ON CONFLICT(chat_id, keyword) DO NOTHING
  `);
    const result = stmt.run(chatId, kw, caseSensitive ? 1 : 0);
    return result.changes > 0;
}

function removeKeyword(chatId, keyword) {
    const stmt = getDb().prepare('DELETE FROM keywords WHERE chat_id = ? AND LOWER(keyword) = LOWER(?)');
    const result = stmt.run(chatId, keyword);
    return result.changes > 0;
}

function getKeywords(chatId) {
    const stmt = getDb().prepare('SELECT * FROM keywords WHERE chat_id = ?');
    return stmt.all(chatId);
}

// =====================
// SETTINGS
// =====================

function getSettings(chatId) {
    const stmt = getDb().prepare('SELECT * FROM settings WHERE chat_id = ?');
    let settings = stmt.get(chatId);

    if (!settings) {
        const insertStmt = getDb().prepare('INSERT OR IGNORE INTO settings (chat_id) VALUES (?)');
        insertStmt.run(chatId);
        settings = stmt.get(chatId);
    }

    return settings;
}

function updateSetting(chatId, settingName, value) {
    const allowedSettings = [
        'alert_retweets', 'alert_mentions', 'alert_quotes', 'alert_replies',
        'keywords_only', 'is_paused', 'whatsapp_enabled', 'telegram_enabled'
    ];

    if (!allowedSettings.includes(settingName)) {
        throw new Error(`Invalid setting: ${settingName}`);
    }

    const stmt = getDb().prepare(`UPDATE settings SET ${settingName} = ? WHERE chat_id = ?`);
    stmt.run(value ? 1 : 0, chatId);
}

function toggleSetting(chatId, settingName) {
    const settings = getSettings(chatId);
    const currentValue = settings[settingName];
    updateSetting(chatId, settingName, !currentValue);
    return !currentValue;
}

// =====================
// ALERT HISTORY
// =====================

function hasAlertBeenSent(chatId, tweetId) {
    const stmt = getDb().prepare('SELECT 1 FROM alert_history WHERE chat_id = ? AND tweet_id = ?');
    return !!stmt.get(chatId, tweetId);
}

function recordAlert(chatId, tweetId) {
    const stmt = getDb().prepare('INSERT OR IGNORE INTO alert_history (chat_id, tweet_id) VALUES (?, ?)');
    stmt.run(chatId, tweetId);
}

function cleanOldAlerts(daysToKeep = 7) {
    const stmt = getDb().prepare(`DELETE FROM alert_history WHERE sent_at < datetime('now', '-' || ? || ' days')`);
    stmt.run(daysToKeep);
}

// =====================
// UTILITY
// =====================

function getUsersWatchingAccount(twitterUsername) {
    const username = twitterUsername.replace('@', '').toLowerCase();
    const stmt = getDb().prepare(`
    SELECT u.*, s.*, wa.last_tweet_id
    FROM users u
    JOIN watched_accounts wa ON u.chat_id = wa.chat_id
    JOIN settings s ON u.chat_id = s.chat_id
    WHERE wa.twitter_username = ? AND u.is_active = 1 AND s.is_paused = 0
  `);
    return stmt.all(username);
}

module.exports = {
    initDatabase,
    getDb,
    // Users
    createUser,
    getUser,
    getAllActiveUsers,
    setWhatsAppNumber,
    // Watched accounts
    addWatchedAccount,
    removeWatchedAccount,
    getWatchedAccounts,
    getAllWatchedAccounts,
    updateLastTweetId,
    getLastTweetId,
    // Keywords
    addKeyword,
    removeKeyword,
    getKeywords,
    // Settings
    getSettings,
    updateSetting,
    toggleSetting,
    // Alert history
    hasAlertBeenSent,
    recordAlert,
    cleanOldAlerts,
    // Utility
    getUsersWatchingAccount,
};
