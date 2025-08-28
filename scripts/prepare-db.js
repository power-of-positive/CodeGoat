#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.error('Preparing database for SQLx...');

// Change to backend directory
const backendDir = path.join(__dirname, '..', 'crates/db');
process.chdir(backendDir);

// Create temporary database file
const dbFile = path.join(backendDir, 'prepare_db.sqlite');
fs.writeFileSync(dbFile, '');

try {
  // Get absolute path (cross-platform)
  const dbPath = path.resolve(dbFile);
  const databaseUrl = `sqlite:${dbPath}`;

  console.error(`Using database: ${databaseUrl}`);

  // Run migrations
  console.error('Running migrations...');
  execSync('cargo sqlx migrate run', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl }
  });

  // Prepare queries
  console.error('Preparing queries...');
  execSync('cargo sqlx prepare', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl }
  });

  console.error('Database preparation complete!');

} finally {
  // Clean up temporary file
  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
  }
}