#!/usr/bin/env node
/**
 * gRPC-web proxy with proper framing support
 */

const http = require('http');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const GRPC_HOST = process.env.GRPC_HOST || '127.0.0.1';
const GRPC_PORT = process.env.GRPC_PORT || 50052;
const PROXY_PORT = 9090;
const PROTO_PATH = path.join(__dirname, 'proto', 'messenger.proto');

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDefinition).messenger;

// Create gRPC client
const grpcClient = new proto.AuthService(
  `${GRPC_HOST}:${GRPC_PORT}`,
  grpc.credentials.createInsecure()
);

// HTTP server for gRPC-web
const server = http.createServer((req, res) => {
  // CORS preflight
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

  // Read request body
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    try {
      const body = Buffer.concat(chunks);

      // Parse gRPC-web framing
      if (body.length < 5) {
        console.log('Body too short:', body.length);
        res.writeHead(400);
        res.end('Invalid gRPC-web message');
        return;
      }

      const compressed = body[0];
      const messageLength = body.readUInt32BE(1);
      const message = body.slice(5, 5 + messageLength);

      // Determine service and method from URL
      const urlMatch = req.url.match(/\/messenger\.(\w+)\/(\w+)/);
      if (!urlMatch) {
        console.log('Invalid URL:', req.url);
        res.writeHead(400);
        res.end('Invalid URL format');
        return;
      }

      const serviceName = urlMatch[1];
      const methodName = urlMatch[2];

      console.log(`gRPC-web: ${serviceName}.${methodName}, body: ${body.length} bytes, msg: ${message.length} bytes`);

      // Handle AuthService methods
      if (serviceName === 'AuthService') {
        handleAuthMethod(grpcClient, methodName, message, res);
      } else if (serviceName === 'ChatService') {
        res.writeHead(501);
        res.end('ChatService not yet implemented');
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
    switch (method) {
      case 'SignIn': {
        const request = proto.SignInRequest.decode(message);
        console.log('SignIn request:', JSON.stringify(request));
        client.signIn(request, (err, response) => {
          if (err) {
            console.error('SignIn error:', err);
            sendGrpcWebError(res, err);
          } else {
            console.log('SignIn response:', JSON.stringify(response));
            sendGrpcWebResponse(res, proto.AuthResponse.encode(response).finish());
          }
        });
        break;
      }
      case 'SignUp': {
        const request = proto.SignUpRequest.decode(message);
        console.log('SignUp request:', JSON.stringify(request));
        client.signUp(request, (err, response) => {
          if (err) {
            console.error('SignUp error:', err);
            sendGrpcWebError(res, err);
          } else {
            console.log('SignUp response:', JSON.stringify(response));
            sendGrpcWebResponse(res, proto.AuthResponse.encode(response).finish());
          }
        });
        break;
      }
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

function sendGrpcWebResponse(res, data) {
  // Build gRPC-web response framing
  const frame = Buffer.alloc(5 + data.length);
  frame[0] = 0; // not compressed
  frame.writeUInt32BE(data.length, 1);
  data.copy(frame, 5);

  res.writeHead(200, {
    'Content-Type': 'application/grpc-web+proto',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Grpc-Web',
  });
  res.end(frame);
}

function sendGrpcWebError(res, err) {
  res.writeHead(200, {
    'Content-Type': 'application/grpc-web+proto',
    'Access-Control-Allow-Origin': '*',
    'grpc-status': err.code || 13,
    'grpc-message': err.message || 'Internal error',
  });
  res.end();
}

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`gRPC-web proxy on ${PROXY_PORT} -> ${GRPC_HOST}:${GRPC_PORT}`);
});
