// ============================================
// App — Root Component with Auth + Routing
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { ChatListScreen } from '@/components/chatList/ChatListScreen'
import { ChatScreen } from '@/components/chat/ChatScreen'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { ProfileScreen } from '@/components/profile/ProfileScreen'
import { FavoritesScreen } from '@/components/favorites/FavoritesScreen'
import { grpcClient } from '@/shared/api/grpcClient'
import { useIOSKeyboard } from '@/hooks/useIOSKeyboard'
import { useAuthStore } from '@/store/authStore'
import { isMobile } from '@/shared/utils'
import '@/styles/global.css'

type Screen = 'auth' | 'chatList' | 'chat' | 'profile' | 'favorites' | 'contacts'

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showShutdownBanner, setShowShutdownBanner] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [hasUpdate, setHasUpdate] = useState(false)
  const [latestVersion, setLatestVersion] = useState('')

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const setTokens = useAuthStore((s) => s.setTokens)

  useIOSKeyboard()

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        console.warn('[SW] Registration failed:', err)
      })
    }
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'NAVIGATE_TO_CHAT') {
          setActiveChatId(event.data.chatId)
          setCurrentScreen('chat')
        }
      }
      navigator.serviceWorker.addEventListener('message', handleMessage)
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
    }
  }, [])

  useEffect(() => {
    const tokensStr = localStorage.getItem('auth_tokens')
    const userStr = localStorage.getItem('auth_user')

    if (tokensStr && userStr) {
      try {
        const tokens = JSON.parse(tokensStr)
        const user = JSON.parse(userStr)
        const now = Math.floor(Date.now() / 1000)
        if (tokens.refreshExpiresAt > now) {
          const getTokens = () => useAuthStore.getState().tokens
          grpcClient.connect(undefined, getTokens)
          setTokens({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            accessExpiresAt: tokens.accessExpiresAt,
            refreshExpiresAt: tokens.refreshExpiresAt,
            user,
          })
          setCurrentScreen('chatList')
          fetchServerCapabilities()
        } else {
          localStorage.removeItem('auth_tokens')
          localStorage.removeItem('auth_user')
        }
      } catch (err) {
        console.error('Failed to restore session:', err)
        localStorage.removeItem('auth_tokens')
        localStorage.removeItem('auth_user')
      }
    }
    setIsLoading(false)
  }, [setTokens])

  const fetchServerCapabilities = useCallback(async () => {
    try {
      await grpcClient.fetchServerInfo()
    } catch (err) {
      console.error('Failed to fetch server info:', err)
    }
  }, [])

  const checkServerHealth = useCallback(async () => {
    try {
      const response = await fetch('/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }, [])

  const handleServerShutdown = useCallback(() => {
    setShowShutdownBanner(true)
  }, [])

  const handleReconnecting = useCallback((reconnecting: boolean) => {
    setIsReconnecting(reconnecting)
    if (reconnecting) {
      const pollHealth = async () => {
        const healthy = await checkServerHealth()
        if (!healthy) {
          setTimeout(pollHealth, 5000)
        } else {
          setIsReconnecting(false)
          setShowShutdownBanner(false)
          fetchServerCapabilities()
        }
      }
      pollHealth()
    }
  }, [checkServerHealth, fetchServerCapabilities])

  const handleStreamError = useCallback(
    (error: string) => {
      if (error.includes('UNAVAILABLE')) {
        setIsOffline(true)
        const pollHealth = async () => {
          const healthy = await checkServerHealth()
          if (!healthy) {
            setTimeout(pollHealth, 5000)
          } else {
            setIsOffline(false)
          }
        }
        pollHealth()
      }
    },
    [checkServerHealth]
  )

  const handleAuthSuccess = useCallback(() => {
    setCurrentScreen('chatList')
    fetchServerCapabilities()
  }, [fetchServerCapabilities])

  const handleLogout = useCallback(async () => {
    await grpcClient.signOut(false)
    logout()
    setCurrentScreen('auth')
  }, [logout])

  const handleChatSelect = useCallback((chatId: string) => {
    setActiveChatId(chatId)
    setCurrentScreen('chat')
  }, [])

  const handleBack = useCallback(() => {
    setCurrentScreen('chatList')
    setActiveChatId(null)
  }, [])

  const handleProfile = useCallback(() => {
    setCurrentScreen('profile')
  }, [])

  const handleFavorites = useCallback(() => {
    setCurrentScreen('favorites')
  }, [])

  const handleContacts = useCallback(() => {
    setCurrentScreen('contacts')
  }, [])

  // --- Update Check ---
  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const current = localStorage.getItem('app_version')
        if (current && current !== data.version) {
          setLatestVersion(data.version)
          setHasUpdate(true)
        }
        localStorage.setItem('app_version', data.version)
      } catch {}
    }
    checkForUpdate()
    const interval = setInterval(checkForUpdate, 60_000)
    return () => clearInterval(interval)
  }, [])

  const handleUpdate = useCallback(() => {
    const doReload = () => {
      localStorage.removeItem('app_version')
      location.reload()
    }
    if ('caches' in window) {
      caches.keys().then((names) => {
        Promise.all(names.map((n) => caches.delete(n))).then(doReload)
      })
    } else {
      doReload()
    }
  }, [])

  if (isLoading) {
    return (
      <div style={{
        width: '100%', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#1a1a2e',
      }}>
        <div style={{ color: '#fff', fontSize: 18 }}>Загрузка...</div>
      </div>
    )
  }

  if (!isAuthenticated || currentScreen === 'auth') {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />
  }

  if (!isMobile()) {
    return (
      <div style={{
        width: '100%', height: '100vh', overflow: 'hidden', background: '#1a1a2e',
      }}>
        {showShutdownBanner && (
          <ShutdownBanner />
        )}
        {isReconnecting && !showShutdownBanner && (
          <ReconnectionBanner />
        )}
        {isOffline && !isReconnecting && !showShutdownBanner && (
          <OfflineBanner />
        )}
        {hasUpdate && (
          <UpdateBanner version={latestVersion} onUpdate={handleUpdate} />
        )}
        <ChatListScreen
          onChatSelect={handleChatSelect}
          onLogout={handleLogout}
          onProfile={handleProfile}
          onContacts={handleContacts}
          onFavorites={handleFavorites}
          rightPanel={currentScreen === 'profile' ? 'profile' : currentScreen === 'contacts' ? 'contacts' : currentScreen === 'favorites' ? 'favorites' : null}
          onCloseRightPanel={handleBack}
        />
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', height: 'var(--viewport-available-height, 100dvh)',
      overflow: 'hidden', background: '#1a1a2e',
    }}>
      {showShutdownBanner && (
        <ShutdownBanner />
      )}
      {isReconnecting && !showShutdownBanner && (
        <ReconnectionBanner />
      )}
      {isOffline && !isReconnecting && !showShutdownBanner && (
        <OfflineBanner />
      )}
      {hasUpdate && (
        <UpdateBanner version={latestVersion} onUpdate={handleUpdate} />
      )}

      {currentScreen === 'chatList' && (
        <div key="list" className="screen-enter" style={{ width: '100%', height: '100%' }}>
          <ChatListScreen onChatSelect={handleChatSelect} onLogout={handleLogout} onProfile={handleProfile} />
        </div>
      )}

      {currentScreen === 'chat' && activeChatId && (
        <div key={`chat-${activeChatId}`} className="screen-enter" style={{ width: '100%', height: '100%' }}>
          <ChatScreen
            chatId={activeChatId}
            onBack={handleBack}
            onServerShutdown={handleServerShutdown}
            onReconnecting={handleReconnecting}
            onStreamError={handleStreamError}
          />
        </div>
      )}

      {currentScreen === 'profile' && (
        <div key="profile" className="screen-enter" style={{ width: '100%', height: '100%' }}>
          <ProfileScreen onBack={handleBack} onFavorites={handleFavorites} />
        </div>
      )}

      {currentScreen === 'favorites' && (
        <div key="favorites" className="screen-enter" style={{ width: '100%', height: '100%' }}>
          <FavoritesScreen onBack={handleBack} />
        </div>
      )}
    </div>
  )
}

function ShutdownBanner() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      padding: '10px 16px', paddingTop: 'calc(10px + var(--sat, 0px))',
      background: 'rgba(255,180,50,0.95)',
      backdropFilter: 'blur(10px)',
      zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 14, color: '#1a1a2e', fontWeight: 600 }}>
        Сервер перезагружается. Пожалуйста, подождите...
      </span>
    </div>
  )
}

function ReconnectionBanner() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      padding: '10px 16px', paddingTop: 'calc(10px + var(--sat, 0px))',
      background: 'rgba(107,92,231,0.9)',
      backdropFilter: 'blur(10px)',
      zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>
        Переподключение к серверу...
      </span>
    </div>
  )
}

function OfflineBanner() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      padding: '10px 16px', paddingTop: 'calc(10px + var(--sat, 0px))',
      background: 'rgba(255,80,80,0.9)',
      backdropFilter: 'blur(10px)',
      zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>
        Сервер недоступен. Проверьте подключение к сети.
      </span>
    </div>
  )
}

function UpdateBanner({ version, onUpdate }: { version: string; onUpdate: () => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      background: 'rgba(107,92,231,0.95)',
      backdropFilter: 'blur(10px)',
      zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <span style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>
        Доступно обновление{version ? ` v${version}` : ''}
      </span>
      <button onClick={onUpdate} style={{
        padding: '6px 16px', borderRadius: 8,
        background: '#fff', border: 'none',
        color: '#6b5ce7', fontSize: 14, fontWeight: 600,
        cursor: 'pointer', flexShrink: 0,
      }}>
        Обновить
      </button>
    </div>
  )
}
