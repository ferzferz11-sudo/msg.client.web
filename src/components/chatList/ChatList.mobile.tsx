// ============================================
// ChatList — Mobile
// ============================================

import type { Chat } from '@/shared/types'

interface ChatListProps {
  chats: Chat[]
  isLoading: boolean
  onChatClick: (chatId: string) => void
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

function getChatIcon(type: Chat['type']): string {
  switch (type) {
    case 'owl':
      return '🦉'
    case 'hermes':
      return '🤖'
    default:
      return ''
  }
}

export function ChatList({ chats, isLoading, onChatClick }: ChatListProps) {
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#888',
          fontSize: 14,
        }}
      >
        Загрузка...
      </div>
    )
  }

  return (
    <div className="scrollable" style={{ height: '100%' }}>
      {chats.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          onChatClick={onChatClick}
        />
      ))}
    </div>
  )
}

// --- Single Chat Item ---

interface ChatListItemProps {
  chat: Chat
  onChatClick: (chatId: string) => void
}

function ChatListItem({ chat, onChatClick }: ChatListItemProps) {
  return (
    <div
      onClick={() => onChatClick(chat.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'rgba(255,255,255,0.05)',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          background: chat.type === 'owl' ? '#6b5ce7' : chat.type === 'hermes' ? '#e75c5c' : '#5c8ae7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {getChatIcon(chat.type) || chat.name.charAt(0).toUpperCase()}
        {chat.isOnline && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 12,
              height: 12,
              borderRadius: 6,
              background: '#4caf50',
              border: '2px solid #1a1a2e',
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {chat.name}
          </span>
          <span
            style={{
              fontSize: 12,
              color: chat.unreadCount > 0 ? '#6b5ce7' : '#888',
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            {formatTime(chat.lastMessageTime)}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 14,
              color: '#888',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {chat.lastMessageText || 'Нет сообщений'}
          </span>
          {chat.unreadCount > 0 && (
            <span
              style={{
                background: '#6b5ce7',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 10,
                padding: '2px 7px',
                minWidth: 20,
                textAlign: 'center',
                flexShrink: 0,
                marginLeft: 8,
              }}
            >
              {chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
