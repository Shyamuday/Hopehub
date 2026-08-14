import { GoogleAuth } from 'google-auth-library';
import webpush from 'web-push';
import { prisma } from '../db.js';

type PushPlatform = 'ios' | 'android' | 'web';

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID?.trim() || '';
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim() || '';
const firebasePrivateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
let warnedMissingFirebaseConfig = false;
const webPushPublicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() || '';
const webPushPrivateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim() || '';
const webPushSubject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim() || 'mailto:contact@hopehub.in';
if (webPushPublicKey && webPushPrivateKey) {
  webpush.setVapidDetails(webPushSubject, webPushPublicKey, webPushPrivateKey);
}

const firebaseAuth =
  firebaseProjectId && firebaseClientEmail && firebasePrivateKey
    ? new GoogleAuth({
        credentials: {
          client_email: firebaseClientEmail,
          private_key: firebasePrivateKey
        },
        scopes: ['https://www.googleapis.com/auth/firebase.messaging']
      })
    : null;

export async function registerUserPushDevice(input: {
  userId: string;
  token: string;
  platform?: PushPlatform;
}) {
  return prisma.pushDevice.upsert({
    where: { token: input.token },
    create: {
      userId: input.userId,
      token: input.token,
      platform: input.platform || 'web',
      provider: 'FCM'
    },
    update: {
      userId: input.userId,
      storeStaffId: null,
      platform: input.platform || 'web',
      provider: 'FCM',
      isActive: true,
      failureCount: 0,
      disabledAt: null,
      lastSeenAt: new Date()
    }
  });
}

export async function registerStoreStaffPushDevice(input: {
  storeStaffId: string;
  token: string;
  platform?: PushPlatform;
}) {
  return prisma.pushDevice.upsert({
    where: { token: input.token },
    create: {
      storeStaffId: input.storeStaffId,
      token: input.token,
      platform: input.platform || 'web',
      provider: 'FCM'
    },
    update: {
      userId: null,
      storeStaffId: input.storeStaffId,
      platform: input.platform || 'web',
      provider: 'FCM',
      isActive: true,
      failureCount: 0,
      disabledAt: null,
      lastSeenAt: new Date()
    }
  });
}

export function getWebPushPublicKey() {
  return webPushPublicKey;
}

export async function registerUserWebPushDevice(input: {
  userId: string;
  subscription: webpush.PushSubscription;
}) {
  const token = JSON.stringify(input.subscription);
  return prisma.pushDevice.upsert({
    where: { token },
    create: {
      userId: input.userId,
      token,
      platform: 'web',
      provider: 'WEB_PUSH'
    },
    update: {
      userId: input.userId,
      storeStaffId: null,
      isActive: true,
      failureCount: 0,
      disabledAt: null,
      lastSeenAt: new Date()
    }
  });
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const devices = await prisma.pushDevice.findMany({
    where: { userId, isActive: true },
    select: { id: true, token: true, provider: true }
  });
  if (!devices.length) return { attempted: 0, delivered: 0, disabled: 0 };

  const fcmDevices = devices.filter((device) => device.provider !== 'WEB_PUSH');
  const webDevices = devices.filter((device) => device.provider === 'WEB_PUSH');
  if (fcmDevices.length && (!firebaseAuth || !firebaseProjectId)) {
    if (!warnedMissingFirebaseConfig) {
      warnedMissingFirebaseConfig = true;
      console.warn(
        '[push] Tokens are persisted, but Firebase delivery is disabled. Configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.'
      );
    }
  }

  let accessToken = '';
  if (fcmDevices.length && firebaseAuth && firebaseProjectId) {
    const client = await firebaseAuth.getClient();
    const accessTokenResult = await client.getAccessToken();
    accessToken =
      typeof accessTokenResult === 'string' ? accessTokenResult : accessTokenResult?.token || '';
    if (!accessToken) throw new Error('Could not obtain Firebase messaging access token.');
  }

  let delivered = 0;
  let disabled = 0;
  await Promise.all(
    devices.map(async (device) => {
      if (device.provider === 'WEB_PUSH') {
        if (!webPushPublicKey || !webPushPrivateKey) return;
        try {
          await webpush.sendNotification(
            JSON.parse(device.token) as webpush.PushSubscription,
            JSON.stringify({
              notification: {
                title: payload.title,
                body: payload.body,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                data: payload.data || {},
                requireInteraction: true
              }
            }),
            { TTL: 60, urgency: 'high' }
          );
          delivered += 1;
          await prisma.pushDevice.update({
            where: { id: device.id },
            data: { failureCount: 0, lastSeenAt: new Date() }
          });
        } catch (error) {
          const statusCode = Number((error as { statusCode?: unknown }).statusCode || 0);
          const invalidToken = statusCode === 404 || statusCode === 410;
          if (invalidToken) disabled += 1;
          await prisma.pushDevice.update({
            where: { id: device.id },
            data: invalidToken
              ? { isActive: false, disabledAt: new Date(), failureCount: { increment: 1 } }
              : { failureCount: { increment: 1 } }
          });
        }
        return;
      }
      if (!accessToken || !firebaseProjectId) return;
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId)}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: {
              token: device.token,
              notification: { title: payload.title, body: payload.body },
              data: payload.data || {},
              android: { priority: 'HIGH' },
              apns: {
                headers: { 'apns-priority': '10' },
                payload: { aps: { sound: 'default', 'content-available': 1 } }
              }
            }
          })
        }
      );

      if (response.ok) {
        delivered += 1;
        await prisma.pushDevice.update({
          where: { id: device.id },
          data: { failureCount: 0, lastSeenAt: new Date() }
        });
        return;
      }

      const responseBody = await response.text();
      const invalidToken =
        response.status === 404 ||
        /UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/i.test(responseBody);
      if (invalidToken) disabled += 1;
      await prisma.pushDevice.update({
        where: { id: device.id },
        data: invalidToken
          ? { isActive: false, disabledAt: new Date(), failureCount: { increment: 1 } }
          : { failureCount: { increment: 1 } }
      });
      console.warn('[push] Firebase delivery failed', {
        deviceId: device.id,
        status: response.status,
        invalidToken
      });
    })
  );

  return { attempted: devices.length, delivered, disabled };
}

export async function sendIncomingCallPush(input: {
  targetUserId: string;
  consultationId: string;
  fromName?: string | null;
  mode?: string;
}) {
  const mode = input.mode === 'video' ? 'video' : input.mode === 'audio' ? 'voice' : 'call';
  return sendPushToUser(input.targetUserId, {
    title: `Incoming ${mode} call`,
    body: `${input.fromName || 'Your Hope Hub support partner'} is calling you.`,
    data: {
      type: 'INSTANT_ONLINE_CALL',
      consultationId: input.consultationId,
      mode,
      route: `/live-session/${input.consultationId}`
    }
  });
}

export async function cleanupInactivePushDevices(retentionDays = 90) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  return prisma.pushDevice.deleteMany({
    where: {
      OR: [
        { isActive: false, updatedAt: { lt: cutoff } },
        { lastSeenAt: { lt: cutoff }, failureCount: { gt: 5 } }
      ]
    }
  });
}
