# Hope Hub Welcome Bot

Tiny Telegram welcome bot for the Hope Hub group.

Use:

- `@Hopehubbot` token here as `TELEGRAM_COMMUNITY_BOT_TOKEN`
- `@Hopehubwebbot` for the main Hope Hub user/web workflow bot

This bot only:

- welcomes new group members
- shows one button to open `@Hopehubwebbot`
- shows one button to open `https://hopehub.in`
- replies to `/start` and `/help` with the same button

## Local run

```bash
npm install
npm run dev --prefix apps/community-bot
```

## Production/simple server run

```bash
npm run build --prefix apps/community-bot
npm run start --prefix apps/community-bot
```

For personal use, keep:

```bash
COMMUNITY_BOT_MODE=polling
```

No database and no Docker are required.
