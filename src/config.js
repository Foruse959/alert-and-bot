require('dotenv').config();

const config = {
    // Telegram Bot
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
    },

    // Twitter Authentication
    twitter: {
        // Cookie-based auth (recommended)
        authToken: process.env.TWITTER_AUTH_TOKEN || null,
        ct0: process.env.TWITTER_CT0 || null,
        // Password-based auth (fallback)
        username: process.env.TWITTER_USERNAME || null,
        password: process.env.TWITTER_PASSWORD || null,
        email: process.env.TWITTER_EMAIL || null,
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

    if (config.twitter.authToken && config.twitter.ct0) {
        console.log('   🍪 Twitter auth: Using cookies (recommended)');
    } else if (config.twitter.username && config.twitter.password) {
        console.log(`   🔑 Twitter auth: Using password for @${config.twitter.username}`);
    } else {
        console.log('   ⚠️  No Twitter auth - guest mode may have limited access');
    }
}

module.exports = { config, validateConfig };
