// ============================================
// usePushNotifications — Web Push Hook
// ============================================
// Manages push notification subscription for PWA.
// Compatible with iOS 16.4+ and Android Chrome.
//
// Flow:
// 1. Check if running as PWA (standalone mode)
// 2. Check current permission status
// 3. If not decided → show banner
// 4. On user action → request permission → subscribe → register token
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'

// --- Types ---

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported'

export interface PushSubscriptionInfo {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface UsePushNotificationsReturn {
  /** Current permission status */
  permission: PushPermission
  /** Whether the app is running as PWA (standalone) */
  isPWA: boolean
  /** Whether push notifications are supported */
  isSupported: boolean
  /** Whether to show the enable banner */
  showBanner: boolean
  /** Whether currently subscribing */
  isSubscribing: boolean
  /** Subscribe the user to push notifications */
  subscribeUser: () => Promise<boolean>
  /** Dismiss the banner (don't ask again this session) */
  dismissBanner: () => void
}

// --- Helpers ---

/**
 * Check if the app is running as a PWA (standalone mode).
 * On iOS Safari, this returns true when launched from Home Screen.
 */
function isRunningAsPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as any).standalone === true)
  )
}

/**
 * Check if Web Push is supported by the browser.
 * Requires: serviceWorker, PushManager, and Notification APIs.
 */
function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Convert a base64 URL-safe string to a Uint8Array.
 * Used for VAPID key conversion.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// --- Hook ---

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PushPermission>('default')
  const [isPWA, setIsPWA] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  // --- Initialize: check PWA mode, support, and permission ---
  useEffect(() => {
    const pwa = isRunningAsPWA()
    const supported = isPushSupported()

    setIsPWA(pwa)
    setIsSupported(supported)

    if (supported) {
      // Get current permission
      setPermission(Notification.permission as PushPermission)

      // Get existing service worker registration
      navigator.serviceWorker.ready.then((registration) => {
        registrationRef.current = registration

        // Check if already subscribed
        if (pwa && Notification.permission === 'granted') {
          registration.pushManager.getSubscription().then((subscription) => {
            if (!subscription) {
              // Permission granted but no subscription — re-subscribe
              // This can happen if the subscription expired
            }
          })
        }
      })
    } else {
      setPermission('unsupported')
    }
  }, [])

  // --- Subscribe user to push notifications ---
  const subscribeUser = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !registrationRef.current) {
      console.warn('Push notifications not supported')
      return false
    }

    setIsSubscribing(true)

    try {
      // Step 1: Request permission
      const result = await Notification.requestPermission()

      if (result !== 'granted') {
        setPermission(result as PushPermission)
        setIsSubscribing(false)
        return false
      }

      setPermission('granted')

      // Step 2: Subscribe to push
      const registration = registrationRef.current

      // Mock VAPID public key (in production, this comes from the server)
      // This is a dummy key for development — replace with real VAPID key
      const vapidPublicKey =
        'BEl62iUYgUIV49q5CHWvA465W5K2lC0k8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8'

      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
      }

      // Step 3: Extract subscription info
      const p256dhKey = subscription.getKey('p256dh')
      const authKey = subscription.getKey('auth')

      const subscriptionInfo: PushSubscriptionInfo = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: p256dhKey
            ? btoa(String.fromCharCode(...new Uint8Array(p256dhKey)))
            : '',
          auth: authKey
            ? btoa(String.fromCharCode(...new Uint8Array(authKey)))
            : '',
        },
      }

      // Step 4: Register token with backend
      await grpcClient.registerPushToken({
        endpoint: subscriptionInfo.endpoint,
        p256dh: subscriptionInfo.keys.p256dh,
        auth: subscriptionInfo.keys.auth,
        platform: 'web',
        userAgent: navigator.userAgent,
      })

      setIsSubscribing(false)
      return true
    } catch (err) {
      console.error('Failed to subscribe to push notifications:', err)
      setIsSubscribing(false)
      return false
    }
  }, [isSupported])

  // --- Dismiss banner ---
  const dismissBanner = useCallback(() => {
    setBannerDismissed(true)
  }, [])

  // --- Show banner logic ---
  // Show banner ONLY if:
  // 1. Running as PWA
  // 2. Push is supported
  // 3. Permission is 'default' (not yet decided)
  // 4. Banner hasn't been dismissed this session
  const showBanner =
    isPWA &&
    isSupported &&
    permission === 'default' &&
    !bannerDismissed

  return {
    permission,
    isPWA,
    isSupported,
    showBanner,
    isSubscribing,
    subscribeUser,
    dismissBanner,
  }
}
