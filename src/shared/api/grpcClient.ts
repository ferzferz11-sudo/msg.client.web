// ============================================
// gRPC-web Client — Real Backend + Auth Interceptor (V2)
// ============================================
// Features:
// - JWT auth with auto-refresh
// - Exponential backoff retry (3 attempts)
// - Error classification (network/auth/rate-limit/server)
// - Error store integration
// - ChatV2 bidirectional streaming
// ============================================

/// <reference types="vite/client" />

import { createClient, type Transport } from '@connectrpc/connect'
import { createGrpcWebTransport } from '@connectrpc/connect-web'
import { SendMessageV2Request } from './gen/proto/messenger_pb'
import type {
  Chat,
  Message,
  StreamCallback,
  User,
  TokenPair,
  DeviceInfo,
  Draft,
  CustomTheme,
  UserProfile,
  AgentInfoV2,
  ToolInfoV2,
  AgentReviewInfo,
  UsageStatInfo,
  ServerNotification,
  FreeModelInfo,
  AIMessage,
  AIToolResult,
  AIChatSettings,
} from '@/shared/types'
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

let isRefreshing = false
let refreshFailedAt = 0
let permanentFail = false

function createAuthInterceptor(
  getTokens: () => TokenPair | null,
  authClientRef: { current: any },
) {
  return (next: any) => async (req: any) => {
    const tokens = getTokens()

    if (permanentFail) {
      throw new Error('Session expired. Please sign in again.')
    }

    // Always attach token (even during refresh — prevents empty-auth requests)
    if (tokens) {
      const now = Math.floor(Date.now() / 1000)
      const isExpired = now >= tokens.accessExpiresAt

      // Skip refresh if: not expired, already refreshing, or recently failed (30s cooldown)
      if (isExpired && !isRefreshing && (now - refreshFailedAt > 30)) {
        isRefreshing = true
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
            return next(req)
          }
        } catch (err: any) {
          console.warn('[Auth] Token refresh failed:', err)
          const isPermanent = err?.code === 'UNAUTHENTICATED' ||
            err?.message?.includes('invalid_token') ||
            err?.message?.includes('token expired') ||
            err?.message?.includes('refresh token')
          if (isPermanent) {
            console.warn('[Auth] Permanent refresh failure — logging out')
            permanentFail = true
            useAuthStore.getState().logout()
            window.location.reload()
            throw new Error('Session expired. Please sign in again.')
          }
          refreshFailedAt = Math.floor(Date.now() / 1000)
        } finally {
          isRefreshing = false
        }
      }

      // Re-read fresh tokens from store (may have been refreshed by another request)
      const latestTokens = getTokens()
      req.header.set('Authorization', `Bearer ${latestTokens?.accessToken || tokens.accessToken}`)
    }
    return next(req)
  }
}

// --- Proto → TypeScript converters ---

function protoToChat(chat: any): Chat {
  let name = chat.name || ''
  const chatType = chat.type || 'regular'
  if (chatType === 'direct' && name.includes(' & ')) {
    const me = useAuthStore.getState().user?.username || ''
    const parts = name.split(' & ')
    if (parts.length === 2) {
      name = parts[0] === me ? parts[1] : parts[0]
    }
  }
  return {
    id: chat.id || '',
    name,
    type: chatType,
    creatorId: chat.creator || '',
    participants: chat.participants || '[]',
    lastMessageText: chat.lastMessageText || '',
    lastMessageTime: chat.lastMessageTime?.toDate?.()?.toISOString() || new Date().toISOString(),
    unreadCount: chat.unreadCount || 0,
    avatarUrl: chat.avatarUrl || '',
    isOnline: chat.isOnline || false,
    activeAgentId: chat.activeAgentId || '',
    agentMode: chat.agentMode || 'single',
    isPinned: chat.isPinned || false,
    isMuted: chat.isMuted || false,
    isArchived: chat.isArchived || false,
    pinnedAt: chat.pinnedAt ? Number(chat.pinnedAt) : 0,
    fullAvatarUrl: chat.fullAvatarUrl || '',
    lastMessageUsername: chat.lastMessageUsername || '',
    lastMessageHasImage: chat.lastMessageHasImage || false,
    allowMembersToAdd: chat.allowMembersToAdd || false,
    isSecret: chat.isSecret || false,
    e2eeReady: chat.e2eeReady || false,
  }
}

function protoToMessageV2(msg: any, outgoing = false, userMap?: Record<string, string>): Message {
  let text = ''
  let imageUrl = ''
  let imageUrls: string[] = []
  let fileUrl = ''
  let voiceUrl = ''
  let duration = 0
  let replyToId = ''
  let replyToPreview = ''

  const contentCase = msg.content?.$case || msg.content?.case
  if (contentCase === 'text') {
    text = msg.content.value || ''
  } else if (contentCase === 'media') {
    const media = msg.content.value
    if (media.type === 'image') {
      imageUrl = media.url || ''
      imageUrls = media.urls || []
    } else if (media.type === 'voice') {
      voiceUrl = media.url || ''
      duration = media.duration || 0
    } else if (media.type === 'file') {
      fileUrl = media.url || ''
      text = media.url?.split('/').pop() || 'Файл'
    }
  } else if (contentCase === 'reply') {
    replyToId = msg.content.value.messageId || ''
    replyToPreview = msg.content.value.preview || ''
  }

  if (!text && !imageUrl && !voiceUrl && !fileUrl) {
    text = msg.text || ''
    imageUrl = msg.imageUrl || ''
    imageUrls = msg.imageUrls || []
    fileUrl = msg.fileUrl || ''
    voiceUrl = msg.voiceUrl || ''
    duration = msg.duration || 0
  }

  let reactions: Record<string, string[]> = {}
  if (msg.reactions && msg.reactions.length > 0) {
    try {
      const decoded = new TextDecoder().decode(msg.reactions)
      const parsed = JSON.parse(decoded)
      for (const [userId, emoji] of Object.entries(parsed)) {
        if (!reactions[emoji as string]) reactions[emoji as string] = []
        reactions[emoji as string].push(userId)
      }
    } catch {}
  }

  const senderId = msg.senderId || ''
  const username = userMap?.[senderId] || ''

  return {
    id: msg.id || '',
    roomId: msg.roomId || '',
    user: username,
    text,
    createdAt: msg.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    isOutgoing: outgoing,
    isRead: msg.isRead || false,
    repliedToMessageId: replyToId,
    repliedToUser: '',
    repliedToText: replyToPreview,
    reactions,
    isEdited: msg.edited || false,
    imageUrl,
    imageUrls,
    fileUrl,
    userId: senderId,
    voiceUrl,
    duration,
  }
}

function handleChatV2Message(v2Msg: any, callback: StreamCallback): void {
  const payload = v2Msg.payload
  if (!payload) return

  const payloadCase = payload.$case || payload.case

  if (payloadCase === 'system' || payload.system) {
    const sys = payload.value || payload.system
    if (sys.type === 'SERVER_SHUTTINGDOWN') {
      callback({ type: 'error', error: 'SERVER_SHUTTINGDOWN' })
      return
    }
    if (sys.type === 'AUTH_FAILED') {
      callback({ type: 'error', error: 'AUTH_FAILED' })
      return
    }
    return
  }

  if (payloadCase === 'typing' || payload.typing) {
    const typing = payload.value || payload.typing
    callback({ type: 'typing', chatId: v2Msg.roomId || '', userId: v2Msg.senderId || '', isTyping: typing.isTyping })
    return
  }

  if (payloadCase === 'message' || payload.message) {
    const msg = payload.value || payload.message
    callback({ type: 'message', message: protoToMessageV2(msg) })
  }
}

function protoToAgentInfoV2(a: any): AgentInfoV2 {
  return {
    id: a.id || '',
    name: a.name || '',
    description: a.description || '',
    providerType: a.providerType || a.provider_type || '',
    model: a.model || '',
    systemPrompt: a.systemPrompt || a.system_prompt || '',
    toolsEnabled: a.toolsEnabled || a.tools_enabled || false,
    ragEnabled: a.ragEnabled || a.rag_enabled || false,
    isPreset: a.isPreset || a.is_preset || false,
    isPublic: a.isPublic || a.is_public || false,
    maxTokens: a.maxTokens || a.max_tokens || 0,
    temperature: a.temperature || 0,
    createdBy: a.createdBy || a.created_by || '',
    capabilities: a.capabilities || { supportsImages: false, supportsTools: false, supportsStreaming: false, maxTokens: 0 },
    installCount: a.installCount || a.install_count || 0,
    avgRating: a.avgRating || a.avg_rating || 0,
    reviewCount: a.reviewCount || a.review_count || 0,
    tags: a.tags || [],
    originalAgentId: a.originalAgentId || a.original_agent_id || '',
    version: a.version || '',
    shareCode: a.shareCode || a.share_code || '',
    emoji: a.emoji || '',
  }
}

function protoToNotification(n: any): ServerNotification {
  return {
    id: n.id || '',
    type: n.type || '',
    title: n.title || '',
    message: n.message || '',
    timestamp: n.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
    metadata: n.metadata || {},
    isRead: n.isRead || n.is_read || false,
  }
}

function protoToFreeModel(m: any): FreeModelInfo {
  return {
    modelId: m.modelId || m.model_id || '',
    displayName: m.displayName || m.display_name || '',
    sortOrder: m.sortOrder || m.sort_order || 0,
  }
}

function protoToReview(r: any): AgentReviewInfo {
  return {
    id: r.id || '',
    agentId: r.agentId || r.agent_id || '',
    userId: r.userId || r.user_id || '',
    username: r.username || '',
    rating: r.rating || 0,
    review: r.review || '',
    createdAt: r.createdAt?.toDate?.()?.toISOString() || '',
  }
}

function protoToUsageStat(s: any): UsageStatInfo {
  return {
    agentId: s.agentId || s.agent_id || '',
    agentName: s.agentName || s.agent_name || '',
    tokenCount: s.tokenCount || s.token_count || 0,
    requestCount: s.requestCount || s.request_count || 0,
    lastUsed: s.lastUsed?.toDate?.()?.toISOString() || '',
  }
}

function protoToToolInfo(t: any): ToolInfoV2 {
  return {
    name: t.name || '',
    description: t.description || '',
    parametersSchema: t.parametersSchema || t.parameters_schema || '',
    requiredRole: t.requiredRole || t.required_role || '',
  }
}

function protoToDraft(d: any): Draft {
  return {
    text: d.draftText || d.text || '',
    repliedToMessageId: d.repliedToMessageId || '',
    repliedToUser: d.repliedToUser || '',
    repliedToText: d.repliedToText || '',
    hasDraft: (d.draftText || d.text) ? (d.draftText || d.text).length > 0 : false,
  }
}

function protoToTheme(t: any): CustomTheme {
  return {
    id: t.id || '',
    name: t.name || '',
    primaryColor: t.primaryColor || t.primary_color || '',
    onPrimaryColor: t.onPrimaryColor || t.on_primary_color || '',
    surfaceColor: t.surfaceColor || t.surface_color || '',
    onSurfaceColor: t.onSurfaceColor || t.on_surface_color || '',
    backgroundColor: t.backgroundColor || t.background_color || '',
    textPrimaryColor: t.textPrimaryColor || t.text_primary_color || '',
    textSecondaryColor: t.textSecondaryColor || t.text_secondary_color || '',
    isDark: t.isDark || t.is_dark || false,
    chatBackgroundImageUrl: t.chatBackgroundImageUrl || t.chat_background_image_url || '',
    chatListBackgroundImageUrl: t.chatListBackgroundImageUrl || t.chat_list_background_image_url || '',
    bottomPanelColor: t.bottomPanelColor || t.bottom_panel_color || '',
    onBottomPanelColor: t.onBottomPanelColor || t.on_bottom_panel_color || '',
    surfaceContainer: t.surfaceContainer || t.surface_container || '',
    outgoingBubbleColor: t.outgoingBubbleColor || t.outgoing_bubble_color || '',
    incomingBubbleColor: t.incomingBubbleColor || t.incoming_bubble_color || '',
    outgoingTextColor: t.outgoingTextColor || t.outgoing_text_color || '',
    incomingTextColor: t.incomingTextColor || t.incoming_text_color || '',
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

async function compressImage(file: File, maxDim = 1920, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  const ratio = Math.min(maxDim / bitmap.width, maxDim / bitmap.height, 1)
  canvas.width = Math.round(bitmap.width * ratio)
  canvas.height = Math.round(bitmap.height * ratio)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }) : file)
    }, 'image/jpeg', quality)
  })
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
    userId: string
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
            platform: 'web',
          },
        })
        if (!result || !result.success) {
          throw new Error(result?.message || 'Ошибка авторизации')
        }
        return {
          success: true,
          message: result.message ?? '',
          accessToken: result.accessToken ?? result.access_token ?? '',
          refreshToken: result.refreshToken ?? result.refresh_token ?? '',
          accessExpiresAt: Number(result.accessExpiresAt ?? result.access_expires_at ?? 0),
          refreshExpiresAt: Number(result.refreshExpiresAt ?? result.refresh_expires_at ?? 0),
          userId: result.userId ?? result.user_id ?? '',
          user: result.user ? protoToUser(result.user) : { id: result.userId ?? result.user_id ?? '', username, email: '', avatarUrl: '', bio: '', status: '', createdAt: '', lastSeenAt: '' },
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
    userId: string
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
            platform: 'web',
          },
        })
        if (!result || !result.success) {
          throw new Error(result?.message || 'Ошибка регистрации')
        }
        return {
          success: true,
          message: result.message ?? '',
          accessToken: result.accessToken ?? result.access_token ?? '',
          refreshToken: result.refreshToken ?? result.refresh_token ?? '',
          accessExpiresAt: Number(result.accessExpiresAt ?? result.access_expires_at ?? 0),
          refreshExpiresAt: Number(result.refreshExpiresAt ?? result.refresh_expires_at ?? 0),
          userId: result.userId ?? result.user_id ?? '',
          user: result.user ? protoToUser(result.user) : { id: result.userId ?? result.user_id ?? '', username, email, avatarUrl: '', bio: '', status: '', createdAt: '', lastSeenAt: '' },
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

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    if (!this.chatClient) throw new Error('Not connected')
    return withRetry(
      async () => {
        const result = await this.chatClient!.requestPasswordReset({ email })
        return { success: result.success, message: result.message }
      },
      { maxRetries: 2, baseDelay: 1000 },
    )
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (!this.chatClient) throw new Error('Not connected')
    return withRetry(
      async () => {
        const result = await this.chatClient!.resetPassword({ token, newPassword })
        return { success: result.success, message: result.message }
      },
      { maxRetries: 2, baseDelay: 1000 },
    )
  }

  // --- Profile Methods (ProfileService v2 with ChatService fallback) ---

  async getProfile(): Promise<User & { bio: string; status: string; locale: string; isSuperAdmin: boolean; fullAvatarUrl: string }> {
    if (!this.chatClient) throw new Error('Not connected')
    try {
      if (this.profileClient) {
        const result = await this.profileClient.getProfile({})
        return {
          id: result.userId || '',
          username: result.username || '',
          email: result.email || '',
          avatarUrl: result.avatarUrl || '',
          fullAvatarUrl: result.fullAvatarUrl || '',
          bio: result.bio || '',
          status: result.status || '',
          locale: result.locale || 'ru',
          isSuperAdmin: result.isSuperAdmin || false,
          createdAt: result.createdAt || '',
          lastSeenAt: result.lastSeenAt || '',
        }
      }
    } catch (e: any) {
      if (e?.code !== 12 && e?.code !== 14) console.warn('ProfileService.getProfile failed, trying ChatService:', e?.message)
    }
    const result = await this.chatClient.getUserProfile({})
    return {
      id: result.userId || '',
      username: result.username || '',
      email: result.email || '',
      avatarUrl: result.avatarUrl || '',
      fullAvatarUrl: result.fullAvatarUrl || '',
      bio: result.bio || '',
      status: result.status || '',
      locale: 'ru',
      isSuperAdmin: result.isSuperAdmin || false,
      createdAt: result.createdAt || '',
      lastSeenAt: result.lastSeenAt || '',
    }
  }

  async updateProfile(updates: { username?: string; bio?: string; status?: string; locale?: string }): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    try {
      if (this.profileClient) {
        const result = await this.profileClient.updateProfile({
          username: updates.username || '',
          bio: updates.bio || '',
          status: updates.status || '',
          locale: updates.locale || '',
        })
        return result.success ?? false
      }
    } catch (e: any) {
      if (e?.code !== 12 && e?.code !== 14) console.warn('ProfileService.updateProfile failed, trying ChatService:', e?.message)
    }
    const result = await this.chatClient.updateProfile({
      username: updates.username || '',
      bio: updates.bio || '',
      status: updates.status || '',
      email: '',
    })
    return result.success ?? false
  }

  async updateAvatar(avatarUrl: string, fullAvatarUrl?: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    try {
      if (this.profileClient) {
        const result = await this.profileClient.updateAvatar({ avatarUrl, fullAvatarUrl: fullAvatarUrl || '' })
        return result.success ?? false
      }
    } catch (e: any) {
      if (e?.code !== 12 && e?.code !== 14) console.warn('ProfileService.updateAvatar failed, trying ChatService:', e?.message)
    }
    const result = await this.chatClient.updateAvatar({ avatarUrl, avatarFull: fullAvatarUrl || '' })
    return result.success ?? false
  }

  async getUserSettings(): Promise<{ locale: string; themeId: string; pushEnabled: boolean }> {
    if (!this.chatClient) throw new Error('Not connected')
    try {
      if (this.profileClient) {
        const result = await this.profileClient.getUserSettings({})
        return {
          locale: result.locale || 'ru',
          themeId: result.themeId || '',
          pushEnabled: result.pushEnabled ?? true,
        }
      }
    } catch (e: any) {
      console.warn('ProfileService.getUserSettings failed:', e?.message)
    }
    return { locale: 'ru', themeId: '', pushEnabled: true }
  }

  async updateUserSettings(settings: { locale?: string; themeId?: string; pushEnabled?: boolean }): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    try {
      if (this.profileClient) {
        const result = await this.profileClient.updateUserSettings({
          locale: settings.locale || '',
          themeId: settings.themeId || '',
          pushEnabled: settings.pushEnabled ?? true,
        })
        return result.success ?? false
      }
    } catch (e: any) {
      console.warn('ProfileService.updateUserSettings failed:', e?.message)
    }
    return false
  }

  // --- Chat Methods ---

  async getChats(userId: string, username?: string, options?: {
    limit?: number
    cursor?: string
    filter?: 'all' | 'pinned' | 'archived' | 'muted'
  }): Promise<{ chats: Chat[]; nextCursor: string; hasMore: boolean }> {
    if (!this.chatClient) throw new Error('Not connected')
    return withRetry(
      async () => {
        const response = await this.chatClient.getChatsV2({
          userId,
          username: username || '',
          limit: options?.limit ?? 100,
          cursor: options?.cursor ?? '',
          filter: options?.filter ?? 'all',
        })
        return {
          chats: (response.chats || []).map(protoToChat),
          nextCursor: response.nextCursor ?? '',
          hasMore: response.hasMore ?? false,
        }
      },
      { maxRetries: 3, baseDelay: 500 },
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

  // --- Messages V2 Methods ---

  async getHistoryV2(roomId: string, limit = 50, cursor = ''): Promise<{ messages: Message[]; nextCursor: string; hasMore: boolean }> {
    if (!this.chatClient) throw new Error('Not connected')
    return withRetry(
      async () => {
        const response = await this.chatClient.getHistoryV2({ roomId, limit, cursor })
        const v2Messages = (response.messages || []).map((m: any) => protoToMessageV2(m))
        return {
          messages: v2Messages,
          nextCursor: response.nextCursor ?? '',
          hasMore: response.hasMore ?? false,
        }
      },
      { maxRetries: 2, baseDelay: 500 },
    )
  }

  async sendMessageV2(
    roomId: string,
    content: string,
    replyToId?: string,
  ): Promise<Message> {
    if (!this.chatClient) throw new Error('Not connected')
    return withRetry(
      async () => {
        if (!content || !content.trim()) {
          throw new Error('Cannot send empty message')
        }
        const request = new SendMessageV2Request({
          roomId,
          content: { case: 'text', value: content },
        })
        if (replyToId) request.replyToId = replyToId
        const response = await this.chatClient.sendMessageV2(request)
        if (!response.success) throw new Error(response.error || 'Failed to send')
        return protoToMessageV2(response.message, true)
      },
      { maxRetries: 2, baseDelay: 300 },
    )
  }

  async sendMessageV2Media(
    roomId: string,
    media: { type: string; url: string; duration?: number },
    replyToId?: string,
  ): Promise<Message> {
    if (!this.chatClient) throw new Error('Not connected')
    return withRetry(
      async () => {
        const request = new SendMessageV2Request({
          roomId,
          content: {
            case: 'media',
            value: { type: media.type, url: media.url, duration: media.duration || 0 },
          },
        })
        if (replyToId) request.replyToId = replyToId
        const response = await this.chatClient.sendMessageV2(request)
        if (!response.success) throw new Error(response.error || 'Failed to send')
        return protoToMessageV2(response.message, true)
      },
      { maxRetries: 2, baseDelay: 300 },
    )
  }

  async editMessageV2(messageId: string, newText: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.editMessageV2({ messageId, text: newText })
    return result.success ?? false
  }

  async deleteMessageV2(messageIds: string[], requesterUserId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.deleteMessageV2({ messageIds, requesterUserId })
    return result.success ?? false
  }

  async setReactionV2(messageId: string, emoji: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.setReactionV2({ messageId, emoji })
    return result.success ?? false
  }

  async searchMessages(roomId: string, query: string, limit = 20): Promise<{ messageId: string; roomId: string; username: string; preview: string; createdAt: string }[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.searchMessages({ roomId, query, limit })
    return (result.messages || []).map((r: any) => ({
      messageId: r.messageId || '',
      roomId: r.roomId || '',
      username: r.username || '',
      preview: r.preview || '',
      createdAt: r.createdAt || '',
    }))
  }

  // --- ChatV2 Stream (bidirectional) ---

  openChatV2Stream(roomId: string, callback: StreamCallback): { cleanup: () => void; send: (msg: any) => void } {
    const streamId = `chatv2-${roomId}`
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

    const sendQueue: any[] = []
    let sendResolve: ((value: IteratorResult<any>) => void) | null = null

    const inputStream = {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<any>> {
            if (sendQueue.length > 0) {
              return Promise.resolve({ value: sendQueue.shift()!, done: false })
            }
            return new Promise<IteratorResult<any>>((resolve) => {
              sendResolve = resolve
            })
          },
        }
      },
    }

    const stream = this.chatClient.chatV2(inputStream, { signal })

    // Send auth immediately — server waits for JWT before sending anything
    sendQueue.push({ jwtToken, roomId })

    const processStream = async () => {
      try {
        for await (const v2Msg of stream) {
          if (signal.aborted) break
          handleChatV2Message(v2Msg, callback)
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        const msg = String(err?.message || err || '')
        if (msg.includes('SERVER_SHUTTINGDOWN')) {
          callback({ type: 'error', error: 'SERVER_SHUTTINGDOWN' })
          return
        }
        callback({ type: 'error', error: msg })
      }
    }

    processStream()

    const send = (msg: any) => {
      sendQueue.push(msg)
      if (sendResolve) {
        sendResolve({ value: sendQueue.shift()!, done: false })
        sendResolve = null
      }
    }

    return {
      cleanup: () => {
        controller.abort()
        this.activeStreams.delete(streamId)
      },
      send,
    }
  }

  // --- ChatList V2 Methods ---

  async pinChat(userId: string, chatId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.pinChat({ userId, chatId })
    return result.success ?? false
  }

  async unPinChat(userId: string, chatId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.unPinChat({ userId, chatId })
    return result.success ?? false
  }

  async searchChats(query: string, limit = 50, offset = 0): Promise<Chat[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.searchChats({ query, limit, offset })
    return (result.chats || []).map(protoToChat)
  }

  async archiveChat(userId: string, chatId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.archiveChat({ userId, chatId })
    return result.success ?? false
  }

  async unarchiveChat(userId: string, chatId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.unarchiveChat({ userId, chatId })
    return result.success ?? false
  }

  async getChatListVersion(): Promise<number> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getChatListVersion({})
    return Number(result.version ?? 0)
  }

  // --- Pin Message Methods ---

  async pinMessage(userId: string, chatId: string, messageId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.pinMessage({ userId, chatId, messageId })
    return result.success ?? false
  }

  async unPinMessage(userId: string, chatId: string, messageId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.unPinMessage({ userId, chatId, messageId })
    return result.success ?? false
  }

  async getPinnedMessages(chatId: string): Promise<Message[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getPinnedMessages({ chatId })
    return (result.messages || []).map((m: any) => protoToMessageV2(m))
  }

  // --- Draft Methods ---

  async saveDraft(userId: string, roomId: string, text: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.saveDraft({ userId, roomId, draftText: text })
    return result.success ?? false
  }

  async getDraft(userId: string, roomId: string): Promise<Draft> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getDraft({ userId, roomId })
    return protoToDraft(result)
  }

  async deleteDraft(userId: string, roomId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.deleteDraft({ userId, roomId })
    return result.success ?? false
  }

  // --- Favorite Methods ---

  async addFavorite(userId: string, messageId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.addFavorite({ userId, messageId })
    return result.success ?? false
  }

  async removeFavorite(userId: string, messageId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.removeFavorite({ userId, messageId })
    return result.success ?? false
  }

  async getFavorites(userId: string): Promise<Message[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getFavorites({ userId })
    return (result.messages || []).map((m: any) => protoToMessageV2(m))
  }

  // --- Theme Methods ---

  async getThemes(username: string, userId: string): Promise<{ currentThemeId: string; themes: CustomTheme[] }> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getThemes({ username, userId })
    return {
      currentThemeId: result.currentThemeId ?? '',
      themes: (result.customThemes || []).map(protoToTheme),
    }
  }

  async saveTheme(username: string, userId: string, theme: Partial<CustomTheme>): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.saveTheme({ username, theme: theme as any, userId })
    return result.success ?? false
  }

  async setCurrentTheme(username: string, userId: string, themeId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.setCurrentTheme({ username, userId, themeId })
    return result.success ?? false
  }

  async deleteTheme(userId: string, themeId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.deleteTheme({ userId, themeId })
    return result.success ?? false
  }

  // --- Muted Methods ---

  async getMutedChats(userId: string): Promise<string[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getMutedChats({ userId })
    return result.roomIds || result.room_ids || []
  }

  async setMutedChat(userId: string, roomId: string, muted: boolean): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.setMutedChat({ userId, roomId, muted })
    return result.success ?? false
  }

  // --- User Methods ---

  async getAllUsers(): Promise<User[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getAllUsers({})
    return (result.users || []).map(protoToUser)
  }

  async getUserProfile(userIdOrUsername: string): Promise<UserProfile> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getUserProfile({ userId: userIdOrUsername })
    return {
      username: result.username || '',
      bio: result.bio || '',
      status: result.status || '',
      avatarUrl: result.avatarUrl || result.avatar_url || '',
      lastSeenAt: result.lastSeenAt?.toDate?.()?.toISOString() || '',
      fullAvatarUrl: result.fullAvatarUrl || result.full_avatar_url || '',
    }
  }

  async getUserId(username: string): Promise<string> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getUserId({ username })
    return result.userId || result.user_id || ''
  }

  async getUserAvatar(userIdOrUsername: string): Promise<{ avatarUrl: string; fullAvatarUrl: string }> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getUserAvatar({ username: userIdOrUsername, userId: userIdOrUsername })
    return {
      avatarUrl: result.avatarUrl || result.avatar_url || '',
      fullAvatarUrl: result.fullAvatarUrl || result.full_avatar_url || '',
    }
  }

  async updateUsername(userId: string, newUsername: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.updateUsername({ userId, newUsername })
    return result.success ?? false
  }

  async updatePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.updatePassword({ userId, oldPassword, newPassword })
    return result.success ?? false
  }

  // --- Chat Management Methods ---

  async updateChatName(chatId: string, userId: string, newName: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.updateChatName({ chatId, userId, newName })
    return result.success ?? false
  }

  async updateChatAvatar(chatId: string, userId: string, avatarUrl: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.updateChatAvatar({ chatId, userId, avatarUrl })
    return result.success ?? false
  }

  async addParticipant(chatId: string, username: string, userId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.addParticipant({ chatId, username, userId })
    return result.success ?? false
  }

  async removeParticipant(chatId: string, username: string, userId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.removeParticipant({ chatId, username, userId })
    return result.success ?? false
  }

  // --- AI Chat Methods ---

  async getAIChats(): Promise<Chat[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getAIChats({})
    return (result.chats || []).map(protoToChat)
  }

  async renameAIChat(chatId: string, newName: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.renameAIChat({ chatId, newName })
    return result.success ?? false
  }

  async getAIChatSettings(sessionId: string, userId: string): Promise<AIChatSettings> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getAIChatSettings({ sessionId, userId })
    return {
      sessionId: result.sessionId || '',
      userApiKey: result.userApiKey || '',
      model: result.model || '',
      isUsingCustomKey: result.isUsingCustomKey || false,
      remaining: result.remaining || 0,
      limit: result.limit || 0,
      windowSeconds: result.windowSeconds || 0,
    }
  }

  async updateAIChatSettings(sessionId: string, userId: string, apiKey: string, model: string): Promise<{ success: boolean; message: string }> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.updateAIChatSettings({ sessionId, userId, apiKey, model })
    return { success: result.success ?? false, message: result.message || '' }
  }

  // --- AI V2 Methods ---

  async *chatWithAIV2(params: {
    sessionId?: string
    message: string
    images?: string[]
    agentId?: string
    toolCalls?: AIToolResult[]
  }): AsyncGenerator<AIMessage> {
    if (!this.chatClient) throw new Error('Not connected')

    const controller = new AbortController()
    const request: any = {
      sessionId: params.sessionId || '',
      message: params.message,
      images: (params.images || []).map((b64) => {
        const binary = atob(b64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        return bytes
      }),
      agentId: params.agentId || '',
      toolCalls: params.toolCalls || [],
    }

    const stream = this.chatClient.chatWithAIV2(request, { signal: controller.signal })

    let fullContent = ''
    let agentId = ''
    let agentName = ''
    let hasRagContext = false
    let modelUsed = ''
    let tokenCount = 0
    let imageUrl = ''

    try {
      for await (const chunk of stream) {
        if (controller.signal.aborted) break

        if (chunk.token) fullContent += chunk.token
        if (chunk.agentId) agentId = chunk.agentId
        if (chunk.agentName) agentName = chunk.agentName
        if (chunk.hasRagContext) hasRagContext = chunk.hasRagContext
        if (chunk.modelUsed) modelUsed = chunk.modelUsed
        if (chunk.tokenCount) tokenCount = chunk.tokenCount
        if (chunk.imageUrl) imageUrl = chunk.imageUrl

        if (chunk.error) {
          throw new Error(chunk.error)
        }

        yield {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: fullContent,
          agentId,
          agentName,
          timestamp: Date.now(),
          isStreaming: !chunk.finished,
          toolCalls: chunk.toolCalls || undefined,
          hasRagContext,
          modelUsed,
          tokenCount,
          imageUrl: imageUrl || undefined,
        }

        if (chunk.finished) break
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        throw err
      }
    } finally {
      controller.abort()
    }
  }

  async getAIAgent(agentId: string): Promise<AgentInfoV2> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getAIAgent({ agentId })
    return protoToAgentInfoV2(result.agent || result)
  }

  async listAIAgents(includePublic = true): Promise<AgentInfoV2[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.listAIAgents({ includePublic })
    return (result.agents || []).map(protoToAgentInfoV2)
  }

  async createAIAgent(params: {
    name: string
    description?: string
    providerType?: string
    model?: string
    systemPrompt?: string
    toolsEnabled?: boolean
    ragEnabled?: boolean
    maxTokens?: number
    temperature?: number
    tags?: string[]
  }): Promise<string> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.createAIAgent({
      name: params.name,
      description: params.description || '',
      providerType: params.providerType || '',
      model: params.model || '',
      systemPrompt: params.systemPrompt || '',
      toolsEnabled: params.toolsEnabled ?? false,
      ragEnabled: params.ragEnabled ?? false,
      maxTokens: params.maxTokens || 0,
      temperature: params.temperature || 0,
      tags: params.tags || [],
    })
    return result.agentId || result.agent_id || ''
  }

  async updateAIAgent(agentId: string, updates: Partial<{
    name: string
    description: string
    providerType: string
    model: string
    systemPrompt: string
    toolsEnabled: boolean
    ragEnabled: boolean
    maxTokens: number
    temperature: number
    tags: string[]
  }>): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.updateAIAgent({ agentId, ...updates })
    return result.success ?? false
  }

  async deleteAIAgent(agentId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.deleteAIAgent({ agentId })
    return result.success ?? false
  }

  async cloneAIAgent(agentId: string, newName: string): Promise<string> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.cloneAIAgent({ agentId, newName })
    return result.agentId || result.agent_id || ''
  }

  async listAITools(): Promise<ToolInfoV2[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.listAITools({})
    return (result.tools || []).map(protoToToolInfo)
  }

  // --- AI Marketplace Methods ---

  async listMarketplaceAgents(query = '', limit = 50, offset = 0): Promise<{ agents: AgentInfoV2[]; total: number }> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.listMarketplaceAgents({ query, limit, offset })
    return {
      agents: (result.agents || []).map(protoToAgentInfoV2),
      total: result.total || 0,
    }
  }

  async rateAIAgent(agentId: string, rating: number, review: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.rateAIAgent({ agentId, rating, review })
    return result.success ?? false
  }

  async getAIAgentReviews(agentId: string): Promise<AgentReviewInfo[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getAIAgentReviews({ agentId })
    return (result.reviews || []).map(protoToReview)
  }

  async getAIAgentStats(agentId: string): Promise<{
    installCount: number
    avgRating: number
    reviewCount: number
  }> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getAIAgentStats({ agentId })
    return {
      installCount: result.installCount || result.install_count || 0,
      avgRating: result.avgRating || result.avg_rating || 0,
      reviewCount: result.reviewCount || result.review_count || 0,
    }
  }

  async shareAIAgent(agentId: string): Promise<string> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.shareAIAgent({ agentId })
    return result.shareCode || result.share_code || ''
  }

  async installAIAgent(shareCode: string): Promise<string> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.installAIAgent({ shareCode })
    return result.agentId || result.agent_id || ''
  }

  async getAIUsageStats(): Promise<{ stats: UsageStatInfo[]; totalTokens: number; totalRequests: number }> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getAIUsageStats({})
    return {
      stats: (result.stats || []).map(protoToUsageStat),
      totalTokens: result.totalTokens || result.total_tokens || 0,
      totalRequests: result.totalRequests || result.total_requests || 0,
    }
  }

  async listAIV2Chats(): Promise<Chat[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.listAIV2Chats({})
    return (result.chats || []).map((c: any) => ({
      id: c.id || '',
      name: c.name || 'AI Chat',
      type: 'ai',
      creatorId: '',
      participants: '[]',
      lastMessageText: '',
      lastMessageTime: c.updatedAt || c.updated_at || c.createdAt || c.created_at || new Date().toISOString(),
      unreadCount: 0,
      avatarUrl: '',
      activeAgentId: c.agentId || c.agent_id || '',
    }))
  }

  async getAIV2ChatHistory(sessionId: string, limit = 50): Promise<AIMessage[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getAIV2ChatHistory({ sessionId, limit })
    return (result.messages || []).map((m: any) => ({
      id: String(m.id || ''),
      role: m.role || 'assistant',
      content: m.content || '',
      agentId: m.agentId || m.agent_id || '',
      modelUsed: m.modelUsed || m.model_used || '',
      tokenCount: m.tokenCount || m.token_count || 0,
      timestamp: m.createdAt || m.created_at ? new Date(m.createdAt || m.created_at).getTime() : Date.now(),
    }))
  }

  // --- Bot Command Methods ---

  async processBotCommand(userId: string, command: string, args: string): Promise<string> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.processBotCommand({ userId, command, args })
    return result.response || ''
  }

  async getBotCommands(): Promise<{ command: string; description: string }[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getBotCommands({})
    return result.commands || []
  }

  // --- Free Model Methods ---

  async getFreeModels(): Promise<FreeModelInfo[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getFreeModels({})
    return (result.models || []).map(protoToFreeModel)
  }

  // --- Notification Methods ---

  async subscribeNotifications(callback: (notification: ServerNotification) => void): Promise<() => void> {
    if (!this.chatClient) throw new Error('Not connected')
    const controller = new AbortController()
    const stream = this.chatClient.subscribeNotifications({}, { signal: controller.signal })
    ;(async () => {
      try {
        for await (const msg of stream) {
          callback(protoToNotification(msg))
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.warn('[Notifications] Stream ended:', err)
        }
      }
    })()
    return () => controller.abort()
  }

  async getNotificationHistory(limit = 50): Promise<ServerNotification[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getNotificationHistory({ limit })
    return (result.notifications || []).map(protoToNotification)
  }

  async markNotificationsRead(notificationIds: string[]): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.markNotificationsRead({ notificationIds })
    return result.success ?? false
  }

  async getUnreadCount(): Promise<number> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getUnreadCount({})
    return Number(result.count ?? 0)
  }

  // --- Device Methods ---

  async deleteOtherDevices(): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.deleteOtherDevices({})
    return result.success ?? false
  }

  async getDevices(userId: string): Promise<any[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getDevices({ userId })
    return result.devices || []
  }

  // --- Contact Methods ---

  async getContacts(): Promise<string[]> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getContacts({})
    return result.contacts || []
  }

  async addContact(userId: string, username: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.addContact({ username: userId, contactUsername: username, userId })
    return result.success ?? false
  }

  async removeContact(userId: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.removeContact({ contactUsername: userId })
    return result.success ?? false
  }

  // --- Delete Profile ---

  async deleteProfile(password?: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    try {
      if (this.profileClient) {
        const result = await this.profileClient.deleteProfile({ password: password || '' })
        return result.success ?? false
      }
    } catch (e: any) {
      console.warn('ProfileService.deleteProfile failed, trying ChatService:', e?.message)
    }
    const result = await this.chatClient.deleteProfile({ password: password || '' })
    return result.success ?? false
  }

  // --- HTTP Methods ---

  async fetchServerInfo(): Promise<Record<string, string>> {
    const response = await fetch('/info')
    if (!response.ok) {
      throw new Error(`Failed to fetch server info: ${response.status}`)
    }
    const data = await response.json()
    return data.services || {}
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch('/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  // --- Upload Methods ---

  private async uploadFile(endpoint: string, fieldName: string, file: File): Promise<string> {
    const tokens = this._getTokens?.()
    const formData = new FormData()
    formData.append(fieldName, file)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens?.accessToken || ''}` },
      body: formData,
    })
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`)
    const data = await response.json()
    return data.url || ''
  }

  async uploadAvatar(avatar: File, avatarFull?: File): Promise<{ avatarUrl: string; fullAvatarUrl: string }> {
    const tokens = this._getTokens?.()
    const formData = new FormData()
    formData.append('avatar', avatar)
    if (avatarFull) formData.append('avatar_full', avatarFull)
    const response = await fetch('/api/upload-avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens?.accessToken || ''}` },
      body: formData,
    })
    if (!response.ok) throw new Error(`Avatar upload failed: ${response.status}`)
    const data = await response.json()
    return { avatarUrl: data.url || '', fullAvatarUrl: data.full_url || data.url || '' }
  }

  async uploadImage(file: File): Promise<string> {
    const compressed = await compressImage(file)
    return this.uploadFile('/api/upload-image', 'image', compressed)
  }

  async uploadFile_(file: File): Promise<string> {
    return this.uploadFile('/api/upload-file', 'file', file)
  }

  async uploadAudio(file: File): Promise<string> {
    return this.uploadFile('/api/upload-audio', 'audio', file)
  }

  async uploadBackground(file: File): Promise<string> {
    return this.uploadFile('/api/upload-background', 'background', file)
  }

  // --- Typing Stream ---

  async *sendTyping(roomId: string, username: string, userId: string, isTyping: boolean): AsyncGenerator<{ roomId: string; username: string; isTyping: boolean }> {
    if (!this.chatClient) throw new Error('Not connected')

    const controller = new AbortController()
    const inputStream = {
      [Symbol.asyncIterator]() {
        let sent = false
        return {
          next(): Promise<IteratorResult<any>> {
            if (!sent) {
              sent = true
              return Promise.resolve({ value: { roomId, username, isTyping, userId }, done: false })
            }
            return new Promise<IteratorResult<any>>(() => {})
          },
        }
      },
    }

    const stream = this.chatClient.typing(inputStream, { signal: controller.signal })
    try {
      for await (const signal of stream) {
        yield { roomId: signal.roomId, username: signal.username, isTyping: signal.isTyping }
      }
    } finally {
      controller.abort()
    }
  }

  openTypingStream(callback: (event: { roomId: string; username: string; isTyping: boolean }) => void): () => void {
    if (!this.chatClient) return () => {}

    const streamId = 'typing-global'

    const existing = this.activeStreams.get(streamId)
    if (existing) {
      existing.abort()
      this.activeStreams.delete(streamId)
    }

    try {
      const controller = new AbortController()
      const signal = controller.signal
      this.activeStreams.set(streamId, controller)

      const inputStream = {
        [Symbol.asyncIterator]() {
          return {
            next(): Promise<IteratorResult<any>> {
              return new Promise<IteratorResult<any>>(() => {})
            },
          }
        },
      }

      const stream = this.chatClient.typing(inputStream, { signal })

      ;(async () => {
        try {
          for await (const signal of stream) {
            if (signal.aborted) break
            callback({ roomId: signal.roomId, username: signal.username, isTyping: signal.isTyping })
          }
        } catch (err) {
          if (!signal.aborted) {
            console.warn('[Typing] Stream ended:', err)
          }
        }
      })()

      return () => {
        controller.abort()
        this.activeStreams.delete(streamId)
      }
    } catch (err) {
      console.warn('[Typing] BiDi stream not supported:', err)
      return () => {}
    }
  }

  // --- Call Session (WebRTC Signaling) ---

  async *callSession(messages: AsyncIterable<any>): AsyncGenerator<any> {
    if (!this.chatClient) throw new Error('Not connected')
    const stream = this.chatClient.callSession(messages)
    for await (const msg of stream) {
      yield msg
    }
  }

  // --- Secret Chat (E2EE) ---

  async createSecretChat(targetUsername: string, targetUserId: string, publicKey: string): Promise<string> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.createSecretChat({
      targetUsername,
      targetUserId,
      publicKey,
      clientVersion: '1.1.2',
    })
    return result.chatId ?? ''
  }

  async exchangeSecretKey(chatId: string, publicKey: string): Promise<boolean> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.exchangeSecretKey({ chatId, publicKey })
    return result.success ?? false
  }

  async getSecretChatKey(chatId: string): Promise<string> {
    if (!this.chatClient) throw new Error('Not connected')
    const result = await this.chatClient.getSecretChatKey({ chatId })
    return result.peerPublicKey ?? ''
  }
}

export const grpcClient = GrpcClient.getInstance()
export default grpcClient
