# 🐦 Twitter Alert Bot

Real-time Twitter monitoring with Telegram alerts.

## ✨ Features

- 📡 **Watch Twitter accounts** - Monitor any public Twitter user
- 🔑 **Keyword filtering** - Only alert on tweets containing specific words
- 🔁 **Tweet type filters** - Enable/disable retweets, quotes, replies
- ⚙️ **Interactive settings** - Change everything via Telegram buttons

---

## 🚀 Quick Start

### 1. Get API Tokens

**Telegram Bot (FREE):**
1. Open [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow prompts
3. Copy the token

**Twitter API (FREE tier):**
1. Go to [developer.twitter.com](https://developer.twitter.com/)
2. Sign up for a developer account
3. Create a new app
4. Copy the Bearer Token

### 2. Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Create new project → Deploy from GitHub
3. Select your repo
4. Add environment variables:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_token
   TWITTER_BEARER_TOKEN=your_twitter_bearer_token
   ```
5. Deploy!

### 3. Start Using

1. Open your Telegram bot
2. Send `/start`
3. Add accounts: `/add @elonmusk`
4. Add keywords: `/keyword add claim`

---

## 📱 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Initialize bot |
| `/add @handle` | Watch Twitter account |
| `/remove @handle` | Stop watching |
| `/list` | Show watched accounts |
| `/keyword add [word]` | Add keyword filter |
| `/keywords` | List keywords |
| `/settings` | Toggle settings |
| `/pause` / `/resume` | Control alerts |

---

## 🏠 Run Locally

```bash
npm install
cp .env.example .env  # Edit with your tokens
npm start
```

---

## 📄 License

MIT
