// ============================================
// ChatScreen — Desktop (Telegram Web Style)
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { grpcClient } from '@/shared/api/grpcClient'
import { t } from '@/shared/types'
import type { Message } from '@/shared/types'
import { useChatListV2 } from '@/hooks/useChatListV2'
import { ImageLightbox } from '@/components/common'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'

interface ChatScreenProps {
  chatId: string
  onBack: () => void
  isSecret?: boolean
  onServerShutdown?: () => void
  onReconnecting?: (isReconnecting: boolean) => void
  onStreamError?: (error: string) => void
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

// Telegram dark theme colors
const TG = {
  bg: '#0E1621',
  headerBg: '#17212B',
  inputBg: '#17212B',
  outgoing: '#2B5278',
  outgoingHover: '#325A82',
  incoming: '#182533',
  incomingHover: '#1E2C3A',
  text: '#F5F5F5',
  textSecondary: '#6C7883',
  accent: '#5EB5F7',
  green: '#4FAE4E',
  border: '#0E1621',
  selection: 'rgba(94, 181, 247, 0.2)',
  replyBar: '#5EB5F7',
}

export function ChatScreen({ chatId, isSecret, onServerShutdown, onReconnecting, onStreamError }: ChatScreenProps) {
  const activeChat = useChatStore((s) => s.getActiveChat())
  const user = useAuthStore((s) => s.user)
  const {
    messages,
    isLoadingMessages,
    isSendingMessage,
    isLoadingMore,
    hasMore,
    sendMessage,
    sendMediaMessage,
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
    sendTypingIndicator,
    replyToMessage,
    setReplyToMessage,
  } = useChatMessages({ chatId, isSecret, onServerShutdown, onReconnecting, onStreamError })

  const { pinChat, unpinChat, archiveChat, setMutedChat } = useChatListV2()
  const [showChatMenu, setShowChatMenu] = useState(false)
  const chatMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setShowChatMenu(false)
      }
    }
    if (showChatMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showChatMenu])

  const [inputText, setInputText] = useState('')
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null)
  const [reactionPicker, setReactionPicker] = useState<{ messageId: string; x: number; y: number } | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const voiceRecorder = useVoiceRecorder()
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const shouldFollowOutput = useRef(true)
  const initialScrollDone = useRef(false)

  useEffect(() => {
    setInputText(draft)
  }, [draft])

  useEffect(() => {
    initialScrollDone.current = false
  }, [chatId])

  useEffect(() => {
    if (!initialScrollDone.current && messages.length > 0) {
      initialScrollDone.current = true
      const firstUnreadIdx = messages.findIndex((m) => !m.isRead && !m.isOutgoing)
      if (firstUnreadIdx > 0) {
        const scrollTo = Math.max(0, firstUnreadIdx - 3)
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({ index: scrollTo, align: 'start' })
        }, 100)
      } else {
        virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, align: 'end' })
      }
    } else if (shouldFollowOutput.current && messages.length > 0) {
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

  const handleVoiceToggle = useCallback(async () => {
    if (voiceRecorder.isRecording) {
      const blob = await voiceRecorder.stopRecording()
      if (blob) {
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type })
        sendMediaMessage(file, 'voice')
      }
    } else {
      await voiceRecorder.startRecording()
    }
  }, [voiceRecorder, sendMediaMessage])

  const handleVoiceCancel = useCallback(() => {
    voiceRecorder.cancelRecording()
  }, [voiceRecorder])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value)
    updateDraft(e.target.value)
    sendTypingIndicator(true)
  }, [updateDraft, sendTypingIndicator])

  const handleStartReached = useCallback(() => {
    if (hasMore && !isLoadingMore) loadMore()
  }, [hasMore, isLoadingMore, loadMore])

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

  const handleCopy = useCallback((messageId: string) => {
    setContextMenu(null)
    const msg = messages.find((m) => m.id === messageId)
    if (msg?.text) {
      navigator.clipboard.writeText(msg.text).catch(() => {})
    }
  }, [messages])

  const handleReply = useCallback((message: Message) => {
    setContextMenu(null)
    setReplyToMessage(message)
    inputRef.current?.focus()
  }, [setReplyToMessage])

  const handleFavorite = useCallback(async (messageId: string) => {
    if (!user?.id) return
    try {
      await grpcClient.addFavorite(user.id, messageId)
    } catch (err) {
      console.error('Failed to add favorite:', err)
    }
  }, [user])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const isAudio = file.type.startsWith('audio/')
    sendMediaMessage(file, isImage ? 'image' : isAudio ? 'voice' : 'file')
    e.target.value = ''
  }, [sendMediaMessage])

  const typingNames = Array.from(typingUsers.keys())
  const chatName = activeChat?.name || t('chat')
  const onlineText = activeChat?.isOnline ? t('online') : t('offline')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: TG.bg }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height: 56,
        padding: '0 16px',
        background: TG.headerBg,
        borderBottom: `1px solid ${TG.border}`,
        flexShrink: 0,
        gap: 12,
      }}>
        {/* Avatar */}
        <div style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: activeChat?.type === 'owl' ? '#6b5ce7' : activeChat?.type === 'hermes' ? '#e75c5c' : TG.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 600,
          color: '#fff',
          flexShrink: 0,
        }}>
          {activeChat?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>

        {/* Name + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: TG.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {chatName}
          </div>
          <div style={{ fontSize: 13, color: activeChat?.isOnline ? TG.green : TG.textSecondary }}>
            {typingNames.length > 0
              ? (typingNames.length === 1 ? `${typingNames[0]} печатает...` : `${typingNames.length} печатают...`)
              : onlineText
            }
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 2, position: 'relative' }} ref={chatMenuRef}>
          <button
            style={headerBtn}
            title="Звонок"
            onClick={() => {
              const targetId = activeChat?.participants ? JSON.parse(activeChat.participants).find((p: string) => p !== user?.username) : ''
              if (targetId && activeChat) {
                window.dispatchEvent(new CustomEvent('start-call', { detail: { targetId, targetUsername: targetId, roomId: chatId } }))
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TG.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
          </button>
          <button
            style={headerBtn}
            title={t('search')}
            onClick={() => {
              const query = prompt('Поиск в чате...')
              if (query) window.dispatchEvent(new CustomEvent('chat-search', { detail: { query, chatId } }))
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TG.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <div style={{ position: 'relative' }}>
            <button
              style={headerBtn}
              title={t('more')}
              onClick={() => setShowChatMenu(!showChatMenu)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={TG.textSecondary}>
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            {showChatMenu && (
              <div
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: '#17212B', borderRadius: 12, padding: '6px 0',
                  minWidth: 200, boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                  border: `1px solid ${TG.border}`, zIndex: 100,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {activeChat?.isPinned ? (
                  <ChatMenuItem
                    emoji="📌"
                    label="Открепить"
                    onClick={() => { unpinChat(chatId); setShowChatMenu(false) }}
                  />
                ) : (
                  <ChatMenuItem
                    emoji="📌"
                    label="Закрепить"
                    onClick={() => { pinChat(chatId); setShowChatMenu(false) }}
                  />
                )}
                {activeChat?.isMuted ? (
                  <ChatMenuItem
                    emoji="🔕"
                    label="Включить уведомления"
                    onClick={() => { setMutedChat(chatId, false); setShowChatMenu(false) }}
                  />
                ) : (
                  <ChatMenuItem
                    emoji="🔔"
                    label="Отключить уведомления"
                    onClick={() => { setMutedChat(chatId, true); setShowChatMenu(false) }}
                  />
                )}
                <ChatMenuItem
                  emoji="📦"
                  label="Архивировать"
                  onClick={() => { archiveChat(chatId); setShowChatMenu(false) }}
                />
                <ChatMenuItem
                  emoji="📌"
                  label="Закреплённые сообщения"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('show-pinned', { detail: { chatId } }))
                    setShowChatMenu(false)
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selection bar */}
      {isSelecting && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          height: 48,
          padding: '0 16px',
          background: TG.selection,
          borderBottom: `1px solid ${TG.border}`,
          flexShrink: 0,
        }}>
          <button onClick={clearSelection} style={{ background: 'none', border: 'none', color: TG.accent, fontSize: 14, cursor: 'pointer', padding: '4px 8px' }}>
            {t('cancel')}
          </button>
          <div style={{ flex: 1, textAlign: 'center', color: TG.text, fontSize: 15, fontWeight: 600 }}>
            {selectedMessages.length} {t('selected')}
          </div>
          <button onClick={() => deleteMessages(selectedMessages)} style={{ background: 'none', border: 'none', color: '#E53935', fontSize: 14, cursor: 'pointer', padding: '4px 8px' }}>
            {t('delete')}
          </button>
        </div>
      )}

      {/* Messages */}
      {isLoadingMessages ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TG.textSecondary, fontSize: 14 }}>
          {t('loadingMessages')}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <Virtuoso
            ref={virtuosoRef}
            data={messages}
            firstItemIndex={0}
            startReached={handleStartReached}
            itemContent={(_index, msg) => (
              <MessageBubble
                message={msg}
                isOwn={msg.user === user?.username}
                isSelecting={isSelecting}
                isSelected={selectedMessages.includes(msg.id)}
                onSelect={() => toggleSelectMessage(msg.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (!isSelecting) setContextMenu({ messageId: msg.id, x: e.clientX, y: e.clientY })
                }}
                onReaction={(emoji) => toggleReaction(msg.id, emoji)}
                onImageClick={(url) => setLightboxUrl(url)}
              />
            )}
            followOutput="smooth"
            atBottomThreshold={100}
            atBottomStateChange={(atBottom) => { shouldFollowOutput.current = atBottom }}
            style={{ height: '100%' }}
            className="scrollable"
          />
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar" onChange={handleFileSelect} style={{ display: 'none' }} />

      {/* Input area */}
      <div style={{ background: TG.inputBg, borderTop: `1px solid ${TG.border}`, flexShrink: 0 }}>
        {/* Edit banner */}
        {editingMessageId && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'rgba(94, 181, 247, 0.08)', borderBottom: `1px solid ${TG.border}` }}>
            <div style={{ flex: 1, borderLeft: `2px solid ${TG.replyBar}`, paddingLeft: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TG.accent }}>{t('editing')}</div>
              <div style={{ fontSize: 13, color: TG.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editingText}</div>
            </div>
            <button onClick={() => { cancelEditing(); setInputText(draft) }} style={{ background: 'none', border: 'none', color: TG.textSecondary, fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        {/* Reply banner */}
        {replyToMessage && !editingMessageId && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'rgba(94, 181, 247, 0.08)', borderBottom: `1px solid ${TG.border}` }}>
            <div style={{ flex: 1, borderLeft: `2px solid ${TG.replyBar}`, paddingLeft: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TG.accent }}>{replyToMessage.user}</div>
              <div style={{ fontSize: 13, color: TG.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyToMessage.text}</div>
            </div>
            <button onClick={() => setReplyToMessage(null)} style={{ background: 'none', border: 'none', color: TG.textSecondary, fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 12px' }}>
          {/* Attachment */}
          <button onClick={() => fileInputRef.current?.click()} style={{ width: 40, height: 40, borderRadius: '50%', background: 'transparent', border: 'none', color: TG.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title={t('attachFile')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          {/* Input */}
          <div style={{
            flex: 1,
            background: '#242F3D',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'flex-end',
            padding: '6px 12px',
            minHeight: 40,
            maxHeight: 140,
          }}>
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
                color: TG.text,
                fontSize: 15,
                padding: '6px 0',
                resize: 'none',
                minHeight: 22,
                maxHeight: 100,
                lineHeight: 1.4,
                fontFamily: 'inherit',
                overflow: 'hidden',
              }}
            />
          </div>

          {/* Send / Voice / Recording */}
          {voiceRecorder.isRecording ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button onClick={handleVoiceCancel} style={{ background: 'none', border: 'none', color: '#E53935', fontSize: 16, cursor: 'pointer', padding: 8 }}>
                ✕
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#E53935', fontSize: 14, fontWeight: 500, minWidth: 48 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E53935', animation: 'pulse 1s infinite' }} />
                {Math.floor(voiceRecorder.recordingTime / 60)}:{(voiceRecorder.recordingTime % 60).toString().padStart(2, '0')}
              </div>
              <button
                onClick={handleVoiceToggle}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: TG.accent, border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={voiceRecorder.error ? undefined : ((editingMessageId ? editingText : inputText).trim() ? handleSend : handleVoiceToggle)}
              disabled={!!(editingMessageId) || isSendingMessage}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: (editingMessageId ? editingText : inputText).trim() ? TG.accent : 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (editingMessageId ? editingText : inputText).trim() ? 'pointer' : 'pointer',
                transition: 'background 0.15s',
                flexShrink: 0,
              }}
            >
              {editingMessageId ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13L9 17L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (editingMessageId ? editingText : inputText).trim() ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                  <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill={TG.textSecondary}>
                  <path d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3zm-1 14.93A7.006 7.006 0 015 11h2a5 5 0 0010 0h2a7.006 7.006 0 01-6 6.93V21h3v2H9v-2h3v-3.07z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} onClick={closeMenus}>
          <div
            style={{
              position: 'absolute',
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              top: Math.min(contextMenu.y, window.innerHeight - 220),
              background: '#17212B',
              borderRadius: 12,
              padding: '6px 0',
              minWidth: 180,
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              border: `1px solid ${TG.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <CtxItem emoji="😊" label={t('reaction')} onClick={() => handleReact(contextMenu.messageId)} />
            <CtxItem emoji="↩️" label={t('reply')} onClick={() => { const msg = messages.find((m) => m.id === contextMenu.messageId); if (msg) handleReply(msg) }} />
            <CtxItem emoji="📋" label={t('copyText')} onClick={() => handleCopy(contextMenu.messageId)} />
            <CtxItem emoji="⭐" label="В избранное" onClick={() => { handleFavorite(contextMenu.messageId); closeMenus() }} />
            {messages.find((m) => m.id === contextMenu.messageId)?.user === user?.username && (
              <>
                <CtxItem emoji="✏️" label={t('edit')} onClick={() => { const msg = messages.find((m) => m.id === contextMenu.messageId); if (msg) handleEdit(msg) }} />
                <CtxItem emoji="🗑" label={t('delete')} onClick={() => handleDelete(contextMenu.messageId)} destructive />
              </>
            )}
          </div>
        </div>
      )}

      {/* Reaction picker */}
      {reactionPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1001 }} onClick={closeMenus}>
          <div
            style={{
              position: 'absolute',
              left: Math.min(reactionPicker.x, window.innerWidth - 280),
              top: Math.min(reactionPicker.y, window.innerHeight - 60),
              background: '#17212B',
              borderRadius: 28,
              padding: '8px 12px',
              display: 'flex',
              gap: 4,
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              border: `1px solid ${TG.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { toggleReaction(reactionPicker.messageId, emoji); closeMenus() }}
                style={{ width: 40, height: 40, borderRadius: 20, background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  )
}

// --- Header button ---
const headerBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

// --- Context menu item ---
function CtxItem({ emoji, label, onClick, destructive }: { emoji: string; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        color: destructive ? '#E53935' : TG.text,
        fontSize: 14,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{emoji}</span>
      {label}
    </button>
  )
}

// --- Chat menu item ---
function ChatMenuItem({ emoji, label, onClick, destructive }: { emoji: string; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '10px 16px', background: 'transparent', border: 'none',
        color: destructive ? '#E53935' : TG.text, fontSize: 14,
        cursor: 'pointer', textAlign: 'left',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{emoji}</span>
      {label}
    </button>
  )
}

// --- Message Bubble (Telegram style) ---
interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  isSelecting: boolean
  isSelected: boolean
  onSelect: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onReaction: (emoji: string) => void
  onImageClick?: (url: string) => void
}

function MessageBubble({ message, isOwn, isSelecting, isSelected, onSelect, onContextMenu, onImageClick }: MessageBubbleProps) {
  const reactions = message.reactions || {}

  return (
    <div
      className="message-appear"
      style={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: 2,
        padding: '1px 52px',
        opacity: isSelecting && isSelected ? 0.5 : 1,
        cursor: isSelecting ? 'pointer' : 'default',
      }}
      onClick={() => isSelecting && onSelect()}
      onContextMenu={onContextMenu}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', maxWidth: '48%', minWidth: 80 }}>
        {/* Selection check */}
        {isSelecting && (
          <div style={{
            width: 22, height: 22, borderRadius: 11,
            border: isSelected ? `2px solid ${TG.accent}` : `2px solid ${TG.textSecondary}`,
            background: isSelected ? TG.accent : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 2,
          }}>
            {isSelected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
        )}

        {/* Reply quote */}
        {message.repliedToMessageId && message.repliedToText && (
          <div style={{
            background: isOwn ? 'rgba(43, 82, 120, 0.6)' : 'rgba(24, 37, 51, 0.8)',
            borderRadius: '8px 8px 0 0',
            padding: '6px 10px',
            width: '100%',
            borderLeft: `2px solid ${TG.accent}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: TG.accent, marginBottom: 1 }}>{message.repliedToUser}</div>
            <div style={{ fontSize: 12, color: TG.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message.repliedToText}</div>
          </div>
        )}

        {/* Bubble */}
        <div
          style={{
            padding: '6px 10px 5px',
            borderRadius: isOwn
              ? (message.repliedToMessageId ? '8px 8px 8px 0' : '12px 12px 0 12px')
              : (message.repliedToMessageId ? '8px 8px 8px 0' : '12px 12px 12px 0'),
            background: isOwn ? TG.outgoing : TG.incoming,
            color: TG.text,
            fontSize: 14.5,
            lineHeight: 1.35,
            wordBreak: 'break-word',
            userSelect: 'text',
            position: 'relative',
          }}
        >
          {/* Sender name in groups */}
          {!isOwn && message.user && (
            <div style={{ fontSize: 13, fontWeight: 600, color: TG.accent, marginBottom: 2 }}>{message.user}</div>
          )}

          {/* Image */}
          {message.imageUrl && (
            <div style={{ marginBottom: 4 }}>
              <img src={message.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, cursor: 'pointer' }} onClick={() => onImageClick?.(message.imageUrl!)} />
            </div>
          )}

          {/* Voice message */}
          {message.voiceUrl && (
            <div style={{ marginBottom: 4 }}>
              <audio controls src={message.voiceUrl} style={{ maxWidth: '100%', height: 36 }} />
            </div>
          )}

          {/* File */}
          {message.fileUrl && (
            <div style={{ marginBottom: 4 }}>
              <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: TG.accent, fontSize: 13, textDecoration: 'none' }}>
                📎 {message.text || 'Файл'}
              </a>
            </div>
          )}

          {/* Text */}
          {message.text && !message.fileUrl && <div style={{ display: 'inline' }}>{message.text}</div>}

          {/* Time + read */}
          <span style={{
            float: 'right',
            fontSize: 11,
            color: isOwn ? 'rgba(255,255,255,0.45)' : TG.textSecondary,
            marginTop: 4,
            marginLeft: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            lineHeight: 1,
          }}>
            {message.isEdited && <span style={{ fontSize: 10, fontStyle: 'italic' }}>ред.</span>}
            {new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            {isOwn && (
              <span style={{ color: message.isRead ? TG.accent : 'rgba(255,255,255,0.35)', fontSize: 14, lineHeight: 1 }}>
                {message.isRead ? (
                  <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                    <path d="M1 5.5L4.5 9L11 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 5.5L8.5 9L15 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M1 5.5L4 9L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            )}
          </span>
        </div>

        {/* Reactions */}
        {Object.keys(reactions).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
            {Object.entries(reactions).map(([emoji, users]) => (
              <div key={emoji} style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: isOwn ? 'rgba(43, 82, 120, 0.8)' : 'rgba(24, 37, 51, 0.9)',
                borderRadius: 12, padding: '2px 6px', fontSize: 13,
                border: `1px solid ${TG.border}`,
                cursor: 'pointer',
              }}>
                <span>{emoji}</span>
                <span style={{ fontSize: 11, color: TG.textSecondary }}>{(users as any[]).length}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
