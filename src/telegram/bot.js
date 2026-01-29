const TelegramBot = require('node-telegram-bot-api');
const { config } = require('../config');
const commands = require('./commands');
const dispatcher = require('../alerts/dispatcher');

let bot = null;

/**
 * Initialize Telegram bot
 */
function initTelegramBot() {
    bot = new TelegramBot(config.telegram.botToken, { polling: true });

    // Pass bot to dispatcher so it can send alerts
    dispatcher.setTelegramBot(bot);

    // Register command handlers
    registerCommands();

    console.log('✅ Telegram bot initialized');
    return bot;
}

/**
 * Register all command handlers
 */
function registerCommands() {
    // Basic commands
    bot.onText(/^\/start$/, (msg) => commands.handleStart(bot, msg));
    bot.onText(/^\/help$/, (msg) => commands.handleHelp(bot, msg));

    // Account management
    bot.onText(/^\/add\s+(.+)$/i, (msg, match) => commands.handleAdd(bot, msg, match));
    bot.onText(/^\/remove\s+(.+)$/i, (msg, match) => commands.handleRemove(bot, msg, match));
    bot.onText(/^\/list$/, (msg) => commands.handleList(bot, msg));

    // Keyword management
    bot.onText(/^\/keyword\s+(.+)$/i, (msg, match) => commands.handleKeyword(bot, msg, match));
    bot.onText(/^\/keywords$/, (msg) => commands.handleKeywords(bot, msg));

    // Settings
    bot.onText(/^\/settings$/, (msg) => commands.handleSettings(bot, msg));
    bot.onText(/^\/toggle\s+(.+)$/i, (msg, match) => commands.handleToggle(bot, msg, match));

    // Pause/Resume
    bot.onText(/^\/pause$/, (msg) => commands.handlePause(bot, msg));
    bot.onText(/^\/resume$/, (msg) => commands.handleResume(bot, msg));

    // Status
    bot.onText(/^\/status$/, (msg) => commands.handleStatus(bot, msg));

    // Callback query handler (for inline buttons)
    bot.on('callback_query', (query) => {
        if (query.data.startsWith('toggle_')) {
            commands.handleSettingsCallback(bot, query);
        }
    });

    // Error handler
    bot.on('polling_error', (error) => {
        console.error('Telegram polling error:', error.message);
    });

    console.log('   📋 Registered 12 command handlers');
}

/**
 * Get bot instance
 */
function getTelegramBot() {
    return bot;
}

/**
 * Send message to a chat
 */
async function sendMessage(chatId, message, options = {}) {
    if (!bot) {
        throw new Error('Telegram bot not initialized');
    }
    return bot.sendMessage(chatId, message, options);
}

module.exports = {
    initTelegramBot,
    getTelegramBot,
    sendMessage,
};
