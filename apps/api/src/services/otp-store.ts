type OtpEntry = { otp: string; expiresAt: number };

const memoryStore = new Map<string, OtpEntry>();

let redisClient: { setEx: (key: string, ttl: number, value: string) => Promise<unknown>; getDel: (key: string) => Promise<string | null> } | null = null;
let redisInit: Promise<void> | null = null;

const OTP_TTL_SEC = 10 * 60;
const keyFor = (mobile: string) => `otp:${mobile}`;

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

export async function storeOtpEntry(mobile: string, otp: string): Promise<void> {
  const expiresAt = Date.now() + OTP_TTL_SEC * 1000;
  const redis = await ensureRedis();

  if (redis) {
    await redis.setEx(keyFor(mobile), OTP_TTL_SEC, JSON.stringify({ otp, expiresAt }));
    return;
  }

  memoryStore.set(mobile, { otp, expiresAt });
}

export async function verifyOtpEntry(mobile: string, otp: string): Promise<boolean> {
  const redis = await ensureRedis();

  if (redis) {
    const raw = await redis.getDel(keyFor(mobile));
    if (!raw) return false;
    try {
      const entry = JSON.parse(raw) as OtpEntry;
      if (Date.now() > entry.expiresAt) return false;
      return entry.otp === otp;
    } catch {
      return false;
    }
  }

  const entry = memoryStore.get(mobile);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(mobile);
    return false;
  }
  if (entry.otp !== otp) return false;
  memoryStore.delete(mobile);
  return true;
}
