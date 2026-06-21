# Архитектура

## Стек

- **UI**: React 18 + TypeScript + CSS-in-JS (inline styles)
- **State**: Zustand (authStore, chatStore, errorStore)
- **API**: gRPC-web через @connectrpc/connect + @connectrpc/connect-web
- **Proto**: @bufbuild/protobuf, protoc-gen-es, protoc-gen-connect-es
- **Build**: Vite 5 с code splitting (mobile/desktop chunks)
- **Реалтайм**: BiDi gRPC стримы (чат), Server Streaming (AI, уведомления)
- **PWA**: Service Worker, push уведомления

## Паттерны

### Code Splitting
Каждый экран: `Screen.tsx` (router) → lazy `.mobile.tsx` / `.desktop.tsx`.
Определение по `window.innerWidth < 768`.

### Data Flow
```
Component → Hook → grpcClient (singleton) → gRPC-web transport → Envoy → Go server
                 ↕
           Zustand Store (normalized state)
```

### Auth Flow
```
1. signInV2(username, password) → access_token (15 мин) + refresh_token (30 дней)
2. Каждый gRPC запрос: Authorization: Bearer <access_token>
3. access истёк → RefreshToken(refresh_token) → новые токены
4. Токены в localStorage → автоматическое восстановление сессии
```

### gRPC Interceptor
- `isRefreshing` флаг блокирует рекурсию (refreshToken сам проходит через interceptor)
- `refreshFailedAt` — 30s cooldown после неудачного refresh
- Stale token fallback — токен всегда attached к запросу
- Экспоненциальный retry (3 попытки) для network/server ошибок
- Классификация ошибок: network | auth | rate_limit | server | unknown

## Серверная инфраструктура (13.140.25.249)

| Сервис | Порт | Описание |
|--------|------|----------|
| Nginx | 80 | /web → dist, /messenger → envoy:9090, /info /health → 8082 |
| Envoy | 9090 | gRPC-web proxy → gRPC backend 50051 |
| Lavender Server | 50051 (prod), 50052 (dev) | systemd `lavender-server` |
| HTTP API | 8082 (prod), 8083 (dev) | uploads, /info, /health, /files |

- **SSH**: `lava` (root@13.140.25.249, key `~/.ssh/lava`)
- **Envoy quirk**: `--network host`, `chmod 644`, всегда `docker rm -f` перед запуском
- **DB prod**: `chat_db` (user: paveld, host: localhost)
- **DB dev**: `chat_db_dev` (user: lavender, host: localhost)

## Типы экранов

| Экран | Mobile | Desktop | Описание |
|-------|--------|---------|----------|
| AuthScreen | ✅ | ✅ | Вход/регистрация |
| ChatListScreen | ✅ | ✅ | Список чатов + сайдбар |
| ChatScreen | ✅ | ✅ | Чат с сообщениями |
| AIChatsScreen | ✅ | ✅ | AI чаты v2 + агенты |
| ContactsScreen | ✅ | — | Контакты + каталог |
| ProfileScreen | ✅ | ✅ | Профиль (модал) |
| SettingsScreen | ✅ | — | Настройки |
| SearchScreen | ✅ | — | Поиск чатов |
| NotificationsScreen | ✅ | — | Уведомления |
| PinnedMessagesScreen | ✅ | — | Закреплённые |
| ArchiveScreen | ✅ | — | Архив |
| FavoritesScreen | ✅ | ✅ | Избранное (self-chat) |

## Resilience

- **Graceful shutdown**: обработка `SERVER_SHUTTINGDOWN` из стрима
- **Auto-reconnect**: exponential backoff (макс 30с)
- **Offline mode**: индикаторы + показ кэшированных данных
- **Health polling**: GET `/health` при ошибках подключения
