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

// Load proto for gRPC client
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

      // Parse gRPC-web framing: [compressed(1)] [length(4)] [message]
      if (body.length < 5) {
        console.log('Body too short:', body.length);
        res.writeHead(400);
        res.end('Invalid gRPC-web message');
        return;
      }

      const compressed = body[0];
      const messageLength = body.readUInt32BE(1);
      const message = body.slice(5, 5 + messageLength);

      // Parse URL: /messenger.ServiceName/MethodName
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
            sendGrpcWebResponse(res, response);
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
            sendGrpcWebResponse(res, response);
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

function sendGrpcWebResponse(res, response) {
  // Encode response to protobuf
  const encoded = AuthResponse.encode(AuthResponse.create(response)).finish();
  
  // Build gRPC-web data frame: [compressed(1)] [length(4)] [message]
  const dataFrame = Buffer.alloc(5 + encoded.length);
  dataFrame[0] = 0; // not compressed
  dataFrame.writeUInt32BE(encoded.length, 1);
  encoded.copy(dataFrame, 5);

  // Build gRPC-web trailer frame: [compressed(1)] [length(4)] [trailer]
  // Trailer format: "grpc-status: 0\r\ngrpc-message: OK\r\n"
  const trailer = 'grpc-status: 0\r\ngrpc-message: OK\r\n';
  const trailerFrame = Buffer.alloc(5 + trailer.length);
  trailerFrame[0] = 0x80; // trailer marker (compressed flag + trailer indicator)
  trailerFrame.writeUInt32BE(trailer.length, 1);
  Buffer.from(trailer).copy(trailerFrame, 5);

  // Send both frames
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
  // Build error trailer
  const statusCode = err.code || 13;
  const message = err.message || 'Internal error';
  const trailer = `grpc-status: ${statusCode}\r\ngrpc-message: ${message}\r\n`;
  
  const trailerFrame = Buffer.alloc(5 + trailer.length);
  trailerFrame[0] = 0x80; // trailer marker
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
