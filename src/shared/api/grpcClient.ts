// ============================================
// gRPC-web Client — Real Backend + Auth Interceptor (V2)
// ============================================
// Features:
// - JWT auth with auto-refresh
// - Exponential backoff retry (3 attempts)
// - Error classification (network/auth/rate-limit/server)
// - Error store integration
// ============================================

/// <reference types="vite/client" />

import { createClient, type Transport } from '@connectrpc/connect'
import { createGrpcWebTransport } from '@connectrpc/connect-web'
import type { Chat, Message, StreamCallback, User, TokenPair, DeviceInfo } from '@/shared/types'
import { useAuthStore } from '@/store/authStore'
import { useErrorStore } from '@/store/errorStore'
import { AuthService, ChatService } from './gen/proto/messenger_connect'

// --- Device Info ---

function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getDeviceInfo(): DeviceInfo {
  let deviceId = localStorage.getItem('device_id')
  if (!deviceId) {
    deviceId = generateUUID()
    localStorage.setItem('device_id', deviceId)
  }
  return {
    deviceId,
    deviceName: navigator.userAgent || 'Web Browser',
    deviceType: 'web',
  }
}

// --- Error Classification ---

type ErrorType = 'network' | 'auth' | 'rate_limit' | 'server' | 'unknown'

function classifyError(err: any): ErrorType {
  const msg = String(err?.message || err || '').toLowerCase()
  const code = err?.code

  // gRPC status codes: UNAUTHENTICATED=14, PERMISSION_DENIED=7, UNAVAILABLE=14
  if (code === 'UNAUTHENTICATED' || code === 14 || msg.includes('unauthenticated') || msg.includes('unauthorized')) {
    return 'auth'
  }
  if (code === 'PERMISSION_DENIED' || code === 7 || msg.includes('permission denied')) {
    return 'auth'
  }
  if (code === 'RESOURCE_EXHAUSTED' || code === 8 || msg.includes('rate limit') || msg.includes('resource exhausted')) {
    return 'rate_limit'
  }
  if (code === 'UNAVAILABLE' || msg.includes('unavailable') || msg.includes('connection') || msg.includes('network') || msg.includes('failed to fetch') || msg.includes('econnrefused')) {
    return 'network'
  }
  if (code === 'INTERNAL' || code === 13 || msg.includes('internal')) {
    return 'server'
  }
  return 'unknown'
}

function isRetryableError(err: any): boolean {
  const type = classifyError(err)
  return type === 'network' || type === 'server' || type === 'unknown'
}

// --- Retry with Exponential Backoff ---

async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; onRetry?: (attempt: number, err: any) => void } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, onRetry } = options
  let lastErr: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err

      // Don't retry auth errors
      if (!isRetryableError(err)) {
        throw err
      }

      // Last attempt — don't retry
      if (attempt === maxRetries) {
        throw err
      }

      const delay = baseDelay * Math.pow(2, attempt)
      onRetry?.(attempt + 1, err)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastErr
}

// --- Auth Interceptor (V2 — with auto-refresh) ---

function createAuthInterceptor(
  getTokens: () => TokenPair | null,
  authClientRef: { current: any },
) {
  return (next: any) => async (req: any) => {
    const tokens = getTokens()
    if (tokens) {
      const now = Math.floor(Date.now() / 1000)
      // Refresh if access token expires within 5 minutes
      if (now >= tokens.accessExpiresAt - 300) {
        try {
          const client = authClientRef.current
          if (client) {
            const result = await client.refreshToken({ refreshToken: tokens.refreshToken })
            const newTokens: TokenPair = {
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              accessExpiresAt: Number(result.accessExpiresAt),
              refreshExpiresAt: Number(result.refreshExpiresAt),
            }
            useAuthStore.getState().updateAccessToken(newTokens)
            req.header.set('Authorization', `Bearer ${newTokens.accessToken}`)
          }
        } catch {
          // Refresh failed — force logout
          useAuthStore.getState().logout()
          useErrorStore.getState().addError({
            message: 'Сессия истекла. Войдите снова.',
            type: 'auth',
          })
        }
      } else {
        req.header.set('Authorization', `Bearer ${tokens.accessToken}`)
      }
    }
    return next(req)
  }
}

// --- Singleton ---

class GrpcClient {
  private static instance: GrpcClient
  private transport: Transport | null = null
  private authClient: any = null
  private chatClient: any = null
  private connected: boolean = false
  private activeStreams: Map<string, AbortController> = new Map()
  private _getTokens: (() => TokenPair | null) | null = null

  private constructor() {}

  static getInstance(): GrpcClient {
    if (!GrpcClient.instance) {
      GrpcClient.instance = new GrpcClient()
    }
    return GrpcClient.instance
  }

  connect(address?: string, getTokens?: () => TokenPair | null): Promise<void> {
    const baseUrl = address
      || import.meta.env.VITE_API_URL
      || '/messenger'

    this._getTokens = getTokens || null

    const authClientRef = { current: null as any }
    const interceptor = createAuthInterceptor(
      () => this._getTokens?.() || null,
      authClientRef,
    )
    this.transport = createGrpcWebTransport({
      baseUrl,
      interceptors: [interceptor],
    })

    this.authClient = createClient(AuthService as any, this.transport)
    this.chatClient = createClient(ChatService as any, this.transport)
    authClientRef.current = this.authClient

    this.connected = true

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
    }

    return Promise.resolve()
  }

  private handleOnline = () => {
    useErrorStore.getState().setOffline(false)
  }

  private handleOffline = () => {
    useErrorStore.getState().setOffline(true)
    useErrorStore.getState().addError({
      message: 'Нет подключения к интернету',
      type: 'network',
    })
  }

  disconnect(): void {
    this.connected = false
    this.activeStreams.forEach((controller) => controller.abort())
    this.activeStreams.clear()
    this.authClient = null
    this.chatClient = null
    this.transport = null

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  // --- Auth V2 Methods ---

  async signInV2(username: string, password: string): Promise<{
    success: boolean
    message: string
    accessToken: string
    refreshToken: string
    accessExpiresAt: number
    refreshExpiresAt: number
    user: User
  }> {
    if (!this.authClient) throw new Error('Not connected')
    const deviceInfo = getDeviceInfo()

    return withRetry(
      async () => {
        const result = await this.authClient.signInV2({
          username,
          password,
          device: {
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            deviceType: deviceInfo.deviceType,
          },
          clientVersion: 'web-0.3.0',
        })
        if (!result || !result.success) {
          throw new Error(result?.message || 'Ошибка авторизации')
        }
        return {
          success: true,
          message: result.message ?? '',
          accessToken: result.accessToken ?? '',
          refreshToken: result.refreshToken ?? '',
          accessExpiresAt: Number(result.accessExpiresAt ?? 0),
          refreshExpiresAt: Number(result.refreshExpiresAt ?? 0),
          user: result.user ? protoToUser(result.user) : { id: '', username, email: '', avatarUrl: '', bio: '', status: '', createdAt: '', lastSeenAt: '' },
        }
      },
      {
        maxRetries: 2,
        baseDelay: 1000,
        onRetry: (attempt, err) => {
          console.warn(`SignInV2 retry ${attempt}:`, err)
        },
      },
    )
  }

  async signUpV2(username: string, password: string, email: string): Promise<{
    success: boolean
    message: string
    accessToken: string
    refreshToken: string
    accessExpiresAt: number
    refreshExpiresAt: number
    user: User
  }> {
    if (!this.authClient) throw new Error('Not connected')
    const deviceInfo = getDeviceInfo()

    return withRetry(
      async () => {
        const result = await this.authClient.signUpV2({
          username,
          password,
          email,
          device: {
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            deviceType: deviceInfo.deviceType,
          },
          clientVersion: 'web-0.3.0',
        })
        if (!result || !result.success) {
          throw new Error(result?.message || 'Ошибка регистрации')
        }
        return {
          success: true,
          message: result.message ?? '',
          accessToken: result.accessToken ?? '',
          refreshToken: result.refreshToken ?? '',
          accessExpiresAt: Number(result.accessExpiresAt ?? 0),
          refreshExpiresAt: Number(result.refreshExpiresAt ?? 0),
          user: result.user ? protoToUser(result.user) : { id: '', username, email, avatarUrl: '', bio: '', status: '', createdAt: '', lastSeenAt: '' },
        }
      },
      {
        maxRetries: 2,
        baseDelay: 1000,
        onRetry: (attempt, err) => {
          console.warn(`SignUpV2 retry ${attempt}:`, err)
        },
      },
    )
  }

  async signOut(allDevices = false): Promise<boolean> {
    if (!this.authClient) return false
    try {
      const tokens = this._getTokens?.()
      const result = await this.authClient.signOut({
        refreshToken: tokens?.refreshToken || '',
        allDevices,
      })
      return result.success ?? false
    } finally {
      this.disconnect()
    }
  }

  async revokeDevice(deviceId: string): Promise<boolean> {
    if (!this.authClient) return false
    const result = await this.authClient.revokeDevice({ deviceId })
    return result.success ?? false
  }

  // --- Chat Methods (with retry) ---

  async getChats(userId: string, username?: string): Promise<Chat[]> {
    if (!this.chatClient) throw new Error('Not connected')
    return withRetry(
      async () => {
        const response = await this.chatClient.getChats({ userId, username: username || '' })
        return (response.chats || []).map(protoToChat)
      },
      {
        maxRetries: 3,
        baseDelay: 500,
        onRetry: (attempt, err) => {
          const type = classifyError(err)
          if (type === 'network') {
            useErrorStore.getState().addError({
              message: `Повторное подключение (${attempt}/3)...`,
              type: 'network',
            })
          }
        },
      },
    )
  }

  async getHistory(roomId: string, limit = 50): Promise<{ messages: Message[]; hasMore: boolean }> {
    if (!this.chatClient) throw new Error('Not connected')
    return withRetry(
      async () => {
        const response = await this.chatClient.getHistory({ room: roomId, limit })
        const messages = (response.messages || []).map(protoToMessage)
        return { messages, hasMore: messages.length === limit }
      },
      { maxRetries: 2, baseDelay: 500 },
    )
  }

  async sendMessage(roomId: string, content: string, userId: string): Promise<Message> {
    if (!this.chatClient) throw new Error('Not connected')
    return withRetry(
      async () => {
        const response = await this.chatClient.chat({ roomId, text: content, userId })
        return protoToMessage(response)
      },
      { maxRetries: 2, baseDelay: 300 },
    )
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
          const type = classifyError(err)
          useErrorStore.getState().addError({
            message: type === 'network' ? 'Потеряно соединение с сервером' : `Ошибка: ${err}`,
            type,
          })
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

export function protoToUser(u: any): User {
  return {
    id: u.id?.toString() || '',
    username: u.username?.toString() || '',
    email: u.email?.toString() || '',
    avatarUrl: u.avatarUrl?.toString() || u.avatar_url?.toString() || '',
    bio: u.bio?.toString() || '',
    status: u.status?.toString() || '',
    createdAt: u.createdAt?.toDate?.()?.toISOString() || '',
    lastSeenAt: u.lastSeenAt?.toDate?.()?.toISOString() || u.last_seen_at?.toDate?.()?.toISOString() || '',
  }
}

export const grpcClient = GrpcClient.getInstance()
export default grpcClient
