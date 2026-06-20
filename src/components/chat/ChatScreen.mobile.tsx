// ============================================
// ChatScreen — Mobile (iOS Native Style)
// ============================================
// Uses react-virtuoso for virtual scrolling.
// Supports pagination (load more on scroll to top).
// Uses useIOSKeyboard for proper keyboard handling.
// ============================================

import { useState, useRef, useEffect, useCallback, forwardRef } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { Screen } from '@/components/common'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useIOSKeyboard } from '@/hooks/useIOSKeyboard'
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

export function ChatScreen({ chatId, onBack, onServerShutdown, onReconnecting, onStreamError }: ChatScreenProps) {
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
    setIsSelecting,
    toggleSelectMessage,
    clearSelection,
    typingUsers,
    replyToMessage,
    setReplyToMessage,
  } = useChatMessages({ chatId, onServerShutdown, onReconnecting, onStreamError })
  const { isKeyboardOpen, keyboardHeight } = useIOSKeyboard()

  const [inputText, setInputText] = useState('')
  const [longPressMenu, setLongPressMenu] = useState<{ messageId: string; x: number; y: number } | null>(null)
  const [reactionPicker, setReactionPicker] = useState<{ messageId: string; x: number; y: number } | null>(null)
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const shouldFollowOutput = useRef(true)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Focus input when chat opens
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300)
    return () => clearTimeout(timer)
  }, [chatId])

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

  const handleInputTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Long press handlers
  const handleTouchStart = useCallback((messageId: string, e: React.TouchEvent) => {
    const touch = e.touches[0]
    longPressTimerRef.current = setTimeout(() => {
      if (isSelecting) {
        toggleSelectMessage(messageId)
      } else {
        setLongPressMenu({ messageId, x: touch.clientX, y: touch.clientY })
      }
    }, 500)
  }, [isSelecting, toggleSelectMessage])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handleLongPressStart = useCallback((messageId: string) => {
    if (!isSelecting) {
      setIsSelecting(true)
      toggleSelectMessage(messageId)
    }
  }, [isSelecting, setIsSelecting, toggleSelectMessage])

  // Close menus
  const closeMenus = useCallback(() => {
    setLongPressMenu(null)
    setReactionPicker(null)
  }, [])

  // Menu actions
  const handleReact = useCallback((messageId: string) => {
    setLongPressMenu(null)
    setReactionPicker({ messageId, x: longPressMenu?.x || 0, y: (longPressMenu?.y || 0) - 60 })
  }, [longPressMenu])

  const handleEdit = useCallback((message: Message) => {
    setLongPressMenu(null)
    startEditing(message.id, message.text)
    setInputText(message.text)
  }, [startEditing])

  const handleDelete = useCallback((messageId: string) => {
    setLongPressMenu(null)
    deleteMessages([messageId])
  }, [deleteMessages])

  const handleReply = useCallback((message: Message) => {
    setLongPressMenu(null)
    setReplyToMessage(message)
    inputRef.current?.focus()
  }, [setReplyToMessage])

  // Get typing user names
  const typingNames = Array.from(typingUsers.keys())

  return (
    <Screen
      header={
        <ChatHeader
          chat={activeChat}
          onBack={onBack}
          isSelecting={isSelecting}
          selectedCount={selectedMessages.length}
          onCancelSelection={clearSelection}
          onDeleteSelected={() => deleteMessages(selectedMessages)}
        />
      }
      footer={
        <MessageInput
          ref={inputRef}
          value={editingMessageId ? editingText : inputText}
          onChange={editingMessageId ? (e) => setEditingText(e.target.value) : handleInputTextChange}
          onKeyDown={handleKeyDown}
          onSend={handleSend}
          isSending={isSendingMessage}
          isKeyboardOpen={isKeyboardOpen}
          keyboardHeight={keyboardHeight}
          isEditing={!!editingMessageId}
          editingText={editingText}
          onCancelEdit={() => {
            cancelEditing()
            setInputText(draft)
          }}
          replyToMessage={replyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
        />
      }
    >
      {isLoadingMessages ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#888' }}>
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
                onLongPressStart={() => handleLongPressStart(msg.id)}
                onSelect={() => toggleSelectMessage(msg.id)}
                onLongPress={(e) => handleTouchStart(msg.id, e)}
                onLongPressEnd={handleTouchEnd}
                onLongPressMove={handleTouchMove}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (!isSelecting) {
                    setLongPressMenu({ messageId: msg.id, x: e.clientX, y: e.clientY })
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

      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 70,
          left: 12,
          right: 12,
          background: 'rgba(26, 26, 46, 0.9)',
          borderRadius: 12,
          padding: '6px 12px',
          fontSize: 12,
          color: 'rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <div style={{ display: 'flex', gap: 3 }}>
            <span className="typing-dot-1" style={{ width: 4, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.5)' }} />
            <span className="typing-dot-2" style={{ width: 4, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.5)' }} />
            <span className="typing-dot-3" style={{ width: 4, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.5)' }} />
          </div>
          {typingNames.length === 1 ? `${typingNames[0]} печатает...` : `${typingNames.length} печатают...`}
        </div>
      )}

      {/* Long press menu */}
      {longPressMenu && (
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
              left: Math.min(longPressMenu.x, window.innerWidth - 180),
              top: Math.min(longPressMenu.y, window.innerHeight - 200),
              background: 'rgba(40, 40, 60, 0.98)',
              borderRadius: 14,
              padding: '6px 0',
              minWidth: 160,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuButton emoji="😊" label="Реакция" onClick={() => handleReact(longPressMenu.messageId)} />
            <MenuButton emoji="↩️" label="Ответить" onClick={() => {
              const msg = messages.find((m) => m.id === longPressMenu.messageId)
              if (msg) handleReply(msg)
            }} />
            {messages.find((m) => m.id === longPressMenu.messageId)?.user === user?.username && (
              <>
                <MenuButton emoji="✏️" label="Редактировать" onClick={() => {
                  const msg = messages.find((m) => m.id === longPressMenu.messageId)
                  if (msg) handleEdit(msg)
                }} />
                <MenuButton emoji="🗑" label="Удалить" onClick={() => handleDelete(longPressMenu.messageId)} isDestructive />
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
              left: Math.min(reactionPicker.x, window.innerWidth - 260),
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
    </Screen>
  )
}

// --- Chat Header (iOS style) ---

interface ChatHeaderProps {
  chat: ReturnType<typeof useChatStore.getState>['chats'][string] | null
  onBack: () => void
  onPinnedClick?: () => void
  isSelecting: boolean
  selectedCount: number
  onCancelSelection: () => void
  onDeleteSelected: () => void
}

function ChatHeader({ chat, onBack, onPinnedClick, isSelecting, selectedCount, onCancelSelection, onDeleteSelected }: ChatHeaderProps) {
  if (!chat) return null

  const chatIcon = chat.type === 'owl' ? '🦉' : chat.type === 'hermes' ? '🤖' : null

  if (isSelecting) {
    return (
      <div
        className="safe-top"
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 44,
          padding: '0 8px',
          background: 'rgba(26, 26, 46, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <button
          onClick={onCancelSelection}
          style={{
            background: 'none', border: 'none', color: '#6b5ce7',
            fontSize: 17, fontWeight: 400, padding: '8px 12px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
            <path d="M10 2L2 10L10 18" stroke="#6b5ce7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 17, fontWeight: 600 }}>
          {selectedCount}
        </div>
        <button
          onClick={onDeleteSelected}
          style={{
            background: 'none', border: 'none', color: '#e74c4c',
            fontSize: 17, fontWeight: 400, padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          Удалить
        </button>
      </div>
    )
  }

  return (
    <div
      className="safe-top"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 44,
        padding: '0 8px',
        background: 'rgba(26, 26, 46, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
      }}
    >
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', color: '#6b5ce7',
          fontSize: 17, fontWeight: 400, padding: '8px 12px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
          <path d="M10 2L2 10L10 18" stroke="#6b5ce7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Назад
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {chatIcon && <span style={{ fontSize: 16 }}>{chatIcon}</span>}
          <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>{chat.name}</span>
          {chat.isMuted && <span style={{ fontSize: 12 }}>🔇</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {chat.isOnline !== undefined && (
            <span style={{ fontSize: 12, color: chat.isOnline ? '#4caf50' : '#888' }}>
              {chat.isOnline ? 'в сети' : 'не в сети'}
            </span>
          )}
          {chat.isSecret && <span style={{ fontSize: 11, color: '#6b5ce7' }}>🔒 E2EE</span>}
          {onPinnedClick && (
            <button
              onClick={onPinnedClick}
              style={{
                background: 'none', border: 'none', color: '#6b5ce7',
                fontSize: 12, cursor: 'pointer', padding: '2px 4px',
              }}
            >
              📌 Закреплённые
            </button>
          )}
        </div>
      </div>
    </div>
  )
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
        fontSize: 15,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{emoji}</span>
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
  onLongPressStart: () => void
  onSelect: () => void
  onLongPress: (e: React.TouchEvent) => void
  onLongPressEnd: () => void
  onLongPressMove: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onReaction: (emoji: string) => void
}

function MessageBubble({
  message,
  isSelecting,
  isSelected,
  onLongPressStart,
  onSelect,
  onLongPress,
  onLongPressEnd,
  onLongPressMove,
  onContextMenu,
}: MessageBubbleProps) {
  const isOutgoing = message.isOutgoing
  const reactions = message.reactions || {}

  const handleClick = () => {
    if (isSelecting) {
      onSelect()
    }
  }

  const handleDoubleClick = () => {
    if (isSelecting) {
      onLongPressStart()
    }
  }

  return (
    <div
      className="message-appear"
      style={{
        display: 'flex',
        justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
        marginBottom: 8,
        padding: '0 12px',
        opacity: isSelecting && isSelected ? 0.7 : 1,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onTouchStart={onLongPress}
      onTouchEnd={onLongPressEnd}
      onTouchMove={onLongPressMove}
      onContextMenu={onContextMenu}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOutgoing ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
        {isSelecting && (
          <div style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            border: isSelected ? '2px solid #6b5ce7' : '2px solid rgba(255,255,255,0.3)',
            background: isSelected ? '#6b5ce7' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
            alignSelf: isOutgoing ? 'flex-end' : 'flex-start',
          }}>
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
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
            borderRadius: isOutgoing ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            background: isOutgoing
              ? 'linear-gradient(135deg, #6b5ce7, #8b7cf7)'
              : 'rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 16,
            lineHeight: 1.35,
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
              color: isOutgoing ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)',
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

// --- Message Input (iOS style) ---

interface MessageInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onSend: () => void
  isSending: boolean
  isKeyboardOpen: boolean
  keyboardHeight: number
  isEditing: boolean
  editingText: string
  onCancelEdit: () => void
  replyToMessage: Message | null
  onCancelReply: () => void
}

const MessageInput = forwardRef<HTMLInputElement, MessageInputProps>(
  ({ value, onChange, onKeyDown, onSend, isSending, isKeyboardOpen, keyboardHeight, isEditing, editingText, onCancelEdit, replyToMessage, onCancelReply }, ref) => {
    return (
      <div
        className="safe-bottom"
        style={{
          background: 'rgba(26, 26, 46, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: isKeyboardOpen
            ? `calc(8px + ${keyboardHeight}px - env(safe-area-inset-bottom, 0px))`
            : undefined,
          transition: 'padding-bottom 0.2s ease-out',
        }}
      >
        {/* Edit mode banner */}
        {isEditing && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
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
              onClick={onCancelEdit}
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
        {replyToMessage && !isEditing && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
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
              onClick={onCancelReply}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              height: 40,
            }}
          >
            <input
              ref={ref}
              type="text"
              value={value}
              onChange={onChange}
              onKeyDown={onKeyDown}
              placeholder={isEditing ? 'Редактировать сообщение...' : t('writeMessage')}
              disabled={isSending}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: 16,
                padding: 0,
                opacity: isSending ? 0.5 : 1,
              }}
            />
          </div>

          <button
            onClick={onSend}
            disabled={!value.trim() || isSending}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: value.trim() ? '#6b5ce7' : 'rgba(255,255,255,0.1)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: value.trim() ? 'pointer' : 'default',
              opacity: isSending ? 0.5 : 1,
              transition: 'background 0.15s',
              WebkitTapHighlightColor: 'transparent',
              flexShrink: 0,
            }}
          >
            {isEditing ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 13L9 17L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2 21L23 12L2 3V10L17 12L2 14V21Z"
                  fill={value.trim() ? '#fff' : 'rgba(255,255,255,0.3)'}
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    )
  }
)

MessageInput.displayName = 'MessageInput'
