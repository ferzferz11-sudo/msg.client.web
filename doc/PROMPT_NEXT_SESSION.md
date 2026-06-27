# Prompt: Next Session — Testing + Multi-Agent AI Chat

**Client:** v0.1.6.1 | **Date:** 2026-06-27 | **Status:** Ready for testing

---

## Goal

Test all new features from v0.1.5.0–v0.1.6.1 and implement Multi-Agent AI Chat.

---

## Testing Checklist (Priority 1)

Verify all features work correctly on https://13.140.25.249/web/:

### Upload
- [ ] Send image in chat → compresses and uploads via `/api/upload-image`
- [ ] Send file in chat → uploads via `/api/upload-file`
- [ ] Send voice message → uploads via `/api/upload-audio`
- [ ] Upload avatar in profile → uploads via `/api/upload-avatar`

### Message Features
- [ ] Copy text from context menu (right-click / long press)
- [ ] Select text in message bubble with mouse
- [ ] Delete any message (including images) via context menu
- [ ] Edit own messages via context menu

### Search
- [ ] Click 🔍 in chat header → search panel opens
- [ ] Type query → debounced results appear
- [ ] Click result → scrolls to message in chat

### Profile
- [ ] Click avatar or name in chat header → profile modal opens
- [ ] Shows username, avatar, bio, status
- [ ] Works for direct chats only

### Chat Background
- [ ] Click ⋮ menu → "Фон чата" → file picker opens
- [ ] Select image → uploads and applies as background

### File Download
- [ ] Click file attachment → progress bar appears
- [ ] File downloads with progress tracking

### Version
- [ ] Hard refresh → update banner appears if new version
- [ ] Click "Обновить" → page reloads with new version
- [ ] Version displayed on "Select a chat" screen

---

## New Feature: Multi-Agent AI Chat (Priority 2)

### Goal
Allow users to send the same message to multiple AI agents simultaneously and see all responses.

### Implementation

#### 1. Agent Selection UI
- In AI Chats screen, add multi-select mode for agents
- Checkbox or toggle on each agent card
- "Send to selected" button

#### 2. Parallel Streaming
- When message sent to multiple agents, create parallel `chatWithAIV2` streams
- Each stream gets its own `sessionId`
- Responses render in separate tabs/panels below the input

#### 3. Response Display
- Tab bar showing agent names (Agent 1 | Agent 2 | Agent 3)
- Each tab shows that agent's streaming response
- Active tab highlighted

#### 4. Proto
- No new proto needed — reuse existing `ChatWithAIV2` RPC
- Each agent gets its own session

### Files to modify
- `src/hooks/useAIChats.ts` — add multi-agent send logic
- `src/components/aiChats/AIChatsScreen.desktop.tsx` — multi-select UI
- `src/components/aiChats/AIChatsScreen.mobile.tsx` — multi-select UI

---

## Architecture Notes

### Upload Endpoints (via nginx proxy)
All uploads go through `/api/` prefix → nginx proxies to port 8082:
- `/api/upload-image` → `http://localhost:8082/upload-image`
- `/api/upload-file` → `http://localhost:8082/upload-file`
- `/api/upload-audio` → `http://localhost:8082/upload-audio`
- `/api/upload-avatar` → `http://localhost:8082/upload-avatar`
- `/api/upload-background` → `http://localhost:8082/upload-background`

**Critical nginx config**: `proxy_pass` must have trailing slash:
```
location /api/ {
    proxy_pass http://127.0.0.1:8082/;  # trailing slash strips /api/ prefix
}
```

### Image Compression
All images compressed to JPEG before upload:
- Max dimension: 1920px
- Quality: 85%
- Function: `compressImage()` in `grpcClient.ts`

### Deleted Messages
Server uses soft delete (`content_type='deleted'`). Client filters:
- `text === '[deleted]'` with no media → filtered out
- Applied in: initial load, pagination, real-time stream

### Message Search
- RPC: `searchMessages(roomId, query, limit)`
- UI: search panel in chat header (desktop: right panel, mobile: full screen)
- Results: message preview + sender + timestamp
- Click: scrolls to message via Virtuoso
