// ============================================
// ChatListScreen — Desktop (Sidebar + Main Area)
// ============================================
// Two-panel layout: chat list on the left,
// selected chat or placeholder on the right.
// ============================================

import { useState, useCallback } from 'react'
import { ChatList } from '@/components/chatList/ChatList'
import { ChatScreen } from '@/components/chat/ChatScreen'
import { useChats } from '@/hooks/useChats'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { t } from '@/shared/types'

interface ChatListScreenProps {
  onChatSelect: (chatId: string) => void
  onLogout: () => void
}

export function ChatListScreen({ onChatSelect, onLogout }: ChatListScreenProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const { chats, isLoadingChats, openChat } = useChats()
  const setActiveChatIdInStore = useChatStore((s) => s.setActiveChatId)
  const user = useAuthStore((s) => s.user)

  const handleChatClick = useCallback((chatId: string) => {
    openChat(chatId)
    setActiveChatId(chatId)
    setActiveChatIdInStore(chatId)
    onChatSelect(chatId)
  }, [openChat, setActiveChatId, setActiveChatIdInStore, onChatSelect])

  const handleBack = useCallback(() => {
    setActiveChatId(null)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar — Chat List */}
      <div
        style={{
          width: 320,
          minWidth: 260,
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          background: '#16162a',
          overflow: 'hidden',
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 52,
            padding: '0 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
            🦞 Lava
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {user && (
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                {user.username}
              </span>
            )}
            <button
              onClick={onLogout}
              title="Выйти"
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                fontSize: 18,
                padding: 4,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Chat List */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatList
            chats={chats}
            isLoading={isLoadingChats}
            onChatClick={handleChatClick}
            activeChatId={activeChatId}
          />
        </div>
      </div>

      {/* Main Area — Chat or Placeholder */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#1a1a2e' }}>
        {activeChatId ? (
          <ChatScreen chatId={activeChatId} onBack={handleBack} />
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.3)',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 48 }}>💬</div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>{t('selectChat')}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>
              {t('selectChatHint')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
