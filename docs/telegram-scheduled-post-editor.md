# Scheduled post editor

Shortcut: send `/schedule` in the target group, then choose Open scheduled
posts to continue privately. In an existing private group-settings session,
`/schedule` opens the complete scheduled-post menu immediately. `/schedulepost` and `/schedu` are
accepted aliases. The shortcut uses the same admin checks and saved-draft editor.

The menu offers Add new post and existing posts. Each existing post includes
content/name edits, date/time, custom and preset intervals, repeat, pause/resume,
topic, link buttons, auto-deletion, delivery status and cancel schedule. Cancelling
requires confirmation and clears the next run while keeping content and history;
a delivery already claimed by the scheduler may still finish.

Browse all posts lists individual items across every enabled and paused schedule
in the selected group, ten per page. Rotating schedules may contain many items;
the home menu shows both schedule and item counts. Selecting a post opens content
controls plus its parent schedule settings. Other groups remain separate: launch
`/schedule` from the intended group. Compact, group-scoped schedule references
keep Telegram callbacks within its 64-byte limit even for long legacy IDs.

Open the group menu, choose Admin settings, continue privately in @Hopehubbot,
and open Scheduled posts. Access is checked for the selected group on every
callback and incoming editor message.

Choose Add new post, then send plain text, a photo, or a video, with an optional
caption. Review and save. New posts are paused, one-off posts with a default
interval of one day. Choose Configure post to set the name, scheduled time,
custom interval, repeat, topic, link buttons and automatic deletion. Finally,
enable the post. A future scheduled time is preserved when enabling it.

Schedule input is `YYYY-MM-DD HH:mm` in IST. For example, `2026-10-13 18:30`.
The existing group minimum posting gap still applies, so scheduled time is the
earliest eligible time rather than a guaranteed exact delivery time.

Existing campaigns expose each item's content, topic, deletion and buttons;
large campaigns paginate five items at a time. Content replacement replaces
the text and media together; send text alone to remove existing media. Replacing
a poll's content converts that item into a regular text/media post.

Upload the media directly to the same private bot. Telegram file IDs are stored
with an explicit photo/video type and reused by the scheduler's same bot. No
public image or video hosting is required. Media captions are limited to 1,024
characters; text posts to 4,096. Buttons use `Label | https://example.com`, one
per line. Use `-` to remove buttons, and `0` to clear the topic or auto-deletion.

Drafts expire after 30 minutes and are isolated by group and admin. Send
`/cancel` or use Cancel to discard changes. Save confirmation is required before
persisting content/configuration. Edits affect future deliveries, not messages
already posted or a delivery already claimed by the scheduler. No migration is
required; the existing campaign, campaign-item and community-state tables are
used.
