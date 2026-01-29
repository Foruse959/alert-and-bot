const twitter = require('./client');
const db = require('../database/db');
const filterEngine = require('../filters/engine');
const dispatcher = require('../alerts/dispatcher');
const { config } = require('../config');

let isRunning = false;
let pollTimeout = null;

/**
 * Start the Twitter monitoring service
 */
async function startMonitoring() {
    if (isRunning) {
        console.log('⚠️  Monitor already running');
        return;
    }

    isRunning = true;
    console.log(`🔄 Starting Twitter monitor (polling every ${config.pollInterval / 1000}s)`);

    // Start polling loop
    poll();
}

/**
 * Stop the monitoring service
 */
function stopMonitoring() {
    isRunning = false;
    if (pollTimeout) {
        clearTimeout(pollTimeout);
        pollTimeout = null;
    }
    console.log('⏹️  Twitter monitor stopped');
}

/**
 * Main polling function
 */
async function poll() {
    if (!isRunning) return;

    try {
        await checkAllWatchedAccounts();
    } catch (error) {
        console.error('Error in poll cycle:', error.message);
    }

    // Schedule next poll
    pollTimeout = setTimeout(poll, config.pollInterval);
}

/**
 * Check all watched Twitter accounts for new tweets
 */
async function checkAllWatchedAccounts() {
    const accounts = db.getAllWatchedAccounts();

    if (accounts.length === 0) {
        return;
    }

    console.log(`📡 Checking ${accounts.length} watched accounts...`);

    for (const account of accounts) {
        try {
            await checkAccount(account);
            // Small delay between accounts to avoid rate limits
            await sleep(1000);
        } catch (error) {
            console.error(`Error checking @${account.twitter_username}:`, error.message);
        }
    }
}

/**
 * Check a single account for new tweets
 */
async function checkAccount(account) {
    // Get user ID if we don't have it
    let userId = account.twitter_user_id;
    if (!userId) {
        const user = await twitter.getUserByUsername(account.twitter_username);
        if (!user) {
            console.warn(`⚠️  Could not find Twitter user @${account.twitter_username}`);
            return;
        }
        userId = user.id;
        // Update all entries with this user ID
        db.addWatchedAccount(account.chat_id, account.twitter_username, userId);
    }

    // Get last tweet ID for this account (global, not per-user)
    const lastTweetId = db.getLastTweetId(account.twitter_username);

    // Fetch new tweets
    const result = await twitter.getUserTweets(userId, lastTweetId, 10);

    if (!result.data || result.data.length === 0) {
        return;
    }

    console.log(`📝 Found ${result.data.length} new tweets from @${account.twitter_username}`);

    // Process tweets (oldest first)
    const tweets = [...result.data].reverse();

    for (const tweet of tweets) {
        // Process tweet through filter engine
        const alerts = filterEngine.processTweetForAlerts(tweet, account.twitter_username);

        // Send alerts
        for (const alert of alerts) {
            await dispatcher.sendAlert(alert);
            db.recordAlert(alert.chatId, tweet.id);
        }

        // Update last tweet ID for all users watching this account
        db.updateLastTweetId(account.chat_id, account.twitter_username, tweet.id);
    }
}

/**
 * Helper function to sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Force check a specific account (useful for testing)
 */
async function forceCheck(twitterUsername) {
    const account = { twitter_username: twitterUsername.replace('@', ''), twitter_user_id: null };
    await checkAccount(account);
}

module.exports = {
    startMonitoring,
    stopMonitoring,
    forceCheck,
};
