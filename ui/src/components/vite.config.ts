import { defineConfig } from 'vite'
/// <reference types="vitest" />
import path from 'path'

export default defineConfig({

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "shared": path.resolve(__dirname, "../shared"),
    },
  },

  server: {
    port: parseInt(process.env.FRONTEND_PORT || '3000'),
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.BACKEND_PORT || '3001'}`,
        changeOrigin: true,
      },
    },
  },

  build: {
    sourcemap: true
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
