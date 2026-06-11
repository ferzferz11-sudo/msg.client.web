#!/usr/bin/env node
/**
 * gRPC-web proxy using @grpc/grpc-js
 * Translates HTTP/1.1 gRPC-web requests to HTTP/2 gRPC requests
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

// Load proto file
const protoPath = path.join(__dirname, 'proto', 'messenger.proto');

const GRPC_HOST = process.env.GRPC_HOST || '127.0.0.1';
const GRPC_PORT = process.env.GRPC_PORT || 50052;
const PROXY_PORT = process.env.PROXY_PORT || 9091;

// Simple HTTP/1.1 to gRPC proxy
// This is a basic implementation that forwards gRPC-web requests to gRPC server

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
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

  // Only handle POST requests for gRPC
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  // Read request body
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', async () => {
    const body = Buffer.concat(chunks);

    try {
      // Forward to gRPC server using HTTP/2
      const response = await forwardToGrpc(req.url, body, req.headers);
      
      res.writeHead(200, {
        'Content-Type': 'application/grpc-web+proto',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Grpc-Web',
        'Content-Length': response.length,
      });
      res.end(response);
    } catch (err) {
      console.error('Proxy error:', err.message);
      res.writeHead(502, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

function forwardToGrpc(url, body, headers) {
  return new Promise((resolve, reject) => {
    // Use http2 to connect to gRPC server
    try {
      const http2 = require('http2');
      
      const client = http2.connect(`http://${GRPC_HOST}:${GRPC_PORT}`);
      
      client.on('error', (err) => {
        reject(new Error(`HTTP/2 connection error: ${err.message}`));
      });

      const req = client.request({
        ':method': 'POST',
        ':path': url,
        'content-type': 'application/grpc+proto',
        'te': 'trailers',
        'user-agent': 'grpc-web-proxy/1.0',
      });

      let responseData = Buffer.alloc(0);
      let statusCode = 200;
      let responseHeaders = {};

      req.on('response', (headers) => {
        statusCode = headers[':status'] || 200;
        responseHeaders = headers;
      });

      req.on('data', (chunk) => {
        responseData = Buffer.concat([responseData, chunk]);
      });

      req.on('end', () => {
        client.close();
        if (statusCode !== 200) {
          reject(new Error(`gRPC error: ${statusCode}`));
        } else {
          resolve(responseData);
        }
      });

      req.on('error', (err) => {
        client.close();
        reject(err);
      });

      req.write(body);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`gRPC-web proxy listening on port ${PROXY_PORT}`);
  console.log(`Forwarding to gRPC server at ${GRPC_HOST}:${GRPC_PORT}`);
});
