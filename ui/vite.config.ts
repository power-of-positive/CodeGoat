import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
const rawEnvApiBase =
  process.env.API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  (process.env.VITE_API_URL ? `${process.env.VITE_API_URL.replace(/\/$/, '')}/api` : '');

const normalizeApiBase = (url: string): string => {
  if (!url) {
    return '';
  }
  const trimmed = url.endsWith('/') ? url.slice(0, -1) : url;
  if (trimmed.endsWith('/api') || trimmed.includes('/api/')) {
    return trimmed;
  }
  return `${trimmed}/api`;
};

const envApiBase = normalizeApiBase(rawEnvApiBase);
const fallbackBackendPort = process.env.BACKEND_PORT ?? process.env.PORT ?? '3000';
const proxyTarget =
  process.env.VITE_API_URL ??
  (envApiBase ? envApiBase.replace(/\/api\/?$/, '') : `http://localhost:${fallbackBackendPort}`);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      shared: path.resolve(__dirname, './shared'),
    },
  },
  server: {
    port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 5173,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress certain warnings during build
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        if (warning.code === 'MISSING_GLOBAL_NAME') return;
        warn(warning);
      },
    },
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.API_BASE_URL': JSON.stringify(envApiBase),
    'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL ?? ''),
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL ?? ''),
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
});
