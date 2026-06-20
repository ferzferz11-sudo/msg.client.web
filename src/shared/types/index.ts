// ============================================
// Lavender Messenger — Shared Types
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
  // ChatList v2 fields
  isPinned?: boolean
  isMuted?: boolean
  isArchived?: boolean
  pinnedAt?: number
  fullAvatarUrl?: string
  lastMessageUsername?: string
  lastMessageHasImage?: boolean
  allowMembersToAdd?: boolean
  isSecret?: boolean
  e2eeReady?: boolean
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
  email: string
  avatarUrl?: string
  bio?: string
  status?: string
  createdAt?: string
  lastSeenAt?: string
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

// Auth V2 types
export interface TokenPair {
  accessToken: string
  refreshToken: string
  accessExpiresAt: number   // unix timestamp (seconds)
  refreshExpiresAt: number  // unix timestamp (seconds)
}

export interface DeviceInfo {
  deviceId: string
  deviceName: string
  deviceType: 'web'
}

export interface AuthResponseV2 {
  success: boolean
  message: string
  accessToken: string
  refreshToken: string
  accessExpiresAt: number
  refreshExpiresAt: number
  user: User
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
  accessExpiresAt: number
  refreshExpiresAt: number
}

// gRPC stream event types
export type StreamEvent =
  | { type: 'message'; message: Message }
  | { type: 'typing'; chatId: string; userId: string; isTyping: boolean }
  | { type: 'presence'; userId: string; isOnline: boolean }
  | { type: 'error'; error: string }
  | { type: 'done' }

export type StreamCallback = (event: StreamEvent) => void

// ============================================
// Localization
// ============================================

export type Lang = 'en' | 'ru'

const translations: Record<string, Record<Lang, string>> = {
  appName: { en: 'Lava', ru: 'Лава' },
  loginTitle: { en: 'Sign In', ru: 'Вход' },
  signupTitle: { en: 'Sign Up', ru: 'Регистрация' },
  usernamePlaceholder: { en: 'Username', ru: 'Имя пользователя' },
  passwordPlaceholder: { en: 'Password', ru: 'Пароль' },
  emailPlaceholder: { en: 'Email', ru: 'Email' },
  signIn: { en: 'Sign In', ru: 'Войти' },
  signUp: { en: 'Sign Up', ru: 'Зарегистрироваться' },
  hasAccount: { en: 'Already have an account? Sign In', ru: 'Уже есть аккаунт? Войти' },
  noAccount: { en: 'No account? Sign Up', ru: 'Нет аккаунта? Зарегистрироваться' },
  connectionError: { en: 'Connection error', ru: 'Ошибка подключения' },
  authError: { en: 'Authentication failed', ru: 'Ошибка авторизации' },
  loading: { en: 'Loading...', ru: 'Загрузка...' },
  selectChat: { en: 'Select a chat', ru: 'Выберите чат' },
  selectChatHint: { en: 'Choose a chat from the list to start messaging', ru: 'Выберите чат из списка, чтобы начать общение' },
  writeMessage: { en: 'Write a message...', ru: 'Написать сообщение...' },
  signOut: { en: 'Sign Out', ru: 'Выйти' },
  online: { en: 'online', ru: 'в сети' },
  offline: { en: 'offline', ru: 'не в сети' },
  retry: { en: 'Retrying... ({attempt}/3)', ru: 'Повторное подключение ({attempt}/3)...' },
  noChats: { en: 'No chats yet', ru: 'Нет чатов' },
  chat: { en: 'Chat', ru: 'Чат' },
  loadingMessages: { en: 'Loading messages...', ru: 'Загрузка сообщений...' },
  noMessages: { en: 'No messages yet. Write the first one!', ru: 'Нет сообщений. Напишите первое!' },
  messageRead: { en: 'Read', ru: 'Прочитано' },
  messageDelivered: { en: 'Delivered', ru: 'Доставлено' },
}

export function t(key: string, lang: Lang = 'ru', replacements?: Record<string, string | number>): string {
  const text = translations[key]?.[lang] ?? translations[key]?.['en'] ?? key
  if (!replacements) return text
  return Object.entries(replacements).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), text)
}

export function detectLang(): Lang {
  return (navigator.language?.startsWith('ru') ? 'ru' : 'en') as Lang
}
