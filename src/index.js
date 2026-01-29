/**
 * Twitter Alert Bot
 * 
 * Monitors Twitter accounts and sends alerts to Telegram.
 * FREE - No Twitter API key required! Uses open-source scraping.
 */

const { config, validateConfig } = require('./config');
const db = require('./database/db');
const twitter = require('./twitter/client');
const telegramBot = require('./telegram/bot');
const monitor = require('./twitter/monitor');

// ASCII art banner
const banner = `
╔════════════════════════════════════════════════╗
║     🐦 Twitter Alert Bot v1.0.0                ║
║     FREE - No API Key Required!                ║
╚════════════════════════════════════════════════╝
`;

async function main() {
    console.log(banner);

    // Validate configuration
    validateConfig();

    // Initialize database
    await db.initDatabase();

    // Initialize Twitter scraper
    await twitter.initTwitterClient();

    // Initialize Telegram bot
    telegramBot.initTelegramBot();

    // Start Twitter monitoring
    monitor.startMonitoring();

    // Clean up old alert history daily
    setInterval(() => {
        db.cleanOldAlerts(7);
    }, 24 * 60 * 60 * 1000);

    console.log('\n🚀 Bot is running! Open Telegram and send /start to begin.\n');

    // Graceful shutdown
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

function shutdown() {
    console.log('\n\n👋 Shutting down...');
    db.saveDatabase();
    monitor.stopMonitoring();
    process.exit(0);
}

// Run the bot
main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
