# Hope Hub Community Bot

Tiny Telegram group/community bot for Hope Hub.

It is intentionally not DB-backed yet. For our own Telegram group(s), env/constants are simpler and safer than running a second database system.

## Features

- Welcomes new group members.
- `/rules` shows community guidelines.
- `/links` shows official Hope Hub links.
- `/report` lets a member flag a replied message.
- `/clean` lets group admins delete a replied message.
- `/pinrules` lets group admins send and pin rules.
- Optional non-admin link blocking with `COMMUNITY_BOT_BLOCK_LINKS=true`.
- Simple in-memory burst anti-spam protection.
- Runs with polling locally or webhook in production.

## Setup

1. Create a bot in BotFather.
2. Set `TELEGRAM_COMMUNITY_BOT_TOKEN`.
3. Add the bot to the Telegram group.
4. Make it group admin if you want reliable welcome/delete/pin actions.
5. Start locally:

```bash
npm install
npm run dev --prefix apps/community-bot
```

## Run on server

For personal use, run it as a normal Node service with PM2/systemd:

```bash
npm run build --prefix apps/community-bot
npm run start --prefix apps/community-bot
```

Use polling for the simplest setup:

```bash
COMMUNITY_BOT_MODE=polling
```

Use webhook only if you later want the bot behind a public HTTPS endpoint:

```bash
COMMUNITY_BOT_MODE=webhook
COMMUNITY_BOT_WEBHOOK_BASE_URL=https://your-public-bot-host
TELEGRAM_COMMUNITY_WEBHOOK_SECRET=<random-secret>
```

The bot exposes:

- `GET /health`
- `POST /telegram/community/webhook`

## Important BotFather settings

For group management, set these in BotFather:

- Add bot to group.
- Consider disabling privacy mode if you want it to inspect group messages.
- Make bot an admin with delete/pin permissions if using `/clean`, `/pinrules`, spam cleanup, or link blocking.
