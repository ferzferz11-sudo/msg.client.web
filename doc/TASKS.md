# Lavender Messenger Web Client — Задачи

Таск-трекер проекта веб-клиента.

**Версия:** v0.1.0
**Дата:** 2026-06-10
**Статус:** 🟢 Базовая реализация

---

## ✅ Фаза 0: Инициализация проекта

- [x] Инициализация Vite + React + TypeScript
- [x] Настройка Zustand, path aliases
- [x] Создание структуры папок
- [x] index.html с iOS meta tags
- [x] Глобальные CSS (SafeArea, bounce, scroll, animations)

---

## ✅ Фаза 1: gRPC клиент

- [x] Синглтон grpcClient с mock-реализацией
- [x] Unary calls: getChats, getMessages, sendMessage, createChat
- [x] Server streaming: streamChatMessages, streamAllMessages
- [x] Мок-данные: 4 чата, 10 сообщений
- [x] AbortController для закрытия стримов

---

## ✅ Фаза 2: State Management

- [x] Zustand store с нормализованной структурой
- [x] chats, messages, chatMessages
- [x] UI state: activeChatId, loading flags
- [x] Actions: setChats, addMessage, updateChat, etc.
- [x] Selectors: getChatList, getActiveChat, getChatMessages

---

## ✅ Фаза 3: Хуки

- [x] useChats — загрузка списка чатов
- [x] useChatMessages — история + стриминг + отправка
- [x] useGrpcStream — lifecycle стрима (iOS background!)
- [x] useIOSKeyboard — обработка клавиатуры iOS

---

## ✅ Фаза 4: UI компоненты (мобильные)

- [x] Screen — базовый layout (header + content + footer)
- [x] ChatListScreen — экран списка чатов
- [x] ChatList — список с аватарами, временем, unread
- [x] ChatScreen — экран чата
- [x] ChatHeader — iOS-style хедер с кнопкой "Назад"
- [x] MessageBubble — пузырь сообщения (входящий/исходящий)
- [x] MessageInput — поле ввода + кнопка отправки
- [x] Code splitting для всех компонентов

---

## ✅ Фаза 5: iOS оптимизации

- [x] Safe Area (env(safe-area-inset-*))
- [x] Bounce scroll prevention
- [x] Momentum scroll (-webkit-overflow-scrolling: touch)
- [x] Keyboard handling (VisualViewport API)
- [x] Stream lifecycle (visibilitychange, pagehide, pageshow)
- [x] Input zoom prevention (font-size: 16px)
- [x] Backdrop blur на хедерах
- [x] Tap highlight removal
- [x] Touch callout prevention
- [x] Screen transition animations
- [x] Message appear animations

---

## 📋 Фаза 6: Интеграция с реальным сервером

- [x] Копирование messenger.proto в проект
- [ ] Генерация TypeScript типов из proto
- [ ] Замена mock grpcClient на grpc-web клиент
- [ ] Настройка Envoy proxy
- [ ] CORS на сервере
- [ ] Обработка ошибок (network, auth, rate limit)
- [ ] Retry с exponential backoff

---

## 📋 Фаза 7: AI чаты

- [x] Типы для AI чатов (owl, hermes) в моках
- [ ] AIChatView — единый компонент для OWL и Hermes
- [ ] Стриминг AI ответов (ChatWithAI)
- [ ] Индикатор набора текста для AI
- [ ] Настройки AI (API key, model)
- [ ] Rate limit indicator в хедере
- [ ] Hermes: список агентов, переключение

---

## 📋 Фаза 8: Контакты и профиль

- [ ] Список контактов
- [ ] Добавление контакта
- [ ] Профиль пользователя
- [ ] Аватар (загрузка/отображение)

---

## 📋 Фаза 9: Настройки и темы

- [ ] Настройки сервера (адрес, порт)
- [ ] Переключение тем (светлая/тёмная)
- [ ] Кастомные темы
- [ ] Язык (RU/EN)

---

## 📋 Фаза 10: E2EE (секретные чаты)

- [ ] ECDH обмен ключами через WebCrypto
- [ ] AES-256-GCM шифрование
- [ ] Индикатор E2EE в чате

---

## 📋 Фаза 11: Полировка

- [ ] Виртуализация списков (react-window)
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
- [ ] PWA manifest
- [ ] Accessibility (a11y)

---

## 📋 Бэклог

- [ ] WebRTC звонки
- [ ] Групповые чаты (создание, управление)
- [ ] Боты и команды
- [ ] Интеграция с Hermes Orchestrator
