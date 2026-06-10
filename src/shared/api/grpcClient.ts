// ============================================
// gRPC-web Client Singleton (Mock)
// ============================================
// In production, this would use generated grpc-web
// client code from messenger.proto. For now, we
// mock the server behavior for development.
// ============================================

import type { Chat, Message, StreamCallback } from '@/shared/types'

// --- Singleton ---

class GrpcClient {
  private static instance: GrpcClient
  private connected: boolean = false
  private mockInterval: ReturnType<typeof setInterval> | null = null
  private activeStreams: Map<string, AbortController> = new Map()

  private constructor() {}

  static getInstance(): GrpcClient {
    if (!GrpcClient.instance) {
      GrpcClient.instance = new GrpcClient()
    }
    return GrpcClient.instance
  }

  connect(_address: string): Promise<void> {
    // address stored for reconnection; mock ignores it
    this.connected = true
    this.startMockIncomingMessages()
    return Promise.resolve()
  }

  disconnect(): void {
    this.connected = false
    this.stopMockIncomingMessages()
    // Close all active streams
    this.activeStreams.forEach((controller) => controller.abort())
    this.activeStreams.clear()
  }

  isConnected(): boolean {
    return this.connected
  }

  // --- Unary calls ---

  async getChats(userId: string): Promise<Chat[]> {
    // Mock: return sample chats
    return getMockChats(userId)
  }

  async getMessages(chatId: string, limit = 50): Promise<Message[]> {
    return getMockMessages(chatId, limit)
  }

  async sendMessage(chatId: string, content: string, senderId: string): Promise<Message> {
    const msg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      chatId,
      senderId,
      senderName: 'You',
      content,
      createdAt: new Date().toISOString(),
      isOutgoing: true,
      isRead: false,
    }
    return msg
  }

  async createChat(participants: string[], name?: string, type: Chat['type'] = 'regular'): Promise<Chat> {
    return {
      id: `chat-${Date.now()}`,
      name: name || 'New Chat',
      type,
      creatorId: 'self',
      participants,
      lastMessageText: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
    }
  }

  // --- Server-Side Streaming ---

  streamChatMessages(chatId: string, callback: StreamCallback): () => void {
    const streamId = `stream-${chatId}-${Date.now()}`
    const controller = new AbortController()
    this.activeStreams.set(streamId, controller)

    const signal = controller.signal

    // Simulate incoming messages every 15-30 seconds
    const scheduleNext = () => {
      if (signal.aborted) return

      const delay = 15000 + Math.random() * 15000
      const timeoutId = setTimeout(() => {
        if (signal.aborted) return

        const mockMsg: Message = {
          id: `msg-incoming-${Date.now()}`,
          chatId,
          senderId: 'other-user',
          senderName: getChatSenderName(chatId),
          content: getRandomIncomingMessage(),
          createdAt: new Date().toISOString(),
          isOutgoing: false,
          isRead: false,
        }

        callback({ type: 'message', message: mockMsg })
        scheduleNext()
      }, delay)

      // Store timeout ID for cleanup
      signal.addEventListener('abort', () => clearTimeout(timeoutId), { once: true })
    }

    // Start after 3 seconds
    const initialTimeout = setTimeout(() => {
      if (signal.aborted) return
      scheduleNext()
    }, 3000)
    signal.addEventListener('abort', () => clearTimeout(initialTimeout), { once: true })

    // Return cleanup function
    return () => {
      controller.abort()
      this.activeStreams.delete(streamId)
    }
  }

  streamAllMessages(callback: StreamCallback): () => void {
    const streamId = `stream-all-${Date.now()}`
    const controller = new AbortController()
    this.activeStreams.set(streamId, controller)

    const signal = controller.signal

    // Simulate presence updates
    const presenceInterval = setInterval(() => {
      if (signal.aborted) return
      callback({
        type: 'presence',
        userId: 'other-user',
        isOnline: Math.random() > 0.3,
      })
    }, 20000)

    signal.addEventListener('abort', () => clearInterval(presenceInterval), { once: true })

    return () => {
      controller.abort()
      this.activeStreams.delete(streamId)
    }
  }

  // --- Mock helpers ---

  private startMockIncomingMessages(): void {
    // Global mock: simulate typing indicators
    this.mockInterval = setInterval(() => {
      // This would be handled by streamAllMessages in real usage
    }, 10000)
  }

  private stopMockIncomingMessages(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval)
      this.mockInterval = null
    }
  }
}

// --- Mock Data ---

const MOCK_CHATS: Record<string, Chat> = {
  'chat-1': {
    id: 'chat-1',
    name: 'Алексей',
    type: 'regular',
    creatorId: 'user-1',
    participants: ['user-1', 'user-2'],
    lastMessageText: 'Привет! Как дела?',
    lastMessageTime: new Date(Date.now() - 60000).toISOString(),
    unreadCount: 2,
    isOnline: true,
  },
  'chat-2': {
    id: 'chat-2',
    name: 'Работа',
    type: 'regular',
    creatorId: 'user-1',
    participants: ['user-1', 'user-3', 'user-4'],
    lastMessageText: 'Отправил отчёт',
    lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
    unreadCount: 0,
  },
  'chat-3': {
    id: 'chat-3',
    name: 'OWL AI',
    type: 'owl',
    creatorId: 'user-1',
    participants: ['user-1'],
    lastMessageText: 'Конечно, помогу!',
    lastMessageTime: new Date(Date.now() - 7200000).toISOString(),
    unreadCount: 0,
  },
  'chat-4': {
    id: 'chat-4',
    name: 'Hermes',
    type: 'hermes',
    creatorId: 'user-1',
    participants: ['user-1'],
    lastMessageText: 'Задача выполнена',
    lastMessageTime: new Date(Date.now() - 86400000).toISOString(),
    unreadCount: 1,
    activeAgentId: 'hermes-developer',
    agentMode: 'single',
  },
}

const MOCK_MESSAGES: Record<string, Message[]> = {
  'chat-1': [
    {
      id: 'm1',
      chatId: 'chat-1',
      senderId: 'user-2',
      senderName: 'Алексей',
      content: 'Привет! Как дела?',
      createdAt: new Date(Date.now() - 120000).toISOString(),
      isOutgoing: false,
      isRead: true,
    },
    {
      id: 'm2',
      chatId: 'chat-1',
      senderId: 'user-1',
      senderName: 'You',
      content: 'Привет! Всё отлично, спасибо!',
      createdAt: new Date(Date.now() - 90000).toISOString(),
      isOutgoing: true,
      isRead: true,
    },
    {
      id: 'm3',
      chatId: 'chat-1',
      senderId: 'user-2',
      senderName: 'Алексей',
      content: 'Отлично! Могу ли я задать вопрос по проекту?',
      createdAt: new Date(Date.now() - 60000).toISOString(),
      isOutgoing: false,
      isRead: false,
    },
  ],
  'chat-2': [
    {
      id: 'm4',
      chatId: 'chat-2',
      senderId: 'user-3',
      senderName: 'Мария',
      content: 'Отправил отчёт',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      isOutgoing: false,
      isRead: true,
    },
  ],
  'chat-3': [
    {
      id: 'm5',
      chatId: 'chat-3',
      senderId: 'user-1',
      senderName: 'You',
      content: 'Привет, OWL! Расскажи о себе',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      isOutgoing: true,
      isRead: true,
    },
    {
      id: 'm6',
      chatId: 'chat-3',
      senderId: 'owl-ai',
      senderName: 'OWL AI',
      content: 'Конечно, помогу! Я — AI-ассистент Lavender. Могу отвечать на вопросы, помогать с кодом и многое другое.',
      createdAt: new Date(Date.now() - 7199000).toISOString(),
      isOutgoing: false,
      isRead: true,
      agentId: 'owl-ai',
    },
  ],
  'chat-4': [
    {
      id: 'm7',
      chatId: 'chat-4',
      senderId: 'user-1',
      senderName: 'You',
      content: 'Проверь код на ошибки',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      isOutgoing: true,
      isRead: true,
    },
    {
      id: 'm8',
      chatId: 'chat-4',
      senderId: 'hermes-dev',
      senderName: 'Hermes Developer',
      content: 'Задача выполнена. Проверил код — ошибок не найдено.',
      createdAt: new Date(Date.now() - 86399000).toISOString(),
      isOutgoing: false,
      isRead: false,
      agentId: 'hermes-developer',
    },
  ],
}

const INCOMING_MESSAGES = [
  'Хорошо, понял!',
  'Интересно, расскажи подробнее',
  'Согласен',
  'Давай обсудим завтра',
  'Отличная идея! 👍',
  'Сейчас посмотрю',
  'Готово!',
  'Нужно подумать...',
  'Можешь скинуть файл?',
  'Ок, сделаю',
]

function getMockChats(_userId: string): Chat[] {
  return Object.values(MOCK_CHATS)
}

function getMockMessages(chatId: string, limit: number): Message[] {
  const messages = MOCK_MESSAGES[chatId] || []
  return messages.slice(-limit)
}

function getChatSenderName(chatId: string): string {
  const chat = MOCK_CHATS[chatId]
  return chat?.name || 'Unknown'
}

function getRandomIncomingMessage(): string {
  return INCOMING_MESSAGES[Math.floor(Math.random() * INCOMING_MESSAGES.length)]
}

// Export singleton
export const grpcClient = GrpcClient.getInstance()
export default grpcClient
