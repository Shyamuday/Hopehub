type OtpEntry = { otp: string; expiresAt: number };
export type OtpVerifyResult =
  { ok: true } | { ok: false; reason: 'missing' | 'expired' | 'mismatch' | 'malformed' };

const memoryStore = new Map<string, OtpEntry>();

let redisClient: {
  setEx: (key: string, ttl: number, value: string) => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
  del: (key: string) => Promise<unknown>;
} | null = null;
let redisInit: Promise<void> | null = null;

const OTP_TTL_SEC = 10 * 60;
const keyFor = (identifier: string) => `otp:${identifier}`;

async function ensureRedis() {
  if (redisClient || redisInit) {
    await redisInit;
    return redisClient;
  }

  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  redisInit = (async () => {
    try {
      const { createClient } = await import('redis');
      const client = createClient({ url });
      client.on('error', (err) => console.warn('[otp] Redis error', err));
      await client.connect();
      redisClient = client;
      console.info('[otp] Using Redis store');
    } catch (error) {
      console.warn('[otp] Redis unavailable — using in-memory store', error);
      redisClient = null;
    }
  })();

  await redisInit;
  return redisClient;
}

export async function storeOtpEntry(identifier: string, otp: string): Promise<void> {
  const expiresAt = Date.now() + OTP_TTL_SEC * 1000;
  const redis = await ensureRedis();

  if (redis) {
    await redis.setEx(keyFor(identifier), OTP_TTL_SEC, JSON.stringify({ otp, expiresAt }));
    return;
  }

  memoryStore.set(identifier, { otp, expiresAt });
}

export async function verifyOtpEntry(identifier: string, otp: string): Promise<boolean> {
  return (await verifyOtpEntryDetailed(identifier, otp)).ok;
}

export async function verifyOtpEntryDetailed(
  identifier: string,
  otp: string
): Promise<OtpVerifyResult> {
  const submittedOtp = otp.trim();
  const redis = await ensureRedis();

  if (redis) {
    const key = keyFor(identifier);
    const raw = await redis.get(key);
    if (!raw) return { ok: false, reason: 'missing' };
    try {
      const entry = JSON.parse(raw) as OtpEntry;
      if (Date.now() > entry.expiresAt) {
        await redis.del(key);
        return { ok: false, reason: 'expired' };
      }
      if (entry.otp !== submittedOtp) return { ok: false, reason: 'mismatch' };
      await redis.del(key);
      return { ok: true };
    } catch {
      await redis.del(key);
      return { ok: false, reason: 'malformed' };
    }
  }

  const entry = memoryStore.get(identifier);
  if (!entry) return { ok: false, reason: 'missing' };
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(identifier);
    return { ok: false, reason: 'expired' };
  }
  if (entry.otp !== submittedOtp) return { ok: false, reason: 'mismatch' };
  memoryStore.delete(identifier);
  return { ok: true };
}
