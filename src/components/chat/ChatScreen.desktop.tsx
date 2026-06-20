// ============================================
// ChatScreen — Desktop
// ============================================
// Full chat view with message list, input area,
// and chat header. Uses react-virtuoso for
// virtual scrolling.
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { t } from '@/shared/types'
import type { Message } from '@/shared/types'

interface ChatScreenProps {
  chatId: string
  onBack: () => void
  onServerShutdown?: () => void
  onReconnecting?: (isReconnecting: boolean) => void
  onStreamError?: (error: string) => void
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

export function ChatScreen({ chatId, onServerShutdown, onReconnecting, onStreamError }: ChatScreenProps) {
  const activeChat = useChatStore((s) => s.getActiveChat())
  const user = useAuthStore((s) => s.user)
  const {
    messages,
    isLoadingMessages,
    isSendingMessage,
    isLoadingMore,
    hasMore,
    sendMessage,
    loadMore,
    draft,
    updateDraft,
    clearDraft,
    editingMessageId,
    editingText,
    setEditingText,
    editMessage,
    startEditing,
    cancelEditing,
    deleteMessages,
    toggleReaction,
    selectedMessages,
    isSelecting,
    toggleSelectMessage,
    clearSelection,
    typingUsers,
    replyToMessage,
    setReplyToMessage,
  } = useChatMessages({ chatId, onServerShutdown, onReconnecting, onStreamError })

  const [inputText, setInputText] = useState('')
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null)
  const [reactionPicker, setReactionPicker] = useState<{ messageId: string; x: number; y: number } | null>(null)
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const shouldFollowOutput = useRef(true)

  // Initialize input with draft
  useEffect(() => {
    setInputText(draft)
  }, [draft])

  // Follow new messages (auto-scroll to bottom)
  useEffect(() => {
    if (shouldFollowOutput.current && messages.length > 0) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        behavior: 'smooth',
      })
    }
  }, [messages.length])

  const handleSend = useCallback(() => {
    if (!inputText.trim() || isSendingMessage) return
    if (editingMessageId) {
      editMessage(editingMessageId, inputText)
    } else {
      sendMessage(inputText)
    }
    setInputText('')
    clearDraft()
    shouldFollowOutput.current = true
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [inputText, isSendingMessage, sendMessage, editingMessageId, editMessage, clearDraft])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
      if (e.key === 'Escape' && editingMessageId) {
        cancelEditing()
        setInputText(draft)
      }
    },
    [handleSend, editingMessageId, cancelEditing, draft],
  )

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInputText(val)
    updateDraft(val)
  }, [updateDraft])

  // Handle scroll to top → load more
  const handleStartReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMore()
    }
  }, [hasMore, isLoadingMore, loadMore])

  // Context menu handlers
  const closeMenus = useCallback(() => {
    setContextMenu(null)
    setReactionPicker(null)
  }, [])

  const handleReact = useCallback((messageId: string) => {
    setContextMenu(null)
    setReactionPicker({ messageId, x: contextMenu?.x || 0, y: (contextMenu?.y || 0) - 60 })
  }, [contextMenu])

  const handleEdit = useCallback((message: Message) => {
    setContextMenu(null)
    startEditing(message.id, message.text)
    setInputText(message.text)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [startEditing])

  const handleDelete = useCallback((messageId: string) => {
    setContextMenu(null)
    deleteMessages([messageId])
  }, [deleteMessages])

  const handleReply = useCallback((message: Message) => {
    setContextMenu(null)
    setReplyToMessage(message)
    inputRef.current?.focus()
  }, [setReplyToMessage])

  // Get typing user names
  const typingNames = Array.from(typingUsers.keys())

  const chatIcon = activeChat?.type === 'owl' ? '🦉' : activeChat?.type === 'hermes' ? '🤖' : null
  const chatColor = activeChat?.type === 'owl' ? '#6b5ce7' : activeChat?.type === 'hermes' ? '#e75c5c' : '#5c8ae7'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Chat Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 52,
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          gap: 10,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: chatColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {chatIcon || activeChat?.name.charAt(0).toUpperCase() || '?'}
        </div>

        {/* Name + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeChat?.name || t('chat')}
          </div>
          {activeChat?.isOnline !== undefined && (
            <div style={{ fontSize: 12, color: activeChat.isOnline ? '#4caf50' : 'rgba(255,255,255,0.3)' }}>
              {activeChat.isOnline ? t('online') : t('offline')}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            style={headerButtonStyle}
            title="Поиск"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button
            style={headerButtonStyle}
            title="Ещё"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Selection header */}
      {isSelecting && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          height: 44,
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(107, 92, 231, 0.1)',
          flexShrink: 0,
        }}>
          <button
            onClick={clearSelection}
            style={{
              background: 'none', border: 'none', color: '#6b5ce7',
              fontSize: 14, cursor: 'pointer', padding: '4px 8px',
            }}
          >
            Отмена
          </button>
          <div style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: 600 }}>
            {selectedMessages.length} выбрано
          </div>
          <button
            onClick={() => deleteMessages(selectedMessages)}
            style={{
              background: 'none', border: 'none', color: '#e74c4c',
              fontSize: 14, cursor: 'pointer', padding: '4px 8px',
            }}
          >
            Удалить
          </button>
        </div>
      )}

      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <div style={{
          padding: '6px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 3 }}>
            <span className="typing-dot-1" style={{ width: 4, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.4)' }} />
            <span className="typing-dot-2" style={{ width: 4, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.4)' }} />
            <span className="typing-dot-3" style={{ width: 4, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.4)' }} />
          </div>
          {typingNames.length === 1 ? `${typingNames[0]} печатает...` : `${typingNames.length} печатают...`}
        </div>
      )}

      {/* Messages Area */}
      {isLoadingMessages ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: 14,
        }}>
        {t('loadingMessages')}
        </div>
      ) : (
        <div style={{ flex: 1, padding: '8px 0', minHeight: 0 }}>
          <Virtuoso
            ref={virtuosoRef}
            data={messages}
            firstItemIndex={0}
            startReached={handleStartReached}
            itemContent={(index, msg) => (
              <MessageBubble
                message={msg}
                isFirst={index === 0}
                isOwn={msg.user === user?.username}
                isSelecting={isSelecting}
                isSelected={selectedMessages.includes(msg.id)}
                onSelect={() => toggleSelectMessage(msg.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (!isSelecting) {
                    setContextMenu({ messageId: msg.id, x: e.clientX, y: e.clientY })
                  }
                }}
                onReaction={(emoji) => toggleReaction(msg.id, emoji)}
              />
            )}
            followOutput="smooth"
            atBottomThreshold={100}
            atBottomStateChange={(atBottom) => {
              shouldFollowOutput.current = atBottom
            }}
            style={{ height: '100%' }}
            className="scrollable"
          />
        </div>
      )}

      {/* Message Input */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        {/* Edit mode banner */}
        {editingMessageId && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            background: 'rgba(107, 92, 231, 0.15)',
            borderBottom: '1px solid rgba(107, 92, 231, 0.3)',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b5ce7' }}>Редактирование</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {editingText}
              </div>
            </div>
            <button
              onClick={() => {
                cancelEditing()
                setInputText(draft)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#e74c4c',
                fontSize: 18,
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Reply banner */}
        {replyToMessage && !editingMessageId && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            background: 'rgba(107, 92, 231, 0.15)',
            borderBottom: '1px solid rgba(107, 92, 231, 0.3)',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b5ce7' }}>Ответ: {replyToMessage.user}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {replyToMessage.text}
              </div>
            </div>
            <button
              onClick={() => setReplyToMessage(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#e74c4c',
                fontSize: 18,
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '12px 16px' }}>
          {/* Attachment button */}
          <button
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title="Прикрепить файл"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          {/* Text input */}
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'flex-end',
              padding: '8px 12px',
              minHeight: 36,
              maxHeight: 120,
            }}
          >
            <textarea
              ref={inputRef}
              value={editingMessageId ? editingText : inputText}
              onChange={editingMessageId ? (e) => setEditingText(e.target.value) : handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={editingMessageId ? 'Редактировать сообщение...' : t('writeMessage')}
              rows={1}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: 14,
                padding: 0,
                resize: 'none',
                minHeight: 20,
                maxHeight: 80,
                lineHeight: 1.4,
                fontFamily: 'inherit',
                overflow: 'hidden',
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!(editingMessageId ? editingText : inputText).trim() || isSendingMessage}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: (editingMessageId ? editingText : inputText).trim() ? '#6b5ce7' : 'rgba(255,255,255,0.06)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (editingMessageId ? editingText : inputText).trim() ? 'pointer' : 'default',
              opacity: isSendingMessage ? 0.5 : 1,
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
            title={editingMessageId ? 'Сохранить (Enter)' : 'Отправить (Enter)'}
          >
            {editingMessageId ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 13L9 17L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2 21L23 12L2 3V10L17 12L2 14V21Z"
                  fill={(editingMessageId ? editingText : inputText).trim() ? '#fff' : 'rgba(255,255,255,0.3)'}
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
          }}
          onClick={closeMenus}
        >
          <div
            style={{
              position: 'absolute',
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              top: Math.min(contextMenu.y, window.innerHeight - 220),
              background: 'rgba(40, 40, 60, 0.98)',
              borderRadius: 12,
              padding: '6px 0',
              minWidth: 180,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuButton emoji="😊" label="Реакция" onClick={() => handleReact(contextMenu.messageId)} />
            <MenuButton emoji="↩️" label="Ответить" onClick={() => {
              const msg = messages.find((m) => m.id === contextMenu.messageId)
              if (msg) handleReply(msg)
            }} />
            {messages.find((m) => m.id === contextMenu.messageId)?.user === user?.username && (
              <>
                <MenuButton emoji="✏️" label="Редактировать" onClick={() => {
                  const msg = messages.find((m) => m.id === contextMenu.messageId)
                  if (msg) handleEdit(msg)
                }} />
                <MenuButton emoji="🗑" label="Удалить" onClick={() => handleDelete(contextMenu.messageId)} isDestructive />
              </>
            )}
          </div>
        </div>
      )}

      {/* Reaction picker */}
      {reactionPicker && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1001,
          }}
          onClick={closeMenus}
        >
          <div
            style={{
              position: 'absolute',
              left: Math.min(reactionPicker.x, window.innerWidth - 280),
              top: Math.min(reactionPicker.y, window.innerHeight - 60),
              background: 'rgba(40, 40, 60, 0.98)',
              borderRadius: 24,
              padding: '8px 12px',
              display: 'flex',
              gap: 4,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  toggleReaction(reactionPicker.messageId, emoji)
                  closeMenus()
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: 'transparent',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Header Button Style ---

const headerButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 6,
  background: 'transparent',
  border: 'none',
  color: 'rgba(255,255,255,0.4)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.1s',
}

// --- Menu Button ---

interface MenuButtonProps {
  emoji: string
  label: string
  onClick: () => void
  isDestructive?: boolean
}

function MenuButton({ emoji, label, onClick, isDestructive }: MenuButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        color: isDestructive ? '#e74c4c' : '#fff',
        fontSize: 14,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{emoji}</span>
      {label}
    </button>
  )
}

// --- Message Bubble ---

interface MessageBubbleProps {
  message: Message
  isFirst?: boolean
  isOwn: boolean
  isSelecting: boolean
  isSelected: boolean
  onSelect: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onReaction: (emoji: string) => void
}

function MessageBubble({ message, isSelecting, isSelected, onSelect, onContextMenu }: MessageBubbleProps) {
  const isOutgoing = message.isOutgoing
  const reactions = message.reactions || {}

  const handleClick = () => {
    if (isSelecting) {
      onSelect()
    }
  }

  return (
    <div
      className="message-appear"
      style={{
        display: 'flex',
        justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
        marginBottom: 6,
        padding: '0 16px',
        opacity: isSelecting && isSelected ? 0.7 : 1,
        cursor: isSelecting ? 'pointer' : 'default',
      }}
      onClick={handleClick}
      onContextMenu={onContextMenu}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOutgoing ? 'flex-end' : 'flex-start', maxWidth: '65%' }}>
        {isSelecting && (
          <div style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            border: isSelected ? '2px solid #6b5ce7' : '2px solid rgba(255,255,255,0.3)',
            background: isSelected ? '#6b5ce7' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
            alignSelf: isOutgoing ? 'flex-end' : 'flex-start',
          }}>
            {isSelected && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )}

        {message.repliedToMessageId && message.repliedToText && (
          <div style={{
            background: 'rgba(107, 92, 231, 0.2)',
            borderRadius: 8,
            padding: '6px 10px',
            marginBottom: 4,
            maxWidth: '100%',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b5ce7', marginBottom: 2 }}>
              {message.repliedToUser}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {message.repliedToText}
            </div>
          </div>
        )}

        <div
          style={{
            padding: '8px 12px',
            borderRadius: isOutgoing ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: isOutgoing
              ? 'linear-gradient(135deg, #6b5ce7, #8b7cf7)'
              : 'rgba(255,255,255,0.08)',
            color: '#fff',
            fontSize: 14,
            lineHeight: 1.4,
            wordBreak: 'break-word',
          }}
        >
          {!isOutgoing && message.user && (
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b5ce7', marginBottom: 2 }}>
              {message.user}
            </div>
          )}
          <div>{message.text}</div>
          <div
            style={{
              fontSize: 11,
              color: isOutgoing ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)',
              marginTop: 4,
              textAlign: 'right',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 4,
            }}
          >
            {message.isEdited && <span style={{ fontSize: 10 }}>ред.</span>}
            {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {isOutgoing && (
              <span style={{ color: message.isRead ? '#4fc3f7' : undefined }}>
                {message.isRead ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>

        {/* Reactions */}
        {Object.keys(reactions).length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: 4,
          }}>
            {Object.entries(reactions).map(([emoji, users]) => (
              <div
                key={emoji}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  background: 'rgba(107, 92, 231, 0.2)',
                  borderRadius: 12,
                  padding: '2px 8px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <span>{emoji}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{users.length}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
