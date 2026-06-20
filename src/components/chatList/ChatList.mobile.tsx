import { useState, useRef, useCallback } from 'react'
import type { Chat } from '@/shared/types'
import { t } from '@/shared/types'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import type { ChatListProps } from '@/components/chatList/ChatList'

interface MobileChatListProps extends ChatListProps {}

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
    case 'owl': return '🦉'
    case 'hermes': return '🤖'
    default: return ''
  }
}

export function ChatList({
  chats, isLoading, onChatClick, typingChats,
  onPin, onUnpin, onArchive, onMute, onDelete,
}: MobileChatListProps) {
  const { showBanner, isSubscribing, subscribeUser, dismissBanner } = usePushNotifications()
  const [actionSheetChat, setActionSheetChat] = useState<Chat | null>(null)
  const [deleteConfirmChat, setDeleteConfirmChat] = useState<Chat | null>(null)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', fontSize: 14 }}>
        {t('loading')}
      </div>
    )
  }

  return (
    <div className="scrollable" style={{ height: '100%' }}>
      {showBanner && (
        <PushNotificationBanner
          isSubscribing={isSubscribing}
          onEnable={subscribeUser}
          onDismiss={dismissBanner}
        />
      )}

      {chats.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          onChatClick={onChatClick}
          onLongPress={setActionSheetChat}
          isTyping={typingChats?.[chat.id] || false}
          onPin={onPin}
          onUnpin={onUnpin}
          onArchive={onArchive}
          onMute={onMute}
          onDelete={(chatId) => {
            const c = chats.find((ch) => ch.id === chatId)
            if (c) setDeleteConfirmChat(c)
          }}
        />
      ))}

      {actionSheetChat && (
        <ActionSheet
          chat={actionSheetChat}
          onClose={() => setActionSheetChat(null)}
          onPin={() => { onPin?.(actionSheetChat.id); setActionSheetChat(null) }}
          onUnpin={() => { onUnpin?.(actionSheetChat.id); setActionSheetChat(null) }}
          onArchive={() => { onArchive?.(actionSheetChat.id); setActionSheetChat(null) }}
          onMute={() => { onMute?.(actionSheetChat.id); setActionSheetChat(null) }}
          onDelete={() => { setDeleteConfirmChat(actionSheetChat); setActionSheetChat(null) }}
        />
      )}

      {deleteConfirmChat && (
        <DeleteConfirmDialog
          chatName={deleteConfirmChat.name}
          onConfirm={() => { onDelete?.(deleteConfirmChat.id); setDeleteConfirmChat(null) }}
          onCancel={() => setDeleteConfirmChat(null)}
        />
      )}
    </div>
  )
}

// --- Push Notification Banner ---

interface PushNotificationBannerProps {
  isSubscribing: boolean
  onEnable: () => Promise<boolean>
  onDismiss: () => void
}

function PushNotificationBanner({ isSubscribing, onEnable, onDismiss }: PushNotificationBannerProps) {
  return (
    <div
      style={{
        margin: '12px 16px',
        padding: '14px 16px',
        background: 'linear-gradient(135deg, rgba(107, 92, 231, 0.15), rgba(139, 124, 247, 0.1))',
        borderRadius: 14,
        border: '1px solid rgba(107, 92, 231, 0.3)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          🔔
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
            Уведомления
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
            Не пропустите новые сообщения
          </div>
        </div>
      </div>

      <p style={{
        fontSize: 13,
        color: 'rgba(255,255,255,0.65)',
        lineHeight: 1.4,
        marginBottom: 12,
        marginLeft: 46,
      }}>
        Включите уведомления, чтобы получать мгновенные оповещения о новых сообщениях даже когда приложение закрыто.
      </p>

      <div style={{ display: 'flex', gap: 8, marginLeft: 46 }}>
        <button
          onClick={onEnable}
          disabled={isSubscribing}
          style={{
            flex: 1,
            height: 36,
            borderRadius: 10,
            background: isSubscribing ? 'rgba(107, 92, 231, 0.5)' : 'linear-gradient(135deg, #6b5ce7, #8b7cf7)',
            border: 'none',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: isSubscribing ? 'default' : 'pointer',
            opacity: isSubscribing ? 0.7 : 1,
            transition: 'opacity 0.15s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {isSubscribing ? 'Подключение...' : 'Включить'}
        </button>
        <button
          onClick={onDismiss}
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Позже
        </button>
      </div>
    </div>
  )
}

// --- Single Chat Item (with swipe + long press) ---

interface ChatListItemProps {
  chat: Chat
  onChatClick: (chatId: string) => void
  onLongPress: (chat: Chat) => void
  isTyping: boolean
  onPin?: (chatId: string) => void
  onUnpin?: (chatId: string) => void
  onArchive?: (chatId: string) => void
  onMute?: (chatId: string) => void
  onDelete?: (chatId: string) => void
}

function ChatListItem({ chat, onChatClick, onLongPress, isTyping, onDelete, onArchive }: ChatListItemProps) {
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    longPressTimerRef.current = setTimeout(() => {
      onLongPress(chat)
      longPressTimerRef.current = null
    }, 500)
  }, [chat, onLongPress])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!longPressTimerRef.current) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    if (Math.abs(dy) > 10 || Math.abs(dx) > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }
    if (Math.abs(dx) > 15) {
      setIsSwiping(true)
      setSwipeX(Math.min(0, Math.max(-120, dx)))
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (isSwiping) {
      if (swipeX < -60) {
        setSwipeX(-100)
      } else {
        setSwipeX(0)
      }
      setIsSwiping(false)
      return
    }
    setSwipeX(0)
    setIsSwiping(false)
    onChatClick(chat.id)
  }, [isSwiping, swipeX, chat.id, onChatClick])

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        <div
          onClick={() => onArchive?.(chat.id)}
          style={{
            width: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#6b5ce7',
            color: '#fff',
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          📦
        </div>
        <div
          onClick={() => onDelete?.(chat.id)}
          style={{
            width: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#e74c3c',
            color: '#fff',
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          🗑️
        </div>
      </div>

      <div
        ref={itemRef}
        onClick={() => {
          if (swipeX === 0) onChatClick(chat.id)
          else setSwipeX(0)
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'rgba(255,255,255,0.05)',
          opacity: chat.isMuted ? 0.7 : 1,
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease',
          background: '#1a1a2e',
          position: 'relative',
          zIndex: 1,
        }}
      >
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

        <div style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
              {chat.isPinned && <span style={{ fontSize: 12, flexShrink: 0 }}>📌</span>}
              <span style={{ fontSize: 16, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {chat.name}
              </span>
              {chat.isMuted && <span style={{ fontSize: 12, flexShrink: 0 }}>🔇</span>}
            </div>
            <span style={{ fontSize: 12, color: chat.unreadCount > 0 ? '#6b5ce7' : '#888', flexShrink: 0, marginLeft: 8 }}>
              {formatTime(chat.lastMessageTime)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {isTyping ? (
              <span style={{ fontSize: 14, color: '#6b5ce7', flex: 1, fontStyle: 'italic' }}>
                печатает...
              </span>
            ) : (
              <span style={{ fontSize: 14, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {chat.lastMessageHasImage && <span style={{ marginRight: 4 }}>📷</span>}
                {chat.lastMessageUsername && <span style={{ color: '#aaa' }}>{chat.lastMessageUsername}: </span>}
                {chat.lastMessageText || t('noMessages')}
              </span>
            )}
            {chat.unreadCount > 0 && (
              <span style={{
                background: '#6b5ce7', color: '#fff', fontSize: 11, fontWeight: 700,
                borderRadius: 10, padding: '2px 7px', minWidth: 20, textAlign: 'center',
                flexShrink: 0, marginLeft: 8,
              }}>
                {chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Action Sheet (iOS style) ---

interface ActionSheetProps {
  chat: Chat
  onClose: () => void
  onPin: () => void
  onUnpin: () => void
  onArchive: () => void
  onMute: () => void
  onDelete: () => void
}

function ActionSheet({ chat, onClose, onPin, onUnpin, onArchive, onMute, onDelete }: ActionSheetProps) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#2a2a3e',
          borderRadius: '14px 14px 0 0',
          padding: '8px 0',
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
          zIndex: 1001,
          animation: 'slideUp 0.25s ease',
        }}
      >
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.2)',
          margin: '8px auto 12px',
        }} />
        <div style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.5)',
          padding: '4px 20px 8px',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {chat.name}
        </div>

        <ActionSheetItem
          icon={chat.isPinned ? '📌' : '📌'}
          label={chat.isPinned ? 'Открепить' : 'Закрепить'}
          onClick={chat.isPinned ? onUnpin : onPin}
        />
        <ActionSheetItem icon="📦" label="Архивировать" onClick={onArchive} />
        <ActionSheetItem
          icon={chat.isMuted ? '🔔' : '🔇'}
          label={chat.isMuted ? 'Включить уведомления' : 'Выключить уведомления'}
          onClick={onMute}
        />
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />
        <ActionSheetItem icon="🗑️" label="Удалить" onClick={onDelete} destructive />
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  )
}

function ActionSheetItem({ icon, label, onClick, destructive }: {
  icon: string
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 20px',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'rgba(255,255,255,0.05)',
      }}
    >
      <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{icon}</span>
      <span style={{
        fontSize: 16,
        color: destructive ? '#e74c3c' : '#fff',
        fontWeight: 500,
      }}>
        {label}
      </span>
    </div>
  )
}

// --- Delete Confirmation Dialog ---

function DeleteConfirmDialog({ chatName, onConfirm, onCancel }: {
  chatName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 1002,
          animation: 'fadeIn 0.15s ease',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#2a2a3e',
          borderRadius: 16,
          padding: '24px 20px 16px',
          width: 280,
          zIndex: 1003,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
          Удалить чат?
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 20, lineHeight: 1.4 }}>
          Чат «{chatName}» и все сообщения будут удалены.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#fff',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              background: '#e74c3c',
              border: 'none',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Удалить
          </button>
        </div>
      </div>
    </>
  )
}
