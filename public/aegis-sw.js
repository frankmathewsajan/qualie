// AEGIS Push Notification Service Worker
// Handles background push messages from the dashboard operator

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Aegis Alert', body: event.data.text() };
  }

  const title = payload.title || '🛡️ Aegis — Operator Message';
  const options = {
    body: payload.body || 'You have a new message from your emergency operator.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.tag || 'aegis-message',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 400],
    data: {
      url: payload.url || '/',
    },
    actions: [
      { action: 'open', title: '📱 Open Aegis' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/listen';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if already open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Keep service worker alive
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
