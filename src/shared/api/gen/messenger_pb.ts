// ============================================
// GENERATED CODE PLACEHOLDER — DO NOT EDIT
// ============================================
// Types matching proto/messenger.proto (with AuthService)
// ============================================

import type { DescService } from "@bufbuild/protobuf"

// --- User Type ---

export interface User {
  id: string
  username: string
  displayName: string
  avatarUrl: string
  email: string
  isOnline: boolean
  lastSeen: string
}

// --- Auth Types ---

export interface SignInRequest {
  username: string
  password: string
  deviceId?: string
  deviceName?: string
}

export interface SignUpRequest {
  username: string
  password: string
  email?: string
  displayName?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
  expiresAt: number
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface LogoutRequest {
  accessToken: string
}

export interface LogoutResponse {
  success: boolean
}

// --- Chat Types ---

export interface Chat {
  id: string
  name: string
  type: string
  creatorId: string
  participants: string
  lastMessageText: string
  lastMessageTime: string
  unreadCount: number
  avatarUrl?: string
  isOnline?: boolean
  activeAgentId?: string
  agentMode?: string
}

export interface Message {
  id: string
  roomId: string
  user: string
  text: string
  createdAt: string
  isOutgoing: boolean
  isRead: boolean
  repliedToMessageId?: string
  repliedToUser?: string
  repliedToText?: string
  agentId?: string
}

// --- Service Definitions ---

function makeMethod(name: string, kind: "unary" | "server_streaming" = "unary"): any {
  return {
    name,
    kind: kind === "server_streaming" ? "server_streaming" : "unary",
    service: null,
    I: null,
    O: null,
  }
}

export const AuthService = {
  kind: "service" as const,
  typeName: "messenger.AuthService",
  name: "AuthService",
  file: null as any,
  methods: [
    makeMethod("SignIn"),
    makeMethod("SignUp"),
    makeMethod("RefreshToken"),
    makeMethod("Logout"),
  ],
  toString() { return "messenger.AuthService" },
} as unknown as DescService

export const ChatService = {
  kind: "service" as const,
  typeName: "messenger.ChatService",
  name: "ChatService",
  file: null as any,
  methods: [
    makeMethod("Chat", "server_streaming"),
    makeMethod("Typing"),
    makeMethod("GetChats"),
    makeMethod("GetHistory"),
    makeMethod("CreateDirectChat"),
    makeMethod("CreateGroupChat"),
    makeMethod("DeleteChat"),
    makeMethod("MarkRead"),
    makeMethod("RegisterToken"),
  ],
  toString() { return "messenger.ChatService" },
} as unknown as DescService
