// ============================================
// ChatScreen — Mobile (Telegram Web Style)
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { Screen, ImageLightbox } from '@/components/common'
import { UserProfileModal } from '@/components/common/UserProfileModal'
import { FileDownloadButton } from '@/components/common/FileDownloadButton'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useIOSKeyboard } from '@/hooks/useIOSKeyboard'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { grpcClient } from '@/shared/api/grpcClient'
import { t } from '@/shared/types'
import { renderMentionText } from '@/shared/mentionRenderer'
import type { Message } from '@/shared/types'
import { useChatListV2 } from '@/hooks/useChatListV2'
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

export function ChatScreen({ chatId, isSecret, onBack, onServerShutdown, onReconnecting, onStreamError }: ChatScreenProps) {
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
  } = useChatMessages({ chatId, isSecret, onServerShutdown, onReconnecting, onStreamError })
  const { isKeyboardOpen, keyboardHeight } = useIOSKeyboard()
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
  const [longPressMenu, setLongPressMenu] = useState<{ messageId: string; x: number; y: number } | null>(null)
  const [reactionPicker, setReactionPicker] = useState<{ messageId: string; x: number; y: number } | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ messageId: string; roomId: string; username: string; preview: string; createdAt: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [profileUser, setProfileUser] = useState<string | null>(null)
  const [chatBgUrl, setChatBgUrl] = useState<string | null>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)
  const voiceRecorder = useVoiceRecorder()
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const shouldFollowOutput = useRef(true)
  const initialScrollDone = useRef(false)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setInputText(draft) }, [draft])

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
        }, 150)
      } else {
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, align: 'end' })
        }, 150)
      }
    } else if (shouldFollowOutput.current && messages.length > 0) {
      virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, behavior: 'smooth' })
    }
  }, [messages.length])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      const msgCount = useChatStore.getState().chatMessages[chatId || '']?.length || 0
      if (msgCount > 0) {
        virtuosoRef.current?.scrollToIndex({ index: msgCount - 1, align: 'end', behavior: 'smooth' })
      }
    }, 100)
  }, [chatId])

  const handleSend = useCallback(() => {
    if (!inputText.trim() || isSendingMessage) return
    if (editingMessageId) editMessage(editingMessageId, inputText)
    else sendMessage(inputText)
    setInputText('')
    clearDraft()
    shouldFollowOutput.current = true
    scrollToBottom()
  }, [inputText, isSendingMessage, sendMessage, editingMessageId, editMessage, clearDraft, scrollToBottom])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape' && editingMessageId) { cancelEditing(); setInputText(draft) }
  }, [handleSend, editingMessageId, cancelEditing, draft])

  const handleVoiceToggle = useCallback(async () => {
    if (voiceRecorder.isRecording) {
      const blob = await voiceRecorder.stopRecording()
      if (blob) {
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type })
        sendMediaMessage(file, 'voice').then(scrollToBottom)
      }
    } else {
      await voiceRecorder.startRecording()
    }
  }, [voiceRecorder, sendMediaMessage, scrollToBottom])

  const handleVoiceCancel = useCallback(() => {
    voiceRecorder.cancelRecording()
  }, [voiceRecorder])

  const handleInputTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
    updateDraft(e.target.value)
    sendTypingIndicator(true)
  }, [updateDraft, sendTypingIndicator])

  const handleStartReached = useCallback(() => {
    if (hasMore && !isLoadingMore) loadMore()
  }, [hasMore, isLoadingMore, loadMore])

  useEffect(() => {
    if (!searchQuery.trim() || !chatId) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await grpcClient.searchMessages(chatId, searchQuery.trim(), 30)
        setSearchResults(results)
      } catch { setSearchResults([]) }
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, chatId])

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

  const handleCopy = useCallback((messageId: string) => {
    setLongPressMenu(null)
    const msg = messages.find((m) => m.id === messageId)
    if (msg?.text) {
      navigator.clipboard.writeText(msg.text).catch(() => {})
    }
  }, [messages])

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
    sendMediaMessage(file, isImage ? 'image' : isAudio ? 'voice' : 'file').then(scrollToBottom)
    e.target.value = ''
  }, [sendMediaMessage, scrollToBottom])

  const typingNames = Array.from(typingUsers.keys())
  const otherUsername = activeChat?.type === 'direct' && activeChat?.participants
    ? JSON.parse(activeChat.participants).find((p: string) => p !== user?.username) || ''
    : ''

  return (
    <>
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
              <div
                onClick={() => { if (otherUsername) setProfileUser(otherUsername) }}
                style={{
                  width: 42, height: 42, borderRadius: '50%', flexShrink: 0, marginLeft: 4,
                  background: activeChat?.type === 'owl' ? '#6b5ce7' : activeChat?.type === 'hermes' ? '#e75c5c' : TG.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, color: '#fff',
                  cursor: otherUsername ? 'pointer' : 'default',
                }}
              >
                {activeChat?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>

              <div onClick={() => { if (otherUsername) setProfileUser(otherUsername) }} style={{ flex: 1, marginLeft: 12, minWidth: 0, cursor: otherUsername ? 'pointer' : 'default' }}>
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

              <button
                style={{ width: 40, height: 40, borderRadius: '50%', background: 'transparent', border: 'none', color: TG.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                style={{ width: 40, height: 40, borderRadius: '50%', background: 'transparent', border: 'none', color: TG.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setShowSearch(!showSearch)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TG.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
              <div style={{ position: 'relative' }} ref={chatMenuRef}>
                <button
                  style={{ width: 40, height: 40, borderRadius: '50%', background: 'transparent', border: 'none', color: TG.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => setShowChatMenu(!showChatMenu)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={TG.textSecondary}><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                </button>
                {showChatMenu && (
                  <div
                    style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 4,
                      background: '#17212B', borderRadius: 14, padding: '6px 0',
                      minWidth: 200, boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                      border: `1px solid ${TG.border}`, zIndex: 100,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {activeChat?.isPinned ? (
                      <MobileMenuItem emoji="📌" label="Открепить" onClick={() => { unpinChat(chatId); setShowChatMenu(false) }} />
                    ) : (
                      <MobileMenuItem emoji="📌" label="Закрепить" onClick={() => { pinChat(chatId); setShowChatMenu(false) }} />
                    )}
                    {activeChat?.isMuted ? (
                      <MobileMenuItem emoji="🔕" label="Включить уведомления" onClick={() => { setMutedChat(chatId, false); setShowChatMenu(false) }} />
                    ) : (
                      <MobileMenuItem emoji="🔔" label="Отключить уведомления" onClick={() => { setMutedChat(chatId, true); setShowChatMenu(false) }} />
                    )}
                    <MobileMenuItem emoji="📦" label="Архивировать" onClick={() => { archiveChat(chatId); setShowChatMenu(false) }} />
                    <MobileMenuItem emoji="📌" label="Закреплённые" onClick={() => {
                      window.dispatchEvent(new CustomEvent('show-pinned', { detail: { chatId } }))
                      setShowChatMenu(false)
                    }} />
                    <MobileMenuItem emoji="🖼" label="Фон чата" onClick={() => { bgInputRef.current?.click(); setShowChatMenu(false) }} />
                  </div>
                )}
              </div>
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
            {voiceRecorder.isRecording ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button onClick={handleVoiceCancel} style={{ background: 'none', border: 'none', color: '#E53935', fontSize: 16, cursor: 'pointer', padding: 4 }}>
                  ✕
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#E53935', fontSize: 13, fontWeight: 500 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E53935', animation: 'pulse 1s infinite' }} />
                  {Math.floor(voiceRecorder.recordingTime / 60)}:{(voiceRecorder.recordingTime % 60).toString().padStart(2, '0')}
                </div>
                <button onClick={handleVoiceToggle} style={{ width: 36, height: 36, borderRadius: '50%', background: TG.accent, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                </button>
              </div>
            ) : (
              <button onClick={voiceRecorder.error ? undefined : ((editingMessageId ? editingText : inputText).trim() ? handleSend : handleVoiceToggle)} disabled={!!editingMessageId || isSendingMessage} style={{
                width: 40, height: 40, borderRadius: '50%',
                background: (editingMessageId ? editingText : inputText).trim() ? TG.accent : 'transparent',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}>
                {editingMessageId ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (editingMessageId ? editingText : inputText).trim() ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" /></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={TG.textSecondary}><path d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3zm-1 14.93A7.006 7.006 0 015 11h2a5 5 0 0010 0h2a7.006 7.006 0 01-6 6.93V21h3v2H9v-2h3v-3.07z" /></svg>
                )}
              </button>
            )}
          </div>
        </div>
      }
    >
      {isLoadingMessages ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: TG.textSecondary }}>{t('loadingMessages')}</div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, background: chatBgUrl ? `url(${chatBgUrl}) center/cover` : undefined }}>
          <Virtuoso
            ref={virtuosoRef}
            data={messages}
            firstItemIndex={0}
            startReached={handleStartReached}
            itemContent={(_index, msg) => (
              <MessageBubble
                message={msg}
                isOwn={msg.isOutgoing}
                isSelecting={isSelecting}
                isSelected={selectedMessages.includes(msg.id)}
                isSecret={isSecret}
                onLongPressStart={() => handleLongPressStart(msg.id)}
                onSelect={() => toggleSelectMessage(msg.id)}
                onLongPress={(e) => handleTouchStart(msg.id, e)}
                onLongPressEnd={handleTouchEnd}
                onLongPressMove={handleTouchMove}
                onContextMenu={(e) => { e.preventDefault(); if (!isSelecting) setLongPressMenu({ messageId: msg.id, x: e.clientX, y: e.clientY }) }}
                onReaction={(emoji) => toggleReaction(msg.id, emoji)}
                onImageClick={(url) => setLightboxUrl(url)}
              />
            )}
            followOutput="smooth"
            atBottomThreshold={100}
            atBottomStateChange={(atBottom) => { shouldFollowOutput.current = atBottom }}
            style={{ height: '100%', paddingBottom: 4 }}
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
            <CtxItem emoji="📋" label={t('copyText')} onClick={() => handleCopy(longPressMenu.messageId)} />
            <CtxItem emoji="⭐" label="В избранное" onClick={() => { handleFavorite(longPressMenu.messageId); closeMenus() }} />
            {messages.find((m) => m.id === longPressMenu.messageId)?.user === user?.username && (
              <CtxItem emoji="✏️" label={t('edit')} onClick={() => { const msg = messages.find((m) => m.id === longPressMenu.messageId); if (msg) handleEdit(msg) }} />
            )}
            <CtxItem emoji="🗑" label={t('delete')} onClick={() => handleDelete(longPressMenu.messageId)} destructive />
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
    {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

    {/* Search panel */}
    {profileUser && <UserProfileModal username={profileUser} onClose={() => setProfileUser(null)} />}
    <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const url = await grpcClient.uploadBackground(file)
        if (url) setChatBgUrl(url)
      } catch {}
      e.target.value = ''
    }} />
    {showSearch && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200, background: '#1a1a2e',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${TG.border}` }}>
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }}
            style={{ background: 'none', border: 'none', color: TG.accent, fontSize: 16, cursor: 'pointer', padding: 4 }}>
            ← Назад
          </button>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск сообщений..."
            autoFocus
            style={{
              flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.08)',
              border: `1px solid ${TG.border}`, borderRadius: 8, color: '#fff', fontSize: 15,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isSearching ? (
            <div style={{ textAlign: 'center', padding: 24, color: TG.textSecondary }}>Поиск...</div>
          ) : searchQuery.trim() && searchResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: TG.textSecondary }}>Ничего не найдено</div>
          ) : (
            searchResults.map((r) => (
              <div
                key={r.messageId}
                onClick={() => {
                  const idx = messages.findIndex((m) => m.id === r.messageId)
                  if (idx >= 0) virtuosoRef.current?.scrollToIndex({ index: idx, align: 'start' })
                  setShowSearch(false)
                }}
                style={{
                  padding: '12px 16px', borderBottom: `1px solid ${TG.border}`, cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: TG.accent, marginBottom: 2 }}>{r.username}</div>
                <div style={{ fontSize: 14, color: TG.text, lineHeight: 1.4 }}>{r.preview}</div>
                <div style={{ fontSize: 11, color: TG.textSecondary, marginTop: 4 }}>
                  {r.createdAt ? new Date(r.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )}
    </>
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

function MobileMenuItem({ emoji, label, onClick, destructive }: { emoji: string; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '12px 16px', background: 'transparent', border: 'none',
        color: destructive ? '#E53935' : TG.text, fontSize: 15,
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{emoji}</span>
      {label}
    </button>
  )
}

function MessageBubble({ message, isOwn, isSelecting, isSelected, isSecret, onLongPressStart, onSelect, onLongPress, onLongPressEnd, onLongPressMove, onContextMenu, onImageClick }: MessageBubbleProps) {
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
          color: TG.text, fontSize: 16, lineHeight: 1.35, wordBreak: 'break-word', userSelect: 'text',
        }}>
          {!isOwn && message.user && (
            <div style={{ fontSize: 13, fontWeight: 600, color: TG.accent, marginBottom: 2 }}>{message.user}</div>
          )}

          {/* Image */}
          {message.imageUrl && (
            <div style={{ marginBottom: 4 }}>
              <img src={message.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 8, cursor: 'pointer' }} onClick={() => onImageClick?.(message.imageUrl!)} />
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
              <FileDownloadButton url={message.fileUrl} filename={message.text || 'file'} style={{ borderRadius: 8, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', color: TG.accent, fontSize: 13 }}>
                  📎 {message.text || 'Файл'}
                </div>
              </FileDownloadButton>
            </div>
          )}

          {/* Text */}
          {message.text && !message.fileUrl && <div style={{ display: 'inline' }}>{renderMentionText(message.text, message.mentions)}</div>}
          <span style={{
            float: 'right', fontSize: 11,
            color: isOwn ? 'rgba(255,255,255,0.45)' : TG.textSecondary,
            marginTop: 4, marginLeft: 8, display: 'flex', alignItems: 'center', gap: 3, lineHeight: 1,
          }}>
            {isSecret && <span style={{ fontSize: 10 }} title="Зашифровано E2EE">🔒</span>}
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
    </div>
  )
}

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  isSelecting: boolean
  isSelected: boolean
  isSecret?: boolean
  onLongPressStart: () => void
  onSelect: () => void
  onLongPress: (e: React.TouchEvent) => void
  onLongPressEnd: () => void
  onLongPressMove: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onReaction: (emoji: string) => void
  onImageClick?: (url: string) => void
}
