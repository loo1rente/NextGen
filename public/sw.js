// Service Worker for NextGen Messenger
// Handles push notifications and offline functionality

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  self.clients.claim();
});

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event.data);
  
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification',
      badge: '/favicon.png',
      icon: '/favicon.png',
      tag: data.tag || 'notification',
      requireInteraction: data.requireInteraction || false,
      data: data.data || {},
      vibrate: data.vibrate || [200, 100, 200],
      sound: data.sound ? '/notification-sound.mp3' : undefined,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'NextGen Messenger', options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
    // Fallback: show a basic notification
    event.waitUntil(
      self.registration.showNotification('NextGen Messenger', {
        body: event.data.text(),
        badge: '/favicon.png',
        icon: '/favicon.png',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  event.notification.close();

  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

self.addEventListener('message', (event) => {
  console.log('Service Worker message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle fetch events for offline support
self.addEventListener('fetch', (event) => {
  // For now, just pass through - can add caching strategies later
  // This ensures the app loads even with the SW installed
});
