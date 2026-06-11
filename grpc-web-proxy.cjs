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
const GRPC_PORT = process.env.GRPC_PORT || 50052;
const PROXY_PORT = 9090;
const PROTO_PATH = path.join(__dirname, 'proto', 'messenger.proto');

// Load proto for encoding/decoding
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

      console.log(`gRPC-web: ${serviceName}.${methodName}, body: ${body.length} bytes, msg: ${message.length} bytes`);

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
      res.writeHead(500);
      res.end('Internal error: ' + err.message);
    }
  });
});

function handleAuthMethod(client, method, message, res) {
  try {
    let request;
    switch (method) {
      case 'SignIn':
        request = SignInRequest.decode(message);
        console.log('SignIn request:', JSON.stringify(request));
        client.signIn(request, (err, response) => {
          if (err) {
            console.error('SignIn error:', err);
            sendGrpcWebError(res, err);
          } else {
            console.log('SignIn response:', JSON.stringify(response));
            sendGrpcWebResponse(res, AuthResponse, response);
          }
        });
        break;
      case 'SignUp':
        request = SignUpRequest.decode(message);
        console.log('SignUp request:', JSON.stringify(request));
        client.signUp(request, (err, response) => {
          if (err) {
            console.error('SignUp error:', err);
            sendGrpcWebError(res, err);
          } else {
            console.log('SignUp response:', JSON.stringify(response));
            sendGrpcWebResponse(res, AuthResponse, response);
          }
        });
        break;
      default:
        res.writeHead(404);
        res.end(`Unknown method: ${method}`);
    }
  } catch (err) {
    console.error('Error in handleAuthMethod:', err);
    res.writeHead(500);
    res.end('Internal error: ' + err.message);
  }
}

function handleChatMethod(client, method, message, res) {
  try {
    let request;
    switch (method) {
      case 'GetChats':
        request = GetChatsRequest.decode(message);
        console.log('GetChats request:', JSON.stringify(request));
        client.getChats(request, (err, response) => {
          if (err) {
            console.error('GetChats error:', err);
            sendGrpcWebError(res, err);
          } else {
            console.log('GetChats response:', JSON.stringify(response));
            sendGrpcWebResponse(res, GetChatsResponse, response);
          }
        });
        break;
      case 'GetHistory':
        request = root.lookupType('messenger.GetHistoryRequest').decode(message);
        console.log('GetHistory request:', JSON.stringify(request));
        client.getHistory(request, (err, response) => {
          if (err) {
            console.error('GetHistory error:', err);
            sendGrpcWebError(res, err);
          } else {
            console.log('GetHistory response:', JSON.stringify(response));
            sendGrpcWebResponse(res, root.lookupType('messenger.GetHistoryResponse'), response);
          }
        });
        break;
      case 'CreateDirectChat':
        request = root.lookupType('messenger.CreateDirectChatRequest').decode(message);
        console.log('CreateDirectChat request:', JSON.stringify(request));
        client.createDirectChat(request, (err, response) => {
          if (err) {
            console.error('CreateDirectChat error:', err);
            sendGrpcWebError(res, err);
          } else {
            console.log('CreateDirectChat response:', JSON.stringify(response));
            sendGrpcWebResponse(res, root.lookupType('messenger.CreateDirectChatResponse'), response);
          }
        });
        break;
      default:
        console.log(`ChatService method not implemented: ${method}`);
        res.writeHead(501);
        res.end(`Method not implemented: ${method}`);
    }
  } catch (err) {
    console.error('Error in handleChatMethod:', err);
    res.writeHead(500);
    res.end('Internal error: ' + err.message);
  }
}

function sendGrpcWebResponse(res, ResponseType, response) {
  const encoded = ResponseType.encode(ResponseType.create(response)).finish();
  
  // Data frame
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
