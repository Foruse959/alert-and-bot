const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { config } = require('../config');

let db = null;
let SQL = null;

/**
 * Initialize the database connection and create tables
 */
async function initDatabase() {
    // Initialize SQL.js
    SQL = await initSqlJs();

    // Ensure data directory exists
    const dbDir = path.dirname(config.databasePath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    // Load existing database or create new one
    try {
        if (fs.existsSync(config.databasePath)) {
            const fileBuffer = fs.readFileSync(config.databasePath);
            db = new SQL.Database(fileBuffer);
            console.log('✅ Database loaded from file');
        } else {
            db = new SQL.Database();
            console.log('✅ New database created');
        }
    } catch (error) {
        console.log('⚠️  Creating fresh database:', error.message);
        db = new SQL.Database();
    }

    // Create tables
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.run(schema);

    // Save database periodically
    setInterval(saveDatabase, 30000); // Every 30 seconds

    console.log('✅ Database initialized');
    return db;
}

/**
 * Save database to file
 */
function saveDatabase() {
    if (!db) return;
    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(config.databasePath, buffer);
    } catch (error) {
        console.error('Error saving database:', error.message);
    }
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

/**
 * Helper to run a query and get results
 */
function query(sql, params = []) {
    const stmt = getDb().prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

/**
 * Helper to run a statement
 */
function run(sql, params = []) {
    getDb().run(sql, params);
    saveDatabase();
}

// =====================
// USER OPERATIONS
// =====================

function createUser(chatId, username = null) {
    run(`
    INSERT INTO users (chat_id, username) VALUES (?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET username = excluded.username, updated_at = datetime('now')
  `, [chatId, username]);

    // Create default settings
    run(`INSERT OR IGNORE INTO settings (chat_id) VALUES (?)`, [chatId]);

    return getUser(chatId);
}

function getUser(chatId) {
    const results = query('SELECT * FROM users WHERE chat_id = ?', [chatId]);
    return results[0] || null;
}

function getAllActiveUsers() {
    return query('SELECT * FROM users WHERE is_active = 1');
}

function setWhatsAppNumber(chatId, phoneNumber) {
    run('UPDATE users SET whatsapp_number = ?, updated_at = datetime(\'now\') WHERE chat_id = ?', [phoneNumber, chatId]);
}

// =====================
// WATCHED ACCOUNTS
// =====================

function addWatchedAccount(chatId, twitterUsername, twitterUserId = null) {
    const username = twitterUsername.replace('@', '').toLowerCase();
    run(`
    INSERT INTO watched_accounts (chat_id, twitter_username, twitter_user_id)
    VALUES (?, ?, ?)
    ON CONFLICT(chat_id, twitter_username) DO UPDATE SET twitter_user_id = excluded.twitter_user_id
  `, [chatId, username, twitterUserId]);
}

function removeWatchedAccount(chatId, twitterUsername) {
    const username = twitterUsername.replace('@', '').toLowerCase();
    const before = query('SELECT COUNT(*) as count FROM watched_accounts WHERE chat_id = ? AND twitter_username = ?', [chatId, username]);
    run('DELETE FROM watched_accounts WHERE chat_id = ? AND twitter_username = ?', [chatId, username]);
    const after = query('SELECT COUNT(*) as count FROM watched_accounts WHERE chat_id = ? AND twitter_username = ?', [chatId, username]);
    return before[0]?.count > after[0]?.count;
}

function getWatchedAccounts(chatId) {
    return query('SELECT * FROM watched_accounts WHERE chat_id = ?', [chatId]);
}

function getAllWatchedAccounts() {
    return query('SELECT DISTINCT twitter_username, twitter_user_id FROM watched_accounts');
}

function updateLastTweetId(chatId, twitterUsername, lastTweetId) {
    const username = twitterUsername.replace('@', '').toLowerCase();
    run('UPDATE watched_accounts SET last_tweet_id = ? WHERE chat_id = ? AND twitter_username = ?', [lastTweetId, chatId, username]);
}

function getLastTweetId(twitterUsername) {
    const username = twitterUsername.replace('@', '').toLowerCase();
    const results = query('SELECT MAX(last_tweet_id) as last_tweet_id FROM watched_accounts WHERE twitter_username = ?', [username]);
    return results[0]?.last_tweet_id;
}

// =====================
// KEYWORDS
// =====================

function addKeyword(chatId, keyword, caseSensitive = false) {
    const kw = caseSensitive ? keyword : keyword.toLowerCase();
    const before = query('SELECT COUNT(*) as count FROM keywords WHERE chat_id = ? AND keyword = ?', [chatId, kw]);
    run(`
    INSERT INTO keywords (chat_id, keyword, is_case_sensitive)
    VALUES (?, ?, ?)
    ON CONFLICT(chat_id, keyword) DO NOTHING
  `, [chatId, kw, caseSensitive ? 1 : 0]);
    const after = query('SELECT COUNT(*) as count FROM keywords WHERE chat_id = ? AND keyword = ?', [chatId, kw]);
    return after[0]?.count > before[0]?.count;
}

function removeKeyword(chatId, keyword) {
    const before = query('SELECT COUNT(*) as count FROM keywords WHERE chat_id = ? AND LOWER(keyword) = LOWER(?)', [chatId, keyword]);
    run('DELETE FROM keywords WHERE chat_id = ? AND LOWER(keyword) = LOWER(?)', [chatId, keyword]);
    return before[0]?.count > 0;
}

function getKeywords(chatId) {
    return query('SELECT * FROM keywords WHERE chat_id = ?', [chatId]);
}

// =====================
// SETTINGS
// =====================

function getSettings(chatId) {
    let results = query('SELECT * FROM settings WHERE chat_id = ?', [chatId]);

    if (results.length === 0) {
        run('INSERT OR IGNORE INTO settings (chat_id) VALUES (?)', [chatId]);
        results = query('SELECT * FROM settings WHERE chat_id = ?', [chatId]);
    }

    return results[0] || {
        alert_retweets: 1,
        alert_mentions: 1,
        alert_quotes: 1,
        alert_replies: 0,
        keywords_only: 0,
        is_paused: 0,
        telegram_enabled: 1
    };
}

function updateSetting(chatId, settingName, value) {
    const allowedSettings = [
        'alert_retweets', 'alert_mentions', 'alert_quotes', 'alert_replies',
        'keywords_only', 'is_paused', 'whatsapp_enabled', 'telegram_enabled'
    ];

    if (!allowedSettings.includes(settingName)) {
        throw new Error(`Invalid setting: ${settingName}`);
    }

    run(`UPDATE settings SET ${settingName} = ? WHERE chat_id = ?`, [value ? 1 : 0, chatId]);
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
    const results = query('SELECT 1 FROM alert_history WHERE chat_id = ? AND tweet_id = ?', [chatId, tweetId]);
    return results.length > 0;
}

function recordAlert(chatId, tweetId) {
    run('INSERT OR IGNORE INTO alert_history (chat_id, tweet_id) VALUES (?, ?)', [chatId, tweetId]);
}

function cleanOldAlerts(daysToKeep = 7) {
    run(`DELETE FROM alert_history WHERE sent_at < datetime('now', '-' || ? || ' days')`, [daysToKeep]);
}

// =====================
// UTILITY
// =====================

function getUsersWatchingAccount(twitterUsername) {
    const username = twitterUsername.replace('@', '').toLowerCase();
    return query(`
    SELECT u.*, s.*, wa.last_tweet_id
    FROM users u
    JOIN watched_accounts wa ON u.chat_id = wa.chat_id
    JOIN settings s ON u.chat_id = s.chat_id
    WHERE wa.twitter_username = ? AND u.is_active = 1 AND s.is_paused = 0
  `, [username]);
}

module.exports = {
    initDatabase,
    saveDatabase,
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
