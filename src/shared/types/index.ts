// ============================================
// Lavender Messenger — Shared Types
// ============================================

export interface Chat {
  id: string
  name: string
  type: 'regular' | 'owl' | 'hermes'
  creatorId: string
  participants: string[]
  lastMessageText: string
  lastMessageTime: string
  unreadCount: number
  avatarUrl?: string
  isOnline?: boolean
  activeAgentId?: string
  agentMode?: 'single' | 'parallel' | 'pipeline'
}

export interface Message {
  id: string
  chatId: string
  senderId: string
  senderName: string
  content: string
  createdAt: string
  isOutgoing: boolean
  isRead: boolean
  replyToId?: string
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
