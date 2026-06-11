// ============================================
// Lavender Messenger — Shared Types
// ============================================
// These types match the real proto/messenger.proto structures
// and are used throughout the app (Zustand store, UI components, gRPC client)
// ============================================

export interface Chat {
  id: string
  name: string
  type: string  // 'regular' | 'group' | 'owl' | 'hermes'
  creatorId: string
  participants: string  // JSON string from proto
  lastMessageText: string
  lastMessageTime: string
  unreadCount: number
  avatarUrl?: string
  isOnline?: boolean
  activeAgentId?: string
  agentMode?: string
}

export interface Message {
  id: string
  roomId: string  // room_id in proto
  user: string  // user in proto
  text: string  // text in proto
  createdAt: string
  isOutgoing: boolean
  isRead: boolean
  repliedToMessageId?: string
  repliedToUser?: string
  repliedToText?: string
  agentId?: string
}

export interface User {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  isOnline: boolean
  lastSeen?: string
}

export interface AIChatSettings {
  sessionId: string
  userApiKey: string
  model: string
  isUsingCustomKey: boolean
  remaining: number
  limit: number
  windowSeconds: number
}

export interface Agent {
  id: string
  name: string
  description: string
  isPreset: boolean
  systemPrompt: string
  model: string
  emoji: string
}

// gRPC stream event types
export type StreamEvent =
  | { type: 'message'; message: Message }
  | { type: 'typing'; chatId: string; userId: string; isTyping: boolean }
  | { type: 'presence'; userId: string; isOnline: boolean }
  | { type: 'error'; error: string }
  | { type: 'done' }

export type StreamCallback = (event: StreamEvent) => void
