# Telegram Group Help smoke test

Run `/smoketest` in each configured private control group after deployment. It checks routing, the neutral admin-alert image setting, and the bot’s live Telegram permissions without changing a member.

Use a dedicated non-admin test account for the checks below. Never use a real member as a moderation target.

1. In the main group, send `/rules`; confirm the command works and command cleanup follows the configured policy.
2. Send `@admin I need help`; confirm the rules reply appears publicly, while the neutral **Admin Help Requested** alert and action buttons appear privately.
3. Reply to a harmless test-account message with `/report`; confirm one private report is created and its buttons work. Use **Resolve** for the normal smoke test.
4. In the private group, run `/warn <test-user-id> smoke test`; confirm the test account receives a clear reason and duration/status message.
5. Run `/lock links`, post a harmless URL from the test account, then run `/unlock links`; confirm only the locked message is removed.
6. Repeat step 5 for `media`, `forwards`, `commands`, and `stickers`. Administrators must remain exempt.
7. Run `/adminerror off`, send an admin command from the test account, and confirm no public permission-error reply appears. Restore with `/adminerror on` if desired.
8. Repeat the routing and lock checks for the off-topic group and its private control group.
9. Run `/botaudit`; all configured public groups must report delete, restrict, pin, and manage-video-chat rights as enabled.

If a destructive button must be tested, use only the dedicated test account and immediately reverse the action with `/unmute` or `/unban`.
