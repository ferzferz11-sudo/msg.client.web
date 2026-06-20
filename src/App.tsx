// ============================================
// App — Root Component with Auth + Routing
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { ChatListScreen } from '@/components/chatList/ChatListScreen'
import { ChatScreen } from '@/components/chat/ChatScreen'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { grpcClient } from '@/shared/api/grpcClient'
import { useIOSKeyboard } from '@/hooks/useIOSKeyboard'
import { useAuthStore } from '@/store/authStore'
import '@/styles/global.css'

type Screen = 'auth' | 'chatList' | 'chat'

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const setTokens = useAuthStore((s) => s.setTokens)

  useIOSKeyboard()

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
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

  const handleAuthSuccess = useCallback(() => {
    setCurrentScreen('chatList')
  }, [])

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
        <ChatListScreen onChatSelect={handleChatSelect} onLogout={handleLogout} />
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', height: 'var(--viewport-available-height, 100dvh)',
      overflow: 'hidden', background: '#1a1a2e',
    }}>
      {currentScreen === 'chatList' && (
        <div key="list" className="screen-enter" style={{ width: '100%', height: '100%' }}>
          <ChatListScreen onChatSelect={handleChatSelect} onLogout={handleLogout} />
        </div>
      )}

      {currentScreen === 'chat' && activeChatId && (
        <div key={`chat-${activeChatId}`} className="screen-enter" style={{ width: '100%', height: '100%' }}>
          <ChatScreen chatId={activeChatId} onBack={handleBack} />
        </div>
      )}
    </div>
  )
}
