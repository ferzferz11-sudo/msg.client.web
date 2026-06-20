# Lavender Messenger Web Client

Веб-клиент мессенджера Lavender. React 18 + TypeScript + Vite + gRPC-web.

## Быстрый старт

```bash
npm install
npm run dev          # dev server на :3000
npm run build        # production build в dist/
npm run proto:generate  # regen proto из proto/messenger.proto
./deploy.sh          # build + deploy на сервер
```

## Сервер

| | Prod | Dev |
|---|---|---|
| gRPC | `13.140.25.249:50051` | `13.140.25.249:50052` |
| HTTP | `13.140.25.249:8082` | `13.140.25.249:8083` |
| Web client | `http://13.140.25.249/web/` | — |

Nginx проксирует:
- `/web/` → статика `dist/`
- `/messenger/` → Envoy → gRPC backend (9090→50051)
- `/info`, `/health`, `/files/` → HTTP API (8082)

## Структура проекта

```
src/
├── App.tsx                    # Root: auth gate, routing, resilience banners
├── main.tsx                   # React mount
├── components/
│   ├── auth/                  # Login/signup (mobile + desktop)
│   ├── chatList/              # Chat list (mobile + desktop)
│   ├── chat/                  # Chat screen (mobile + desktop)
│   ├── aiChats/               # AI v2 chat (mobile + desktop)
│   ├── contacts/              # Contacts + user directory
│   ├── profile/               # Profile modal
│   ├── settings/              # Settings screen
│   ├── search/                # Chat search
│   ├── notifications/         # Notification history
│   ├── pinned/                # Pinned messages
│   ├── archive/               # Archived chats
│   └── common/                # Screen layout wrapper
├── hooks/                     # Custom hooks (useChats, useChatMessages, etc.)
├── store/                     # Zustand stores (auth, chat, error)
├── shared/
│   ├── types/                 # TypeScript interfaces + i18n
│   └── api/
│       ├── grpcClient.ts      # Singleton gRPC-web client (30+ methods)
│       └── gen/proto/         # Auto-generated from proto
├── styles/global.css          # CSS reset, iOS optimizations, animations
└── gen/                       # Legacy proto stubs (unused)
```

## Документация

| Файл | Описание |
|------|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Архитектура, стек, паттерны |
| [API.md](API.md) | Все gRPC методы клиента |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Деплой на сервер |
| [CHANGELOG.md](CHANGELOG.md) | История версий |
