# Lavender Messenger Web Client — Документация

**Версия:** v0.2.0
**Дата:** 2026-06-11

---

## Быстрый старт

1. **ARCHITECTURE.md** — полная архитектура, авторизация, gRPC, iOS оптимизации
2. **TASKS.md** — таск-трекер с текущим статусом
3. **CHANGELOG.md** — история изменений

---

## Документация

### Архитектура и код

| Файл | Назначение | Когда читать |
|------|-----------|-------------|
| `ARCHITECTURE.md` | Полная архитектура, авторизация, gRPC-web, iOS оптимизации, PWA | **Всегда в начале** |
| `CODEBASE.md` | Детальное описание каждого модуля, типов, хуков, компонентов | **При работе с кодом** |
| `IOS.md` | iOS Safari: SafeArea, bounce, клавиатура, stream lifecycle | **При iOS-разработке** |
| `STATE.md` | Zustand store: нормализация, actions, selectors | **При работе с state** |
| `GRPC.md` | gRPC клиент: singleton, mock, streaming, lifecycle | **При работе с API** |
| `SERVER_INTEGRATION.md` | gRPC API сервера, протоколы, таблицы БД | **При интеграции с сервером** |
| `ANDROID_PARITY.md` | Соответствие Android-клиенту | При реализации UI |
| `PITFALLS.md` | Подводные камни | **Перед началом работы** |

### Разработка

| Файл | Назначение | Когда читать |
|------|-----------|-------------|
| `TASKS.md` | Таск-трекер по фазам | В начале сессии |
| `CHANGELOG.md` | История изменений | При релизе |

---

## Документация проекта Lavender (сервер)

| Файл | Назначение |
|------|-----------|
| `/root/msg/doc/INDEX.md` | Полный индекс документации |
| `/root/msg/doc/INTEGRATION_SESSION.md` | Текущий статус, версии, архитектура |
| `/root/msg/doc/TASKS.md` | Таск-трекер сервера и Android |

---

## Связанные проекты

| Проект | Путь | Документация |
|--------|------|-------------|
| Сервер | /root/msg | /root/msg/doc/ |
| Android | /root/msg.client.android | /root/msg/doc/ (общие) |
| **Web Client** | **/root/msg.client.web** | **/root/msg.client.web/doc/** |

---

## Версионирование

- Версия сервера: `server.go:33` (const ServerVersion)
- Версия Android: `version.txt`
- Версия Web: `package.json` → version field
