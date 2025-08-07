const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.json({ message: 'Test route works!' });
});

app.get('/api/management/models', (req, res) => {
  res.json({ models: [] });
});

app.use((req, res) => {
  res.status(404).json({ error: 'No matching route found' });
});

app.listen(3001, () => {
  console.log('Test server running on port 3001');
});