# Prompt: Next Session — Testing + E2EE Secret Chat UI

**Client:** v0.1.7.0 | **Date:** 2026-06-28 | **Status:** Ready for testing

---

## Goal

Test all features from v0.1.5.0–v0.1.7.0 and implement E2EE Secret Chat UI.

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

### Multi-Agent AI Chat
- [ ] Click 🔀 in agent panel → multi-select mode activates
- [ ] Select 2+ agents → checkboxes appear
- [ ] Click "Новый чат" → agent picker modal shows agents
- [ ] Select agent → chat created with that agent
- [ ] Send message → parallel streaming to all selected agents
- [ ] Tab bar shows agent names with streaming status
- [ ] Click tab → switches to that agent's response
- [ ] Stop button → cancels all parallel streams

### Error Toasts
- [ ] Trigger a network error → toast appears with icon
- [ ] Toast auto-dismisses after 5 seconds
- [ ] Click toast → dismisses immediately
- [ ] Max 3 toasts visible at once

---

## New Feature: E2EE Secret Chat UI (Priority 2)

### Goal
Full UI flow for end-to-end encrypted secret chats with key exchange.

### Implementation

#### 1. Secret Chat Creation Flow
- In New Chat modal, add 🔐 button next to each user
- Clicking 🔐 creates a secret chat + generates RSA keypair
- Public key sent to server via `exchangeSecretKey`

#### 2. Key Exchange UI
- `SecretChatScreen` shows key exchange progress:
  - Waiting for peer's public key
  - Key received → derive shared AES key
  - Ready to chat
- Status indicators: 🔒 Waiting / 🔓 Ready

#### 3. Encrypted Messaging
- Messages encrypted with AES-GCM before send
- Messages decrypted on receive/load
- E2EE badge on messages in secret chats

#### 4. Files to modify
- `src/components/secretChats/SecretChatScreen.tsx` — key exchange UI
- `src/components/chat/ChatScreen.tsx` — E2EE mode
- `src/hooks/useChatMessages.ts` — encrypt/decrypt pipeline

---

## Architecture Notes

### Error Toast System
```
Component → useErrorStore.addError({ message, type }) → ToastContainer renders toast
Types: network | auth | rate_limit | server | unknown
Auto-dismiss: 5s, max 3 visible
```

### Multi-Agent AI Chat
```
User selects agents → sendMultiAgentMessage() → parallel chatWithAIV2 streams
Each agent gets its own sessionId → responses stored in multiAgentMessages
Tab bar shows active/completed status per agent
AbortController per agent for clean cancellation
```

### Testing
```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```
- Framework: Vitest + @testing-library/react
- Setup: `src/test/setup.ts`
- Test files: `*.test.ts(x)` colocated with source
