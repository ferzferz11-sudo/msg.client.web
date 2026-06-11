# Lavender Messenger Web Client — Задачи

Таск-трекер проекта веб-клиента.

**Версия:** v0.2.0
**Дата:** 2026-06-11
**Статус:** 🟡 Ожидает AuthService на сервере

---

## ✅ Завершённые фазы

### Фаза 0: Инициализация проекта
- [x] Vite + React + TypeScript
- [x] Zustand, path aliases
- [x] index.html с iOS meta tags
- [x] Глобальные CSS (SafeArea, bounce, scroll, animations)

### Фаза 1: gRPC клиент
- [x] Синглтон grpcClient
- [x] Unary calls: getChats, getHistory, sendMessage, createDirectChat, createGroupChat
- [x] Server streaming: streamChatMessages
- [x] Auth interceptor (Bearer token из Zustand)

### Фаза 2: State Management
- [x] Zustand store с нормализованной структурой
- [x] authStore (user, accessToken, isAuthenticated) + localStorage persist
- [x] chatStore (chats, messages, chatMessages)

### Фаза 3: Хуки
- [x] useChats, useChatMessages, useGrpcStream, useIOSKeyboard, usePushNotifications

### Фаза 4: UI компоненты
- [x] Screen, ChatListScreen, ChatList, ChatScreen
- [x] AuthScreen (iOS-style login/signup form)
- [x] Code splitting для всех компонентов

### Фаза 5: iOS оптимизации
- [x] Safe Area, bounce prevention, momentum scroll
- [x] Keyboard handling, stream lifecycle
- [x] PWA manifest, Service Worker, Web Push

### Фаза 6: Protobuf + gRPC-web
- [x] messenger.proto скопирован с сервера
- [x] AuthService добавлен в proto (SignIn, SignUp, RefreshToken, Logout)
- [x] Код сгенерирован через buf generate
- [x] grpc-web-proxy.js (Node.js прокси)

---

## 🔴 Блокирующая задача (выполняется на сервере)

### AuthService на сервере
Сервер должен реализовать `AuthService` с методами `SignIn` и `SignUp`.

**После завершения на сервере:**

1. **Обновить web-клиент для работы с реальным AuthService**
   - Заменить mock вызовы на реальные gRPC вызовы
   - Протестировать signIn/signUp flow
   - Убедиться что токен сохраняется в Zustand + localStorage

2. **Настроить gRPC-web proxy**
   - Установить Envoy или grpcwebproxy для трансляции HTTP/1.1 ↔ HTTP/2
   - Настроить Nginx как reverse proxy
   - Протестировать CORS заголовки

3. **Обновить документацию API**
   - Описать AuthService методы
   - Описать формат токенов
   - Описать обработку ошибок

---

## 📋 Фаза 7: Интеграция с реальным сервером (после AuthService)

- [ ] Подключить web-клиент к реальному серверу
- [ ] Протестировать signIn/signUp flow end-to-end
- [ ] Обработка ошибок (network, auth, rate limit)
- [ ] Retry с exponential backoff
- [ ] Автоматический refresh токена

---

## 📋 Фаза 8: AI чаты

- [ ] AIChatView — единый компонент для OWL и Hermes
- [ ] Стриминг AI ответов (ChatWithAI)
- [ ] Индикатор набора текста для AI
- [ ] Настройки AI (API key, model)
- [ ] Rate limit indicator в хедере
- [ ] Hermes: список агентов, переключение

---

## 📋 Фаза 9: Контакты и профиль

- [ ] Список контактов
- [ ] Добавление контакта
- [ ] Профиль пользователя
- [ ] Аватар (загрузка/отображение)

---

## 📋 Фаза 10: Настройки и темы

- [ ] Настройки сервера (адрес, порт)
- [ ] Переключение тем (светлая/тёмная)
- [ ] Кастомные темы
- [ ] Язык (RU/EN)

---

## 📋 Фаза 11: E2EE (секретные чаты)

- [ ] ECDH обмен ключами через WebCrypto
- [ ] AES-256-GCM шифрование
- [ ] Индикатор E2EE в чате

---

## 📋 Фаза 12: Полировка

- [ ] Виртуализация списков (react-virtuoso)
- [ ] Pull-to-refresh
- [ ] Infinite scroll для истории
- [ ] Поиск по сообщениям
- [ ] Копирование сообщения
- [ ] Reply / Forward
- [ ] Реакции на сообщения
- [ ] Файлы и изображения
- [ ] Голосовые сообщения
- [ ] Offline mode (Service Worker)
- [ ] Web Push уведомления
- [ ] Accessibility (a11y)

---

## 📋 Бэклог

- [ ] WebRTC звонки
- [ ] Групповые чаты (создание, управление)
- [ ] Боты и команды
- [ ] Интеграция с Hermes Orchestrator

---

## Архитектура проекта

```
msg.client.web/
├── proto/messenger.proto          # API definition (copied from server)
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service Worker (push notifications)
│   └── icons/                     # PWA icons
├── src/
│   ├── main.tsx                   # Entry point
│   ├── App.tsx                    # Root component (auth + routing)
│   ├── styles/global.css          # Global iOS styles
│   ├── shared/
│   │   ├── types/index.ts         # TypeScript types
│   │   └── api/
│   │       ├── grpcClient.ts      # gRPC-web client + auth interceptor
│   │       └── gen/proto/         # Generated protobuf code
│   │           ├── messenger_pb.ts
│   │           └── messenger_connect.ts
│   ├── store/
│   │   ├── authStore.ts           # Auth state (Zustand + persist)
│   │   └── chatStore.ts           # Chat state (Zustand, normalized)
│   ├── hooks/
│   │   ├── useChats.ts
│   │   ├── useChatMessages.ts
│   │   ├── useGrpcStream.ts
│   │   ├── useIOSKeyboard.ts
│   │   └── usePushNotifications.ts
│   └── components/
│       ├── auth/
│       │   ├── AuthScreen.tsx     # Code splitting entry
│       │   ├── AuthScreen.mobile.tsx
│       │   └── AuthScreen.desktop.tsx
│       ├── chat/
│       │   ├── ChatScreen.tsx
│       │   ├── ChatScreen.mobile.tsx
│       │   └── ChatScreen.desktop.tsx
│       ├── chatList/
│       │   ├── ChatList.tsx
│       │   ├── ChatList.mobile.tsx
│       │   ├── ChatListScreen.tsx
│       │   ├── ChatListScreen.mobile.tsx
│       │   └── ChatListScreen.desktop.tsx
│       └── common/
│           ├── Screen.tsx
│           ├── Screen.mobile.tsx
│           └── Screen.desktop.tsx
├── grpc-web-proxy.js              # Node.js gRPC-web proxy
├── buf.gen.yaml                   # Buf generation config
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Команды

```bash
# Dev server
npm run dev

# Production build
npm run build

# Generate proto code
npx buf generate

# Start gRPC-web proxy
node grpc-web-proxy.js
```

---

## Ссылки

- Сервер: `/root/msg/`
- Android клиент: `/root/msg.client.android/`
- Документация сервера: `/root/msg/doc/`
