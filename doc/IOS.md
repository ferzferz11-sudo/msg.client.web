# Lavender Messenger Web Client — iOS Safari

Документация по iOS-специфичным решениям и оптимизациям.

**Дата:** 2026-06-10

---

## 1. Viewport и Meta-теги (index.html)

```html
<meta name="viewport"
  content="width=device-width, initial-scale=1,
           viewport-fit=cover, maximum-scale=1,
           user-scalable=no" />
```

| Параметр | Значение | Зачем |
|----------|----------|-------|
| `viewport-fit=cover` | Контент заходит за safe area (вырез, индикатор) |
| `maximum-scale=1` | Запрет зума двумя пальцами |
| `user-scalable=no` | Запрет зума вообще |

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

Позволяет добавить на домашний экран как PWA. `black-translucent` — статусбар прозрачный, контент за ним.

---

## 2. Safe Area

### CSS переменные (global.css)

```css
html {
  --sat: env(safe-area-inset-top, 0px);     /* ~44px на iPhone с вырезом */
  --sar: env(safe-area-inset-right, 0px);   /* ~0 */
  --sab: env(safe-area-inset-bottom, 0px);  /* ~34px на iPhone с индикатором */
  --sal: env(safe-area-inset-left, 0px);    /* ~0 */
}
```

### Использование

```css
.safe-top    { padding-top: var(--sat); }
.safe-bottom { padding-bottom: var(--sab); }
```

Применяется на:
- Хедер списка чатов (`.safe-top`)
- Хедер экрана чата (`.safe-top`)
- Поле ввода сообщений (`.safe-bottom`)

### Значения на устройствах

| Устройство | top | bottom |
|-----------|-----|--------|
| iPhone 14/15 (с вырезом) | 47px | 34px |
| iPhone SE (без выреза) | 20px | 0 |
| iPad | 20px | 20px |

---

## 3. Блокировка Bounce Scroll

```css
html {
  overflow: hidden;
  position: fixed;
  width: 100%;
  height: 100%;
}

body {
  overflow: hidden;
  position: fixed;
  overscroll-behavior: none;
}
```

**Зачем:** на iOS Safari при скролле вверх/вниз за пределы контента происходит "отскок" (bounce). Это выглядит не как нативное приложение.

**Важно:** внутри `.scrollable` контейнеров bounce разрешён через `-webkit-overflow-scrolling: touch` — это нативный momentum scroll.

---

## 4. Виртуальная клавиатура

### Проблема

На iOS при открытии клавиатуры:
1. `window.innerHeight` НЕ меняется
2. `window.visualViewport.height` МЕНЯЕТСЯ
3. Поле ввода может быть перекрыто клавиатурой

### Решение: useIOSKeyboard hook

```typescript
const viewport = window.visualViewport

const handleResize = () => {
  const windowHeight = window.innerHeight
  const viewportHeight = viewport.height
  const diff = windowHeight - viewportHeight

  if (diff > 100) {
    // Клавиатура открыта
    document.documentElement.style.setProperty('--keyboard-height', `${diff}px`)
  }
}
```

### CSS переменная `--keyboard-height`

Устанавливается на `document.documentElement`. Может использоваться в компонентах для позиционирования элементов над клавиатурой.

### Предотвращение зума на input

```css
input, textarea, select {
  font-size: 16px !important;  /* iOS зумит если < 16px */
}

@supports (-webkit-touch-callout: none) {
  input:focus, textarea:focus {
    font-size: 16px !important;  /* Двойная страховка */
  }
}
```

---

## 5. Momentum Scroll

```css
.scrollable {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}
```

`-webkit-overflow-scrolling: touch` — включает инерционный скролл (как в нативных приложениях). Без него скролл "дёрганый".

`overscroll-behavior-y: contain` — предотвращает проброс скролла на body (pull-to-refresh).

---

## 6. Stream Lifecycle (iOS Background)

### Проблема

Когда пользователь сворачивает Safari (Home button или переключение на другое приложение), gRPC стримы продолжают работать, потребляя батарею.

### Решение: useGrpcStream hook

Слушает 3 события:

```typescript
// 1. Page Visibility API (стандарт)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) → close stream
  else → reopen stream
})

// 2. iOS Safari specific
window.addEventListener('pagehide', () => close stream)
window.addEventListener('pageshow', () => reopen stream)

// 3. React cleanup
useEffect(() => () => close stream, [chatId])
```

### AbortController

Каждый стрим использует `AbortController`. При закрытии:
```typescript
controller.abort()  // отмена всех setTimeout внутри стрима
activeStreams.delete(streamId)
```

---

## 7. Визуальные оптимизации

### Backdrop Blur (iOS native feel)

```css
header {
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
```

Размытие фона под хедером — как в нативных iOS приложениях.

### Tap Highlight

```css
* {
  -webkit-tap-highlight-color: transparent;
}
```

Убирает стандартный синий блик при тапе.

### Touch Callout

```css
body {
  -webkit-touch-callout: none;
}
```

Запрещает контекстное меню при long press (как в нативном приложении).

### User Select

```css
body {
  -webkit-user-select: none;
  user-select: none;
}

input, textarea {
  -webkit-user-select: text;
  user-select: text;
}
```

Запрещает выделение текста в UI, но разрешает в полях ввода.

---

## 8. Анимации

### Screen Transitions

```css
.screen-enter {
  animation: slideInFromRight 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

@keyframes slideInFromRight {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
```

Переход между экранами — слайд справа налево (как в iOS NavigationController).

### Message Appear

```css
.message-appear {
  animation: messageAppear 0.2s ease-out both;
}

@keyframes messageAppear {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Новое сообщение появляется с fade-in + slide-up.

### Typing Indicator

```css
@keyframes typingDot {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30%           { transform: translateY(-4px); opacity: 1; }
}
.typing-dot-1 { animation: typingDot 1.4s infinite 0s; }
.typing-dot-2 { animation: typingDot 1.4s infinite 0.2s; }
.typing-dot-3 { animation: typingDot 1.4s infinite 0.4s; }
```

---

## 9. Известные ограничения iOS Safari

| Ограничение | Описание | Решение |
|------------|----------|---------|
| Нет bidirectional streaming | grpc-web не поддерживает в браузере | Используем server streaming + unary |
| VisualViewport не в Safari < 13 | API для клавиатуры | Graceful degradation |
| 300ms delay на tap | Убран в современных Safari | `width=device-width` в viewport |
| Зум на input focus | Safari зумит если font < 16px | `font-size: 16px !important` |
| Background tabs | Таймеры замедляются | AbortController + visibilitychange |
| PWA ограничения | Нет push, ограниченный кэш | Пока не реализуем |
