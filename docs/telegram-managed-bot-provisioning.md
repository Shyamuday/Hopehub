# Telegram managed bot provisioning

Hope Hub can create Telegram bots from code using Telegram's official **managed bots** MTProto API. BotFather remains the authority: an existing bot must first be enabled as a **manager bot** in BotFather's Bot Management Mode.

This avoids automating the BotFather conversation and prevents authentication tokens from appearing in Telegram chat history, terminal output, Git, or the admin website.

## One-time BotFather setup

1. Open the official `@BotFather` chat.
2. Select the Hope Hub bot that will manage newly created bots.
3. Open its bot-management settings and enable **Bot Management Mode**.
4. Keep the existing MTProto owner session at `/etc/hopehub-telegram-user-session`.

The connected MTProto account must be `@spiritualspirirt`. The manager bot must report Telegram's `bot_can_manage_bots` capability; the script refuses to continue otherwise.

## Preview a creation

Run a dry check first. It verifies the owner session, manager capability and username without creating anything:

```bash
cd /opt/hopehub/apps/api
sudo npm run telegram:managed-bot:create -- \
  --name "Hope Hub Care" \
  --username HopeHubCareBot \
  --manager HopeHubAiBot \
  --description "Private support and care navigation from Hope Hub." \
  --short-description "Find the right Hope Hub support." \
  --dry-run
```

When `--manager` is omitted, the script identifies the manager from `/etc/hopehub-telegram-hopehubbot-token`.

## Create the bot

Run the same command without `--dry-run`:

```bash
sudo npm run telegram:managed-bot:create -- \
  --name "Hope Hub Care" \
  --username HopeHubCareBot \
  --manager HopeHubAiBot \
  --description "Private support and care navigation from Hope Hub." \
  --short-description "Find the right Hope Hub support."
```

The script:

- checks Telegram username rules and availability;
- creates the bot through `bots.createBot`, or recovers it when the owner already owns that username;
- exports the bot token without revoking the current token;
- writes the token to a generated `/etc/hopehub-telegram-<name>-token` file with mode `0600`;
- stores non-secret metadata in `/etc/hopehub-telegram-managed-bots.json`;
- optionally applies the long and short bot descriptions through the Bot API;
- never prints the token.

Use `--secret-name hopehub-telegram-custom-token` when deployment expects a specific secret filename. Secret names cannot contain slashes or uppercase characters.

## Operational safeguards

- Keep provisioning as a privileged server command; do not expose bot creation or tokens in the admin web application.
- Never pass a bot token as a command-line argument.
- Respect Telegram flood waits and account bot-creation limits.
- Do not create replacement bots when an existing owned bot can be recovered.
- Give every generated bot only the group/channel permissions required for its purpose.
- Back up `/etc/hopehub-telegram-managed-bots.json`; back up token secrets only through the approved encrypted secret backup process.

## Conventional BotFather fallback

When Bot Management Mode has not been enabled yet, the server can create a conventional bot through the approved MTProto account:

```bash
sudo npm run telegram:botfather-bot:create -- \\
  --name "Toxic Movie Updates - Yash Unofficial" \\
  --username ToxicYashUpdatesBot \\
  --secret-name hopehub-telegram-toxic-movie-token
```

This fallback cancels any unfinished BotFather operation, creates exactly one bot, verifies its identity through the Bot API, and writes the token directly to the protected `/etc` secret without printing it. It refuses to overwrite an existing token.
