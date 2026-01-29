const db = require('../database/db');
const twitter = require('../twitter/client');

/**
 * All Telegram command handlers
 */

// =====================
// /start - Initialize bot
// =====================
async function handleStart(bot, msg) {
    const chatId = msg.chat.id;
    const username = msg.from.username || msg.from.first_name;

    // Create or update user
    db.createUser(chatId, username);

    const welcomeMessage = `
🐦 <b>Twitter Alert Bot</b> (FREE!)

Welcome, <b>${username}</b>! I'll monitor Twitter and send you instant alerts.

🆓 <i>No Twitter API needed - uses Nitter RSS!</i>

<b>Quick Start:</b>
1️⃣ Add accounts: <code>/add @username</code>
2️⃣ Add keywords: <code>/keyword add claim</code>
3️⃣ View settings: <code>/settings</code>

<b>All Commands:</b>
/help - Show all commands
/add @handle - Watch a Twitter account
/remove @handle - Stop watching
/list - Show watched accounts
/keyword add/remove [word] - Manage keywords
/keywords - List all keywords
/settings - View & edit settings
/pause - Pause alerts
/resume - Resume alerts

Let's go! Add your first account with /add @username
`;

    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
}

// =====================
// /help - Show commands
// =====================
async function handleHelp(bot, msg) {
    const chatId = msg.chat.id;

    const helpMessage = `
📚 <b>Command Reference</b>

<b>📡 Monitoring:</b>
/add @handle - Add Twitter account to watch
/remove @handle - Remove Twitter account
/list - Show all watched accounts

<b>🔑 Keywords:</b>
/keyword add [word] - Add keyword filter
/keyword remove [word] - Remove keyword
/keywords - List all keywords

<b>⚙️ Settings:</b>
/settings - Interactive settings menu
/toggle retweets - Enable/disable RT alerts
/toggle mentions - Enable/disable mentions
/toggle quotes - Enable/disable quotes
/toggle replies - Enable/disable replies
/toggle keywords_only - Only alert on keyword match

<b>🎮 Controls:</b>
/pause - Pause all alerts
/resume - Resume alerts
/status - Check bot status
`;

    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
}

// =====================
// /add - Add Twitter account to watch
// =====================
async function handleAdd(bot, msg, match) {
    const chatId = msg.chat.id;
    const username = match[1]?.replace('@', '').trim();

    if (!username) {
        await bot.sendMessage(chatId, '❌ Please specify a Twitter username.\nExample: <code>/add @elonmusk</code>', { parse_mode: 'HTML' });
        return;
    }

    await bot.sendMessage(chatId, `🔍 Adding @${username}...`);

    const twitterUser = await twitter.getUserByUsername(username);

    if (!twitterUser) {
        await bot.sendMessage(chatId, `❌ Could not verify @${username}. The account may be private or suspended.`);
        return;
    }

    // Add to database
    db.createUser(chatId, msg.from.username);
    db.addWatchedAccount(chatId, username, twitterUser.id);

    await bot.sendMessage(chatId,
        `✅ <b>Now watching:</b> @${twitterUser.username}\n\n` +
        `You'll receive alerts when they tweet.\n` +
        `Use /settings to customize alert types.`,
        { parse_mode: 'HTML' }
    );
}

// =====================
// /remove - Remove watched account
// =====================
async function handleRemove(bot, msg, match) {
    const chatId = msg.chat.id;
    const username = match[1]?.replace('@', '').trim();

    if (!username) {
        await bot.sendMessage(chatId, '❌ Please specify a Twitter username.\nExample: <code>/remove @elonmusk</code>', { parse_mode: 'HTML' });
        return;
    }

    const removed = db.removeWatchedAccount(chatId, username);

    if (removed) {
        await bot.sendMessage(chatId, `✅ Stopped watching @${username}`);
    } else {
        await bot.sendMessage(chatId, `❌ You weren't watching @${username}`);
    }
}

// =====================
// /list - List watched accounts
// =====================
async function handleList(bot, msg) {
    const chatId = msg.chat.id;
    const accounts = db.getWatchedAccounts(chatId);

    if (accounts.length === 0) {
        await bot.sendMessage(chatId,
            '📭 You\'re not watching any accounts yet.\n\nUse <code>/add @username</code> to start!',
            { parse_mode: 'HTML' }
        );
        return;
    }

    let message = `📡 <b>Watched Accounts (${accounts.length})</b>\n\n`;

    for (const acc of accounts) {
        message += `• @${acc.twitter_username}\n`;
    }

    message += '\nUse <code>/remove @username</code> to stop watching.';

    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
}

// =====================
// /keyword - Add or remove keywords
// =====================
async function handleKeyword(bot, msg, match) {
    const chatId = msg.chat.id;
    const args = match[1]?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();
    const keyword = args.slice(1).join(' ');

    if (!action || !['add', 'remove'].includes(action)) {
        await bot.sendMessage(chatId,
            '❌ Usage:\n<code>/keyword add [word]</code>\n<code>/keyword remove [word]</code>',
            { parse_mode: 'HTML' }
        );
        return;
    }

    if (!keyword) {
        await bot.sendMessage(chatId, `❌ Please specify a keyword to ${action}.`);
        return;
    }

    db.createUser(chatId, msg.from.username);

    if (action === 'add') {
        const added = db.addKeyword(chatId, keyword);
        if (added) {
            await bot.sendMessage(chatId, `✅ Added keyword: <b>${keyword}</b>\n\nTweets containing this word will trigger alerts.`, { parse_mode: 'HTML' });
        } else {
            await bot.sendMessage(chatId, `ℹ️ Keyword "${keyword}" already exists.`);
        }
    } else {
        const removed = db.removeKeyword(chatId, keyword);
        if (removed) {
            await bot.sendMessage(chatId, `✅ Removed keyword: <b>${keyword}</b>`, { parse_mode: 'HTML' });
        } else {
            await bot.sendMessage(chatId, `❌ Keyword "${keyword}" not found.`);
        }
    }
}

// =====================
// /keywords - List keywords
// =====================
async function handleKeywords(bot, msg) {
    const chatId = msg.chat.id;
    const keywords = db.getKeywords(chatId);

    if (keywords.length === 0) {
        await bot.sendMessage(chatId,
            '📭 No keywords set.\n\nUse <code>/keyword add [word]</code> to add keywords.\n\n' +
            '💡 <i>Tip: Keywords like "claim", "airdrop", "mint" help filter important tweets!</i>',
            { parse_mode: 'HTML' }
        );
        return;
    }

    let message = `🔑 <b>Your Keywords (${keywords.length})</b>\n\n`;

    for (const kw of keywords) {
        message += `• ${kw.keyword}\n`;
    }

    message += '\nUse <code>/keyword remove [word]</code> to remove.';

    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
}

// =====================
// /settings - Interactive settings menu
// =====================
async function handleSettings(bot, msg) {
    const chatId = msg.chat.id;
    db.createUser(chatId, msg.from.username);
    const settings = db.getSettings(chatId);

    const on = '✅';
    const off = '❌';

    const keyboard = {
        inline_keyboard: [
            [
                { text: `${settings.alert_retweets ? on : off} Retweets`, callback_data: 'toggle_retweets' },
                { text: `${settings.alert_quotes ? on : off} Quotes`, callback_data: 'toggle_quotes' },
            ],
            [
                { text: `${settings.alert_mentions ? on : off} Mentions`, callback_data: 'toggle_mentions' },
                { text: `${settings.alert_replies ? on : off} Replies`, callback_data: 'toggle_replies' },
            ],
            [
                { text: `${settings.keywords_only ? on : off} Keywords Only`, callback_data: 'toggle_keywords_only' },
            ],
            [
                { text: settings.is_paused ? '▶️ Resume Alerts' : '⏸️ Pause Alerts', callback_data: 'toggle_pause' },
            ],
        ],
    };

    let message = `⚙️ <b>Your Settings</b>\n\n`;
    message += `<b>Tweet Types:</b>\n`;
    message += `• Retweets: ${settings.alert_retweets ? 'On' : 'Off'}\n`;
    message += `• Quotes: ${settings.alert_quotes ? 'On' : 'Off'}\n`;
    message += `• Mentions: ${settings.alert_mentions ? 'On' : 'Off'}\n`;
    message += `• Replies: ${settings.alert_replies ? 'On' : 'Off'}\n\n`;
    message += `<b>Mode:</b> ${settings.keywords_only ? 'Keywords Only' : 'All Tweets'}\n\n`;
    message += `<b>Status:</b> ${settings.is_paused ? '⏸️ Paused' : '▶️ Active'}\n\n`;
    message += `<i>Tap buttons below to toggle:</i>`;

    await bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
    });
}

// =====================
// Handle settings button callbacks
// =====================
async function handleSettingsCallback(bot, query) {
    const chatId = query.message.chat.id;
    const action = query.data;

    const settingMap = {
        'toggle_retweets': 'alert_retweets',
        'toggle_quotes': 'alert_quotes',
        'toggle_mentions': 'alert_mentions',
        'toggle_replies': 'alert_replies',
        'toggle_keywords_only': 'keywords_only',
        'toggle_pause': 'is_paused',
    };

    const settingName = settingMap[action];
    if (!settingName) {
        await bot.answerCallbackQuery(query.id, { text: 'Unknown action' });
        return;
    }

    const newValue = db.toggleSetting(chatId, settingName);

    const labels = {
        'alert_retweets': 'Retweets',
        'alert_quotes': 'Quotes',
        'alert_mentions': 'Mentions',
        'alert_replies': 'Replies',
        'keywords_only': 'Keywords Only',
        'is_paused': 'Alerts',
    };

    let feedback;
    if (settingName === 'is_paused') {
        feedback = newValue ? '⏸️ Alerts paused' : '▶️ Alerts resumed';
    } else {
        feedback = `${labels[settingName]}: ${newValue ? 'On' : 'Off'}`;
    }

    await bot.answerCallbackQuery(query.id, { text: feedback });

    // Refresh the settings message
    await handleSettings(bot, query.message);
}

// =====================
// /toggle - Quick toggle settings
// =====================
async function handleToggle(bot, msg, match) {
    const chatId = msg.chat.id;
    const setting = match[1]?.toLowerCase().trim();

    const settingMap = {
        'retweets': 'alert_retweets',
        'rt': 'alert_retweets',
        'quotes': 'alert_quotes',
        'quote': 'alert_quotes',
        'mentions': 'alert_mentions',
        'mention': 'alert_mentions',
        'replies': 'alert_replies',
        'reply': 'alert_replies',
        'keywords_only': 'keywords_only',
        'keywordsonly': 'keywords_only',
    };

    const settingName = settingMap[setting];

    if (!settingName) {
        await bot.sendMessage(chatId,
            '❌ Unknown setting. Available:\n• retweets\n• quotes\n• mentions\n• replies\n• keywords_only',
            { parse_mode: 'HTML' }
        );
        return;
    }

    db.createUser(chatId, msg.from.username);
    const newValue = db.toggleSetting(chatId, settingName);

    await bot.sendMessage(chatId, `✅ ${setting} is now: <b>${newValue ? 'ON' : 'OFF'}</b>`, { parse_mode: 'HTML' });
}

// =====================
// /pause - Pause alerts
// =====================
async function handlePause(bot, msg) {
    const chatId = msg.chat.id;
    db.createUser(chatId, msg.from.username);
    db.updateSetting(chatId, 'is_paused', true);
    await bot.sendMessage(chatId, '⏸️ Alerts paused. Use /resume to start receiving alerts again.');
}

// =====================
// /resume - Resume alerts
// =====================
async function handleResume(bot, msg) {
    const chatId = msg.chat.id;
    db.createUser(chatId, msg.from.username);
    db.updateSetting(chatId, 'is_paused', false);
    await bot.sendMessage(chatId, '▶️ Alerts resumed! You\'ll now receive new tweet alerts.');
}

// =====================
// /status - Bot status
// =====================
async function handleStatus(bot, msg) {
    const chatId = msg.chat.id;
    const accounts = db.getWatchedAccounts(chatId);
    const keywords = db.getKeywords(chatId);
    const settings = db.getSettings(chatId);

    let message = `📊 <b>Bot Status</b>\n\n`;
    message += `<b>Monitoring:</b> ${accounts.length} account(s)\n`;
    message += `<b>Keywords:</b> ${keywords.length} keyword(s)\n`;
    message += `<b>Alerts:</b> ${settings?.is_paused ? '⏸️ Paused' : '▶️ Active'}\n`;
    message += `<b>Method:</b> Nitter RSS (FREE)\n\n`;
    message += `🟢 Bot is running`;

    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
}

module.exports = {
    handleStart,
    handleHelp,
    handleAdd,
    handleRemove,
    handleList,
    handleKeyword,
    handleKeywords,
    handleSettings,
    handleSettingsCallback,
    handleToggle,
    handlePause,
    handleResume,
    handleStatus,
};
