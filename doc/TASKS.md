# Lava Messenger Web Client — Задачи

Таск-трекер проекта веб-клиента.

**Версия:** v0.4.0
**Дата:** 2026-06-14
**Статус:** 🟢 Auth V2 работает + Desktop UI + i18n + Dev proxy

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
- [x] authStore (user, tokens, isAuthenticated) + localStorage persist
- [x] chatStore (chats, messages, chatMessages)
- [x] errorStore (глобальные ошибки, network status)

### Фаза 3: Хуки
- [x] useChats, useChatMessages, useGrpcStream, useIOSKeyboard, usePushNotifications

### Фаза 4: UI компоненты
- [x] Screen, ChatListScreen, ChatList, ChatScreen
- [x] AuthScreen (iOS-style login/signup form)
- [x] Code splitting mobile/desktop для всех компонентов

### Фаза 5: iOS оптимизации
- [x] Safe Area, bounce prevention, momentum scroll
- [x] Keyboard handling, stream lifecycle
- [x] PWA manifest, Service Worker, Web Push

### Фаза 6: Protobuf + gRPC-web
- [x] messenger.proto скопирован с сервера
- [x] AuthService V2 добавлен в proto
- [x] Код сгенерирован через buf generate
- [x] grpc-web-proxy.cjs (Node.js прокси с V2 поддержкой)

---

## ✅ Фаза 7: Интеграция с реальным сервером

- [x] Подключить web-клиент к реальному AuthService V2
- [x] Proto синхронизирован с сервером (messenger.proto)
- [x] grpcClient использует реальный AuthService V2 (SignInV2/SignUpV2)
- [x] AuthScreen работает с V2 API (success/accessToken/refreshToken/user)
- [x] Production билд собирается
- [x] Nginx настроен для /web и /messenger (gRPC-web proxy)
- [x] AuthService V2 — JWT токены (access + refresh)
- [x] Автоматический refresh access token (за 5 мин до истечения)
- [x] Device info передаётся при login/signup (deviceId, deviceName, deviceType)
- [x] Token rotation при refresh
- [x] SignOut + RevokeDevice
- [x] Обработка ошибок (network, auth, rate limit) — errorStore + классификация
- [x] Retry с exponential backoff (3 попытки, baseDelay 500-1000ms)
- [x] Stream error handling — error callback + error store notification
- [x] **Авторизация работает** ✅ (проверено на dev сервере)
- [ ] Секция управления устройствами в настройках

---

## ✅ Фаза 7.5: Desktop UI

- [x] Screen.desktop — полноценный flex layout
- [x] ChatListScreen.desktop — sidebar + main area (двухпанельный layout)
- [x] ChatList.desktop — список чатов в sidebar с hover/active состояниями
- [x] ChatScreen.desktop — чат с сообщениями, инпутом, хедером
- [x] AuthScreen.desktop — форма входа/регистрации V2
- [x] App.tsx — десктоп рендерит ChatListScreen напрямую
- [ ] Адаптивность sidebar (ресайз, сворачивание)
- [ ] Горячие клавиши (Ctrl+K поиск, Escape и т.д.)

---

## ✅ Фаза 7.5b: Локализация (i18n)

- [x] Система локализации `t()`, `detectLang()` в shared/types
- [x] Переводы: appName, loginTitle, signupTitle, placeholders, buttons, errors
- [x] Переключатель языка EN/RU в AuthScreen
- [x] Автоопределение языка по navigator.language
- [x] Переименование: Lavender → Lava (EN) / Лава (RU)
- [ ] Перевести остальные компоненты (ChatListScreen, ChatScreen, Settings)

---

## 📋 Фаза 8: Список чатов и сообщения

- [x] useChats — загрузка списка чатов
- [x] useChatMessages — загрузка истории + real-time streaming
- [ ] Интеграция ChatList с реальными данными (getChats)
- [ ] Интеграция ChatScreen с реальными данными (getHistory, sendMessage, stream)
- [ ] Индикаторы загрузки / пустые состояния
- [ ] Unread count, last message preview
- [ ] Статусы online/offline

---

## 📋 Фаза 9: AI чаты

- [ ] AIChatView — единый компонент для OWL и Hermes
- [ ] Стриминг AI ответов (ChatWithAI)
- [ ] Индикатор набора текста для AI
- [ ] Настройки AI (API key, model)
- [ ] Rate limit indicator в хедере
- [ ] Hermes: список агентов, переключение

---

## 📋 Фаза 10: Контакты и профиль

- [ ] Список контактов
- [ ] Добавление контакта
- [ ] Профиль пользователя
- [ ] Аватар (загрузка/отображение)

---

## 📋 Фаза 11: Настройки и темы

- [ ] Настройки сервера (адрес, порт)
- [ ] Переключение тем (светлая/тёмная)
- [ ] Кастомные темы
- [ ] Управление устройствами (RevokeDevice, SignOut all)
- [ ] Смена пароля

---

## 📋 Фаза 12: E2EE (секретные чаты)

- [ ] ECDH обмен ключами через WebCrypto
- [ ] AES-256-GCM шифрование
- [ ] Индикатор E2EE в чате

---

## 📋 Фаза 13: Полировка

- [ ] Pull-to-refresh (mobile)
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

## Текущая конфигурация

| Компонент | Адрес | Статус |
|-----------|-------|--------|
| Dev сервер gRPC | `127.0.0.1:50052` | ✅ Работает |
| Prod сервер gRPC | `127.0.0.1:50051` | ⬜ Старая версия |
| gRPC-web proxy | `127.0.0.1:9090` | ✅ Работает → dev |
| Веб-клиент SPA | `/web` (Nginx) | ✅ Работает |

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
│   │   ├── types/index.ts         # TypeScript types + i18n
│   │   └── api/
│   │       ├── grpcClient.ts      # gRPC-web client + auth interceptor + retry
│   │       └── gen/proto/         # Generated protobuf code
│   ├── store/
│   │   ├── authStore.ts           # Auth state (Zustand + persist, V2 JWT)
│   │   ├── chatStore.ts           # Chat state (Zustand, normalized)
│   │   └── errorStore.ts          # Global errors + network status
│   ├── hooks/
│   │   ├── useChats.ts
│   │   ├── useChatMessages.ts
│   │   ├── useGrpcStream.ts
│   │   ├── useIOSKeyboard.ts
│   │   └── usePushNotifications.ts
│   └── components/
│       ├── auth/                  # AuthScreen (entry, mobile, desktop)
│       ├── chat/                  # ChatScreen (entry, mobile, desktop)
│       ├── chatList/              # ChatList + ChatListScreen (entry, mobile, desktop)
│       └── common/                # Screen (entry, mobile, desktop)
├── grpc-web-proxy.cjs             # Node.js gRPC-web proxy (V2)
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

# Production build (+ chmod fix)
npm run build

# Generate proto code
npx buf generate

# Start gRPC-web proxy
node grpc-web-proxy.cjs
```

---

## Ссылки

- Dev сервер: `/root/msg/` (порт 50052)
- Документация сервера: `/root/msg/doc/`
- AuthService V2 docs: `/root/msg/doc/AUTHSERVICE_V2.md`
- Android клиент: `/root/msg.client.android/`
- iOS клиент: `/root/msg.client.ios/`
- macOS клиент: `/root/msg.client.macos/`
