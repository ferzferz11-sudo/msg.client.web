// ============================================
// Lavender Messenger — Shared Types
// ============================================

export interface Reaction {
  user: string
  emoji: string
}

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
  roomId: string
  user: string
  text: string
  createdAt: string
  isOutgoing: boolean
  isRead: boolean
  repliedToMessageId?: string
  repliedToUser?: string
  repliedToText?: string
  agentId?: string
  reactions?: Record<string, string[]>
  isEdited?: boolean
  imageUrl?: string
  imageUrls?: string[]
  fileUrl?: string
  userId?: string
  voiceUrl?: string
  duration?: number
  isSuperAdmin?: boolean
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

export interface UserProfile {
  username: string
  bio: string
  status: string
  avatarUrl: string
  lastSeenAt: string
  fullAvatarUrl: string
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

export interface AIAgentV2 {
  id: string
  name: string
  description: string
  providerType: string
  model: string
  systemPrompt: string
  toolsEnabled: boolean
  ragEnabled: boolean
  isPreset: boolean
  isPublic: boolean
  maxTokens: number
  temperature: number
  createdBy: string
  capabilities?: AgentCapabilitiesV2
  installCount: number
  avgRating: number
  reviewCount: number
  tags: string[]
  shareCode: string
  emoji: string
  originalAgentId?: string
  version?: string
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  agentId?: string
  agentName?: string
  modelUsed?: string
  tokenCount?: number
  toolCalls?: AIToolCall[]
  toolResults?: AIToolResult[]
  hasRagContext?: boolean
  imageUrl?: string
  timestamp: number
  isStreaming?: boolean
}

export interface AIToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface AIToolResult {
  id: string
  name: string
  arguments: Record<string, unknown>
  result: string
}

export interface AIMarketplaceAgent {
  id: string
  name: string
  description: string
  providerType: string
  model: string
  isPublic: boolean
  avgRating: number
  reviewCount: number
  installCount: number
  tags: string[]
  createdBy: string
  emoji: string
}

export interface AIUsageStat {
  agentId: string
  agentName: string
  requests: number
  tokens: number
}

export interface AIUsageStatsResponse {
  stats: AIUsageStat[]
  totalTokens: number
  totalRequests: number
}

export type AgentInfoV2 = AIAgentV2
export type ToolCallV2 = AIToolResult
export type ToolCallRequestV2 = AIToolCall

export interface Draft {
  text: string
  repliedToMessageId?: string
  repliedToUser?: string
  repliedToText?: string
  hasDraft: boolean
}

export interface CustomTheme {
  id: string
  name: string
  primaryColor: string
  onPrimaryColor: string
  surfaceColor: string
  onSurfaceColor: string
  backgroundColor: string
  textPrimaryColor: string
  textSecondaryColor: string
  isDark: boolean
  chatBackgroundImageUrl?: string
  chatListBackgroundImageUrl?: string
  bottomPanelColor: string
  onBottomPanelColor: string
  surfaceContainer: string
  outgoingBubbleColor: string
  incomingBubbleColor: string
  outgoingTextColor: string
  incomingTextColor: string
}

export interface AgentCapabilitiesV2 {
  supportsImages: boolean
  supportsTools: boolean
  supportsStreaming: boolean
  maxTokens: number
}

export interface ToolInfoV2 {
  name: string
  description: string
  parametersSchema: string
  requiredRole: string
}

export interface AgentReviewInfo {
  id: string
  agentId: string
  userId: string
  username: string
  rating: number
  review: string
  createdAt: string
}

export interface UsageStatInfo {
  agentId: string
  agentName: string
  tokenCount: number
  requestCount: number
  lastUsed: string
}

export interface ServerNotification {
  id: string
  type: string
  title: string
  message: string
  timestamp: string
  metadata: Record<string, string>
  isRead: boolean
}

export interface FreeModelInfo {
  modelId: string
  displayName: string
  sortOrder: number
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
  // Chat
  reaction: { en: 'Reaction', ru: 'Реакция' },
  reply: { en: 'Reply', ru: 'Ответить' },
  edit: { en: 'Edit', ru: 'Редактировать' },
  delete: { en: 'Delete', ru: 'Удалить' },
  cancel: { en: 'Cancel', ru: 'Отмена' },
  selected: { en: 'selected', ru: 'выбрано' },
  editing: { en: 'Editing', ru: 'Редактирование' },
  editingMessage: { en: 'Edit message...', ru: 'Редактировать сообщение...' },
  replyTo: { en: 'Reply to {user}', ru: 'Ответ: {user}' },
  // Settings
  settings: { en: 'Settings', ru: 'Настройки' },
  username: { en: 'Username', ru: 'Имя пользователя' },
  changeUsername: { en: 'Change username', ru: 'Сменить имя пользователя' },
  changePassword: { en: 'Change password', ru: 'Сменить пароль' },
  currentPassword: { en: 'Current password', ru: 'Текущий пароль' },
  newPassword: { en: 'New password', ru: 'Новый пароль' },
  save: { en: 'Save', ru: 'Сохранить' },
  deleteAccount: { en: 'Delete account', ru: 'Удалить аккаунт' },
  deleteAccountConfirm: { en: 'This action is irreversible. All data will be deleted.', ru: 'Это действие необратимо. Все данные будут удалены.' },
  dangerZone: { en: 'Danger Zone', ru: 'Опасная зона' },
  language: { en: 'Language', ru: 'Язык' },
  devices: { en: 'Devices', ru: 'Устройства' },
  version: { en: 'Version', ru: 'Версия' },
  // Contacts
  contacts: { en: 'Contacts', ru: 'Контакты' },
  directory: { en: 'Directory', ru: 'Каталог' },
  searchUsers: { en: 'Search users...', ru: 'Поиск пользователей...' },
  addContact: { en: 'Add contact', ru: 'Добавить контакт' },
  removeContact: { en: 'Remove contact', ru: 'Удалить контакт' },
  // Search
  searchChats: { en: 'Search chats...', ru: 'Поиск чатов...' },
  // Notifications
  notifications: { en: 'Notifications', ru: 'Уведомления' },
  noNotifications: { en: 'No notifications', ru: 'Нет уведомлений' },
  // Archive
  archive: { en: 'Archive', ru: 'Архив' },
  noArchivedChats: { en: 'No archived chats', ru: 'Нет архивированных чатов' },
  // Pinned
  pinnedMessages: { en: 'Pinned Messages', ru: 'Закреплённые сообщения' },
  noPinnedMessages: { en: 'No pinned messages', ru: 'Нет закреплённых сообщений' },
  // General
  back: { en: 'Back', ru: 'Назад' },
  search: { en: 'Search', ru: 'Поиск' },
  more: { en: 'More', ru: 'Ещё' },
  attachFile: { en: 'Attach file', ru: 'Прикрепить файл' },
  send: { en: 'Send', ru: 'Отправить' },
  networkError: { en: 'No internet connection', ru: 'Нет подключения к интернету' },
  sessionExpired: { en: 'Session expired. Please sign in again.', ru: 'Сессия истекла. Войдите снова.' },
}

export function t(key: string, lang: Lang = 'ru', replacements?: Record<string, string | number>): string {
  const text = translations[key]?.[lang] ?? translations[key]?.['en'] ?? key
  if (!replacements) return text
  return Object.entries(replacements).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), text)
}

export function detectLang(): Lang {
  return (navigator.language?.startsWith('ru') ? 'ru' : 'en') as Lang
}
