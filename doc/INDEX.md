# Lava Messenger Web Client — Документация

**Версия:** v0.4.0
**Дата:** 2026-06-14
**Статус:** 🟢 Auth V2 работает + Desktop UI + i18n

---

## Быстрый старт

1. **PROMPT.md** — промпт для новой сессии (полный контекст проекта)
2. **ARCHITECTURE.md** — полная архитектура, авторизация, gRPC, iOS оптимизации
3. **TASKS.md** — таск-трекер с текущим статусом
4. **CHANGELOG.md** — история изменений

---

## Документация

### Архитектура и код

| Файл | Назначение | Когда читать |
|------|-----------|-------------|
| `PROMPT.md` | Промпт для новой сессии, полный контекст | **В начале каждой сессии** |
| `ARCHITECTURE.md` | Полная архитектура, авторизация, gRPC-web, iOS оптимизации, PWA | **Всегда в начале** |
| `CODEBASE.md` | Детальное описание каждого модуля, типов, хуков, компонентов | **При работе с кодом** |
| `IOS.md` | iOS Safari: SafeArea, bounce, клавиатура, stream lifecycle | **При iOS-разработке** |
| `STATE.md` | Zustand store: нормализация, actions, selectors | **При работе с state** |
| `GRPC.md` | gRPC клиент: singleton, streaming, lifecycle | **При работе с API** |
| `SERVER_INTEGRATION.md` | gRPC API сервера, gRPC-web proxy, Nginx | **При интеграции с сервером** |
| `GRPC_WEB_PROXY.md` | gRPC-web proxy: архитектура, настройка, отладка | **При проблемах с gRPC** |
| `ANDROID_PARITY.md` | Соответствие Android-клиенту | При реализации UI |
| `PITFALLS.md` | Подводные камни | **Перед началом работы** |
| `LAVA_CONTEXT.md` | Контекст проекта: сервер, AI, инфраструктура | **Для общего понимания** |

### Разработка

| Файл | Назначение | Когда читать |
|------|-----------|-------------|
| `TASKS.md` | Таск-трекер по фазам | В начале сессии |
| `CHANGELOG.md` | История изменений | При релизе |

---

## Документация проекта Lava (сервер)

| Файл | Назначение |
|------|-----------|
| `/root/msg/doc/INDEX.md` | Полный индекс документации |
| `/root/msg/doc/AUTHSERVICE_V2.md` | AuthService V2: JWT + device management |
| `/root/msg/doc/INTEGRATION_SESSION.md` | Текущий статус, версии, архитектура |
| `/root/msg/doc/TASKS.md` | Таск-трекер сервера и Android |

---

## Связанные проекты

| Проект | Путь | Версия | Документация |
|--------|------|--------|-------------|
| Dev сервер | `/root/msg/` | v1.1.4.0 | `/root/msg/doc/` |
| Prod сервер | `/root/LavenderMessenger/run/` | v1.1.3.10 | `/root/msg/doc/` |
| Android | `/root/msg.client.android/` | v1.1.3.10 | `/root/msg/doc/` (общие) |
| iOS | `/root/msg.client.ios/` | — | `/root/msg.client.ios/doc/` |
| **Web Client** | **/root/msg.client.web** | **v0.4.0** | **/root/msg.client.web/doc/** |

---

## Версионирование

- Версия сервера (dev): `server.go` (const ServerVersion)
- Версия Web: `package.json` → version field
- Версия Android: `version.txt`
