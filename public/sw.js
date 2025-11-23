// Service Worker for NextGen Messenger - handles push notifications
console.log('Service Worker loading...');

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  self.clients.claim();
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event with no data');
    return;
  }

  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'NextGen Messenger', {
        body: data.body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: data.tag || 'notification',
        requireInteraction: data.requireInteraction || false,
      })
    );
  } catch (e) {
    event.waitUntil(
      self.registration.showNotification('NextGen Messenger', {
        body: event.data.text(),
        icon: '/favicon.png',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        if (windowClients[i].url === '/') {
          return windowClients[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
