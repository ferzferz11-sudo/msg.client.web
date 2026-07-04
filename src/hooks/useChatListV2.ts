// ============================================
// useChatListV2 — Chat List V2 Hook (pin, archive, search, pagination)
// ============================================

import { useState, useCallback } from 'react'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { grpcClient } from '@/shared/api/grpcClient'
import { useErrorStore } from '@/store/errorStore'

type ChatFilter = 'all' | 'pinned' | 'archived' | 'muted'

export function useChatListV2() {
  const chatList = useChatStore((s) => s.getChatList())
  const isLoadingChats = useChatStore((s) => s.isLoadingChats)
  const setChats = useChatStore((s) => s.setChats)
  const updateChat = useChatStore((s) => s.updateChat)
  const setLoadingChats = useChatStore((s) => s.setLoadingChats)
  const user = useAuthStore((s) => s.user)
  const addError = useErrorStore((s) => s.addError)

  const [filter, setFilter] = useState<ChatFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [chatListVersion, setChatListVersion] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [nextCursor, setNextCursor] = useState('')

  const loadChats = useCallback(async (f: ChatFilter = 'all') => {
    if (!user) return
    setLoadingChats(true)
    try {
      const result = await grpcClient.getChats(user.id, user.username, {
        limit: 100,
        filter: f,
      })
      setChats(result.chats)
      setNextCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (err: any) {
      const msg = String(err?.message || err || '')
      if (msg.includes('502') || msg.includes('503') || msg.includes('unavailable') || msg.includes('Connection refused')) {
        return
      }
      console.error('Failed to load chats:', err)
      addError({ message: 'Не удалось загрузить список чатов', type: 'network' })
    } finally {
      setLoadingChats(false)
    }
  }, [user, setChats, setLoadingChats, addError])

  const loadMore = useCallback(async () => {
    if (!user || !hasMore || !nextCursor) return
    try {
      const result = await grpcClient.getChats(user.id, user.username, {
        limit: 100,
        cursor: nextCursor,
        filter,
      })
      if (result.chats.length > 0) {
        useChatStore.getState().setChats([...useChatStore.getState().getChatList(), ...result.chats])
      }
      setNextCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (err) {
      console.error('Failed to load more chats:', err)
    }
  }, [user, hasMore, nextCursor, filter])

  const refreshChats = useCallback(async () => {
    await loadChats(filter)
  }, [loadChats, filter])

  const pinChat = useCallback(async (chatId: string) => {
    if (!user) return false
    try {
      const success = await grpcClient.pinChat(user.id, chatId)
      if (success) updateChat(chatId, { isPinned: true, pinnedAt: Date.now() })
      return success
    } catch (err) {
      addError({ message: 'Не удалось закрепить чат', type: 'network' })
      return false
    }
  }, [user, updateChat, addError])

  const unpinChat = useCallback(async (chatId: string) => {
    if (!user) return false
    try {
      const success = await grpcClient.unPinChat(user.id, chatId)
      if (success) updateChat(chatId, { isPinned: false, pinnedAt: 0 })
      return success
    } catch (err) {
      addError({ message: 'Не удалось открепить чат', type: 'network' })
      return false
    }
  }, [user, updateChat, addError])

  const archiveChat = useCallback(async (chatId: string) => {
    if (!user) return false
    try {
      const success = await grpcClient.archiveChat(user.id, chatId)
      if (success) updateChat(chatId, { isArchived: true })
      return success
    } catch (err) {
      addError({ message: 'Не удалось архивировать чат', type: 'network' })
      return false
    }
  }, [user, updateChat, addError])

  const unarchiveChat = useCallback(async (chatId: string) => {
    if (!user) return false
    try {
      const success = await grpcClient.unarchiveChat(user.id, chatId)
      if (success) updateChat(chatId, { isArchived: false })
      return success
    } catch (err) {
      addError({ message: 'Не удалось разархивировать чат', type: 'network' })
      return false
    }
  }, [user, updateChat, addError])

  const setMutedChat = useCallback(async (chatId: string, muted: boolean) => {
    try {
      const success = await grpcClient.setMutedChat(user?.id || '', chatId, muted)
      if (success) updateChat(chatId, { isMuted: muted })
      return success
    } catch (err) {
      addError({ message: muted ? 'Не удалось отключить уведомления' : 'Не удалось включить уведомления', type: 'network' })
      return false
    }
  }, [user, updateChat, addError])

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const success = await grpcClient.deleteChat(chatId, user?.username || '', user?.id || '')
      if (success) useChatStore.getState().removeChat(chatId)
      return success
    } catch (err) {
      addError({ message: 'Не удалось удалить чат', type: 'network' })
      return false
    }
  }, [user, addError])

  const searchChats = useCallback(async (query: string) => {
    if (!user) return []
    setSearchQuery(query)
    if (!query.trim()) {
      await loadChats(filter)
      return []
    }
    try {
      const chats = await grpcClient.searchChats(query)
      return chats
    } catch (err) {
      addError({ message: 'Ошибка поиска', type: 'network' })
      return []
    }
  }, [user, filter, loadChats, addError])

  const getChatListVersion = useCallback(async () => {
    try {
      const version = await grpcClient.getChatListVersion()
      setChatListVersion(version)
      return version
    } catch (err) {
      console.warn('[ChatList] Failed to get version:', err)
      return 0
    }
  }, [])

  // Filter chats locally based on current filter
  const filteredChats = chatList.filter((chat) => {
    if (filter === 'pinned') return chat.isPinned
    if (filter === 'archived') return chat.isArchived
    if (filter === 'muted') return chat.isMuted
    return !chat.isArchived // 'all' excludes archived
  })

  return {
    chats: filteredChats,
    allChats: chatList,
    isLoadingChats,
    filter,
    setFilter,
    searchQuery,
    chatListVersion,
    hasMore,
    loadChats,
    loadMore,
    refreshChats,
    pinChat,
    unpinChat,
    archiveChat,
    unarchiveChat,
    setMutedChat,
    deleteChat,
    searchChats,
    getChatListVersion,
  }
}
