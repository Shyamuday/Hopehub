# Hope Hub Welcome Bot

Tiny Telegram welcome bot for the Hope Hub group.

Current production swap:

- `@Hopehubwebbot` runs this welcome/community bot
- `@Hopehubbot` runs the main Hope Hub user/web workflow bot

This bot only:

- welcomes new group members
- shows Hope Hub logo above the welcome text
- shows one `Hope Hub Bot` button for `@Hopehubbot`
- shows one `Website` button for `https://hopehub.in`
- shows one `Rules` button that replies with group rules
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
