const db = require('../database/db');

/**
 * Filter Engine - Determines if a tweet should trigger an alert
 */

/**
 * Check if tweet text contains any of the user's keywords
 */
function matchesKeywords(tweetText, keywords) {
    if (!keywords || keywords.length === 0) {
        return { matches: false, matched: [] };
    }

    const matched = [];
    for (const kw of keywords) {
        const text = kw.is_case_sensitive ? tweetText : tweetText.toLowerCase();
        const keyword = kw.is_case_sensitive ? kw.keyword : kw.keyword.toLowerCase();

        if (text.includes(keyword)) {
            matched.push(kw.keyword);
        }
    }

    return {
        matches: matched.length > 0,
        matched,
    };
}

/**
 * Check if tweet should be sent as alert based on user settings
 */
function shouldSendAlert(tweet, tweetType, userSettings, userKeywords) {
    // Check if paused
    if (userSettings.is_paused) {
        return { send: false, reason: 'alerts paused' };
    }

    // Check tweet type against settings
    if (tweetType === 'retweet' && !userSettings.alert_retweets) {
        return { send: false, reason: 'retweets disabled' };
    }

    if (tweetType === 'reply' && !userSettings.alert_replies) {
        return { send: false, reason: 'replies disabled' };
    }

    if (tweetType === 'quote' && !userSettings.alert_quotes) {
        return { send: false, reason: 'quotes disabled' };
    }

    // Check keywords
    const keywordMatch = matchesKeywords(tweet.text, userKeywords);

    // If keywords_only mode, require keyword match
    if (userSettings.keywords_only && !keywordMatch.matches) {
        return { send: false, reason: 'no keyword match (keywords_only mode)' };
    }

    return {
        send: true,
        reason: keywordMatch.matches ? `matched keywords: ${keywordMatch.matched.join(', ')}` : 'all tweets mode',
        matchedKeywords: keywordMatch.matched,
    };
}

/**
 * Process a tweet and determine which users should receive alerts
 */
function processTweetForAlerts(tweet, twitterUsername) {
    const users = db.getUsersWatchingAccount(twitterUsername);
    const alerts = [];

    const tweetType = require('../twitter/client').getTweetType(tweet);

    for (const user of users) {
        // Check if already sent
        if (db.hasAlertBeenSent(user.chat_id, tweet.id)) {
            continue;
        }

        // Get user's keywords
        const keywords = db.getKeywords(user.chat_id);

        // Check if should send
        const result = shouldSendAlert(tweet, tweetType, user, keywords);

        if (result.send) {
            alerts.push({
                chatId: user.chat_id,
                whatsappNumber: user.whatsapp_number,
                whatsappEnabled: user.whatsapp_enabled,
                telegramEnabled: user.telegram_enabled,
                tweet,
                tweetType,
                twitterUsername,
                matchedKeywords: result.matchedKeywords || [],
                reason: result.reason,
            });
        }
    }

    return alerts;
}

module.exports = {
    matchesKeywords,
    shouldSendAlert,
    processTweetForAlerts,
};
