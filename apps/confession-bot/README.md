# HopeHub Anonymous Confession Bot

A Telegram bot for anonymous confessions with admin moderation before publishing to a channel.

## Flow

```
User: /start → Welcome message
User: Tap "Send Confession" → Write confession → Preview → Submit
Admin: Receives confession → Approve / Reject
  → Approved: posted anonymously to channel, user notified
  → Rejected: user notified, nothing published
```

## Setup

### 1. Install dependencies

```bash
cd apps/confession-bot
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
BOT_TOKEN=8880551060:AAGMfnjQTurnXQ686v9qEkfFOYm4R2NlPhU
ADMIN_CHAT_ID=123456789         # Your numeric Telegram user ID (get from @userinfobot)
CONFESSION_CHANNEL_ID=@HopeHubConfessions   # Channel where approved confessions go
CONFESSION_START_NUMBER=1000    # Optional: starting confession number
```

### 3. Make the bot an admin in your channel

The bot **must be an administrator** in `CONFESSION_CHANNEL_ID` to post messages.

Go to your channel → Administrators → Add Administrator → search your bot.

### 4. Run

```bash
# Production
npm start

# Development (auto-restarts on file change, Node 18+)
npm run dev
```

## Commands

| Command   | Description               |
| --------- | ------------------------- |
| `/start`  | Show welcome message      |
| `/cancel` | Cancel current confession |
| `/help`   | Show help                 |

## Deployment on Lightsail server

SSH into the server and run:

```bash
# Install PM2 globally if not already installed
npm install -g pm2

# Navigate to bot directory
cd /opt/hopehub/apps/confession-bot

# Copy and fill in .env
cp .env.example .env
nano .env

# Install deps
npm install

# Start with PM2
pm2 start bot.js --name confession-bot

# Save PM2 process list so it restarts on reboot
pm2 save
pm2 startup
```

## Important notes

- `ADMIN_CHAT_ID` must be your **numeric** Telegram user ID, not your username.  
  Get it by messaging [@userinfobot](https://t.me/userinfobot).
- Confessions are stored **in memory** — they are lost on restart. For persistence, add a database (SQLite/PostgreSQL).
- Each confession has a unique ID and number starting from `CONFESSION_START_NUMBER`.
