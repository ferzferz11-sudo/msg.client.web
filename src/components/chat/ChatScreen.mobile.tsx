// ============================================
// ChatScreen — Mobile (Telegram Web Style)
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { Screen } from '@/components/common'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useIOSKeyboard } from '@/hooks/useIOSKeyboard'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { grpcClient } from '@/shared/api/grpcClient'
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

const TG = {
  bg: '#0E1621',
  headerBg: '#17212B',
  inputBg: '#17212B',
  outgoing: '#2B5278',
  incoming: '#182533',
  text: '#F5F5F5',
  textSecondary: '#6C7883',
  accent: '#5EB5F7',
  green: '#4FAE4E',
  border: '#0E1621',
}

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
    setIsSelecting,
    toggleSelectMessage,
    clearSelection,
    typingUsers,
    sendTypingIndicator,
    replyToMessage,
    setReplyToMessage,
  } = useChatMessages({ chatId, onServerShutdown, onReconnecting, onStreamError })
  const { isKeyboardOpen, keyboardHeight } = useIOSKeyboard()

  const [inputText, setInputText] = useState('')
  const [longPressMenu, setLongPressMenu] = useState<{ messageId: string; x: number; y: number } | null>(null)
  const [reactionPicker, setReactionPicker] = useState<{ messageId: string; x: number; y: number } | null>(null)
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const shouldFollowOutput = useRef(true)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setInputText(draft) }, [draft])

  useEffect(() => {
    if (shouldFollowOutput.current && messages.length > 0) {
      virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, behavior: 'smooth' })
    }
  }, [messages.length])

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300)
    return () => clearTimeout(timer)
  }, [chatId])

  const handleSend = useCallback(() => {
    if (!inputText.trim() || isSendingMessage) return
    if (editingMessageId) editMessage(editingMessageId, inputText)
    else sendMessage(inputText)
    setInputText('')
    clearDraft()
    shouldFollowOutput.current = true
  }, [inputText, isSendingMessage, sendMessage, editingMessageId, editMessage, clearDraft])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape' && editingMessageId) { cancelEditing(); setInputText(draft) }
  }, [handleSend, editingMessageId, cancelEditing, draft])

  const handleInputTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
    updateDraft(e.target.value)
    sendTypingIndicator(true)
  }, [updateDraft, sendTypingIndicator])

  const handleStartReached = useCallback(() => {
    if (hasMore && !isLoadingMore) loadMore()
  }, [hasMore, isLoadingMore, loadMore])

  const handleTouchStart = useCallback((messageId: string, e: React.TouchEvent) => {
    const touch = e.touches[0]
    longPressTimerRef.current = setTimeout(() => {
      if (isSelecting) toggleSelectMessage(messageId)
      else setLongPressMenu({ messageId, x: touch.clientX, y: touch.clientY })
    }, 500)
  }, [isSelecting, toggleSelectMessage])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null }
  }, [])

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null }
  }, [])

  const handleLongPressStart = useCallback((messageId: string) => {
    if (!isSelecting) { setIsSelecting(true); toggleSelectMessage(messageId) }
  }, [isSelecting, setIsSelecting, toggleSelectMessage])

  const closeMenus = useCallback(() => { setLongPressMenu(null); setReactionPicker(null) }, [])

  const handleReact = useCallback((messageId: string) => {
    setLongPressMenu(null)
    setReactionPicker({ messageId, x: longPressMenu?.x || 0, y: (longPressMenu?.y || 0) - 60 })
  }, [longPressMenu])

  const handleEdit = useCallback((message: Message) => {
    setLongPressMenu(null); startEditing(message.id, message.text); setInputText(message.text)
  }, [startEditing])

  const handleDelete = useCallback((messageId: string) => {
    setLongPressMenu(null); deleteMessages([messageId])
  }, [deleteMessages])

  const handleReply = useCallback((message: Message) => {
    setLongPressMenu(null); setReplyToMessage(message); inputRef.current?.focus()
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

  return (
    <Screen
      header={
        <div className="safe-top" style={{ display: 'flex', alignItems: 'center', height: 56, padding: '0 4px', background: TG.headerBg, borderBottom: `1px solid ${TG.border}` }}>
          {isSelecting ? (
            <>
              <button onClick={clearSelection} style={{ background: 'none', border: 'none', color: TG.accent, fontSize: 17, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="20" viewBox="0 0 12 20" fill="none"><path d="M10 2L2 10L10 18" stroke={TG.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div style={{ flex: 1, textAlign: 'center', color: TG.text, fontSize: 17, fontWeight: 600 }}>{selectedMessages.length}</div>
              <button onClick={() => deleteMessages(selectedMessages)} style={{ background: 'none', border: 'none', color: '#E53935', fontSize: 17, padding: '8px 12px', cursor: 'pointer' }}>{t('delete')}</button>
            </>
          ) : (
            <>
              <button onClick={onBack} style={{ background: 'none', border: 'none', color: TG.accent, padding: '8px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                <svg width="12" height="20" viewBox="0 0 12 20" fill="none"><path d="M10 2L2 10L10 18" stroke={TG.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {t('back')}
              </button>

              {/* Avatar */}
              <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0, marginLeft: 4,
                background: activeChat?.type === 'owl' ? '#6b5ce7' : activeChat?.type === 'hermes' ? '#e75c5c' : TG.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, color: '#fff',
              }}>
                {activeChat?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>

              <div style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: TG.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeChat?.name}
                </div>
                <div style={{ fontSize: 13, color: typingNames.length > 0 ? TG.accent : (activeChat?.isOnline ? TG.green : TG.textSecondary) }}>
                  {typingNames.length > 0
                    ? (typingNames.length === 1 ? `${typingNames[0]} печатает...` : `${typingNames.length} печатают...`)
                    : (activeChat?.isOnline ? 'в сети' : 'не в сети')
                  }
                </div>
              </div>

              <button style={{ width: 40, height: 40, borderRadius: '50%', background: 'transparent', border: 'none', color: TG.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={TG.textSecondary}><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
              </button>
            </>
          )}
        </div>
      }
      footer={
        <div className="safe-bottom" style={{ background: TG.inputBg, borderTop: `1px solid ${TG.border}`, paddingBottom: isKeyboardOpen ? `calc(8px + ${keyboardHeight}px - env(safe-area-inset-bottom, 0px))` : undefined, transition: 'padding-bottom 0.2s ease-out' }}>
          {editingMessageId && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(94, 181, 247, 0.08)', borderBottom: `1px solid ${TG.border}` }}>
              <div style={{ flex: 1, borderLeft: `2px solid ${TG.accent}`, paddingLeft: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: TG.accent }}>{t('editing')}</div>
                <div style={{ fontSize: 13, color: TG.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editingText}</div>
              </div>
              <button onClick={() => { cancelEditing(); setInputText(draft) }} style={{ background: 'none', border: 'none', color: TG.textSecondary, padding: '4px 8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}
          {replyToMessage && !editingMessageId && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(94, 181, 247, 0.08)', borderBottom: `1px solid ${TG.border}` }}>
              <div style={{ flex: 1, borderLeft: `2px solid ${TG.accent}`, paddingLeft: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: TG.accent }}>{replyToMessage.user}</div>
                <div style={{ fontSize: 13, color: TG.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyToMessage.text}</div>
              </div>
              <button onClick={() => setReplyToMessage(null)} style={{ background: 'none', border: 'none', color: TG.textSecondary, padding: '4px 8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar" onChange={handleFileSelect} style={{ display: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px' }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ width: 40, height: 40, borderRadius: '50%', background: 'transparent', border: 'none', color: TG.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <div style={{ flex: 1, background: '#242F3D', borderRadius: 20, display: 'flex', alignItems: 'center', padding: '0 14px', height: 40 }}>
              <input ref={inputRef} type="text" value={editingMessageId ? editingText : inputText} onChange={editingMessageId ? (e) => setEditingText(e.target.value) : handleInputTextChange} onKeyDown={handleKeyDown} placeholder={editingMessageId ? 'Редактировать...' : t('writeMessage')} disabled={isSendingMessage} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: TG.text, fontSize: 16, padding: 0, opacity: isSendingMessage ? 0.5 : 1 }} />
            </div>
            <button onClick={handleSend} disabled={!(editingMessageId ? editingText : inputText).trim() || isSendingMessage} style={{
              width: 40, height: 40, borderRadius: '50%',
              background: (editingMessageId ? editingText : inputText).trim() ? TG.accent : 'transparent',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: (editingMessageId ? editingText : inputText).trim() ? 'pointer' : 'default', flexShrink: 0,
            }}>
              {editingMessageId ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (editingMessageId ? editingText : inputText).trim() ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" /></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill={TG.textSecondary}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></svg>
              )}
            </button>
          </div>
        </div>
      }
    >
      {isLoadingMessages ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: TG.textSecondary }}>{t('loadingMessages')}</div>
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
                onLongPressStart={() => handleLongPressStart(msg.id)}
                onSelect={() => toggleSelectMessage(msg.id)}
                onLongPress={(e) => handleTouchStart(msg.id, e)}
                onLongPressEnd={handleTouchEnd}
                onLongPressMove={handleTouchMove}
                onContextMenu={(e) => { e.preventDefault(); if (!isSelecting) setLongPressMenu({ messageId: msg.id, x: e.clientX, y: e.clientY }) }}
                onReaction={(emoji) => toggleReaction(msg.id, emoji)}
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

      {typingNames.length > 0 && (
        <div style={{ position: 'absolute', bottom: 70, left: 12, right: 12, background: 'rgba(23, 33, 43, 0.95)', borderRadius: 12, padding: '6px 12px', fontSize: 13, color: TG.textSecondary, display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${TG.border}` }}>
          <div style={{ display: 'flex', gap: 3 }}>
            <span className="typing-dot-1" style={{ width: 5, height: 5, borderRadius: 3, background: TG.textSecondary }} />
            <span className="typing-dot-2" style={{ width: 5, height: 5, borderRadius: 3, background: TG.textSecondary }} />
            <span className="typing-dot-3" style={{ width: 5, height: 5, borderRadius: 3, background: TG.textSecondary }} />
          </div>
          {typingNames.length === 1 ? `${typingNames[0]} печатает...` : `${typingNames.length} печатают...`}
        </div>
      )}

      {longPressMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} onClick={closeMenus}>
          <div style={{
            position: 'absolute',
            left: Math.min(longPressMenu.x, window.innerWidth - 180),
            top: Math.min(longPressMenu.y, window.innerHeight - 200),
            background: '#17212B', borderRadius: 14, padding: '6px 0', minWidth: 160,
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)', border: `1px solid ${TG.border}`,
          }} onClick={(e) => e.stopPropagation()}>
            <CtxItem emoji="😊" label={t('reaction')} onClick={() => handleReact(longPressMenu.messageId)} />
            <CtxItem emoji="↩️" label={t('reply')} onClick={() => { const msg = messages.find((m) => m.id === longPressMenu.messageId); if (msg) handleReply(msg) }} />
            <CtxItem emoji="⭐" label="В избранное" onClick={() => { handleFavorite(longPressMenu.messageId); closeMenus() }} />
            {messages.find((m) => m.id === longPressMenu.messageId)?.user === user?.username && (
              <>
                <CtxItem emoji="✏️" label={t('edit')} onClick={() => { const msg = messages.find((m) => m.id === longPressMenu.messageId); if (msg) handleEdit(msg) }} />
                <CtxItem emoji="🗑" label={t('delete')} onClick={() => handleDelete(longPressMenu.messageId)} destructive />
              </>
            )}
          </div>
        </div>
      )}

      {reactionPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1001 }} onClick={closeMenus}>
          <div style={{
            position: 'absolute',
            left: Math.min(reactionPicker.x, window.innerWidth - 260),
            top: Math.min(reactionPicker.y, window.innerHeight - 60),
            background: '#17212B', borderRadius: 28, padding: '8px 12px', display: 'flex', gap: 4,
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)', border: `1px solid ${TG.border}`,
          }} onClick={(e) => e.stopPropagation()}>
            {REACTION_EMOJIS.map((emoji) => (
              <button key={emoji} onClick={() => { toggleReaction(reactionPicker.messageId, emoji); closeMenus() }}
                style={{ width: 40, height: 40, borderRadius: 20, background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.3)')} onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >{emoji}</button>
            ))}
          </div>
        </div>
      )}
    </Screen>
  )
}

function CtxItem({ emoji, label, onClick, destructive }: { emoji: string; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', color: destructive ? '#E53935' : TG.text, fontSize: 15, cursor: 'pointer', textAlign: 'left' }}>
      <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{emoji}</span>
      {label}
    </button>
  )
}

function MessageBubble({ message, isOwn, isSelecting, isSelected, onLongPressStart, onSelect, onLongPress, onLongPressEnd, onLongPressMove, onContextMenu }: MessageBubbleProps) {
  const reactions = message.reactions || {}

  return (
    <div
      className="message-appear"
      style={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: 2,
        padding: '1px 12px',
        opacity: isSelecting && isSelected ? 0.5 : 1,
      }}
      onClick={() => isSelecting && onSelect()}
      onDoubleClick={onLongPressStart}
      onTouchStart={onLongPress}
      onTouchEnd={onLongPressEnd}
      onTouchMove={onLongPressMove}
      onContextMenu={onContextMenu}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', maxWidth: '78%', minWidth: 70 }}>
        {isSelecting && (
          <div style={{
            width: 22, height: 22, borderRadius: 11,
            border: isSelected ? `2px solid ${TG.accent}` : `2px solid ${TG.textSecondary}`,
            background: isSelected ? TG.accent : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2,
          }}>
            {isSelected && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </div>
        )}

        {message.repliedToMessageId && message.repliedToText && (
          <div style={{
            background: isOwn ? 'rgba(43, 82, 120, 0.6)' : 'rgba(24, 37, 51, 0.8)',
            borderRadius: '8px 8px 0 0', padding: '6px 10px', width: '100%',
            borderLeft: `2px solid ${TG.accent}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: TG.accent, marginBottom: 1 }}>{message.repliedToUser}</div>
            <div style={{ fontSize: 12, color: TG.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message.repliedToText}</div>
          </div>
        )}

        <div style={{
          padding: '6px 10px 5px',
          borderRadius: isOwn
            ? (message.repliedToMessageId ? '8px 8px 8px 0' : '12px 12px 0 12px')
            : (message.repliedToMessageId ? '8px 8px 8px 0' : '12px 12px 12px 0'),
          background: isOwn ? TG.outgoing : TG.incoming,
          color: TG.text, fontSize: 16, lineHeight: 1.35, wordBreak: 'break-word',
        }}>
          {!isOwn && message.user && (
            <div style={{ fontSize: 13, fontWeight: 600, color: TG.accent, marginBottom: 2 }}>{message.user}</div>
          )}

          {/* Image */}
          {message.imageUrl && (
            <div style={{ marginBottom: 4 }}>
              <img src={message.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 8, cursor: 'pointer' }} onClick={() => window.open(message.imageUrl, '_blank')} />
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
          <span style={{
            float: 'right', fontSize: 11,
            color: isOwn ? 'rgba(255,255,255,0.45)' : TG.textSecondary,
            marginTop: 4, marginLeft: 8, display: 'flex', alignItems: 'center', gap: 3, lineHeight: 1,
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

        {Object.keys(reactions).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
            {Object.entries(reactions).map(([emoji, users]) => (
              <div key={emoji} style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: isOwn ? 'rgba(43, 82, 120, 0.8)' : 'rgba(24, 37, 51, 0.9)',
                borderRadius: 12, padding: '2px 6px', fontSize: 13,
                border: `1px solid ${TG.border}`, cursor: 'pointer',
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

interface MessageBubbleProps {
  message: Message
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
