# Lavender Messenger Web Client — Архитектура

Обзор архитектуры веб-клиента Lavender Messenger.

**Статус:** проект создан, архитектура в разработке
**Дата:** 2026-06-10

---

## Цель

Веб-клиент Lavender Messenger — полноценный веб-интерфейс для мессенджера, реализующий функциональность Android-клиента в браузере.

---

## Технологический стек (планируемый)

### Frontend
- **Framework:** React 18+ или Vue 3 (TBD)
- **Language:** TypeScript
- **State Management:** Zustand / Pinia (TBD)
- **UI Library:** Material Web Components или собственная дизайн-система
- **gRPC:** grpc-web через Envoy proxy или JSON-REST адаптер
- **Build:** Vite

### Инфраструктура
- **gRPC:** grpc-web → Envoy → gRPC server
- **Альтернатива:** REST API gateway перед gRPC
- **WebSocket:** для real-time сообщений (если не grpc-web)
- **Auth:** существующая система Lavender (credential store)

---

## Структура проекта (планируемая)

```
msg.client.web/
├── doc/                    # Документация
│   ├── INDEX.md
│   ├── ARCHITECTURE.md
│   ├── SERVER_INTEGRATION.md
│   ├── ANDROID_PARITY.md
│   ├── PITFALLS.md
│   └── TASKS.md
├── src/
│   ├── components/         # UI компоненты
│   │   ├── chat/           # Чат: список, сообщения, инпут
│   │   ├── ai/             # AI чаты: OWL, Hermes
│   │   ├── settings/       # Настройки
│   │   └── common/         # Общие компоненты
│   ├── services/           # Сервисный слой
│   │   ├── grpc/           # gRPC клиент
│   │   ├── auth/           # Аутентификация
│   │   └── storage/        # LocalStorage/IndexedDB
│   ├── stores/             # State management
│   ├── proto/              # Сгенерированные proto типы
│   └── styles/             # CSS/темы
├── public/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Ключевые компоненты

### 1. gRPC клиент
- Подключение к серверу через grpc-web или REST-адаптер
- Трансляция protobuf сообщений в TypeScript типы
- Обработка streaming ответов (AI чаты)

### 2. Аутентификация
- Использование существующей системы Lavender
- CredentialStore → localStorage/IndexedDB в браузере
- Серверный адрес, ключ шифрования

### 3. Чат-система
- Список чатов (обычные + AI)
- Отправка/получение сообщений в реальном времени
- Групповые чаты, личные сообщения
- E2EE секретные чаты (если реализуем в браузере)

### 4. AI чаты
- OWL AI — стриминг ответов
- Hermes Orchestrator — маршрутизация к агентам
- История сообщений, настройки per-chat

### 5. Темы
- Поддержка тем оформления (как в Android)
- Material Design 3 токены
- Кастомные темы

---

## Потоки данных

```
┌─────────────────────────────────────────────────────────┐
│                    Web Browser                           │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Chat List   │  │  Chat View   │  │  AI Chat     │  │
│  │  Component   │  │  Component   │  │  Component   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
│  ┌──────┴─────────────────┴──────────────────┴───────┐  │
│  │              gRPC Client Service                   │  │
│  └──────────────────────┬────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────┘
                          │ grpc-web / WebSocket
┌─────────────────────────┼───────────────────────────────┐
│                    Server                                │
│  ┌──────────────────────┴────────────────────────────┐  │
│  │              Lavender gRPC Server                  │  │
│  │              (port 50051 / 50052)                  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Решения (TBD)

| Вопрос | Варианты | Статус |
|--------|----------|--------|
| Framework | React vs Vue | Не выбран |
| gRPC | grpc-web vs REST gateway | Не выбран |
| State | Zustand vs Pinia vs Redux | Не выбран |
| UI Lib | MWC vs Ant Design vs свой | Не выбран |
| E2EE | WebCrypto API vs библиотека | Не выбран |
