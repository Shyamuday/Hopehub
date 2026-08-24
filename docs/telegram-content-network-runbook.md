# Telegram Content Network Runbook

## Purpose

Create a network of focused public Telegram broadcast channels and publish short, source-linked educational posts through **HopeHub AI**. The system uses public RSS/Atom feeds and the existing HopeHub server; it does not require a paid news API or paid AI service.

Posts are never full copies of source articles. The system stores a concise attributed draft, links to the original source, removes duplicate links, and requires an admin review by default.

## Current implementation

The application code provides:

- Prisma models for channels, RSS/Atom sources, and fetched content items.
- Migration: `apps/api/prisma/migrations/20260824090000_telegram_content_network`.
- Fetcher/scheduler: `apps/api/src/services/telegram-content-network.ts`.
- Admin API under `/admin/telegram-bots/content-network`.
- Admin screen: **Telegram Content**.
- Channel-creation script: `apps/api/scripts/create-telegram-content-channels.ts`.

The content scheduler is called by the existing Telegram campaign scheduler. A channel is inactive until an administrator enables it. Approval is enabled by default.

## Cost model

No paid data provider is needed.

| Component                      | Cost                                                  |
| ------------------------------ | ----------------------------------------------------- |
| Telegram Bot API / MTProto     | Free within Telegram limits                           |
| Public RSS/Atom feeds          | Free when the publisher makes the feed public         |
| Content database and scheduler | Uses the existing HopeHub server/database             |
| AI rewriting                   | Not required; disabled in this implementation         |
| Images                         | Optional public feed images; no image-generation cost |

There is still normal server bandwidth/storage usage. Do not scrape sites that do not provide a public feed or whose terms do not permit reuse.

## Channel plan

| Slug               | Public title         | Preferred username      | Category               |
| ------------------ | -------------------- | ----------------------- | ---------------------- |
| `mental-health`    | Mindspace Daily      | `@MindspaceDaily`       | Mental health          |
| `relationships`    | HeartTalk            | `@HeartTalkDaily`       | Relationships          |
| `motivation`       | Daily Spark          | `@DailySpark`           | Motivation             |
| `career`           | Career Compass       | `@CareerCompassDaily`   | Career                 |
| `technology`       | Tech Pulse           | `@TechPulseDaily`       | Technology             |
| `ai`               | AI Brief             | `@AIBriefDaily`         | AI                     |
| `finance`          | Money Sense          | `@MoneySenseDaily`      | Personal finance       |
| `health`           | Health Notes         | `@HealthNotesDaily`     | Health education       |
| `startups`         | Startup Circle       | `@StartupCircleDaily`   | Startups               |
| `education`        | LearnLab             | `@LearnLabDaily`        | Education              |
| `ayurveda`         | Ayurveda Guide       | `@AyurvedaGuideDaily`   | Ayurveda education     |
| `exercise`         | MoveWell             | `@MoveWellDaily`        | Exercise               |
| `nutrition`        | Food & Wellness      | `@FoodWellnessDaily`    | Nutrition              |
| `sleep`            | Sleep Better         | `@SleepBetterDaily`     | Sleep                  |
| `yoga`             | Yoga & Breath        | `@YogaBreathDaily`      | Yoga and breathwork    |
| `womens-wellness`  | Her Wellness         | `@HerWellnessDaily`     | Women’s wellness       |
| `mens-wellness`    | Men’s Wellbeing      | `@MensWellbeingDaily`   | Men’s wellness         |
| `parenting`        | Parenting Circle     | `@ParentingCircleDaily` | Parenting              |
| `calm-living`      | Calm Living          | `@CalmLivingDaily`      | Mindful living         |
| `health-research`  | Health Research Desk | `@HealthResearchDesk`   | Health research        |
| `hindi-mind`       | मन की बात            | `@ManKiBaatDaily`       | Hindi mental wellbeing |
| `hindi-health`     | सेहत साथी            | `@SehatSaathiDaily`     | Hindi health           |
| `hindi-motivation` | प्रेरणा              | `@PrernaDaily`          | Hindi motivation       |
| `bhakti`           | भक्ति पथ             | `@BhaktiPathDaily`      | Bhakti                 |
| `hindi-career`     | करियर दिशा           | `@CareerDishaHindi`     | Hindi career           |

Telegram may reserve or sell a preferred public username. The channel creator safely tries the preferred name, then an `HQ` or `Now` suffix. Never take over or modify a channel merely because another account owns a matching username.

## Channel creation

### Prerequisites

- The MTProto account must be the intended owner account: `@spiritualspirirt`.
- `/etc/hopehub-telegram-user-session` must exist and be readable only by the privileged scheduler user.
- `/etc/hopehub-telegram-user-api-id` and `/etc/hopehub-telegram-user-api-hash` must exist.
- `/etc/hopehub-telegram-hopehubbot-token` must contain the HopeHub AI bot token.

The script creates a **broadcast channel** (not a discussion group), makes it public, and grants HopeHub AI only the post/edit/delete rights it needs. It persists successful results at:

```text
/etc/hopehub-telegram-content-channels.json
```

Run it on the production server as a privileged operation:

```bash
cd /opt/hopehub/apps/api
sudo npm run telegram:content:channels:create
```

It is idempotent for channels already present in the state file.

### Telegram flood limits

Telegram limits fast creation of public channels and public usernames. Do not retry rapidly and do not use multiple accounts to bypass that protection.

Useful checks:

```bash
sudo cat /etc/hopehub-telegram-content-channels.json
sudo journalctl -u hopehub-telegram-content-channel-creator.service --no-pager
sudo systemctl list-timers --all hopehub-telegram-content-channel-creator.timer
```

To pause a temporary creator timer:

```bash
sudo systemctl stop hopehub-telegram-content-channel-creator.timer
```

To resume later, wait for Telegram’s reported flood interval, then run the script once. The script recovers an owned channel with the expected title if it was created before a public-username request was rate-limited.

## Deploy and enable the content network

Do this only in a normal approved deployment window.

1. Deploy the API and admin web changes.
2. Apply the Prisma migration:

   ```bash
   cd /opt/hopehub/apps/api
   npm run prisma:deploy
   ```

3. Confirm the normal Telegram campaign scheduler is enabled; the content network shares this scheduler.
4. Open Admin → **Telegram Content**.
5. Add each created channel using its title, category, and Bot API chat ID from `/etc/hopehub-telegram-content-channels.json`.
6. Keep **Enable publishing** off initially and keep **Require review before publishing** on.
7. Add one trusted source and use **Fetch**. Confirm that the candidate appears in the review queue.
8. Approve one draft, enable the channel, and verify the bot posts to the correct destination.

### Recommended safe launch sequence

Start with five channels only:

1. Mindspace Daily
2. HeartTalk
3. Daily Spark
4. Career Compass
5. Tech Pulse

Use one trusted source per channel, review all posts manually for at least one week, then add the remaining channels gradually.

## Adding sources and publishing

In Admin → Telegram Content:

1. Select the channel.
2. Add a source name, attribution, and its **public HTTPS RSS or Atom URL**.
3. Keep automatic approval off unless the channel explicitly does not require approval.
4. Choose a fetch interval (start at 180 minutes).
5. Click **Fetch** to create drafts.
6. Review the title, summary, attribution, and link.
7. Approve immediately or select a future schedule time.

The platform rejects non-HTTPS, local, and private-network URLs. It also limits fetch size/time and de-duplicates by source link.

## Editorial and safety rules

- Use official organisations, universities, public-health bodies, research institutions, or publishers that explicitly provide RSS/Atom feeds.
- Attribute every post and preserve the original source link.
- Do not post a diagnosis, a treatment plan, a medication recommendation, investment advice, or a guaranteed health outcome.
- For health, Ayurveda, nutrition, exercise, and sleep content, retain an educational disclaimer and route emergencies to local emergency services.
- Review Hindi translations for clarity and cultural context before publication.
- Disable a source immediately when it produces low-quality, unsafe, outdated, duplicate, or non-attributed material.

## Operations and troubleshooting

| Symptom                            | Action                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| No draft arrives                   | Confirm source is active, feed is public HTTPS, then use Fetch and inspect `lastError`.                                                       |
| Draft does not publish             | Confirm channel is active, item is `APPROVED`, scheduled time has passed, the post gap has elapsed, and HopeHub AI is still an administrator. |
| Telegram returns `FLOOD_WAIT`      | Stop retries, respect the stated wait, then rerun once.                                                                                       |
| Desired username is taken/reserved | Let the script use `HQ` or `Now`; update the documentation and public links with the actual final username.                                   |
| Bot cannot post                    | Re-add HopeHub AI as a channel administrator with post/edit/delete rights.                                                                    |
| Duplicate candidate appears        | Ensure the two sources do not point to different tracking URLs for the same article; disable one source if needed.                            |

## Completion checklist

- [ ] All required channels are created and public.
- [ ] Actual usernames and Bot API chat IDs are recorded in the protected state file.
- [ ] HopeHub AI has posting rights in every enabled channel.
- [ ] Migration `20260824090000_telegram_content_network` is applied.
- [ ] Admin → Telegram Content loads channels and sources.
- [ ] At least one reviewed test post succeeds for every enabled channel.
- [ ] Source attribution and health/editorial review rules are followed.
- [ ] The temporary channel creator timer is stopped once all channels are complete.
