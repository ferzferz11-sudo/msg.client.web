// ============================================
// gRPC-web Client — Real Backend Integration
// ============================================
// Uses @connectrpc/connect-web for gRPC-web transport.
// Works through Envoy/Nginx proxy (grpc-web filter).
//
// Environment:
//   VITE_API_URL — backend URL (default: http://localhost:8080)
//   VITE_VAPID_PUBLIC_KEY — VAPID key for Web Push
//
// Generated code from proto/messenger.proto:
//   npm run proto:generate  (runs buf generate)
//
// The generated services are in src/gen/ and provide
// type-safe clients for ChatService and PushService.
// ============================================

/// <reference types="vite/client" />

import { createPromiseClient, type PromiseClient, type Transport } from '@connectrpc/connect'
import { createGrpcWebTransport } from '@connectrpc/connect-web'
import type { Chat, Message, StreamCallback } from '@/shared/types'

// Import generated services (will exist after buf generate)
// For now, we use the placeholder in src/gen/messenger_connect.ts
import { ChatService, PushService } from '@/gen'

// --- Singleton ---

class GrpcClient {
  private static instance: GrpcClient
  private transport: Transport | null = null
  private chatClient: PromiseClient<typeof ChatService> | null = null
  private pushClient: PromiseClient<typeof PushService> | null = null
  private connected: boolean = false
  private activeStreams: Map<string, AbortController> = new Map()

  private constructor() {}

  static getInstance(): GrpcClient {
    if (!GrpcClient.instance) {
      GrpcClient.instance = new GrpcClient()
    }
    return GrpcClient.instance
  }

  // --- Connection ---

  connect(address?: string): Promise<void> {
    const baseUrl = address
      || import.meta.env.VITE_API_URL
      || 'http://localhost:8080'

    this.transport = createGrpcWebTransport({
      baseUrl,
      // Credentials for CORS
      credentials: 'include',
    })

    // Create typed clients from generated service definitions
    this.chatClient = createPromiseClient(ChatService as any, this.transport)
    this.pushClient = createPromiseClient(PushService as any, this.transport)

    this.connected = true
    return Promise.resolve()
  }

  disconnect(): void {
    this.connected = false
    this.activeStreams.forEach((controller) => controller.abort())
    this.activeStreams.clear()
    this.chatClient = null
    this.pushClient = null
    this.transport = null
  }

  isConnected(): boolean {
    return this.connected
  }

  // --- Unary calls ---

  async getChats(userId: string): Promise<Chat[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await (this.chatClient as any).getChats({ userId })
    return response.chats.map(protoToChat)
  }

  async getMessages(chatId: string, limit = 50, beforeId?: string): Promise<{ messages: Message[]; hasMore: boolean }> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await (this.chatClient as any).getMessages({ chatId, limit, beforeId })
    return {
      messages: response.messages.map(protoToMessage),
      hasMore: response.hasMore,
    }
  }

  async sendMessage(chatId: string, content: string, senderId: string, replyToId?: string): Promise<Message> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await (this.chatClient as any).sendMessage({ chatId, content, senderId, replyToId })
    return protoToMessage(response.message!)
  }

  async createChat(participants: string[], name?: string, type: string = 'regular'): Promise<Chat> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await (this.chatClient as any).createChat({ participants, name, type })
    return protoToChat(response.chat!)
  }

  async deleteChat(chatId: string, userId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await (this.chatClient as any).deleteChat({ chatId, userId })
    return response.success
  }

  async getMissingMessages(chatId: string, since: string): Promise<Message[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await (this.chatClient as any).getMissingMessages({ chatId, since })
    return response.messages.map(protoToMessage)
  }

  // --- Server-Side Streaming ---

  streamChatMessages(chatId: string, callback: StreamCallback): () => void {
    const streamId = `stream-${chatId}-${Date.now()}`
    const controller = new AbortController()
    this.activeStreams.set(streamId, controller)
    const signal = controller.signal

    // Use the streaming RPC from generated client
    const stream = (this.chatClient as any).subscribeChat(
      { chatId, userId: 'user-1' },
      { signal }
    )

    // Process the stream
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

  // --- Push Notifications ---

  async registerPushToken(params: {
    endpoint: string
    p256dh: string
    auth: string
    platform: string
    userAgent: string
  }): Promise<{ success: boolean }> {
    if (!this.pushClient) throw new Error('Not connected')
    const response = await (this.pushClient as any).registerPushToken({
      userId: 'user-1',
      endpoint: params.endpoint,
      p256dh: params.p256dh,
      auth: params.auth,
      platform: params.platform,
      userAgent: params.userAgent,
    })
    return { success: response.success }
  }

  async unregisterPushToken(endpoint: string): Promise<boolean> {
    if (!this.pushClient) throw new Error('Not connected')
    const response = await (this.pushClient as any).unregisterPushToken({ endpoint })
    return response.success
  }
}

// --- Proto → TypeScript converters ---

function protoToChat(chat: any): Chat {
  return {
    id: chat.id,
    name: chat.name,
    type: chat.type as Chat['type'],
    creatorId: chat.creatorId,
    participants: chat.participants,
    lastMessageText: chat.lastMessageText,
    lastMessageTime: chat.lastMessageTime,
    unreadCount: chat.unreadCount,
    avatarUrl: chat.avatarUrl,
    isOnline: chat.isOnline,
    activeAgentId: chat.activeAgentId,
    agentMode: chat.agentMode as Chat['agentMode'],
  }
}

function protoToMessage(msg: any): Message {
  return {
    id: msg.id,
    chatId: msg.chatId,
    senderId: msg.senderId,
    senderName: msg.senderName,
    content: msg.content,
    createdAt: msg.createdAt,
    isOutgoing: msg.isOutgoing,
    isRead: msg.isRead,
    replyToId: msg.replyToId,
    agentId: msg.agentId,
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

// Export singleton
export const grpcClient = GrpcClient.getInstance()
export default grpcClient
