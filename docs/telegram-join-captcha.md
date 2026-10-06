# Join captcha and staff review

Captcha protection applies only when join protection is `captcha` or `strict` and captcha mode is enabled. Pending captcha prompts and verification state remain until a correct answer or an administrator decision. Confirmation-only joins retain their existing timeout.

The configured wrong-answer limit (default three) keeps the member restricted and sends Accept/Reject buttons to the configured private staff group. User answers cannot unlock a member after staff review begins. Only an administrator or owner in that configured staff group may decide. Accept restores the target group's normal permissions. Reject removes the member, then unbans them so they can request to join again.

Use the bot's `/settings` → Onboarding to change **Captcha wrong-answer limit** (1–10, default 3) and **Verified welcome cleanup seconds** (1–3600, default 30). Both settings appear only while captcha is enabled. They are persisted in SiteConfig and take effect without restarting. Run the managed configuration sync during deployment to initialize their database rows. Existing scheduled deletions retain their saved deadline; the configured delay applies when completion is finalized.

Member callbacks, join/leave transitions and admin-alert recovery share durable operation claims. Every join gets a random verification ID included in its captcha and decision buttons. Buttons from an older join cannot affect a rejoined member. Review message IDs are persisted to avoid sending additional alerts after delivery.

Failed review delivery retries automatically after 30 seconds, then uses increasing delays capped at one hour. Retry attempts, next due time and the latest error persist in the verification state. The maintenance worker runs at startup and every ten seconds, independently of campaign timing or user clicks. Missing or public staff-group configuration is logged; delivery never falls back to a public channel.

Leaving or rejoining cancels the old verification and queues removal of both its welcome and review messages. Completed acceptance/verification is checkpointed before cleanup, so a restart finishes the saved decision and retains the saved deletion deadline. A failed Telegram deletion stays in the existing cleanup queue for retries.

Decision history is stored in `TelegramCommunityState` under `join-verification-history:<group ID>`, keyed by member and verification ID. It records wrong-attempt counts, final outcome, actor ID and timestamps without the captcha answer. History retains up to fifty events per join for 180 days. Duplicate completion recovery does not add duplicate outcome events.

Captcha-specific Telegram settings appear only while captcha is enabled. The legacy pending timeout is hidden for enabled captchas. Correct verification or administrator acceptance removes the welcome-message buttons immediately and schedules deletion after the configured seconds (default 30). Confirmation-only joins retain their configured cleanup delay. The deletion is persisted for restart recovery, with a timer to wake cleanup at the due time. Existing scheduled cleanup jobs preserve unresolved captcha prompts, and legacy 24-hour verification states are preserved during scheduled state cleanup.

Configure the staff group ID and ensure the bot can send messages there, restrict members in the community group, and remove members. Set the group before enabling captcha. No Telegram messages are sent by the local tests; a live end-to-end check should use a controlled test member.
