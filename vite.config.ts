import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
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
  // Environment variables available in the app via import.meta.env.VITE_*
  envPrefix: 'VITE_',
})
