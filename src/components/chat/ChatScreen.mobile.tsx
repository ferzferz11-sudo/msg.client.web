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
import { t } from '@/shared/types'
import type { Message } from '@/shared/types'

interface ChatScreenProps {
  chatId: string
  onBack: () => void
}

export function ChatScreen({ chatId, onBack }: ChatScreenProps) {
  const activeChat = useChatStore((s) => s.getActiveChat())
  const {
    messages,
    isLoadingMessages,
    isSendingMessage,
    isLoadingMore,
    hasMore,
    sendMessage,
    loadMore,
  } = useChatMessages(chatId)
  const { isKeyboardOpen, keyboardHeight } = useIOSKeyboard()

  const [inputText, setInputText] = useState('')
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const shouldFollowOutput = useRef(true)

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
    sendMessage(inputText)
    setInputText('')
    shouldFollowOutput.current = true
  }, [inputText, isSendingMessage, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
  }, [])

  // Handle scroll to top → load more
  const handleStartReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMore()
    }
  }, [hasMore, isLoadingMore, loadMore])

  return (
    <Screen
      header={<ChatHeader chat={activeChat} onBack={onBack} />}
      footer={
        <MessageInput
          ref={inputRef}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSend={handleSend}
          isSending={isSendingMessage}
          isKeyboardOpen={isKeyboardOpen}
          keyboardHeight={keyboardHeight}
        />
      }
    >
      {isLoadingMessages ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#888' }}>
          t('loadingMessages')
        </div>
      ) : (
        <div style={{ flex: 1, padding: '8px 0', minHeight: 0 }}>
          <Virtuoso
            ref={virtuosoRef}
            data={messages}
            firstItemIndex={0}
            startReached={handleStartReached}
            itemContent={(index, msg) => (
              <MessageBubble message={msg} isFirst={index === 0} />
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
    </Screen>
  )
}

// --- Chat Header (iOS style) ---

interface ChatHeaderProps {
  chat: ReturnType<typeof useChatStore.getState>['chats'][string] | null
  onBack: () => void
  onPinnedClick?: () => void
}

function ChatHeader({ chat, onBack, onPinnedClick }: ChatHeaderProps) {
  if (!chat) return null

  const chatIcon = chat.type === 'owl' ? '🦉' : chat.type === 'hermes' ? '🤖' : null

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

// --- Message Bubble ---

interface MessageBubbleProps {
  message: Message
  isFirst?: boolean
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isOutgoing = message.isOutgoing

  return (
    <div
      className="message-appear"
      style={{
        display: 'flex',
        justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
        marginBottom: 8,
        padding: '0 12px',
      }}
    >
      <div
        style={{
          maxWidth: '78%',
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
          }}
        >
          {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {isOutgoing && (
            <span style={{ marginLeft: 4 }}>
              {message.isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
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
}

const MessageInput = forwardRef<HTMLInputElement, MessageInputProps>(
  ({ value, onChange, onKeyDown, onSend, isSending, isKeyboardOpen, keyboardHeight }, ref) => {
    return (
      <div
        className="safe-bottom"
        style={{
          background: 'rgba(26, 26, 46, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '8px 12px',
          paddingBottom: isKeyboardOpen
            ? `calc(8px + ${keyboardHeight}px - env(safe-area-inset-bottom, 0px))`
            : undefined,
          transition: 'padding-bottom 0.2s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              placeholder={t('writeMessage')}
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M2 21L23 12L2 3V10L17 12L2 14V21Z"
                fill={value.trim() ? '#fff' : 'rgba(255,255,255,0.3)'}
              />
            </svg>
          </button>
        </div>
      </div>
    )
  }
)

MessageInput.displayName = 'MessageInput'
