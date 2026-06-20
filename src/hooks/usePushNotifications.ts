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
// 4. On user action → request permission → subscribe → register token via gRPC
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { grpcClient } from '@/shared/api/grpcClient'
import { useAuthStore } from '@/store/authStore'

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
  permission: PushPermission
  isPWA: boolean
  isSupported: boolean
  showBanner: boolean
  isSubscribing: boolean
  subscribeUser: () => Promise<boolean>
  dismissBanner: () => void
}

// --- Helpers ---

function isRunningAsPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as any).standalone === true)
  )
}

function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

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

  // Initialize: check PWA mode, support, and permission
  useEffect(() => {
    const pwa = isRunningAsPWA()
    const supported = isPushSupported()

    setIsPWA(pwa)
    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission as PushPermission)

      navigator.serviceWorker.ready.then((registration) => {
        registrationRef.current = registration

        // Check if already subscribed
        if (pwa && Notification.permission === 'granted') {
          registration.pushManager.getSubscription().then((subscription) => {
            if (!subscription) {
              // Permission granted but no subscription — needs re-subscribe
            }
          })
        }
      })
    } else {
      setPermission('unsupported')
    }
  }, [])

  // Subscribe user to push notifications
  const subscribeUser = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !registrationRef.current) {
      console.warn('Push notifications not supported')
      return false
    }

    setIsSubscribing(true)

    try {
      // Step 1: Request permission from user
      const result = await Notification.requestPermission()

      if (result !== 'granted') {
        setPermission(result as PushPermission)
        setIsSubscribing(false)
        return false
      }

      setPermission('granted')

      // Step 2: Get VAPID public key from backend (or use env var)
      // In production, fetch this from your API
      const vapidPublicKey =
        import.meta.env.VITE_VAPID_PUBLIC_KEY ||
        'BEl62iUYgUIV49q5CHWvA465W5K2lC0k8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8Qf7l6n8v9X3m2v8'

      // Step 3: Subscribe to push
      const registration = registrationRef.current

      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
      }

      // Step 4: Extract subscription keys
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

      // Step 5: Register token with backend via gRPC
      // Uses ChatService.RegisterToken from messenger.proto
      const userId = useAuthStore.getState().user?.id || ''
      await grpcClient.registerPushToken(
        userId,
        subscriptionInfo.endpoint,
        true // pushEnabled
      )

      setIsSubscribing(false)
      return true
    } catch (err) {
      console.error('Failed to subscribe to push notifications:', err)
      setIsSubscribing(false)
      return false
    }
  }, [isSupported])

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true)
  }, [])

  // Show banner ONLY if: PWA + supported + permission not decided + not dismissed
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
