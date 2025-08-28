import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function globalSetup() {
  console.error('🗄️  Initializing test database for E2E tests...');
  
  try {
    // Set environment variables for database initialization
    const env = {
      ...process.env,
      NODE_ENV: 'e2e-test',
      KANBAN_DATABASE_URL: 'file:./prisma/kanban-test.db',
      DATABASE_URL: 'file:./prisma/kanban-test.db',
    };

    // Go to project root and initialize database
    const projectRoot = path.resolve(__dirname, '../..');
    
    execSync('npx prisma db push --force-reset --skip-generate', {
      cwd: projectRoot,
      env,
      stdio: 'pipe', // Don't show output unless there's an error
    });
    
    console.error('✅ Test database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error.message);
    // Don't fail the tests, just warn
    console.warn('⚠️  Continuing with E2E tests despite database initialization failure');
  }
}

export default globalSetup;