require('dotenv').config();

const config = {
    // Telegram Bot (ONLY REQUIRED CREDENTIAL!)
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
    },

    // Polling interval (how often to check for new tweets)
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

    if (errors.length > 0) {
        console.error('❌ Configuration errors:');
        errors.forEach(e => console.error(`   - ${e}`));
        console.error('\n💡 Copy .env.example to .env and add your Telegram bot token');
        console.error('   Get it FREE from @BotFather on Telegram!');
        process.exit(1);
    }

    console.log('✅ Configuration validated');
    console.log('   🆓 Using Nitter RSS (no Twitter API key needed!)');
    console.log(`   ⏱️  Poll interval: ${config.pollInterval / 1000} seconds`);
}

module.exports = { config, validateConfig };
