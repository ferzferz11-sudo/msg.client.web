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

type Screen = 'auth' | 'chatList' | 'chat' | 'profile' | 'favorites'

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showShutdownBanner, setShowShutdownBanner] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

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
        {currentScreen === 'profile' ? (
          <ProfileScreen onBack={handleBack} onFavorites={handleFavorites} />
        ) : currentScreen === 'favorites' ? (
          <FavoritesScreen onBack={handleBack} />
        ) : (
          <ChatListScreen onChatSelect={handleChatSelect} onLogout={handleLogout} onProfile={handleProfile} />
        )}
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
