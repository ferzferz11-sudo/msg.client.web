# Lavender Messenger Web Client — Архитектура

Полная документация по архитектуре веб-клиента Lavender Messenger.

**Статус:** v0.1.0 — базовая реализация (мобильный чат)
**Дата:** 2026-06-10
**Стек:** React 18 + TypeScript + Vite 5 + Zustand 4

---

## 1. Технологический стек (финальный)

| Технология | Версия | Назначение |
|-----------|--------|-----------|
| React | 18.3 | UI фреймворк |
| TypeScript | 5.5 | Типизация |
| Vite | 5.4 | Сборка, dev server, code splitting |
| Zustand | 4.5 | State management |

**Почему не grpc-web:** На данном этапе используется mock-реализация gRPC клиента. В production будет использован grpc-web через Envoy proxy или REST gateway.

---

## 2. Структура проекта

```
msg.client.web/
├── index.html                    # Entry HTML (iOS meta tags)
├── package.json                  # Dependencies
├── vite.config.ts                # Vite config + path aliases (@/*)
├── tsconfig.json                 # TypeScript strict mode
├── .gitignore
├── doc/                          # Документация
│   ├── INDEX.md                  # ← этот файл
│   ├── ARCHITECTURE.md
│   ├── CODEBASE.md               # Подробное описание кодовой базы
│   ├── IOS.md                    # iOS-специфичные решения
│   ├── STATE.md                  # Управление состоянием (Zustand)
│   ├── GRPC.md                   # gRPC клиент и стриминг
│   ├── SERVER_INTEGRATION.md     # Интеграция с сервером
│   ├── ANDROID_PARITY.md         # Соответствие Android-клиенту
│   ├── PITFALLS.md               # Подводные камни
│   └── TASKS.md                  # Таск-трекер
└── src/
    ├── main.tsx                  # React entry point
    ├── App.tsx                   # Root компонент + роутинг
    ├── styles/
    │   └── global.css            # Глобальные стили (iOS reset, SafeArea, animations)
    ├── shared/
    │   ├── types/
    │   │   └── index.ts          # TypeScript типы (Chat, Message, User, Agent, etc.)
    │   └── api/
    │       └── grpcClient.ts     # gRPC клиент-синглтон (mock)
    ├── store/
    │   └── chatStore.ts          # Zustand store (нормализованный)
    ├── hooks/
    │   ├── index.ts              # Экспорт всех хуков
    │   ├── useChats.ts           # Загрузка списка чатов
    │   ├── useChatMessages.ts    # История + стриминг + отправка
    │   ├── useGrpcStream.ts      # Lifecycle gRPC стрима (iOS background!)
    │   └── useIOSKeyboard.ts     # Обработка клавиатуры iOS
    └── components/
        ├── common/
        │   ├── index.ts
        │   ├── Screen.tsx         # Code splitting entry (matchMedia < 768)
        │   ├── Screen.mobile.tsx  # Базовый layout (header + content + footer)
        │   └── Screen.desktop.tsx # Заглушка
        ├── chatList/
        │   ├── ChatList.tsx              # Code splitting entry
        │   ├── ChatList.mobile.tsx       # Список чатов (аватары, время, unread)
        │   ├── ChatList.desktop.tsx      # Заглушка
        │   ├── ChatListScreen.tsx        # Code splitting entry
        │   ├── ChatListScreen.mobile.tsx # Экран списка чатов + хедер
        │   └── ChatListScreen.desktop.tsx# Заглушка
        └── chat/
            ├── index.ts
            ├── ChatScreen.tsx             # Code splitting entry
            ├── ChatScreen.mobile.tsx      # Экран чата (хедер, сообщения, инпут)
            └── ChatScreen.desktop.tsx     # Заглушка
```

---

## 3. Code Splitting — паттерн

Каждый компонент следует единому паттерну из 3 файлов:

```
Component.tsx            ← React.lazy + matchMedia(768) → выбор загрузки
Component.mobile.tsx     ← Основная реализация (мобильная)
Component.desktop.tsx    ← Минимальная заглушка
```

**Screen.tsx (пример):**
```typescript
const MobileScreen = createLazyLoader(() => import('./Screen.mobile'))
const DesktopScreen = createLazyLoader(() => import('./Screen.desktop'))

export function ChatList(props: ChatListProps) {
  if (isMobile()) {
    return (
      <Suspense fallback={...}>
        <MobileChatList {...props} />
      </Suspense>
    )
  }
  return (
    <Suspense fallback={...}>
      <DesktopChatList {...props} />
    </Suspense>
  )
}
```

**Результат сборки (vite build):**
```
dist/assets/Screen.mobile-CjnQffzr.js             0.52 kB
dist/assets/ChatList.mobile-DEXI5gHS.js           2.44 kB
dist/assets/ChatListScreen.mobile-BkvMrEQp.js     2.31 kB
dist/assets/ChatScreen.mobile-XLDaPCje.js         7.80 kB
dist/assets/chatStore-BKFQKilm.js                 6.46 kB
dist/assets/vendor-DsceW-4w.js                  140.86 kB  (React)
dist/assets/Screen.desktop-CfcofHzY.js            0.31 kB
dist/assets/ChatList.desktop-m1ToXg2t.js          0.27 kB
dist/assets/ChatScreen.desktop-RFBSG4uD.js        0.27 kB
dist/assets/ChatListScreen.desktop-DPwY7nkJ.js    0.31 kB
```

Мобильные компоненты загружаются только на мобильных, десктопные — только на десктопе.

---

## 4. Роутинг

Простой state-based роутинг в `App.tsx`:

```typescript
type Screen = 'chatList' | 'chat'

// Переход в чат:
setActiveChatId(chatId)
setCurrentScreen('chat')

// Возврат:
setCurrentScreen('chatList')
setActiveChatId(null)
```

Анимация перехода через CSS: `screen-enter` (slideInFromRight 0.25s).

---

## 5. Поток данных

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│  ┌─────────────────────┐    ┌──────────────────────────┐    │
│  │   ChatListScreen     │    │      ChatScreen           │    │
│  │   (useChats hook)    │───▶│  (useChatMessages hook)  │    │
│  └──────────┬───────────┘    └──────────┬───────────────┘    │
│             │                           │                    │
│             ▼                           ▼                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Zustand Store (chatStore.ts)             │    │
│  │  chats: { [id]: Chat }                               │    │
│  │  messages: { [id]: Message }                         │    │
│  │  chatMessages: { [chatId]: string[] }                │    │
│  └──────────────────────────┬───────────────────────────┘    │
│                             │                                │
│                             ▼                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │           useGrpcStream (lifecycle hook)              │    │
│  │  - visibilitychange → close/reopen stream             │    │
│  │  - pagehide/pageshow → close/reopen stream            │    │
│  │  - unmount → abort controller                         │    │
│  └──────────────────────────┬───────────────────────────┘    │
│                             │                                │
│                             ▼                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         gRPC Client Singleton (grpcClient.ts)         │    │
│  │  - connect/disconnect                                 │    │
│  │  - getChats, getMessages, sendMessage (unary)         │    │
│  │  - streamChatMessages (server-side streaming)         │    │
│  │  - streamAllMessages (presence updates)               │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Мок-данные

В `grpcClient.ts` определены 4 тестовых чата:

| ID | Имя | Тип | Сообщения |
|----|-----|-----|----------|
| chat-1 | Алексей | regular | 3 (последнее входящее) |
| chat-2 | Работа | regular | 1 |
| chat-3 | OWL AI | owl | 2 |
| chat-4 | Hermes | hermes | 2 |

Мок симулирует входящие сообщения каждые 15-30 секунд через `streamChatMessages`.

---

## 7. Конфигурация

### Vite (vite.config.ts)
- Path alias: `@/` → `src/`
- Dev server: `0.0.0.0:3000`
- Build target: `es2020`
- Manual chunks: `vendor` (React)

### TypeScript (tsconfig.json)
- Strict mode: enabled
- JSX: `react-jsx` (no React import needed)
- Module resolution: `bundler`
- Path alias: `@/*` → `src/*`
