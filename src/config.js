require('dotenv').config();

const config = {
    // Telegram Bot
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
    },

    // Twitter API
    twitter: {
        bearerToken: process.env.TWITTER_BEARER_TOKEN,
    },

    // Polling interval
    pollInterval: parseInt(process.env.POLL_INTERVAL) || 60000,

    // Database
    databasePath: process.env.DATABASE_PATH || './data/bot.db',
};

// Validate required config
function validateConfig() {
    const errors = [];

    if (!config.telegram.botToken) {
        errors.push('TELEGRAM_BOT_TOKEN is required');
    }

    if (!config.twitter.bearerToken) {
        errors.push('TWITTER_BEARER_TOKEN is required');
    }

    if (errors.length > 0) {
        console.error('❌ Configuration errors:');
        errors.forEach(e => console.error(`   - ${e}`));
        console.error('\n💡 Get your tokens:');
        console.error('   Telegram: https://t.me/botfather (FREE)');
        console.error('   Twitter:  https://developer.twitter.com (FREE tier available)');
        process.exit(1);
    }

    console.log('✅ Configuration validated');
    console.log(`   ⏱️  Poll interval: ${config.pollInterval / 1000} seconds`);
}

module.exports = { config, validateConfig };
