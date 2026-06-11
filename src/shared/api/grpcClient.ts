// ============================================
// gRPC-web Client — Real Backend Integration
// ============================================
// Uses @connectrpc/connect-web for gRPC-web transport.
// Works through Envoy/Nginx proxy (grpc-web filter).
//
// Environment:
//   VITE_API_URL — backend URL (default: http://localhost:8080)
//
// Real proto: proto/messenger.proto (copied from /root/msg/messenger.proto)
// Services: ChatService (all methods), ServerService
// ============================================

/// <reference types="vite/client" />

import { createClient, type Transport } from '@connectrpc/connect'
import { createGrpcWebTransport } from '@connectrpc/connect-web'
import type { Chat, Message, StreamCallback } from '@/shared/types'

// Import generated service definitions
import { ChatService } from './gen/messenger_pb'

// --- Singleton ---

class GrpcClient {
  private static instance: GrpcClient
  private transport: Transport | null = null
  private chatClient: any = null
  private connected: boolean = false
  private activeStreams: Map<string, AbortController> = new Map()

  private constructor() {}

  static getInstance(): GrpcClient {
    if (!GrpcClient.instance) {
      GrpcClient.instance = new GrpcClient()
    }
    return GrpcClient.instance
  }

  connect(address?: string): Promise<void> {
    const baseUrl = address
      || import.meta.env.VITE_API_URL
      || 'http://localhost:8080'

    this.transport = createGrpcWebTransport({ baseUrl })
    this.chatClient = createClient(ChatService as any, this.transport)
    this.connected = true
    return Promise.resolve()
  }

  // --- Authentication ---

  async startChat(
    username: string,
    password: string,
    joinMessage = '',
    register = false,
    email = '',
    deviceId = '',
    deviceName = ''
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    if (!this.chatClient) throw new Error('Not connected')
    try {
      const response = await (this.chatClient as any).startChat({
        user: username,
        password,
        joinMessage,
        register,
        email,
        deviceId,
        deviceName,
      })
      return { success: true, userId: response.userId }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  }

  async login(
    username: string,
    password: string,
    register = false,
    email = ''
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    return this.startChat(username, password, '', register, email, 'web-device', 'Web Browser')
  }

  disconnect(): void {
    this.connected = false
    this.activeStreams.forEach((controller) => controller.abort())
    this.activeStreams.clear()
    this.chatClient = null
    this.transport = null
  }

  isConnected(): boolean {
    return this.connected
  }

  // --- Unary calls ---

  async getChats(userId: string): Promise<Chat[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await this.chatClient.getChats({ userId })
    return (response.chats || []).map(protoToChat)
  }

  async getHistory(chatId: string, limit = 50): Promise<{ messages: Message[]; hasMore: boolean }> {
    if (!this.chatClient) throw new Error('Not connected')
    const response = await this.chatClient.getHistory({ room: chatId, limit })
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
      type: 'regular' as string,
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
      type: 'group' as string,
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

  streamChatMessages(chatId: string, callback: StreamCallback): () => void {
    const streamId = `stream-${chatId}-${Date.now()}`
    const controller = new AbortController()
    this.activeStreams.set(streamId, controller)
    const signal = controller.signal

    const stream = this.chatClient.chat({ roomId: chatId }, { signal })

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
    chatId: msg.roomId || '',
    senderId: msg.user || msg.userId || '',
    senderName: msg.user || '',
    content: msg.text || '',
    createdAt: msg.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    isOutgoing: msg.userId === 'user-1',
    isRead: msg.isRead || false,
    replyToId: msg.repliedToMessageId || '',
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
