# 🐦 Twitter Alert Bot (FREE!)

Real-time Twitter monitoring with Telegram alerts. **No Twitter API key needed!**

## ✨ Features

- 📡 **Watch Twitter accounts** - Monitor any public Twitter user
- 🔑 **Keyword filtering** - Only alert on tweets containing specific words
- 🔁 **Tweet type filters** - Enable/disable retweets, quotes, replies
- ⚙️ **Interactive settings** - Toggle everything via Telegram buttons
- 🆓 **FREE** - Uses open-source scraping, no paid API!

---

## 🚀 Quick Start

### 1. Get Telegram Bot Token (FREE)

1. Open [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow prompts
3. Copy the token

### 2. (Optional) Add Twitter Account

For better reliability, add Twitter credentials:
- This uses YOUR Twitter account to scrape
- Improves rate limits and access

### 3. Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Deploy from GitHub → Select your repo
3. Add environment variables:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_token
   TWITTER_USERNAME=your_twitter_username  (optional)
   TWITTER_PASSWORD=your_twitter_password  (optional)
   ```
4. Deploy!

### 4. Start Using

1. Open your Telegram bot
2. Send `/start`
3. Add accounts: `/add @elonmusk`

---

## 📱 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Initialize bot |
| `/add @handle` | Watch Twitter account |
| `/remove @handle` | Stop watching |
| `/list` | Show watched accounts |
| `/keyword add [word]` | Add keyword filter |
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

## ⚠️ Note

This bot uses open-source Twitter scraping. It may occasionally break if Twitter updates their frontend. The community typically fixes these quickly.

## 📄 License

MIT
