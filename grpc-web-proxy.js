#!/usr/bin/env node
/**
 * gRPC-web proxy using @improbable-eng/grpc-web
 */

const http = require('http')
const { grpcweb } = require('@improbable-eng/grpc-web')

const PROXY_PORT = parseInt(process.env.PROXY_PORT || '9090')
const GRPC_HOST = process.env.GRPC_HOST || '127.0.0.1'
const GRPC_PORT = parseInt(process.env.GRPC_PORT || '50051')

console.log(`Starting gRPC-web proxy...`)
console.log(`Listen: 0.0.0.0:${PROXY_PORT}`)
console.log(`Target: ${GRPC_HOST}:${GRPC_PORT}`)

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Grpc-Web, Accept',
    })
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405)
    res.end()
    return
  }

  const chunks = []
  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', () => {
    const body = Buffer.concat(chunks)

    // Forward as gRPC-web
    const proxyReq = http.request({
      hostname: GRPC_HOST,
      port: GRPC_PORT,
      path: req.url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/grpc-web+proto',
        'Content-Length': body.length,
        'X-Grpc-Web': '1',
        ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
      },
    }, (proxyRes) => {
      const responseChunks = []
      proxyRes.on('data', (chunk) => responseChunks.push(chunk))
      proxyRes.on('end', () => {
        res.writeHead(proxyRes.statusCode || 200, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/grpc-web+proto',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Grpc-Web',
          ...(proxyRes.headers['grpc-status'] ? { 'grpc-status': proxyRes.headers['grpc-status'] } : {}),
          ...(proxyRes.headers['grpc-message'] ? { 'grpc-message': proxyRes.headers['grpc-message'] } : {}),
        })
        res.end(Buffer.concat(responseChunks))
      })
    })

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message)
      res.writeHead(502, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      })
      res.end('Bad Gateway')
    })

    proxyReq.write(body)
    proxyReq.end()
  })
})

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`gRPC-web proxy listening on port ${PROXY_PORT}`)
  console.log(`Forwarding to ${GRPC_HOST}:${GRPC_PORT}`)
})

server.on('error', (err) => {
  console.error('Server error:', err.message)
})
