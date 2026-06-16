// ============================================
// gRPC-web Client — Real Backend + Auth Interceptor (V2)
// ============================================
// Features:
// - JWT auth with auto-refresh
// - Exponential backoff retry (3 attempts)
// - Error classification (network/auth/rate-limit/server)
// - Error store integration
// - BiDi Chat streaming (auth via first message JWT)
// ============================================

/// <reference types="vite/client" />

import { createClient, type Transport } from '@connectrpc/connect'
import { createGrpcWebTransport } from '@connectrpc/connect-web'
import type { Chat, Message, StreamCallback, User, TokenPair, DeviceInfo } from '@/shared/types'
import { useAuthStore } from '@/store/authStore'
import { useErrorStore } from '@/store/errorStore'
import { AuthService, ChatService, ProfileService } from './gen/proto/messenger_connect'

// --- Device Info ---

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
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
      if (!isRetryableError(err)) throw err
      if (attempt === maxRetries) throw err
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

function handleChatMessage(msg: any, callback: StreamCallback): void {
  if (!msg || !msg.user) return
  const text = msg.text || ''
  if (
    text.startsWith('SERVER_INFO:') ||
    text === 'AUTH_FAILED' ||
    text.startsWith('DEPRECATED:') ||
    text === 'SET_SUPER_ADMIN' ||
    text.startsWith('CLEAR_CACHE:') ||
    text.startsWith('CHAT_DELETED:') ||
    text === 'REGISTRATION_SUCCESS' ||
    text === 'USER_NOT_FOUND'
  ) {
    return
  }
  callback({ type: 'message', message: protoToMessage(msg) })
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

// --- Singleton ---

class GrpcClient {
  private static instance: GrpcClient
  private transport: Transport | null = null
  private authClient: any = null
  private chatClient: any = null
  private profileClient: any = null
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
    this.profileClient = createClient(ProfileService as any, this.transport)
    authClientRef.current = this.authClient
    this.connected = true

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
    this.profileClient = null
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
          clientVersion: 'web-0.4.0',
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
      { maxRetries: 2, baseDelay: 1000 },
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
          clientVersion: 'web-0.4.0',
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
      { maxRetries: 2, baseDelay: 1000 },
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

  // --- ProfileService V2 Methods (JWT auth) ---

  async getProfile(): Promise<User & { bio: string; status: string; locale: string; isSuperAdmin: boolean }> {
    if (!this.profileClient) throw new Error('Not connected')
    const result = await this.profileClient.getProfile({})
    return {
      id: result.userId || '',
      username: result.username || '',
      email: result.email || '',
      avatarUrl: result.avatarUrl || '',
      bio: result.bio || '',
      status: result.status || '',
      locale: result.locale || 'ru',
      isSuperAdmin: result.isSuperAdmin || false,
      createdAt: result.createdAt || '',
      lastSeenAt: result.lastSeenAt || '',
    }
  }

  async updateProfile(updates: { username?: string; bio?: string; status?: string; locale?: string }): Promise<boolean> {
    if (!this.profileClient) throw new Error('Not connected')
    const result = await this.profileClient.updateProfile({
      username: updates.username || '',
      bio: updates.bio || '',
      status: updates.status || '',
      locale: updates.locale || '',
    })
    return result.success ?? false
  }

  async updateAvatar(avatarUrl: string, fullAvatarUrl?: string): Promise<boolean> {
    if (!this.profileClient) throw new Error('Not connected')
    const result = await this.profileClient.updateAvatar({ avatarUrl, fullAvatarUrl: fullAvatarUrl || '' })
    return result.success ?? false
  }

  async getUserSettings(): Promise<{ locale: string; themeId: string; pushEnabled: boolean }> {
    if (!this.profileClient) throw new Error('Not connected')
    const result = await this.profileClient.getUserSettings({})
    return {
      locale: result.locale || 'ru',
      themeId: result.themeId || '',
      pushEnabled: result.pushEnabled ?? true,
    }
  }

  async updateUserSettings(settings: { locale?: string; themeId?: string; pushEnabled?: boolean }): Promise<boolean> {
    if (!this.profileClient) throw new Error('Not connected')
    const result = await this.profileClient.updateUserSettings({
      locale: settings.locale || '',
      themeId: settings.themeId || '',
      pushEnabled: settings.pushEnabled ?? true,
    })
    return result.success ?? false
  }

  // --- Chat Methods ---

  async getChats(userId: string, username?: string): Promise<Chat[]> {
    if (!this.chatClient) throw new Error('Not connected')
    return withRetry(
      async () => {
        const response = await this.chatClient.getChats({ userId, username: username || '' })
        return (response.chats || []).map(protoToChat)
      },
      { maxRetries: 3, baseDelay: 500 },
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

  // --- BiDi Chat Stream (receive-only) ---
  // Opens a Chat stream, sends JWT auth in the first message,
  // then listens for broadcast messages from the server.

  openReceiveStream(roomId: string, callback: StreamCallback): () => void {
    const streamId = `recv-${roomId}`
    const controller = new AbortController()
    const signal = controller.signal

    const existing = this.activeStreams.get(streamId)
    if (existing) {
      existing.abort()
      this.activeStreams.delete(streamId)
    }
    this.activeStreams.set(streamId, controller)

    const tokens = this._getTokens?.()
    const jwtToken = tokens?.accessToken || ''

    let authSent = false
    const sendQueue: any[] = []
    let sendResolve: ((value: IteratorResult<any>) => void) | null = null

    const inputStream = {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<any>> {
            if (sendQueue.length > 0) {
              return Promise.resolve({ value: sendQueue.shift()!, done: false })
            }
            if (!authSent && jwtToken) {
              authSent = true
              return Promise.resolve({ value: { jwtToken, roomId }, done: false })
            }
            // Keep stream open, waiting for close
            return new Promise<IteratorResult<any>>((resolve) => {
              sendResolve = resolve
            })
          },
        }
      },
    }

    const stream = this.chatClient.chat(inputStream, { signal })

    ;(async () => {
      try {
        for await (const msg of stream) {
          if (signal.aborted) break
          handleChatMessage(msg, callback)
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
      if (sendResolve) {
        const resolve = sendResolve
        sendResolve = null
        resolve({ value: undefined as any, done: true })
      }
    }
  }

  // --- Send Message via ephemeral BiDi stream ---
  // Opens a new Chat stream, sends auth + message, waits for the echoed response, then closes.

  async sendMessage(roomId: string, content: string, userId: string): Promise<Message> {
    if (!this.chatClient) throw new Error('Not connected')

    return withRetry(
      async () => {
        const tokens = this._getTokens?.()
        const jwtToken = tokens?.accessToken || ''

        const sendQueue: any[] = []

        const inputStream = {
          [Symbol.asyncIterator]() {
            return {
              next(): Promise<IteratorResult<any>> {
                if (sendQueue.length > 0) {
                  return Promise.resolve({ value: sendQueue.shift()!, done: false })
                }
                // No more items — keep waiting (stream stays open until abort)
                return new Promise<IteratorResult<any>>(() => {})
              },
            }
          },
        }

        const controller = new AbortController()
        const stream = this.chatClient.chat(inputStream, { signal: controller.signal })

        // Push auth message — the stream's next() will pick it up
        sendQueue.push({ jwtToken, roomId })

        // Push the actual message
        const localId = `local-${Date.now()}`
        sendQueue.push({ roomId, text: content, userId, id: localId })

        // Wait for the echoed message from server
        let savedMessage: Message | null = null

        try {
          for await (const msg of stream) {
            if (controller.signal.aborted) break
            const text = msg.text || ''
            if (
              !text ||
              text.startsWith('SERVER_INFO:') ||
              text === 'AUTH_FAILED' ||
              text.startsWith('DEPRECATED:') ||
              text === 'SET_SUPER_ADMIN' ||
              text.startsWith('CLEAR_CACHE:') ||
              text.startsWith('CHAT_DELETED:')
            ) {
              continue
            }
            savedMessage = { ...protoToMessage(msg), isOutgoing: true }
            break
          }
        } finally {
          controller.abort()
        }

        if (!savedMessage) {
          throw new Error('Не удалось отправить сообщение')
        }
        return savedMessage
      },
      { maxRetries: 2, baseDelay: 300 },
    )
  }
}

export const grpcClient = GrpcClient.getInstance()
export default grpcClient
