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
import { t } from '@/shared/types'
import type { Message } from '@/shared/types'

interface ChatScreenProps {
  chatId: string
  onBack: () => void
}

export function ChatScreen({ chatId }: ChatScreenProps) {
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

  const [inputText, setInputText] = useState('')
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
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

  const handleSend = useCallback(() => {
    if (!inputText.trim() || isSendingMessage) return
    sendMessage(inputText)
    setInputText('')
    shouldFollowOutput.current = true
    // Re-focus input after send
    setTimeout(() => inputRef.current?.focus(), 50)
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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value)
  }, [])

  // Handle scroll to top → load more
  const handleStartReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMore()
    }
  }, [hasMore, isLoadingMore, loadMore])

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

      {/* Message Input */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '12px 16px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
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
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={t('writeMessage')}
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
            disabled={!inputText.trim() || isSendingMessage}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: inputText.trim() ? '#6b5ce7' : 'rgba(255,255,255,0.06)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'default',
              opacity: isSendingMessage ? 0.5 : 1,
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
            title="Отправить (Enter)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M2 21L23 12L2 3V10L17 12L2 14V21Z"
                fill={inputText.trim() ? '#fff' : 'rgba(255,255,255,0.3)'}
              />
            </svg>
          </button>
        </div>
      </div>
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
        marginBottom: 6,
        padding: '0 16px',
      }}
    >
      <div
        style={{
          maxWidth: '65%',
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
