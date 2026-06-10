// ============================================
// Zustand Store — Chat State (Normalized)
// ============================================

import { create } from 'zustand'
import type { Chat, Message } from '@/shared/types'

// --- Normalized State Shape ---
//
// chats:    { [chatId]: Chat }           — chat metadata
// messages: { [messageId]: Message }     — flat message store
// chatMessages: { [chatId]: string[] }   — ordered message IDs per chat
//
// This avoids duplication and makes updates O(1).

interface ChatState {
  // Normalized data
  chats: Record<string, Chat>
  messages: Record<string, Message>
  chatMessages: Record<string, string[]>

  // UI state
  activeChatId: string | null
  isLoadingChats: boolean
  isLoadingMessages: boolean
  isSendingMessage: boolean

  // Actions — Chats
  setChats: (chats: Chat[]) => void
  addChat: (chat: Chat) => void
  updateChat: (chatId: string, updates: Partial<Chat>) => void
  removeChat: (chatId: string) => void
  setActiveChatId: (chatId: string | null) => void

  // Actions — Messages
  setMessages: (chatId: string, messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  prependMessages: (chatId: string, messages: Message[]) => void

  // Actions — Loading
  setLoadingChats: (loading: boolean) => void
  setLoadingMessages: (loading: boolean) => void
  setSendingMessage: (sending: boolean) => void

  // Selectors (computed)
  getChatList: () => Chat[]
  getActiveChat: () => Chat | null
  getChatMessages: (chatId: string) => Message[]
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  chats: {},
  messages: {},
  chatMessages: {},
  activeChatId: null,
  isLoadingChats: false,
  isLoadingMessages: false,
  isSendingMessage: false,

  // --- Chat Actions ---

  setChats: (chats) => {
    const chatMap: Record<string, Chat> = {}
    const msgMap: Record<string, Message> = {}
    const chatMsgMap: Record<string, string[]> = {}

    for (const chat of chats) {
      chatMap[chat.id] = chat
      chatMsgMap[chat.id] = []
    }

    set((state) => ({
      chats: { ...state.chats, ...chatMap },
      messages: { ...state.messages, ...msgMap },
      chatMessages: { ...state.chatMessages, ...chatMsgMap },
    }))
  },

  addChat: (chat) => {
    set((state) => ({
      chats: { ...state.chats, [chat.id]: chat },
      chatMessages: { ...state.chatMessages, [chat.id]: [] },
    }))
  },

  updateChat: (chatId, updates) => {
    set((state) => {
      const existing = state.chats[chatId]
      if (!existing) return state
      return {
        chats: {
          ...state.chats,
          [chatId]: { ...existing, ...updates },
        },
      }
    })
  },

  removeChat: (chatId) => {
    set((state) => {
      const { [chatId]: _removed, ...restChats } = state.chats
      const { [chatId]: _removedMsgs, ...restChatMessages } = state.chatMessages
      return {
        chats: restChats,
        chatMessages: restChatMessages,
        activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
      }
    })
  },

  setActiveChatId: (chatId) => set({ activeChatId: chatId }),

  // --- Message Actions ---

  setMessages: (chatId, messages) => {
    const msgMap: Record<string, Message> = {}
    const msgIds: string[] = []

    for (const msg of messages) {
      msgMap[msg.id] = msg
      msgIds.push(msg.id)
    }

    set((state) => ({
      messages: { ...state.messages, ...msgMap },
      chatMessages: {
        ...state.chatMessages,
        [chatId]: msgIds,
      },
    }))
  },

  addMessage: (message) => {
    set((state) => {
      // Add to flat messages store
      const newMessages = {
        ...state.messages,
        [message.id]: message,
      }

      // Add to chat's message ID list
      const existingIds = state.chatMessages[message.chatId] || []
      const newIds = existingIds.includes(message.id)
        ? existingIds
        : [...existingIds, message.id]

      // Update chat's last message
      const chat = state.chats[message.chatId]
      const newChats = chat
        ? {
            ...state.chats,
            [message.chatId]: {
              ...chat,
              lastMessageText: message.content,
              lastMessageTime: message.createdAt,
              unreadCount: message.isOutgoing
                ? chat.unreadCount
                : chat.unreadCount + 1,
            },
          }
        : state.chats

      return {
        messages: newMessages,
        chatMessages: {
          ...state.chatMessages,
          [message.chatId]: newIds,
        },
        chats: newChats,
      }
    })
  },

  updateMessage: (messageId, updates) => {
    set((state) => {
      const existing = state.messages[messageId]
      if (!existing) return state
      return {
        messages: {
          ...state.messages,
          [messageId]: { ...existing, ...updates },
        },
      }
    })
  },

  prependMessages: (chatId, messages) => {
    const msgMap: Record<string, Message> = {}
    const newIds: string[] = []

    for (const msg of messages) {
      msgMap[msg.id] = msg
      newIds.push(msg.id)
    }

    set((state) => {
      const existingIds = state.chatMessages[chatId] || []
      // Deduplicate
      const uniqueNewIds = newIds.filter((id) => !existingIds.includes(id))
      return {
        messages: { ...state.messages, ...msgMap },
        chatMessages: {
          ...state.chatMessages,
          [chatId]: [...uniqueNewIds, ...existingIds],
        },
      }
    })
  },

  // --- Loading Actions ---

  setLoadingChats: (loading) => set({ isLoadingChats: loading }),
  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),
  setSendingMessage: (sending) => set({ isSendingMessage: sending }),

  // --- Selectors ---

  getChatList: () => {
    const state = get()
    return Object.values(state.chats).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    )
  },

  getActiveChat: () => {
    const state = get()
    return state.activeChatId ? state.chats[state.activeChatId] || null : null
  },

  getChatMessages: (chatId) => {
    const state = get()
    const ids = state.chatMessages[chatId] || []
    return ids.map((id) => state.messages[id]).filter(Boolean)
  },
}))
