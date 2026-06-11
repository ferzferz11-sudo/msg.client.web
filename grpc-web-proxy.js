#!/usr/bin/env node
/**
 * gRPC-web proxy — translates HTTP/1.1 gRPC-web ↔ HTTP/2 gRPC
 * Uses @improbable-eng/grpc-web for proper framing
 */

const http = require('http');
const { Readable } = require('stream');

const PROXY_PORT = parseInt(process.env.PROXY_PORT || '9090');
const GRPC_HOST = process.env.GRPC_HOST || '127.0.0.1';
const GRPC_PORT = parseInt(process.env.GRPC_PORT || '50051');

console.log(`gRPC-web proxy starting...`);
console.log(`  Listen:  0.0.0.0:${PROXY_PORT}`);
console.log(`  Backend: ${GRPC_HOST}:${GRPC_PORT}`);

// Parse gRPC-web frame: 1 byte flag + 4 byte length + payload
function parseGrpcWebFrame(buf) {
  if (buf.length < 5) return null;
  const flag = buf[0];
  const length = buf.readUInt32BE(1);
  if (buf.length < 5 + length) return null;
  return {
    flag,
    payload: buf.slice(5, 5 + length),
    rest: buf.slice(5 + length),
  };
}

// Wrap a raw gRPC payload in a gRPC-web frame
function wrapGrpcWebFrame(payload, isTrailer = false) {
  const header = Buffer.alloc(5);
  header[0] = isTrailer ? 0x80 : 0x00;
  header.writeUInt32BE(payload.length, 1);
  return Buffer.concat([header, payload]);
}

// Parse gRPC status from trailer
function parseGrpcStatus(trailerStr) {
  const match = trailerStr.match(/grpc-status:\s*(\d+)/);
  return match ? match[1] : '0';
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Grpc-Web, Accept, X-User-Agent',
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

  // Only handle gRPC-web requests
  const contentType = req.headers['content-type'] || '';
  const isGrpcWeb = contentType.includes('grpc-web') || req.headers['x-grpc-web'] === '1';

  if (!isGrpcWeb) {
    res.writeHead(400);
    res.end('Expected gRPC-web content type');
    return;
  }

  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks);

    // Parse gRPC-web frame(s) to extract raw gRPC payload
    let rawPayload = Buffer.alloc(0);
    let offset = 0;
    while (offset < body.length) {
      const frame = parseGrpcWebFrame(body.slice(offset));
      if (!frame) break;
      // Skip trailer frames (0x80 flag) — they're for client→server in streaming
      if (frame.flag & 0x80) break;
      rawPayload = Buffer.concat([rawPayload, frame.payload]);
      offset += 5 + frame.payload.length;
    }

    if (rawPayload.length === 0) {
      // Fallback: send raw body
      rawPayload = body;
    }

    // Forward as HTTP/2 gRPC to backend
    // nginx grpc_pass handles HTTP/2, so we go through nginx's gRPC endpoint
    const backendReq = http.request({
      hostname: GRPC_HOST,
      port: GRPC_PORT,
      path: req.url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/grpc+proto',
        'Content-Length': rawPayload.length,
        'TE': 'trailers',
        ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
      },
    }, (backendRes) => {
      const responseChunks = [];
      backendRes.on('data', (chunk) => responseChunks.push(chunk));
      backendRes.on('end', () => {
        const responseBody = Buffer.concat(responseChunks);

        // Parse response: gRPC wire format has 5-byte header + message + optional trailer
        // For simplicity, wrap the entire response in a gRPC-web frame
        // and append a trailer frame

        // Find where the gRPC message ends and trailer begins
        // Trailer is after the last gRPC message frame
        let messageEnd = responseBody.length;
        let trailerStr = '';

        // Try to find trailer (starts with 0x80 flag in gRPC framing)
        // In HTTP/2 gRPC response, trailer comes as separate HEADERS frame
        // But over HTTP/1.1 via nginx, it's appended
        // Simple heuristic: look for "grpc-status:" in the last part
        const bodyStr = responseBody.toString('binary');
        const trailerIdx = bodyStr.lastIndexOf('grpc-status:');
        if (trailerIdx > 0) {
          // Find the start of the trailer section (after the last gRPC message)
          // gRPC message frames start with 0x00 flag
          let lastMsgEnd = 0;
          let pos = 0;
          while (pos < responseBody.length) {
            if (pos + 5 > responseBody.length) break;
            const flag = responseBody[pos];
            const len = responseBody.readUInt32BE(pos + 1);
            if (pos + 5 + len > responseBody.length) break;
            if (flag === 0x00) {
              lastMsgEnd = pos + 5 + len;
            }
            pos += 5 + len;
          }

          if (lastMsgEnd > 0 && lastMsgEnd < responseBody.length) {
            const msgPayload = responseBody.slice(0, lastMsgEnd);
            const trailerPayload = responseBody.slice(lastMsgEnd);

            // Wrap message in gRPC-web frame
            const msgFrame = wrapGrpcWebFrame(msgPayload, false);
            // Wrap trailer in gRPC-web trailer frame
            const trailerFrame = wrapGrpcWebFrame(trailerPayload, true);

            res.writeHead(200, {
              'Content-Type': 'application/grpc-web+proto',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Grpc-Web',
            });
            res.end(Buffer.concat([msgFrame, trailerFrame]));
            return;
          }
        }

        // Fallback: wrap entire response as single gRPC-web frame
        const msgFrame = wrapGrpcWebFrame(responseBody, false);
        res.writeHead(200, {
          'Content-Type': 'application/grpc-web+proto',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Grpc-Web',
        });
        res.end(msgFrame);
      });
    });

    backendReq.on('error', (err) => {
      console.error('Backend error:', err.message);
      res.writeHead(502, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      });
      res.end('Bad Gateway: ' + err.message);
    });

    backendReq.write(rawPayload);
    backendReq.end();
  });
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`gRPC-web proxy listening on port ${PROXY_PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
  process.exit(1);
});
