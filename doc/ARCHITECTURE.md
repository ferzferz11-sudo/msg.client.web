# Архитектура

## Стек

- **UI**: React 18 + TypeScript + CSS-in-JS (inline styles)
- **State**: Zustand (authStore, chatStore, errorStore)
- **API**: gRPC-web через @connectrpc/connect + @connectrpc/connect-web
- **Proto**: @bufbuild/protobuf, protoc-gen-es, protoc-gen-connect-es
- **Build**: Vite 5 с code splitting (mobile/desktop chunks)
- **Реалтайм**: BiDi gRPC стримы (чат), Server Streaming (AI, уведомления)
- **PWA**: Service Worker, push уведомления
- **E2EE**: RSA-OAEP 2048 + AES-GCM 256 (Web Crypto API)
- **WebRTC**: Peer connection, STUN/TURN servers, callSession signaling

## Паттерны

### Code Splitting
Каждый экран: `Screen.tsx` (router) → lazy `.mobile.tsx` / `.desktop.tsx`.
Определение по `window.innerWidth < 768`.

### Data Flow
```
Component → Hook → grpcClient (singleton) → gRPC-web transport → Envoy → Go server
                 ↕
           Zustand Store (normalized state)
                 ↕
           ToastContainer (error toasts from errorStore)
```

### Auth Flow
```
1. signInV2(username, password) → access_token (15 мин) + refresh_token (30 дней)
2. Каждый gRPC запрос: Authorization: Bearer <access_token>
3. access истёк → RefreshToken(refresh_token) → новые токены (rotation)
   - 10s timeout на refresh RPC
   - 10s timeout на waiter promises (параллельные запросы)
4. Токены в localStorage → автоматическое восстановление сессии
5. При permanent fail → logout + reload
6. Клик на логотип "Лава" → window.location.reload() — interceptor рефрешит токен
```

### gRPC Interceptor (с очередью + таймаутами)
- **Очередь запросов**: если токен протух и уже идёт refresh — запросы ждут в `refreshWaiters[]` (макс 10s), потом используют свежий токен
- **10s timeout**: refresh RPC и waiter promises — предотвращает бесконечное зависание
- `isRefreshing` флаг — предотвращает параллельные refresh
- `refreshFailedAt` — 30s cooldown после неудачного refresh
- `permanentFail` — блокирует все запросы после permanent failure
- Stale token fallback — токен всегда attached к запросу
- Экспоненциальный retry (3 попытки) для network/server ошибок
- Классификация ошибок: network | auth | rate_limit | server | unknown

### Logout Flow (v0.1.9.5)
```
handleLogout:
  1. logout() — clear authStore + localStorage (мгновенно)
  2. grpcClient.disconnect() — abort все стримы
  3. Clear all caches (caches.keys → delete)
  4. Unregister все service workers
  5. window.location.href = '/' — чистый redirect
```

### Update Flow (v0.1.9.5)
```
handleUpdate:
  1. localStorage.removeItem('app_version')
  2. Clear all caches (caches.keys → delete)
  3. Unregister все service workers
  4. window.location.href = '/' — чистый redirect
```

### Message V2 (oneof content)
```typescript
// Правильное создание запроса:
const request = new SendMessageV2Request({
  roomId,
  content: { case: 'text', value: text },
})
// НЕ используйте any-тип — oneof не сериализуется корректно
```

### Reactions Flow
```
1. setReactionV2(messageId, emoji) → сервер сохраняет в JSONB, возвращает { success, reactions }
2. toggleReaction обновляет локальное состояние из response (optimistic update)
3. Сервер broadcast: Broadcast() → v1 WebSocket + BroadcastV2Reaction() → ChatV2 stream
4. ChatV2 stream handler: REACTION_V2 → callback({ type: 'reaction_update', messageId, reactions })
5. useChatMessages: updateMessage(messageId, { reactions }) → UI обновляется
```

### E2EE Flow
```
1. Key exchange: RSA-OAEP 2048 (public key → server)
2. Shared key: AES-GCM 256 (обмен через exchangeSecretKey)
3. Message encryption: AES-GCM(plaintext, sharedKey) → base64
4. Send: { isE2ee: true, e2eePayload: base64 ciphertext }
5. Receive: base64 → AES-GCM decrypt → plaintext
```

## Серверная инфраструктура (13.140.25.249)

| Сервис | Порт | Описание |
|--------|------|----------|
| Nginx | 80 | /web → dist, /messenger → envoy:9090, /info /health → 8082 |
| Envoy | 9090 | gRPC-web proxy → gRPC backend 50051 |
| Lavender Server | 50051 (prod), 50052 (dev) | systemd `lavender-server` |
| HTTP API | 8082 (prod), 8083 (dev) | uploads, /info, /health, /files, /turn-credentials |

- **SSH**: `lava` (root@13.140.25.249, key `~/.ssh/lava`)
- **Envoy quirk**: `--network host`, `chmod 644`, всегда `docker rm -f` перед запуском
- **DB prod**: `chat_db` (user: paveld, host: localhost)
- **DB dev**: `chat_db_dev` (user: lavender, host: localhost)

## Типы экранов

| Экран | Mobile | Desktop | Описание |
|-------|--------|---------|----------|
| AuthScreen | ✅ | ✅ | Вход/регистрация + password reset |
| ChatListScreen | ✅ | ✅ | Список чатов + сайдбар |
| ChatScreen | ✅ | ✅ | Чат с сообщениями + reactions + media |
| AIChatsScreen | ✅ | ✅ | AI чаты v2 + агенты + marketplace |
| ContactsScreen | ✅ | — | Контакты + каталог |
| ProfileScreen | ✅ | ✅ | Профиль (модал) |
| SettingsScreen | ✅ | — | Настройки |
| SearchScreen | ✅ | — | Поиск чатов |
| NotificationsScreen | ✅ | ✅ | Уведомления + native notifications |
| PinnedMessagesScreen | ✅ | — | Закреплённые |
| ArchiveScreen | ✅ | — | Архив |
| FavoritesScreen | ✅ | ✅ | Избранное (self-chat) |
| SecretChatScreen | ✅ | ✅ | E2EE ключевой обмен |
| CallScreen | ✅ | ✅ | WebRTC звонок |
| AdminPanel | — | ✅ | Панель администратора (только desktop) |
| CompanyProfileScreen | ✅ | ✅ | Управление компанией (позиции, участники, чаты) |

## Resilience

- **Graceful shutdown**: обработка `SERVER_SHUTTINGDOWN` из стрима
- **Auto-reconnect**: exponential backoff (макс 30с)
- **Offline mode**: индикаторы + показ кэшированных данных
- **Health polling**: GET `/health` при ошибках подключения
- **Auth recovery**: permanent fail → logout + reload
- **Auth timeout**: 10s timeout на refresh RPC + waiter promises (v0.1.9.5)
- **Logout reliability**: logout делает disconnect() сначала, не ждёт signOut (v0.1.9.5)
- **Auto update**: version.json polling → UpdateBanner → SW unregister + cache clear → redirect

## Testing

- **Framework**: Vitest + @testing-library/react + jsdom
- **Setup**: `src/test/setup.ts` (localStorage mock, fetch mock, IntersectionObserver mock)
- **Run**: `npm test` (single run), `npm run test:watch` (watch mode)
- **Coverage**: `npm run test:coverage`
- **Test files**: colocated with source as `*.test.ts(x)`
