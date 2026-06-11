import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  base: '/web/',
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'public/manifest.json', dest: '.' },
        { src: 'public/sw.js', dest: '.' },
        { src: 'public/icons', dest: 'icons' },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          virtuoso: ['react-virtuoso'],
          protobuf: ['@bufbuild/protobuf', '@connectrpc/connect', '@connectrpc/connect-web'],
        },
      },
    },
  },
  envPrefix: 'VITE_',
})
