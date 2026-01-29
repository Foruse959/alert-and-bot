# 🐦 Twitter Alert Bot (FREE!)

Real-time Twitter monitoring with Telegram alerts. **100% FREE** - No Twitter API key needed!

## ✨ Features

- 📡 **Watch Twitter accounts** - Monitor any public Twitter user
- 🔑 **Keyword filtering** - Only alert on tweets containing specific words
- 🔁 **Tweet type filters** - Enable/disable retweets, quotes, replies
- ⚙️ **Interactive settings** - Change everything via Telegram buttons
- 🆓 **Completely FREE** - Uses Nitter RSS, no paid APIs!

---

## 🚀 Quick Start

### 1. Get Telegram Bot Token (FREE)

1. Open Telegram, search for [@BotFather](https://t.me/botfather)
2. Send `/newbot`
3. Follow prompts to create your bot
4. Copy the token (looks like `123456:ABC-DEF...`)

### 2. Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. Go to [railway.app](https://railway.app)
2. Create new project → **Deploy from GitHub repo**
3. Add ONE environment variable:
   ```
   TELEGRAM_BOT_TOKEN=your_token_here
   ```
4. Deploy! 🚀

### 3. Start Using

1. Open Telegram
2. Find your bot (the one you created)
3. Send `/start`
4. Add accounts: `/add @elonmusk`
5. Add keywords: `/keyword add claim`

---

## 📱 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Initialize bot |
| `/help` | Show all commands |
| `/add @handle` | Watch a Twitter account |
| `/remove @handle` | Stop watching |
| `/list` | Show watched accounts |
| `/keyword add [word]` | Add keyword filter |
| `/keyword remove [word]` | Remove keyword |
| `/keywords` | List keywords |
| `/settings` | Interactive settings menu |
| `/toggle [setting]` | Toggle retweets/quotes/etc |
| `/pause` | Pause alerts |
| `/resume` | Resume alerts |
| `/status` | Check bot status |

---

## 🏠 Run Locally

```bash
cd twitter-alert-bot
npm install

# Create .env file with your token
echo "TELEGRAM_BOT_TOKEN=your_token_here" > .env

# Run
npm start
```

---

## 🔒 Security

- ✅ Only ONE credential needed (Telegram token)
- ✅ No Twitter API (uses free Nitter RSS)
- ✅ No WhatsApp credentials
- ✅ All secrets via environment variables
- ✅ Database stored locally (never shared)

---

## 📁 Project Structure

```
twitter-alert-bot/
├── src/
│   ├── index.js           # Entry point
│   ├── config.js          # Environment loader
│   ├── database/          # SQLite storage
│   ├── twitter/           # Nitter RSS client
│   ├── filters/           # Keyword matching
│   ├── telegram/          # Bot & commands
│   └── alerts/            # Alert dispatcher
├── .env.example           # Environment template
├── package.json
└── railway.toml           # Railway config
```

---

## 📄 License

MIT
