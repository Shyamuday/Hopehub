/* global self */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const notification = payload.notification || payload;
  const data = notification.data || {};
  event.waitUntil(
    self.registration.showNotification(notification.title || 'Hope Hub call', {
      body: notification.body || 'Someone is calling you.',
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: notification.badge || '/icons/icon-72x72.png',
      data,
      requireInteraction: true,
      tag: data.consultationId ? `call-${data.consultationId}` : 'hopehub-call',
      renotify: true,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = event.notification.data?.route || '/';
  const url = new URL(route, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const matching = clients.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (matching) {
        if ('navigate' in matching) await matching.navigate(url);
        return matching.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
