# Lavender Messenger Web Client — Changelog

## v0.2.1 (2026-06-11)

### Добавлено
- **AuthService интеграция**: веб-клиент подключён к реальному AuthService на сервере
- **Proto синхронизация**: messenger.proto обновлён с сервера (добавлены User, SignInRequest, SignUpRequest, AuthResponse, AuthService)
- **gRPC-web proxy**: Nginx проксирует `/messenger` → Envoy (9090) → gRPC сервер (50051)
- **Production деплой**: веб-клиент доступен через `/web` на сервере

### Изменёнено
- grpcClient теперь использует относительный путь `/messenger` вместо прямого подключения к порту 9090
- AuthScreen упрощён — убрано поле serverAddress (теперь используется относительный путь)
- authStore обновлён — убраны поля refreshToken (не поддерживается сервером)

### Исправлено
- Сгенерированный TS код теперь включает AuthService, SignInRequest, SignUpRequest, AuthResponse, User

---

## v0.2.0 (2026-06-11)

### Добавлено
- **AuthService**: Новый сервис авторизации (SignIn, SignUp, RefreshToken, Logout)
- **authStore**: Zustand store для состояния авторизации с localStorage persist
- **AuthInterceptor**: gRPC-web interceptor для автоматической подстановки Bearer токена
- **AuthScreen**: iOS-style экран входа/регистрации
- **Protected routing**: Редирект на авторизацию если не аутентифицирован
- **gRPC-web proxy**: Node.js прокси для трансляции HTTP/1.1 ↔ HTTP/2
- **PWA**: manifest.json, Service Worker, Web Push
- **Virtual scroll**: react-virtuoso для списка сообщений
- **Code splitting**: React.lazy для всех компонентов

### Изменено
- Message types обновлены для соответствия proto (roomId, user, text)
- grpcClient теперь использует сгенерированный код из proto

### Известные проблемы
- AuthService пока не реализован на сервере (блокирующая задача)
- gRPC-web proxy требует Envoy или grpcwebproxy для production

---

## v0.1.0 (2026-06-10)

### Добавлено
- Базовая структура проекта (Vite + React + TypeScript)
- Zustand store для состояния чатов
- gRPC-web client (mock реализация)
- UI компоненты (ChatList, ChatScreen, MessageBubble)
- iOS оптимизации (SafeArea, bounce prevention, keyboard handling)
- Code splitting для мобильной и десктопной версий
