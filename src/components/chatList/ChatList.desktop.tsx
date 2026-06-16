// ============================================
// ChatList — Desktop (Sidebar)
// ============================================
// Compact chat items for sidebar display.
// ============================================

import type { Chat } from '@/shared/types'
import { t } from '@/shared/types'

interface ChatListProps {
  chats: Chat[]
  isLoading: boolean
  onChatClick: (chatId: string) => void
  activeChatId?: string | null
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'Вчера'
  } else if (diffDays < 7) {
    return date.toLocaleDateString('ru-RU', { weekday: 'short' })
  }
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

function getChatColor(type: Chat['type']): string {
  switch (type) {
    case 'owl': return '#6b5ce7'
    case 'hermes': return '#e75c5c'
    case 'group': return '#e7a85c'
    default: return '#5c8ae7'
  }
}

function getChatIcon(type: Chat['type']): string {
  switch (type) {
    case 'owl': return '🦉'
    case 'hermes': return '🤖'
    default: return ''
  }
}

export function ChatList({ chats, isLoading, onChatClick, activeChatId }: ChatListProps) {
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        color: 'rgba(255,255,255,0.3)',
        fontSize: 13,
      }}>
        {t('loading')}
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        color: 'rgba(255,255,255,0.3)',
        fontSize: 13,
        textAlign: 'center',
      }}>
        {t('noChats')}
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.1) transparent',
      }}
      className="scrollable"
    >
      {chats.map((chat) => {
        const isActive = chat.id === activeChatId
        const color = getChatColor(chat.type)
        const icon = getChatIcon(chat.type)

        return (
          <div
            key={chat.id}
            onClick={() => onChatClick(chat.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 16px',
              cursor: 'pointer',
              background: isActive ? 'rgba(107, 92, 231, 0.15)' : 'transparent',
              borderLeft: isActive ? '3px solid #6b5ce7' : '3px solid transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent'
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
                position: 'relative',
              }}
            >
              {icon || chat.name.charAt(0).toUpperCase()}
              {chat.isOnline && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    right: -1,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: '#4caf50',
                    border: '2px solid #16162a',
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 2,
              }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {chat.name}
                </span>
                <span style={{
                  fontSize: 11,
                  color: chat.unreadCount > 0 ? '#6b5ce7' : 'rgba(255,255,255,0.3)',
                  flexShrink: 0,
                  marginLeft: 8,
                }}>
                  {formatTime(chat.lastMessageTime)}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.4)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {chat.lastMessageText || t('noMessages')}
                </span>
                {chat.unreadCount > 0 && (
                  <span style={{
                    background: '#6b5ce7',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 10,
                    padding: '1px 6px',
                    minWidth: 18,
                    textAlign: 'center',
                    flexShrink: 0,
                    marginLeft: 8,
                    lineHeight: '16px',
                  }}>
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
