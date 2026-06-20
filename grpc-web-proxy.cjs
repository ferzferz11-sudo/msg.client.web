#!/usr/bin/env node
/**
 * gRPC-web proxy
 * Converts HTTP/1.1 gRPC-web requests to HTTP/2 gRPC responses
 * Supports AuthService v1 + v2 (JWT) and ChatService
 */

const http = require('http');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const protobuf = require('protobufjs');
const path = require('path');

const GRPC_HOST = process.env.GRPC_HOST || '127.0.0.1';
const GRPC_PORT = process.env.GRPC_PORT || 50052;
const PROXY_PORT = 9090;
const PROTO_PATH = path.join(__dirname, 'proto', 'messenger.proto');

// Load proto for encoding/decoding with protobufjs
const root = protobuf.loadSync(PROTO_PATH);

// Auth V1 types
const SignInRequest = root.lookupType('messenger.SignInRequest');
const SignUpRequest = root.lookupType('messenger.SignUpRequest');
const AuthResponse = root.lookupType('messenger.AuthResponse');

// Auth V2 types
const SignInRequestV2 = root.lookupType('messenger.SignInRequestV2');
const SignUpRequestV2 = root.lookupType('messenger.SignUpRequestV2');
const AuthResponseV2 = root.lookupType('messenger.AuthResponseV2');
const RefreshTokenRequest = root.lookupType('messenger.RefreshTokenRequest');
const RefreshTokenResponse = root.lookupType('messenger.RefreshTokenResponse');
const SignOutRequest = root.lookupType('messenger.SignOutRequest');
const RevokeDeviceRequest = root.lookupType('messenger.RevokeDeviceRequest');
const GetDevicesRequest = root.lookupType('messenger.GetDevicesRequest');
const GetDevicesResponse = root.lookupType('messenger.GetDevicesResponse');

// Chat types
const GetChatsRequest = root.lookupType('messenger.GetChatsRequest');
const GetChatsResponse = root.lookupType('messenger.GetChatsResponse');
const GetHistoryRequest = root.lookupType('messenger.GetHistoryRequest');
const GetHistoryResponse = root.lookupType('messenger.GetHistoryResponse');
const CreateDirectChatRequest = root.lookupType('messenger.CreateDirectChatRequest');
const CreateDirectChatResponse = root.lookupType('messenger.CreateDirectChatResponse');
const CreateGroupChatRequest = root.lookupType('messenger.CreateGroupChatRequest');
const CreateGroupChatResponse = root.lookupType('messenger.CreateGroupChatResponse');
const DeleteChatRequest = root.lookupType('messenger.DeleteChatRequest');
const DeleteChatResponse = root.lookupType('messenger.DeleteChatResponse');
const MarkReadRequest = root.lookupType('messenger.MarkReadRequest');
const MarkReadResponse = root.lookupType('messenger.MarkReadResponse');
const TokenRequest = root.lookupType('messenger.TokenRequest');
const TokenResponse = root.lookupType('messenger.TokenResponse');
const Message = root.lookupType('messenger.Message');

// ChatList V2 types
const GetChatListVersionRequest = root.lookupType('messenger.GetChatListVersionRequest');
const GetChatListVersionResponse = root.lookupType('messenger.GetChatListVersionResponse');
const PinChatRequest = root.lookupType('messenger.PinChatRequest');
const PinChatResponse = root.lookupType('messenger.PinChatResponse');
const UnPinChatRequest = root.lookupType('messenger.UnPinChatRequest');
const UnPinChatResponse = root.lookupType('messenger.UnPinChatResponse');
const SearchChatsRequest = root.lookupType('messenger.SearchChatsRequest');
const SearchChatsResponse = root.lookupType('messenger.SearchChatsResponse');
const ArchiveChatRequest = root.lookupType('messenger.ArchiveChatRequest');
const ArchiveChatResponse = root.lookupType('messenger.ArchiveChatResponse');
const UnarchiveChatRequest = root.lookupType('messenger.UnarchiveChatRequest');
const UnarchiveChatResponse = root.lookupType('messenger.UnarchiveChatResponse');

// Pin Message types
const PinMessageRequest = root.lookupType('messenger.PinMessageRequest');
const PinMessageResponse = root.lookupType('messenger.PinMessageResponse');
const UnPinMessageRequest = root.lookupType('messenger.UnPinMessageRequest');
const UnPinMessageResponse = root.lookupType('messenger.UnPinMessageResponse');
const GetPinnedMessagesRequest = root.lookupType('messenger.GetPinnedMessagesRequest');
const GetPinnedMessagesResponse = root.lookupType('messenger.GetPinnedMessagesResponse');

// AI Chat types
const GetAIChatsRequest = root.lookupType('messenger.GetAIChatsRequest');
const GetAIChatsResponse = root.lookupType('messenger.GetAIChatsResponse');
const RenameAIChatRequest = root.lookupType('messenger.RenameAIChatRequest');
const RenameAIChatResponse = root.lookupType('messenger.RenameAIChatResponse');

// Notification types
const SubscribeNotificationsRequest = root.lookupType('messenger.SubscribeNotificationsRequest');
const ServerNotification = root.lookupType('messenger.ServerNotification');
const GetNotificationHistoryRequest = root.lookupType('messenger.GetNotificationHistoryRequest');
const GetNotificationHistoryResponse = root.lookupType('messenger.GetNotificationHistoryResponse');
const MarkNotificationReadRequest = root.lookupType('messenger.MarkNotificationReadRequest');
const MarkNotificationReadResponse = root.lookupType('messenger.MarkNotificationReadResponse');
const GetUnreadCountRequest = root.lookupType('messenger.GetUnreadCountRequest');
const GetUnreadCountResponse = root.lookupType('messenger.GetUnreadCountResponse');

// Device types
const DeleteDeviceRequest = root.lookupType('messenger.DeleteDeviceRequest');
const DeleteDeviceResponse = root.lookupType('messenger.DeleteDeviceResponse');

// Password types
const RequestPasswordResetRequest = root.lookupType('messenger.RequestPasswordResetRequest');
const RequestPasswordResetResponse = root.lookupType('messenger.RequestPasswordResetResponse');
const ResetPasswordRequest = root.lookupType('messenger.ResetPasswordRequest');
const ResetPasswordResponse = root.lookupType('messenger.ResetPasswordResponse');

// Profile types
const GetProfileRequest = root.lookupType('messenger.GetProfileRequest');
const GetProfileResponse = root.lookupType('messenger.GetProfileResponse');
const UpdateProfileRequest = root.lookupType('messenger.UpdateProfileRequest');
const UpdateProfileResponse = root.lookupType('messenger.UpdateProfileResponse');
const UpdateAvatarRequest = root.lookupType('messenger.UpdateAvatarRequest');
const UpdateAvatarResponse = root.lookupType('messenger.UpdateAvatarResponse');
const GetUserSettingsRequest = root.lookupType('messenger.GetUserSettingsRequest');
const GetUserSettingsResponse = root.lookupType('messenger.GetUserSettingsResponse');
const UpdateUserSettingsRequest = root.lookupType('messenger.UpdateUserSettingsRequest');
const UpdateUserSettingsResponse = root.lookupType('messenger.UpdateUserSettingsResponse');

// Load proto for gRPC client
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDefinition).messenger;

// Create gRPC clients
const authClient = new proto.AuthService(
  `${GRPC_HOST}:${GRPC_PORT}`,
  grpc.credentials.createInsecure()
);
const chatClient = new proto.ChatService(
  `${GRPC_HOST}:${GRPC_PORT}`,
  grpc.credentials.createInsecure()
);
const profileClient = new proto.ProfileService(
  `${GRPC_HOST}:${GRPC_PORT}`,
  grpc.credentials.createInsecure()
);

// HTTP server for gRPC-web
const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Grpc-Web, X-User-Agent',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    try {
      const body = Buffer.concat(chunks);

      if (body.length < 5) {
        res.writeHead(400);
        res.end('Invalid gRPC-web message');
        return;
      }

      const compressed = body[0];
      const messageLength = body.readUInt32BE(1);
      const message = body.slice(5, 5 + messageLength);

      const urlMatch = req.url.match(/\/messenger\.(\w+)\/(\w+)/);
      if (!urlMatch) {
        res.writeHead(400);
        res.end('Invalid URL format');
        return;
      }

      const serviceName = urlMatch[1];
      const methodName = urlMatch[2];

      console.log(`gRPC-web: ${serviceName}.${methodName}`);

      if (serviceName === 'AuthService') {
        handleAuthMethod(methodName, message, res);
      } else if (serviceName === 'ChatService') {
        handleChatMethod(methodName, message, res);
      } else if (serviceName === 'ProfileService') {
        handleProfileMethod(methodName, message, res);
      } else {
        res.writeHead(404);
        res.end(`Unknown service: ${serviceName}`);
      }
    } catch (err) {
      console.error('Error processing request:', err);
      sendGrpcWebError(res, { code: 13, message: err.message });
    }
  });
});

// --- Auth Method Handler (V1 + V2) ---

function handleAuthMethod(method, message, res) {
  let RequestType;
  let ResponseType;
  let grpcMethod;

  switch (method) {
    // V1 (legacy)
    case 'SignIn':
      RequestType = SignInRequest;
      ResponseType = AuthResponse;
      grpcMethod = 'signIn';
      break;
    case 'SignUp':
      RequestType = SignUpRequest;
      ResponseType = AuthResponse;
      grpcMethod = 'signUp';
      break;
    // V2 (JWT)
    case 'SignInV2':
      RequestType = SignInRequestV2;
      ResponseType = AuthResponseV2;
      grpcMethod = 'signInV2';
      break;
    case 'SignUpV2':
      RequestType = SignUpRequestV2;
      ResponseType = AuthResponseV2;
      grpcMethod = 'signUpV2';
      break;
    case 'RefreshToken':
      RequestType = RefreshTokenRequest;
      ResponseType = RefreshTokenResponse;
      grpcMethod = 'refreshToken';
      break;
    case 'SignOut':
      RequestType = SignOutRequest;
      ResponseType = AuthResponse;
      grpcMethod = 'signOut';
      break;
    case 'RevokeDevice':
      RequestType = RevokeDeviceRequest;
      ResponseType = AuthResponse;
      grpcMethod = 'revokeDevice';
      break;
    case 'GetDevices':
      RequestType = GetDevicesRequest;
      ResponseType = GetDevicesResponse;
      grpcMethod = 'getDevices';
      break;
    default:
      res.writeHead(404);
      res.end(`Unknown method: ${method}`);
      return;
  }

  try {
    const request = RequestType.decode(message);
    console.log(`${method} request:`, JSON.stringify(request));

    authClient[grpcMethod](request, (err, response) => {
      if (err) {
        console.error(`${method} error:`, err);
        sendGrpcWebError(res, err);
      } else {
        console.log(`${method} response:`, JSON.stringify(response).slice(0, 200));
        sendGrpcWebResponse(res, ResponseType, response);
      }
    });
  } catch (err) {
    console.error(`${method} decode error:`, err);
    sendGrpcWebError(res, { code: 3, message: `Invalid request: ${err.message}` });
  }
}

// --- Chat Method Handler ---

function handleChatMethod(method, message, res) {
  let RequestType;
  let ResponseType;
  let grpcMethod;

  switch (method) {
    // Existing methods
    case 'GetChats':
      RequestType = GetChatsRequest;
      ResponseType = GetChatsResponse;
      grpcMethod = 'getChats';
      break;
    case 'GetChatsV2':
      RequestType = GetChatsRequest;
      ResponseType = GetChatsResponse;
      grpcMethod = 'getChatsV2';
      break;
    case 'GetHistory':
      RequestType = GetHistoryRequest;
      ResponseType = GetHistoryResponse;
      grpcMethod = 'getHistory';
      break;
    case 'Chat':
      RequestType = Message;
      ResponseType = Message;
      grpcMethod = 'chat';
      break;
    case 'CreateDirectChat':
      RequestType = CreateDirectChatRequest;
      ResponseType = CreateDirectChatResponse;
      grpcMethod = 'createDirectChat';
      break;
    case 'CreateGroupChat':
      RequestType = CreateGroupChatRequest;
      ResponseType = CreateGroupChatResponse;
      grpcMethod = 'createGroupChat';
      break;
    case 'DeleteChat':
      RequestType = DeleteChatRequest;
      ResponseType = DeleteChatResponse;
      grpcMethod = 'deleteChat';
      break;
    case 'MarkRead':
      RequestType = MarkReadRequest;
      ResponseType = MarkReadResponse;
      grpcMethod = 'markRead';
      break;
    case 'RegisterToken':
      RequestType = TokenRequest;
      ResponseType = TokenResponse;
      grpcMethod = 'registerToken';
      break;
    // ChatList V2
    case 'GetChatListVersion':
      RequestType = GetChatListVersionRequest;
      ResponseType = GetChatListVersionResponse;
      grpcMethod = 'getChatListVersion';
      break;
    case 'PinChat':
      RequestType = PinChatRequest;
      ResponseType = PinChatResponse;
      grpcMethod = 'pinChat';
      break;
    case 'UnPinChat':
      RequestType = UnPinChatRequest;
      ResponseType = UnPinChatResponse;
      grpcMethod = 'unPinChat';
      break;
    case 'SearchChats':
      RequestType = SearchChatsRequest;
      ResponseType = SearchChatsResponse;
      grpcMethod = 'searchChats';
      break;
    case 'ArchiveChat':
      RequestType = ArchiveChatRequest;
      ResponseType = ArchiveChatResponse;
      grpcMethod = 'archiveChat';
      break;
    case 'UnarchiveChat':
      RequestType = UnarchiveChatRequest;
      ResponseType = UnarchiveChatResponse;
      grpcMethod = 'unarchiveChat';
      break;
    // Pin Message
    case 'PinMessage':
      RequestType = PinMessageRequest;
      ResponseType = PinMessageResponse;
      grpcMethod = 'pinMessage';
      break;
    case 'UnPinMessage':
      RequestType = UnPinMessageRequest;
      ResponseType = UnPinMessageResponse;
      grpcMethod = 'unPinMessage';
      break;
    case 'GetPinnedMessages':
      RequestType = GetPinnedMessagesRequest;
      ResponseType = GetPinnedMessagesResponse;
      grpcMethod = 'getPinnedMessages';
      break;
    // AI Chat
    case 'GetAIChats':
      RequestType = GetAIChatsRequest;
      ResponseType = GetAIChatsResponse;
      grpcMethod = 'getAIChats';
      break;
    case 'RenameAIChat':
      RequestType = RenameAIChatRequest;
      ResponseType = RenameAIChatResponse;
      grpcMethod = 'renameAIChat';
      break;
    // Devices
    case 'DeleteDevice':
      RequestType = DeleteDeviceRequest;
      ResponseType = DeleteDeviceResponse;
      grpcMethod = 'deleteDevice';
      break;
    case 'DeleteOtherDevices':
      RequestType = DeleteDeviceRequest;
      ResponseType = DeleteDeviceResponse;
      grpcMethod = 'deleteOtherDevices';
      break;
    // Password
    case 'RequestPasswordReset':
      RequestType = RequestPasswordResetRequest;
      ResponseType = RequestPasswordResetResponse;
      grpcMethod = 'requestPasswordReset';
      break;
    case 'ResetPassword':
      RequestType = ResetPasswordRequest;
      ResponseType = ResetPasswordResponse;
      grpcMethod = 'resetPassword';
      break;
    default:
      res.writeHead(501);
      res.end(`Method not implemented: ${method}`);
      return;
  }

  try {
    const request = RequestType.decode(message);
    console.log(`${method} request:`, JSON.stringify(request).slice(0, 200));

    chatClient[grpcMethod](request, (err, response) => {
      if (err) {
        console.error(`${method} error:`, err);
        sendGrpcWebError(res, err);
      } else {
        console.log(`${method} response:`, JSON.stringify(response).slice(0, 200));
        sendGrpcWebResponse(res, ResponseType, response);
      }
    });
  } catch (err) {
    console.error(`${method} decode error:`, err);
    sendGrpcWebError(res, { code: 3, message: `Invalid request: ${err.message}` });
  }
}

// --- Profile Method Handler ---

function handleProfileMethod(method, message, res) {
  let RequestType;
  let ResponseType;
  let grpcMethod;

  switch (method) {
    case 'GetProfile':
      RequestType = GetProfileRequest;
      ResponseType = GetProfileResponse;
      grpcMethod = 'getProfile';
      break;
    case 'UpdateProfile':
      RequestType = UpdateProfileRequest;
      ResponseType = UpdateProfileResponse;
      grpcMethod = 'updateProfile';
      break;
    case 'UpdateAvatar':
      RequestType = UpdateAvatarRequest;
      ResponseType = UpdateAvatarResponse;
      grpcMethod = 'updateAvatar';
      break;
    case 'GetUserSettings':
      RequestType = GetUserSettingsRequest;
      ResponseType = GetUserSettingsResponse;
      grpcMethod = 'getUserSettings';
      break;
    case 'UpdateUserSettings':
      RequestType = UpdateUserSettingsRequest;
      ResponseType = UpdateUserSettingsResponse;
      grpcMethod = 'updateUserSettings';
      break;
    default:
      res.writeHead(501);
      res.end(`Profile method not implemented: ${method}`);
      return;
  }

  try {
    const request = RequestType.decode(message);
    console.log(`Profile.${method} request:`, JSON.stringify(request).slice(0, 200));

    profileClient[grpcMethod](request, (err, response) => {
      if (err) {
        console.error(`Profile.${method} error:`, err);
        sendGrpcWebError(res, err);
      } else {
        console.log(`Profile.${method} response:`, JSON.stringify(response).slice(0, 200));
        sendGrpcWebResponse(res, ResponseType, response);
      }
    });
  } catch (err) {
    console.error(`Profile.${method} decode error:`, err);
    sendGrpcWebError(res, { code: 3, message: `Invalid request: ${err.message}` });
  }
}

// --- Response Helpers ---

function sendGrpcWebResponse(res, ResponseType, response) {
  const plainObject = ResponseType.toObject(response, {
    longs: String,
    enums: String,
    bytes: String,
    defaults: true,
  });

  const message = ResponseType.create(plainObject);
  const encoded = ResponseType.encode(message).finish();

  const dataFrame = Buffer.alloc(5 + encoded.length);
  dataFrame[0] = 0;
  dataFrame.writeUInt32BE(encoded.length, 1);
  encoded.copy(dataFrame, 5);

  const trailer = 'grpc-status: 0\r\ngrpc-message: OK\r\n';
  const trailerFrame = Buffer.alloc(5 + trailer.length);
  trailerFrame[0] = 0x80;
  trailerFrame.writeUInt32BE(trailer.length, 1);
  Buffer.from(trailer).copy(trailerFrame, 5);

  res.writeHead(200, {
    'Content-Type': 'application/grpc-web+proto',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Grpc-Web',
    'Transfer-Encoding': 'chunked',
  });

  res.write(dataFrame);
  res.write(trailerFrame);
  res.end();
}

function sendGrpcWebError(res, err) {
  const statusCode = err.code || 13;
  const message = err.message || 'Internal error';
  const trailer = `grpc-status: ${statusCode}\r\ngrpc-message: ${message}\r\n`;

  const trailerFrame = Buffer.alloc(5 + trailer.length);
  trailerFrame[0] = 0x80;
  trailerFrame.writeUInt32BE(trailer.length, 1);
  Buffer.from(trailer).copy(trailerFrame, 5);

  res.writeHead(200, {
    'Content-Type': 'application/grpc-web+proto',
    'Access-Control-Allow-Origin': '*',
    'Transfer-Encoding': 'chunked',
  });

  res.write(trailerFrame);
  res.end();
}

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`gRPC-web proxy on ${PROXY_PORT} -> ${GRPC_HOST}:${GRPC_PORT}`);
  console.log('Auth V1: SignIn, SignUp');
  console.log('Auth V2: SignInV2, SignUpV2, RefreshToken, SignOut, RevokeDevice, GetDevices');
  console.log('Chat: GetChats/V2, GetHistory, Chat, CreateDirectChat, GroupChat, DeleteChat, MarkRead, RegisterToken');
  console.log('ChatList V2: PinChat, UnPinChat, SearchChats, ArchiveChat, UnarchiveChat, GetChatListVersion');
  console.log('PinMsg: PinMessage, UnPinMessage, GetPinnedMessages');
  console.log('AI: GetAIChats, RenameAIChat');
  console.log('Devices: DeleteDevice, DeleteOtherDevices');
  console.log('Password: RequestPasswordReset, ResetPassword');
  console.log('Profile: GetProfile, UpdateProfile, UpdateAvatar, GetUserSettings, UpdateUserSettings');
});
