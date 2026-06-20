import { useState, useRef, useCallback, useEffect } from 'react'
import type { Chat } from '@/shared/types'
import { t } from '@/shared/types'
import type { ChatListProps } from '@/components/chatList/ChatList'

interface DesktopChatListProps extends ChatListProps {}

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

export function ChatList({
  chats, isLoading, onChatClick, activeChatId, typingChats,
  onPin, onUnpin, onArchive, onMute, onDelete, onMarkRead,
}: DesktopChatListProps) {
  const [contextMenu, setContextMenu] = useState<{ chat: Chat; x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [contextMenu, closeContextMenu])

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
        const isTyping = typingChats?.[chat.id] || false

        return (
          <div
            key={chat.id}
            onClick={() => onChatClick(chat.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu({ chat, x: e.clientX, y: e.clientY })
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 16px',
              cursor: 'pointer',
              background: isActive ? 'rgba(107, 92, 231, 0.15)' : 'transparent',
              borderLeft: isActive ? '3px solid #6b5ce7' : '3px solid transparent',
              transition: 'background 0.1s',
              opacity: chat.isMuted ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent'
            }}
          >
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

            <div style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 2,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
                  {chat.isPinned && <span style={{ fontSize: 11, flexShrink: 0 }}>📌</span>}
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
                  {chat.isMuted && <span style={{ fontSize: 11, flexShrink: 0 }}>🔇</span>}
                </div>
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
                {isTyping ? (
                  <span style={{
                    fontSize: 12,
                    color: '#6b5ce7',
                    flex: 1,
                    fontStyle: 'italic',
                  }}>
                    печатает...
                  </span>
                ) : (
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
                )}
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

      {contextMenu && (
        <ContextMenu
          ref={menuRef}
          chat={contextMenu.chat}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onPin={() => { contextMenu.chat.isPinned ? onUnpin?.(contextMenu.chat.id) : onPin?.(contextMenu.chat.id); closeContextMenu() }}
          onArchive={() => { onArchive?.(contextMenu.chat.id); closeContextMenu() }}
          onMute={() => { onMute?.(contextMenu.chat.id); closeContextMenu() }}
          onDelete={() => { onDelete?.(contextMenu.chat.id); closeContextMenu() }}
          onMarkRead={() => { onMarkRead?.(contextMenu.chat.id); closeContextMenu() }}
        />
      )}
    </div>
  )
}

// --- Context Menu ---

import { forwardRef } from 'react'

interface ContextMenuProps {
  chat: Chat
  x: number
  y: number
  onClose: () => void
  onPin: () => void
  onArchive: () => void
  onMute: () => void
  onDelete: () => void
  onMarkRead: () => void
}

const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(function ContextMenu(
  { chat, x, y, onClose, onPin, onArchive, onMute, onDelete, onMarkRead },
  ref
) {
  const adjustedStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 1100,
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1099 }} />
      <div
        ref={ref}
        style={{
          ...adjustedStyle,
          background: '#2a2a3e',
          borderRadius: 10,
          padding: '6px 0',
          minWidth: 180,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <ContextMenuItem
          icon={chat.isPinned ? '📌' : '📌'}
          label={chat.isPinned ? 'Открепить' : 'Закрепить'}
          onClick={onPin}
        />
        <ContextMenuItem icon="📦" label="Архивировать" onClick={onArchive} />
        <ContextMenuItem
          icon={chat.isMuted ? '🔔' : '🔇'}
          label={chat.isMuted ? 'Включить уведомления' : 'Выключить уведомления'}
          onClick={onMute}
        />
        {chat.unreadCount > 0 && (
          <ContextMenuItem icon="✓" label="Отметить как прочитанное" onClick={onMarkRead} />
        )}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
        <ContextMenuItem icon="🗑️" label="Удалить" onClick={onDelete} destructive />
      </div>
    </>
  )
})

function ContextMenuItem({ icon, label, onClick, destructive }: {
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
        gap: 10,
        padding: '8px 16px',
        cursor: 'pointer',
        fontSize: 13,
        color: destructive ? '#e74c3c' : '#fff',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{icon}</span>
      <span>{label}</span>
    </div>
  )
}
