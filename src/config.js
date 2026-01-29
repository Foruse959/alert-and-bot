require('dotenv').config();

const config = {
    // Telegram Bot
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
    },

    // Twitter Account (for scraping)
    twitter: {
        username: process.env.TWITTER_USERNAME || null,
        password: process.env.TWITTER_PASSWORD || null,
    },

    // Polling interval
    pollInterval: parseInt(process.env.POLL_INTERVAL) || 60000,

    // Database
    databasePath: process.env.DATABASE_PATH || './data/bot.db',
};

// Validate required config
function validateConfig() {
    if (!config.telegram.botToken) {
        console.error('❌ TELEGRAM_BOT_TOKEN is required');
        console.error('   Get it free from: https://t.me/botfather');
        process.exit(1);
    }

    console.log('✅ Configuration validated');
    console.log(`   ⏱️  Poll interval: ${config.pollInterval / 1000} seconds`);

    if (config.twitter.username && config.twitter.password) {
        console.log(`   🐦 Twitter account: @${config.twitter.username}`);
    } else {
        console.log('   ⚠️  No Twitter credentials - using guest mode (may be limited)');
    }
}

module.exports = { config, validateConfig };
