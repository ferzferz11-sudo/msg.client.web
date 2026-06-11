#!/usr/bin/env node
/**
 * Simple gRPC-web proxy
 * Translates gRPC-web (HTTP/1.1) to gRPC (HTTP/2)
 * Listens on port 9090, forwards to gRPC server on port 50051
 */

const http = require('http')
const { execSync } = require('child_process')

const PROXY_PORT = 9090
const GRPC_HOST = '127.0.0.1'
const GRPC_PORT = 50051

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Grpc-Web',
    })
    res.end()
    return
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.writeHead(405)
    res.end('Method Not Allowed')
    return
  }

  // Collect body
  const chunks = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', () => {
    const body = Buffer.concat(chunks)

    // Build gRPC request
    // gRPC-web framing: 1 byte flag + 4 byte length + message
    const messageLen = body.length
    const frame = Buffer.alloc(5 + messageLen)
    frame[0] = 0 // compression flag
    frame.writeUInt32BE(messageLen, 1)
    body.copy(frame, 5)

    // Use curl to send gRPC request
    const url = `http://${GRPC_HOST}:${GRPC_PORT}${req.url}`
    try {
      const result = execSync(
        `curl -s -X POST -H "Content-Type: application/grpc+proto" -H "Authorization: ${req.headers.authorization || ''}" --data-binary '@-' '${url}'`,
        { input: frame, maxBuffer: 10 * 1024 * 1024 }
      )

      // Parse gRPC response framing
      let offset = 0
      const responseChunks = []
      while (offset < result.length) {
        if (offset + 5 > result.length) break
        const flag = result[offset]
        const len = result.readUInt32BE(offset + 1)
        offset += 5
        if (offset + len > result.length) break
        responseChunks.push(result.slice(offset, offset + len))
        offset += len
      }

      const responseBody = Buffer.concat(responseChunks)

      res.writeHead(200, {
        'Content-Type': 'application/grpc+proto',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Grpc-Web',
      })
      res.end(responseBody)
    } catch (err) {
      console.error('Proxy error:', err.message)
      res.writeHead(502, { 'Content-Type': 'text/plain' })
      res.end('Bad Gateway')
    }
  })
})

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`gRPC-web proxy listening on port ${PROXY_PORT}`)
  console.log(`Forwarding to gRPC server at ${GRPC_HOST}:${GRPC_PORT}`)
})
