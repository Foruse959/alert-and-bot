let telegramBot = null;

/**
 * Set the Telegram bot instance (called from telegram/bot.js)
 */
function setTelegramBot(bot) {
    telegramBot = bot;
}

/**
 * Format alert message for Telegram
 */
function formatTelegramAlert(alert) {
    const { tweet, tweetType, twitterUsername, matchedKeywords } = alert;

    let typeEmoji = '🐦';
    let typeLabel = 'Tweet';

    switch (tweetType) {
        case 'retweet':
            typeEmoji = '🔁';
            typeLabel = 'Retweet';
            break;
        case 'quote':
            typeEmoji = '💬';
            typeLabel = 'Quote Tweet';
            break;
        case 'reply':
            typeEmoji = '↩️';
            typeLabel = 'Reply';
            break;
    }

    let message = `${typeEmoji} <b>${typeLabel} Alert</b>\n\n`;
    message += `👤 <b>@${twitterUsername}</b>\n`;
    message += `📝 ${escapeHtml(tweet.text)}\n\n`;

    if (matchedKeywords && matchedKeywords.length > 0) {
        message += `🔑 <i>Matched: ${matchedKeywords.join(', ')}</i>\n`;
    }

    // Use the direct link from tweet if available
    const tweetUrl = tweet.link || `https://twitter.com/${twitterUsername}/status/${tweet.id}`;
    message += `\n🔗 <a href="${tweetUrl}">View Tweet</a>`;

    return message;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Send alert to user via Telegram
 */
async function sendAlert(alert) {
    const { chatId } = alert;

    // Send to Telegram
    if (telegramBot) {
        try {
            const message = formatTelegramAlert(alert);
            await telegramBot.sendMessage(chatId, message, {
                parse_mode: 'HTML',
                disable_web_page_preview: false,
            });
            console.log(`📨 Telegram alert sent to ${chatId}`);
            return { telegram: true };
        } catch (error) {
            console.error(`❌ Telegram send failed to ${chatId}:`, error.message);
        }
    }

    return { telegram: false };
}

/**
 * Send a simple notification message
 */
async function sendNotification(chatId, message, options = {}) {
    if (telegramBot) {
        try {
            await telegramBot.sendMessage(chatId, message, {
                parse_mode: 'HTML',
                ...options,
            });
            return true;
        } catch (error) {
            console.error(`❌ Notification failed to ${chatId}:`, error.message);
        }
    }
    return false;
}

module.exports = {
    setTelegramBot,
    formatTelegramAlert,
    sendAlert,
    sendNotification,
};
