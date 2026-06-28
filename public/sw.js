// ============================================
// Service Worker — MSG PWA
// ============================================
// Handles push notifications and notification clicks.
// Compatible with iOS 16.4+ Web Push API.
//
// Expected push payload format (from backend):
// {
//   "title": "Sender Name",
//   "body": "Message text",
//   "data": {
//     "chatId": "chat-uuid",
//     "messageId": "msg-uuid",
//     "senderId": "user-uuid",
//     "type": "message" | "typing" | "presence"
//   }
// }
//
// This matches the Android FCM payload structure
// for cross-platform consistency.
// ============================================

const CACHE_NAME = 'msg-v4'
const OFFLINE_URL = '/'

// --- Install: cache offline shell ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_URL])
    })
  )
  self.skipWaiting()
})

// --- Activate: clean old caches ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// --- Push: show notification ---
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = {
      title: 'MSG',
      body: event.data.text(),
      data: { chatId: null, type: 'message' },
    }
  }

  // Extract fields matching Android FCM structure
  const {
    title = 'MSG',
    body = 'Новое сообщение',
    icon = '/icons/icon-192.png',
    badge = '/icons/icon-192.png',
    tag = 'msg-notification',
    requireInteraction = false,
  } = payload

  // Data object from backend (matches Android data payload)
  const data = payload.data || {}
  const chatId = data.chatId || null
  const messageId = data.messageId || null
  const senderId = data.senderId || null
  const type = data.type || 'message'

  const options = {
    body,
    icon,
    badge,
    tag,
    requireInteraction,
    vibrate: [200, 100, 200],
    // Full data passed to notificationclick handler
    data: {
      chatId,
      messageId,
      senderId,
      type,
      url: chatId ? `/?chat=${chatId}` : '/',
      timestamp: Date.now(),
    },
    actions: chatId
      ? [
          { action: 'reply', title: 'Ответить' },
          { action: 'dismiss', title: 'Закрыть' },
        ]
      : [],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// --- Notification click: focus or open PWA ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { chatId, url = '/' } = event.notification.data || {}

  if (event.action === 'dismiss') {
    return
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          if (chatId) {
            client.postMessage({
              type: 'NAVIGATE_TO_CHAT',
              chatId,
            })
          }
          return
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})

// --- Message from client ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
