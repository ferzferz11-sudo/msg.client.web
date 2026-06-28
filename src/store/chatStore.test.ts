import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from './chatStore'
import type { Chat, Message } from '@/shared/types'

const makeChat = (id: string, name: string, lastMessageTime = '2025-01-01T00:00:00Z'): Chat => ({
  id, name, type: 'regular', creatorId: 'u1', participants: '[]',
  lastMessageText: '', lastMessageTime, unreadCount: 0,
})

const makeMessage = (id: string, roomId: string, text: string, isOutgoing = false): Message => ({
  id, roomId, user: 'testuser', text,
  createdAt: new Date().toISOString(),
  isOutgoing, isRead: false,
})

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      chats: {}, messages: {}, chatMessages: {},
      activeChatId: null, isLoadingChats: false,
      isLoadingMessages: false, isSendingMessage: false,
    })
  })

  describe('chats', () => {
    it('setChats populates store', () => {
      const chats = [makeChat('c1', 'Alice'), makeChat('c2', 'Bob')]
      useChatStore.getState().setChats(chats)
      const state = useChatStore.getState()
      expect(Object.keys(state.chats)).toHaveLength(2)
      expect(state.chats['c1'].name).toBe('Alice')
    })

    it('addChat adds single chat', () => {
      useChatStore.getState().addChat(makeChat('c1', 'Alice'))
      expect(useChatStore.getState().chats['c1']).toBeDefined()
      expect(useChatStore.getState().chatMessages['c1']).toEqual([])
    })

    it('updateChat merges partial updates', () => {
      useChatStore.getState().addChat(makeChat('c1', 'Alice'))
      useChatStore.getState().updateChat('c1', { name: 'Alice Updated', unreadCount: 3 })
      expect(useChatStore.getState().chats['c1'].name).toBe('Alice Updated')
      expect(useChatStore.getState().chats['c1'].unreadCount).toBe(3)
    })

    it('updateChat is no-op for missing chat', () => {
      useChatStore.getState().updateChat('missing', { name: 'nope' })
      expect(useChatStore.getState().chats['missing']).toBeUndefined()
    })

    it('removeChat deletes chat and messages', () => {
      useChatStore.getState().addChat(makeChat('c1', 'Alice'))
      useChatStore.getState().setMessages('c1', [makeMessage('m1', 'c1', 'hi')])
      useChatStore.getState().removeChat('c1')
      const state = useChatStore.getState()
      expect(state.chats['c1']).toBeUndefined()
      expect(state.chatMessages['c1']).toBeUndefined()
    })

    it('removeChat clears activeChatId if active', () => {
      useChatStore.getState().addChat(makeChat('c1', 'Alice'))
      useChatStore.getState().setActiveChatId('c1')
      useChatStore.getState().removeChat('c1')
      expect(useChatStore.getState().activeChatId).toBeNull()
    })

    it('removeChat preserves activeChatId if different', () => {
      useChatStore.getState().addChat(makeChat('c1', 'Alice'))
      useChatStore.getState().addChat(makeChat('c2', 'Bob'))
      useChatStore.getState().setActiveChatId('c2')
      useChatStore.getState().removeChat('c1')
      expect(useChatStore.getState().activeChatId).toBe('c2')
    })
  })

  describe('messages', () => {
    it('setMessages populates for chat', () => {
      const msgs = [makeMessage('m1', 'c1', 'hello'), makeMessage('m2', 'c1', 'world')]
      useChatStore.getState().setMessages('c1', msgs)
      const result = useChatStore.getState().getChatMessages('c1')
      expect(result).toHaveLength(2)
      expect(result[0].text).toBe('hello')
    })

    it('addMessage adds to chat and updates lastMessage', () => {
      useChatStore.getState().addChat(makeChat('c1', 'Alice'))
      useChatStore.getState().addMessage(makeMessage('m1', 'c1', 'hello', true))
      const state = useChatStore.getState()
      expect(state.chatMessages['c1']).toContain('m1')
      expect(state.chats['c1'].lastMessageText).toBe('hello')
    })

    it('addMessage increments unreadCount for incoming', () => {
      useChatStore.getState().addChat(makeChat('c1', 'Alice'))
      useChatStore.getState().addMessage(makeMessage('m1', 'c1', 'hello', false))
      expect(useChatStore.getState().chats['c1'].unreadCount).toBe(1)
    })

    it('addMessage does not increment unreadCount for outgoing', () => {
      useChatStore.getState().addChat(makeChat('c1', 'Alice'))
      useChatStore.getState().addMessage(makeMessage('m1', 'c1', 'hello', true))
      expect(useChatStore.getState().chats['c1'].unreadCount).toBe(0)
    })

    it('addMessage deduplicates', () => {
      useChatStore.getState().addChat(makeChat('c1', 'Alice'))
      useChatStore.getState().addMessage(makeMessage('m1', 'c1', 'hello'))
      useChatStore.getState().addMessage(makeMessage('m1', 'c1', 'hello'))
      expect(useChatStore.getState().chatMessages['c1']).toHaveLength(1)
    })

    it('updateMessage modifies existing message', () => {
      useChatStore.getState().addMessage(makeMessage('m1', 'c1', 'original'))
      useChatStore.getState().updateMessage('m1', { text: 'edited' })
      const msg = useChatStore.getState().messages['m1']
      expect(msg.text).toBe('edited')
    })

    it('updateMessage is no-op for missing message', () => {
      useChatStore.getState().updateMessage('missing', { text: 'nope' })
      expect(useChatStore.getState().messages['missing']).toBeUndefined()
    })

    it('prependMessages adds at beginning and deduplicates', () => {
      useChatStore.getState().addChat(makeChat('c1', 'Alice'))
      useChatStore.getState().setMessages('c1', [makeMessage('m2', 'c1', 'world')])
      useChatStore.getState().prependMessages('c1', [makeMessage('m1', 'c1', 'hello'), makeMessage('m2', 'c1', 'world')])
      const result = useChatStore.getState().getChatMessages('c1')
      expect(result).toHaveLength(2)
      expect(result[0].text).toBe('hello')
    })

    it('removeMessage deletes message and removes from chat', () => {
      useChatStore.getState().addChat(makeChat('c1', 'Alice'))
      useChatStore.getState().addMessage(makeMessage('m1', 'c1', 'hello'))
      useChatStore.getState().removeMessage('c1', 'm1')
      const state = useChatStore.getState()
      expect(state.messages['m1']).toBeUndefined()
      expect(state.chatMessages['c1']).not.toContain('m1')
    })
  })

  describe('selectors', () => {
    it('getChatList returns sorted by lastMessageTime', () => {
      useChatStore.getState().addChat(makeChat('c1', 'Alice', '2025-01-01'))
      useChatStore.getState().addChat(makeChat('c2', 'Bob', '2025-06-01'))
      const list = useChatStore.getState().getChatList()
      expect(list[0].name).toBe('Bob')
      expect(list[1].name).toBe('Alice')
    })

    it('getActiveChat returns correct chat', () => {
      useChatStore.getState().addChat(makeChat('c1', 'Alice'))
      useChatStore.getState().setActiveChatId('c1')
      expect(useChatStore.getState().getActiveChat()?.name).toBe('Alice')
    })

    it('getActiveChat returns null if no active', () => {
      expect(useChatStore.getState().getActiveChat()).toBeNull()
    })

    it('getChatMessages returns empty for unknown chat', () => {
      expect(useChatStore.getState().getChatMessages('unknown')).toEqual([])
    })
  })

  describe('loading states', () => {
    it('setLoadingChats toggles', () => {
      useChatStore.getState().setLoadingChats(true)
      expect(useChatStore.getState().isLoadingChats).toBe(true)
      useChatStore.getState().setLoadingChats(false)
      expect(useChatStore.getState().isLoadingChats).toBe(false)
    })

    it('setSendingMessage toggles', () => {
      useChatStore.getState().setSendingMessage(true)
      expect(useChatStore.getState().isSendingMessage).toBe(true)
    })
  })
})
