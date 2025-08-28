// Simple test server for Playwright tests
const express = require('express');
const path = require('path');

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

app.use(express.json());

// Serve static files from UI build directory
const uiDistPath = path.join(__dirname, 'ui', 'dist');
app.use(express.static(uiDistPath));

// Mock API endpoints that tests expect
app.get('/api/workers', (req, res) => {
  res.json([]);
});

app.get('/api/tasks', (req, res) => {
  res.json([]);
});

app.get('/api/analytics', (req, res) => {
  res.json({ metrics: [] });
});

app.get('/api/settings', (req, res) => {
  res.json({ validationStages: [] });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Catch-all for client-side routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.sendFile(path.join(uiDistPath, 'index.html'));
  }
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.error(`Test server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.error('Shutting down test server...');
  server.close(() => {
    console.error('Test server shut down.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.error('Shutting down test server...');
  server.close(() => {
    console.error('Test server shut down.');
    process.exit(0);
  });
});