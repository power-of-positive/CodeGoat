const { contextBridge } = require('electron');

const DEFAULT_BACKEND_PORT = process.env.PORT ?? process.env.BACKEND_PORT ?? '3001';
const DEFAULT_API_BASE =
  process.env.API_BASE_URL ?? `http://localhost:${DEFAULT_BACKEND_PORT}/api`;

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  apiBase: DEFAULT_API_BASE,
});
