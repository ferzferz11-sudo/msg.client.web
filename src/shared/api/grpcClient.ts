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
    this.connected = true
    this.startMockIncomingMessages()
    return Promise.resolve()
  }

  disconnect(): void {
    this.connected = false
    this.stopMockIncomingMessages()
    this.activeStreams.forEach((controller) => controller.abort())
    this.activeStreams.clear()
  }

  isConnected(): boolean {
    return this.connected
  }

  // --- Unary calls ---

  async getChats(userId: string): Promise<Chat[]> {
    return getMockChats(userId)
  }

  async getMessages(chatId: string, limit = 50): Promise<Message[]> {
    return getMockMessages(chatId, limit)
  }

  async sendMessage(chatId: string, content: string, senderId: string): Promise<Message> {
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      chatId,
      senderId,
      senderName: 'You',
      content,
      createdAt: new Date().toISOString(),
      isOutgoing: true,
      isRead: false,
    }
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

  async getMissingMessages(chatId: string, since: string): Promise<Message[]> {
    const sinceTime = new Date(since).getTime()
    const now = Date.now()
    const count = Math.floor(Math.random() * 3)
    const messages: Message[] = []
    for (let i = 0; i < count; i++) {
      const msgTime = sinceTime + Math.random() * (now - sinceTime)
      messages.push({
        id: `msg-missing-${now}-${i}`,
        chatId,
        senderId: 'other-user',
        senderName: getChatSenderName(chatId),
        content: getRandomIncomingMessage(),
        createdAt: new Date(msgTime).toISOString(),
        isOutgoing: false,
        isRead: false,
      })
    }
    return messages
  }

  async registerPushToken(params: {
    endpoint: string
    p256dh: string
    auth: string
    platform: string
    userAgent: string
  }): Promise<{ success: boolean }> {
    console.log('[Mock] registerPushToken:', {
      endpoint: params.endpoint.slice(0, 50) + '...',
      platform: params.platform,
    })
    return { success: true }
  }

  // --- Server-Side Streaming ---

  streamChatMessages(chatId: string, callback: StreamCallback): () => void {
    const streamId = `stream-${chatId}-${Date.now()}`
    const controller = new AbortController()
    this.activeStreams.set(streamId, controller)
    const signal = controller.signal

    const scheduleNext = () => {
      if (signal.aborted) return
      const delay = 15000 + Math.random() * 15000
      const timeoutId = setTimeout(() => {
        if (signal.aborted) return
        callback({
          type: 'message',
          message: {
            id: `msg-incoming-${Date.now()}`,
            chatId,
            senderId: 'other-user',
            senderName: getChatSenderName(chatId),
            content: getRandomIncomingMessage(),
            createdAt: new Date().toISOString(),
            isOutgoing: false,
            isRead: false,
          },
        })
        scheduleNext()
      }, delay)
      signal.addEventListener('abort', () => clearTimeout(timeoutId), { once: true })
    }

    const initialTimeout = setTimeout(() => {
      if (signal.aborted) return
      scheduleNext()
    }, 3000)
    signal.addEventListener('abort', () => clearTimeout(initialTimeout), { once: true })

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
    this.mockInterval = setInterval(() => {
      // Global mock: simulate typing indicators
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
      id: 'm1', chatId: 'chat-1', senderId: 'user-2', senderName: 'Алексей',
      content: 'Привет! Как дела?', createdAt: new Date(Date.now() - 120000).toISOString(),
      isOutgoing: false, isRead: true,
    },
    {
      id: 'm2', chatId: 'chat-1', senderId: 'user-1', senderName: 'You',
      content: 'Привет! Всё отлично, спасибо!', createdAt: new Date(Date.now() - 90000).toISOString(),
      isOutgoing: true, isRead: true,
    },
    {
      id: 'm3', chatId: 'chat-1', senderId: 'user-2', senderName: 'Алексей',
      content: 'Отлично! Могу ли я задать вопрос по проекту?', createdAt: new Date(Date.now() - 60000).toISOString(),
      isOutgoing: false, isRead: false,
    },
  ],
  'chat-2': [
    {
      id: 'm4', chatId: 'chat-2', senderId: 'user-3', senderName: 'Мария',
      content: 'Отправил отчёт', createdAt: new Date(Date.now() - 3600000).toISOString(),
      isOutgoing: false, isRead: true,
    },
  ],
  'chat-3': [
    {
      id: 'm5', chatId: 'chat-3', senderId: 'user-1', senderName: 'You',
      content: 'Привет, OWL! Расскажи о себе', createdAt: new Date(Date.now() - 7200000).toISOString(),
      isOutgoing: true, isRead: true,
    },
    {
      id: 'm6', chatId: 'chat-3', senderId: 'owl-ai', senderName: 'OWL AI',
      content: 'Конечно, помогу! Я — AI-ассистент Lavender.',
      createdAt: new Date(Date.now() - 7199000).toISOString(),
      isOutgoing: false, isRead: true, agentId: 'owl-ai',
    },
  ],
  'chat-4': [
    {
      id: 'm7', chatId: 'chat-4', senderId: 'user-1', senderName: 'You',
      content: 'Проверь код на ошибки', createdAt: new Date(Date.now() - 86400000).toISOString(),
      isOutgoing: true, isRead: true,
    },
    {
      id: 'm8', chatId: 'chat-4', senderId: 'hermes-dev', senderName: 'Hermes Developer',
      content: 'Задача выполнена. Проверил код — ошибок не найдено.',
      createdAt: new Date(Date.now() - 86399000).toISOString(),
      isOutgoing: false, isRead: false, agentId: 'hermes-developer',
    },
  ],
}

const INCOMING_MESSAGES = [
  'Хорошо, понял!', 'Интересно, расскажи подробнее', 'Согласен',
  'Давай обсудим завтра', 'Отличная идея! 👍', 'Сейчас посмотрю',
  'Готово!', 'Нужно подумать...', 'Можешь скинуть файл?', 'Ок, сделаю',
]

function getMockChats(_userId: string): Chat[] {
  return Object.values(MOCK_CHATS)
}

function getMockMessages(chatId: string, limit: number): Message[] {
  return (MOCK_MESSAGES[chatId] || []).slice(-limit)
}

function getChatSenderName(chatId: string): string {
  return MOCK_CHATS[chatId]?.name || 'Unknown'
}

function getRandomIncomingMessage(): string {
  return INCOMING_MESSAGES[Math.floor(Math.random() * INCOMING_MESSAGES.length)]
}

export const grpcClient = GrpcClient.getInstance()
export default grpcClient
