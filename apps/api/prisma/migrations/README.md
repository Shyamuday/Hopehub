# Prisma migration history

This folder uses a **squashed baseline** strategy:

1. **`00000000000000_baseline`** — full schema snapshot for fresh databases.
2. **Incremental migrations** (dated `20260708*`) — real SQL changes applied after the baseline.

Earlier placeholder migration folders (comment-only stubs that pointed at the baseline) were removed to keep deploy history honest. New environments should run:

```bash
npm run prisma:migrate
# or: npx prisma migrate deploy
```

Do **not** use `prisma db push --accept-data-loss` in CI or production.
