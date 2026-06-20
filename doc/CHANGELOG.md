# Changelog

## v1.0.0 (2026-06-20)

Полная переработка клиента под сервер Lavender v1.3.0.15.

**Proto**: синхронизация с сервером (1891 строка, 15 новых RPC)
**grpcClient**: 30+ новых методов (реакции, черновики, избранное, темы, muted, AI v2, маркетплейс, секретные чаты, bot commands)

### Экраны

- **AI Chats v2**: ChatWithAIV2 стриминг, CRUD агентов, маркетплейс, статистика
- **Chat**: реакции, редактирование/удаление, typing индикаторы, черновики, read receipts, выделение
- **ChatList**: контекстные меню, свайп-действия, mute/delete, typing в списке
- **Profile**: модал с аватар/bio/status
- **Settings**: смена username/пароля, темы, устройства, язык, danger zone
- **Contacts**: вкладки контакты + каталог с поиском

### Resilience

- Graceful shutdown обработка (SERVER_SHUTTINGDOWN)
- Автопереподключение с exponential backoff (макс 30с)
- Offline режим с индикаторами
- Capability negotiation (GET /info)

### Деплой

- deploy.sh для деплоя на сервер
- Envoy на --network host
- Nginx прокси для /info, /health, /files

### Исправления (после v1.0.0)

- Auth token expiry: use accessExpiresAt/refreshExpiresAt (не expiresAt)
- GetChatsV2: правильное имя RPC (сервер не реализует GetChats)
- /info endpoint: проксируется через nginx на порт 8082
- Логотип: заменён эмодзи на <img src="/logo.png">

---

## v0.6.0 (2026-06-19)

Адаптация к серверу v1.2.0.7: Auth V2 фиксы, новые gRPC методы.

## v0.5.0 (2026-06-18)

Реальные чаты и сообщения через gRPC-web BiDi stream.

## v0.4.0 (2026-06-17)

i18n (EN/RU), переименование проекта в Lava.

## v0.3.0 (2026-06-16)

Desktop UI, Auth V2 JWT, gRPC-web proxy.

## v0.1.0 (2026-06-14)

Начало проекта.
