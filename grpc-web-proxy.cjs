#!/usr/bin/env node
/**
 * gRPC-web proxy
 * Converts HTTP/1.1 gRPC-web requests to HTTP/2 gRPC responses
 */

const http = require('http');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const protobuf = require('protobufjs');
const path = require('path');

const GRPC_HOST = process.env.GRPC_HOST || '127.0.0.1';
const GRPC_PORT = process.env.GRPC_PORT || 50051;
const PROXY_PORT = 9090;
const PROTO_PATH = path.join(__dirname, 'proto', 'messenger.proto');

// Load proto for encoding/decoding with protobufjs
const root = protobuf.loadSync(PROTO_PATH);
const SignInRequest = root.lookupType('messenger.SignInRequest');
const SignUpRequest = root.lookupType('messenger.SignUpRequest');
const AuthResponse = root.lookupType('messenger.AuthResponse');
const GetChatsRequest = root.lookupType('messenger.GetChatsRequest');
const GetChatsResponse = root.lookupType('messenger.GetChatsResponse');

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
        handleAuthMethod(authClient, methodName, message, res);
      } else if (serviceName === 'ChatService') {
        handleChatMethod(chatClient, methodName, message, res);
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

function handleAuthMethod(client, method, message, res) {
  let RequestType;
  switch (method) {
    case 'SignIn':
      RequestType = SignInRequest;
      break;
    case 'SignUp':
      RequestType = SignUpRequest;
      break;
    default:
      res.writeHead(404);
      res.end(`Unknown method: ${method}`);
      return;
  }

  const request = RequestType.decode(message);
  console.log(`${method} request:`, JSON.stringify(request));

  client[method.toLowerCase()](request, (err, response) => {
    if (err) {
      console.error(`${method} error:`, err);
      sendGrpcWebError(res, err);
    } else {
      console.log(`${method} response:`, JSON.stringify(response));
      sendGrpcWebResponse(res, AuthResponse, response);
    }
  });
}

function handleChatMethod(client, method, message, res) {
  let RequestType;
  let ResponseType;

  switch (method) {
    case 'GetChats':
      RequestType = GetChatsRequest;
      ResponseType = GetChatsResponse;
      break;
    default:
      res.writeHead(501);
      res.end(`Method not implemented: ${method}`);
      return;
  }

  const request = RequestType.decode(message);
  console.log(`${method} request:`, JSON.stringify(request));

  client[method.toLowerCase()](request, (err, response) => {
    if (err) {
      console.error(`${method} error:`, err);
      sendGrpcWebError(res, err);
    } else {
      console.log(`${method} response: chats count = ${response.chats?.length || 0}`);
      sendGrpcWebResponse(res, ResponseType, response);
    }
  });
}

function sendGrpcWebResponse(res, ResponseType, response) {
  // Convert response to plain object for protobufjs
  const plainObject = ResponseType.toObject(response, {
    longs: String,
    enums: String,
    bytes: String,
    defaults: true,
  });

  // Encode with protobufjs
  const message = ResponseType.create(plainObject);
  const encoded = ResponseType.encode(message).finish();

  // Build gRPC-web data frame
  const dataFrame = Buffer.alloc(5 + encoded.length);
  dataFrame[0] = 0;
  dataFrame.writeUInt32BE(encoded.length, 1);
  encoded.copy(dataFrame, 5);

  // Trailer frame
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
});
