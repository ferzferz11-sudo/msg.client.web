// ============================================
// gRPC-web Client — Real Backend + Auth Interceptor
// ============================================

/// <reference types="vite/client" />

import { createClient, type Transport } from '@connectrpc/connect'
import { createGrpcWebTransport } from '@connectrpc/connect-web'
import type { Chat, Message, StreamCallback } from '@/shared/types'
import type { AuthResponse } from '@/shared/api/gen/messenger_pb'
import { AuthService, ChatService } from '@/shared/api/gen/messenger_pb'

// --- Auth Interceptor ---

function createAuthInterceptor(getToken: () => string | null) {
  return (next: any) => async (req: any) => {
    const token = getToken()
    if (token) {
      req.header.set('Authorization', `Bearer ${token}`)
    }
    return next(req)
  }
}

// --- Singleton ---

class GrpcClient {
  private static instance: GrpcClient
  private baseTransport: Transport | null = null
  private authClient: any = null
  private chatClient: any = null
  private connected: boolean = false
  private activeStreams: Map<string, AbortController> = new Map()
  private getToken: (() => string | null) | null = null

  private constructor() {}

  static getInstance(): GrpcClient {
    if (!GrpcClient.instance) {
      GrpcClient.instance = new GrpcClient()
    }
    return GrpcClient.instance
  }

  connect(address?: string, getToken?: () => string | null): Promise<void> {
    const baseUrl = address
      || import.meta.env.VITE_API_URL
      || 'http://localhost:8080'

    this.getToken = getToken || null

    const interceptor = createAuthInterceptor(() => this.getToken?.() || null)
    this.baseTransport = createGrpcWebTransport({
      baseUrl,
      interceptors: [interceptor],
    })

    this.authClient = createClient(AuthService as any, this.baseTransport)
    this.chatClient = createClient(ChatService as any, this.baseTransport)

    this.connected = true
    return Promise.resolve()
  }

  disconnect(): void {
    this.connected = false
    this.activeStreams.forEach((controller) => controller.abort())
    this.activeStreams.clear()
    this.authClient = null
    this.chatClient = null
    this.baseTransport = null
  }

  isConnected(): boolean {
    return this.connected
  }

  // --- Auth Methods ---

  async signIn(username: string, password: string): Promise<AuthResponse> {
    if (!this.authClient) throw new Error('Not connected')
    return this.authClient.signIn({
      username,
      password,
      deviceId: 'web-device',
      deviceName: 'Web Browser',
    })
  }

  async signUp(username: string, password: string, email?: string, displayName?: string): Promise<AuthResponse> {
    if (!this.authClient) throw new Error('Not connected')
    return this.authClient.signUp({
      username,
      password,
      email: email || '',
      displayName: displayName || username,
    })
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    if (!this.authClient) throw new Error('Not connected')
    return this.authClient.refreshToken({ refreshToken })
  }

  async logout(): Promise<boolean> {
    if (!this.authClient) return false
    try {
      const token = this.getToken?.()
      if (token) {
        await this.authClient.logout({ accessToken: token })
      }
      return true
    } catch {
      return false
    }
  }

  // --- Chat Methods ---

  async getChats(userId: string): Promise<Chat[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await this.chatClient.getChats({ userId })
    return (response.chats || []).map(protoToChat)
  }

  async getHistory(roomId: string, limit = 50): Promise<{ messages: Message[]; hasMore: boolean }> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await this.chatClient.getHistory({ room: roomId, limit })
    const messages = (response.messages || []).map(protoToMessage)
    return { messages, hasMore: messages.length === limit }
  }

  async sendMessage(roomId: string, content: string, userId: string): Promise<Message> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await this.chatClient.chat({ roomId, text: content, userId })
    return protoToMessage(response)
  }

  async createDirectChat(user1: string, user2: string, user1Id: string, user2Id: string): Promise<Chat> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await this.chatClient.createDirectChat({ user1, user2, user1Id, user2Id })
    return {
      id: response.chatId || '',
      name: user2,
      type: 'regular',
      creatorId: user1Id,
      participants: JSON.stringify([user1, user2]),
      lastMessageText: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      isOnline: false,
    }
  }

  async createGroupChat(name: string, participants: string[], creator: string, creatorId: string, participantIds: string[]): Promise<Chat> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await this.chatClient.createGroupChat({ name, participants, creator, creatorId, participantIds })
    return {
      id: response.chatId || '',
      name,
      type: 'group',
      creatorId,
      participants: JSON.stringify(participants),
      lastMessageText: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      isOnline: false,
    }
  }

  async deleteChat(chatId: string, requesterUsername: string, requesterUserId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await this.chatClient.deleteChat({ chatId, requesterUsername, requesterUserId })
    return response.success
  }

  async markRead(roomId: string, username: string, userId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await this.chatClient.markRead({ roomId, username, userId })
    return response.success
  }

  async registerPushToken(userId: string, token: string, pushEnabled: boolean): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await this.chatClient.registerToken({ user: userId, token, pushEnabled, userId })
    return response.success
  }

  // --- Server-Side Streaming ---

  streamChatMessages(roomId: string, callback: StreamCallback): () => void {
    const streamId = `stream-${roomId}-${Date.now()}`
    const controller = new AbortController()
    this.activeStreams.set(streamId, controller)
    const signal = controller.signal

    const stream = this.chatClient.chat({ roomId }, { signal })

    ;(async () => {
      try {
        for await (const event of stream) {
          if (signal.aborted) break
          handleStreamEvent(event, callback)
        }
      } catch (err) {
        if (!signal.aborted) {
          callback({ type: 'error', error: String(err) })
        }
      }
    })()

    return () => {
      controller.abort()
      this.activeStreams.delete(streamId)
    }
  }
}

// --- Proto → TypeScript converters ---

function protoToChat(chat: any): Chat {
  return {
    id: chat.id || '',
    name: chat.name || '',
    type: chat.type || 'regular',
    creatorId: chat.creator || '',
    participants: chat.participants || '[]',
    lastMessageText: chat.lastMessageText || '',
    lastMessageTime: chat.lastMessageTime?.toDate?.()?.toISOString() || new Date().toISOString(),
    unreadCount: chat.unreadCount || 0,
    avatarUrl: chat.avatarUrl || '',
    isOnline: chat.isOnline || false,
    activeAgentId: chat.activeAgentId || '',
    agentMode: chat.agentMode || 'single',
  }
}

function protoToMessage(msg: any): Message {
  return {
    id: msg.id || '',
    roomId: msg.roomId || msg.chatId || '',
    user: msg.user || '',
    text: msg.text || '',
    createdAt: msg.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    isOutgoing: false,
    isRead: msg.isRead || false,
    repliedToMessageId: msg.repliedToMessageId || '',
    repliedToUser: msg.repliedToUser || '',
    repliedToText: msg.repliedToText || '',
    agentId: msg.agentId || '',
  }
}

function handleStreamEvent(event: any, callback: StreamCallback): void {
  if (event.message) {
    callback({ type: 'message', message: protoToMessage(event.message) })
  } else if (event.typing) {
    callback({ type: 'typing', chatId: event.typing.chatId, userId: event.typing.userId, isTyping: event.typing.isTyping })
  } else if (event.presence) {
    callback({ type: 'presence', userId: event.presence.userId, isOnline: event.presence.isOnline })
  } else if (event.error) {
    callback({ type: 'error', error: event.error.error })
  }
}

export const grpcClient = GrpcClient.getInstance()
export default grpcClient
