const { app, BrowserWindow } = require('electron');
const { fork } = require('child_process');
const path = require('path');

const DEFAULT_BACKEND_PORT = process.env.PORT ?? process.env.BACKEND_PORT ?? '3001';
const BACKEND_ENTRY = path.join(__dirname, '..', '..', 'dist', 'src', 'index.js');

const RENDERER_URL = process.env.ELECTRON_RENDERER_URL ?? '';
let backendProcess;

if (!process.env.PORT) {
  process.env.PORT = DEFAULT_BACKEND_PORT;
}

const startBackend = () => {
  if (process.env.ELECTRON_STARTUP === 'dev') {
    return;
  }

  backendProcess = fork(BACKEND_ENTRY, [], {
    env: {
      ...process.env,
      PORT: DEFAULT_BACKEND_PORT,
      NODE_ENV: process.env.NODE_ENV ?? 'production',
    },
  });

  backendProcess.on('error', error => {
    console.error('Failed to start backend process:', error);
  });
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (RENDERER_URL) {
    const loadResult = mainWindow.loadURL(RENDERER_URL);
    if (typeof loadResult?.catch === 'function') {
      loadResult.catch(console.error);
    }

    if (process.env.ELECTRON_STARTUP === 'dev') {
      const devToolsResult = mainWindow.webContents.openDevTools({ mode: 'detach' });
      if (typeof devToolsResult?.catch === 'function') {
        devToolsResult.catch(() => {});
      }
    }
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    const loadFileResult = mainWindow.loadFile(indexPath);
    if (typeof loadFileResult?.catch === 'function') {
      loadFileResult.catch(console.error);
    }
  }
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.removeAllListeners('exit');
    backendProcess.kill('SIGTERM');
  }
});

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
