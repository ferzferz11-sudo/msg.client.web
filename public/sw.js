// ============================================
// Service Worker — MSG PWA
// ============================================
// Handles push notifications and notification clicks.
// Compatible with iOS 16.4+ Web Push API.
// ============================================

const CACHE_NAME = 'msg-v1';
const OFFLINE_URL = '/';

// --- Install: cache offline shell ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_URL]);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// --- Activate: clean old caches ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();
});

// --- Push: show notification ---
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Fallback: treat as plain text
    payload = {
      title: 'MSG',
      body: event.data.text(),
      chatId: null,
    };
  }

  const {
    title = 'MSG',
    body = 'Новое сообщение',
    chatId = null,
    icon = '/icons/icon-192.png',
    badge = '/icons/icon-192.png',
    tag = 'msg-notification',
    requireInteraction = false,
  } = payload;

  const options = {
    body,
    icon,
    badge,
    tag,
    requireInteraction,
    // Vibration pattern (not supported on iOS but harmless)
    vibrate: [200, 100, 200],
    // Custom data passed through to notificationclick
    data: {
      chatId,
      url: chatId ? `/?chat=${chatId}` : '/',
      timestamp: Date.now(),
    },
    // Actions shown on Android / macOS (iOS shows default dismiss)
    actions: chatId
      ? [
          { action: 'reply', title: 'Ответить', icon: '/icons/icon-192.png' },
          { action: 'dismiss', title: 'Закрыть' },
        ]
      : [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// --- Notification click: focus or open PWA ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { chatId, url = '/' } = event.notification.data || {};

  // Handle action buttons
  if (event.action === 'dismiss') {
    return; // Just close (already closed above)
  }

  // Default click or "reply" action → open/focus the PWA
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          // Navigate to the chat if chatId is present
          if (chatId) {
            client.postMessage({
              type: 'NAVIGATE_TO_CHAT',
              chatId,
            });
          }
          return;
        }
      }
      // No window open → open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// --- Message from client: handle navigation ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
