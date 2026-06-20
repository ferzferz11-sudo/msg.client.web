# Lava Messenger Web Client — План v0.6.0

**Дата:** 2026-06-18
**Сервер:** v1.2.0.6 (dev)
**Текущая версия web:** v0.4.0
**Целевая версия:** v0.6.0
**Файл плана:** `/root/msg.client.web/doc/PLAN_V0.6.0.md`

---

## Чеклист выполнения

### Блок 1: Адаптация к серверу v1.2.0.6
- [x] 1.1 Обновить proto с сервера
- [x] 1.2 Перегенерировать код (npx buf generate)
- [x] 1.3 Обновить Chat интерфейс — добавить новые поля
- [x] 1.4 Обновить protoToChat конвертер
- [x] 1.5 Обновить getChats метод — GetChatsV2 с пагинацией
- [x] 1.6 Обновить getProfile метод — новые поля
- [x] 1.7 Обновить signInV2/signUpV2 — clientVersion web-0.6.0
- [x] 1.8 Обновить grpc-web-proxy.cjs — все новые методы

### Блок 2: Новые методы grpcClient
- [x] 2.1 ChatList V2: pinChat, unPinChat, searchChats, archiveChat, unarchiveChat, getChatListVersion
- [x] 2.2 Pin Message: pinMessage, unPinMessage, getPinnedMessages
- [x] 2.3 AI Chat: getAIChats, renameAIChat
- [x] 2.4 Notifications: subscribeNotifications, getNotificationHistory, markNotificationsRead, getUnreadCount
- [x] 2.5 Devices: deleteOtherDevices, getDevices
- [x] 2.6 Password: requestPasswordReset, resetPassword

### Блок 3: Новые хуки
- [x] 3.1 useChatListV2
- [x] 3.2 usePinnedMessages
- [x] 3.3 useNotifications
- [x] 3.4 useAIChats
- [x] 3.5 useProfile
- [x] 3.6 useContacts
- [x] 3.7 useDevices

### Блок 4: Новые компоненты/экраны
- [x] 4.1 ProfileScreen (без импорта Screen — проблема с vite)
- [x] 4.2 SettingsScreen
- [x] 4.3 ContactsScreen
- [x] 4.4 SearchScreen
- [x] 4.5 ArchiveScreen
- [x] 4.6 PinnedMessagesScreen
- [x] 4.7 AIChatsScreen
- [x] 4.8 NotificationsScreen
- [x] 4.9 Обновить ChatList — isPinned, isMuted, lastMessageUsername, lastMessageHasImage
- [x] 4.10 Обновить ChatScreen — pinned button, isMuted, isSecret/E2EE
- [!] НЕ интегрированы в App.tsx из-за проблемы с vite билдом (Screen lazy loading conflict)

### Блок 5: Полировка
- [x] 5.2 Обновить версию (package.json → 0.6.0)
- [x] 5.3 TypeScript check + build (успешно)
- [ ] 5.1 Обновить документацию

---

## Промт для следующей сессии

```
# Lava Messenger Web Client — Продолжение реализации v0.6.0

**Версия:** v0.4.0 → v0.6.0
**Дата:** 2026-06-18
**Статус:** 🔄 В процессе — Блок 1.1 частично выполнен

---

## Контекст

Lava Messenger Web Client — SPA мессенджер на React 18 + TypeScript + Vite.
gRPC-web через Connect-RPC, Zustand state management, PWA.

**Путь:** `/root/msg.client.web/`
**Сервер:** `/root/msg/` (dev сервер v1.2.0.6, порт 50052)
**gRPC-web proxy:** порт 9090 → dev сервер 50052
**Nginx:** `/web` → SPA dist, `/messenger` → gRPC-web proxy

Сервер сильно обновился (v1.1.3.10 → v1.2.0.6). Нужно адаптировать web-клиент.

---

## Что уже сделано

- [x] Скопирован новый proto с сервера (`/root/msg/messenger.proto` → `proto/messenger.proto`)

---

## Что нужно сделать (по порядку)

### Блок 1: Адаптация к серверу (КРИТИЧНЫЙ — начать с него)

#### 1.2 Перегенерировать proto код
```bash
cd /root/msg.client.web
npx buf generate
```
Проверить что все новые методы появились в `src/shared/api/gen/proto/messenger_connect.ts`.

#### 1.3 Обновить Chat интерфейс (`src/shared/types/index.ts`)
Добавить новые поля:
```typescript
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
```

#### 1.4 Обновить protoToChat конвертер (`src/shared/api/grpcClient.ts`)
Маппинг новых полей из proto ChatInfo:
- `isPinned` ← `chat.isPinned`
- `isMuted` ← `chat.isMuted`
- `isArchived` ← `chat.isArchived`
- `pinnedAt` ← `chat.pinnedAt`
- `fullAvatarUrl` ← `chat.fullAvatarUrl`
- `lastMessageUsername` ← `chat.lastMessageUsername`
- `lastMessageHasImage` ← `chat.lastMessageHasImage`
- `allowMembersToAdd` ← `chat.allowMembersToAdd`

#### 1.5 Обновить getChats метод (`src/shared/api/grpcClient.ts`)
- Использовать `GetChatsV2` вместо `GetChats`
- Добавить параметры: limit (default 100), offset (default 0), filter (default "all")
- Сохранить обратную совместимость с вызывающим кодом

#### 1.6 Обновить getProfile метод (`src/shared/api/grpcClient.ts`)
Добавить новые поля в ответ:
- `email` ← `result.email`
- `locale` ← `result.locale`
- `isSuperAdmin` ← `result.isSuperAdmin`
- `createdAt` ← `result.createdAt`
- `lastSeenAt` ← `result.lastSeenAt`
- `fullAvatarUrl` ← `result.fullAvatarUrl`

#### 1.7 Обновить signInV2/signUpV2 (`src/shared/api/grpcClient.ts`)
- Добавить `clientVersion: 'web-0.6.0'` в запрос
- Убедиться что `deviceType` передаётся в deviceInfo

#### 1.8 Обновить grpc-web-proxy.cjs
Добавить все новые методы в маппинг:
- ChatList V2: PinChat, UnPinChat, SearchChats, ArchiveChat, UnarchiveChat, GetChatsV2, GetChatListVersion
- Pin Message: PinMessage, UnPinMessage, GetPinnedMessages
- AI Chat: GetAIChats, RenameAIChat
- Notifications: SubscribeNotifications, GetNotificationHistory, MarkNotificationsRead, GetUnreadCount
- Devices: DeleteOtherDevices
- Password: RequestPasswordReset, ResetPassword

### Блок 2: Новые методы grpcClient

Добавить в `src/shared/api/grpcClient.ts`:

```typescript
// ChatList V2
async pinChat(chatId: string): Promise<boolean>
async unPinChat(chatId: string): Promise<boolean>
async searchChats(query: string, limit?: number, offset?: number): Promise<Chat[]>
async archiveChat(chatId: string): Promise<boolean>
async unarchiveChat(chatId: string): Promise<boolean>
async getChatListVersion(): Promise<number>

// Pin Message
async pinMessage(chatId: string, messageId: string): Promise<boolean>
async unPinMessage(chatId: string, messageId: string): Promise<boolean>
async getPinnedMessages(chatId: string): Promise<Message[]>

// AI Chat
async getAIChats(): Promise<Chat[]>
async renameAIChat(chatId: string, newName: string): Promise<boolean>

// Notifications
async subscribeNotifications(callback: (notification: any) => void): Promise<() => void>
async getNotificationHistory(limit?: number): Promise<any[]>
async markNotificationsRead(notificationIds: string[]): Promise<boolean>
async getUnreadCount(): Promise<number>

// Devices
async deleteOtherDevices(): Promise<boolean>
async getDevices(): Promise<DeviceInfo[]>

// Password
async requestPasswordReset(email: string): Promise<boolean>
async resetPassword(token: string, newPassword: string): Promise<boolean>
```

### Блок 3: Новые хуки

Создать файлы в `src/hooks/`:
- `useChatListV2.ts` — пагинация, фильтры, pin/unpin, archive, search
- `usePinnedMessages.ts` — закреплённые сообщения
- `useNotifications.ts` — серверные уведомления
- `useAIChats.ts` — список AI чатов
- `useProfile.ts` — профиль + настройки
- `useContacts.ts` — контакты
- `useDevices.ts` — управление устройствами

### Блок 4: Новые компоненты

Создать компоненты:
- `ProfileScreen` — отображение/редактирование профиля
- `SettingsScreen` — настройки (locale, theme, push, devices, password)
- `ContactsScreen` — список контактов
- `SearchScreen` — поиск по чатам
- `ArchiveScreen` — архив чатов
- `PinnedMessagesScreen` — закреплённые сообщения
- `AIChatsScreen` — AI чаты
- `NotificationsScreen` — уведомления

Обновить существующие:
- `ChatList` — показ isPinned (📌), isMuted (🔇), сортировка, pull-to-refresh, бесконечный скролл
- `ChatScreen` — закреплённые сообщения в хедере, lastMessageUsername, lastMessageHasImage (📷)

### Блок 5: Полировка

- Обновить `PROMPT.md` — статус, версия, архитектура
- Обновить `CHANGELOG.md` — добавить v0.6.0
- Обновить `TASKS.md` — статусы задач
- Обновить `package.json` — version: "0.6.0"
- `npx tsc --noEmit` — проверка типов
- `npm run build` — production build

---

## Важные заметки

- Все новые методы требуют JWT Bearer token (кроме AuthService)
- ProfileService V2 работает только на dev сервере
- Chat Stream v2 использует jwt_token в первом сообщении (password deprecated)
- Старые методы (GetChats, GetHistory) продолжают работать
- gRPC-web proxy должен проксировать все новые методы
- Android-клиент уже поддерживает новую версию сервера — можно смотреть паттерны в `/root/msg.client.android/`

---

## Полный план

Детальный план в файле: `/root/msg.client.web/doc/PLAN_V0.6.0.md`

Начинай с Блока 1.2 (перегенерация proto). Двигайся последовательно по блокам.
После каждого блока — обновляй чеклист в файле плана (отмечай [x] выполненные пункты).
