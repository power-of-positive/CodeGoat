#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
// import { PrismaClient } from '@prisma/client';

/**
 * Script to clean up test-generated projects from databases
 * and ensure proper test database setup
 */

// const DEV_DATABASE = 'file:./prisma/kanban.db';
// const TEST_DATABASE = 'file:./prisma/kanban-test.db';

/* interface ProjectRow {
  id: string;
  name: string;
  git_repo_path: string;
} */

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function runCommand(command: string, description: string): void {
  try {
    log(`Running: ${description}`);
    console.log(`Command: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
  } catch (error) {
    console.error(`Failed to run ${description}:`, error);
  }
}

// DISABLED: Requires Prisma setup
/* async function cleanupDatabase(databaseUrl: string, dbName: string) {
  log(`Cleaning up ${dbName}...`);
  
  try {
    // const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    });

    // Check if projects table exists
    try {
      await prisma.$queryRaw`SELECT 1 FROM projects LIMIT 1`;
    } catch (error: unknown) {
      const prismaError = error as { code?: string; meta?: { message?: string } };
      if (prismaError?.code === 'P2010' && prismaError?.meta?.message?.includes('no such table: projects')) {
        log(`Projects table does not exist in ${dbName}. Skipping cleanup.`);
        await prisma.$disconnect();
        return;
      }
      throw error;
    }

    // Find test projects based on patterns
    const testProjects = await prisma.$queryRaw<ProjectRow[]>`
      SELECT id, name, git_repo_path 
      FROM projects 
      WHERE 
        name LIKE '%Test%' OR 
        name LIKE '%test%' OR 
        git_repo_path LIKE '%test%' OR 
        git_repo_path LIKE '%tmp%' OR
        git_repo_path LIKE '%/tmp/%' OR
        name LIKE '%Task Details Test%' OR
        name LIKE '%Playwright%'
    `;

    if (testProjects.length === 0) {
      log(`No test projects found in ${dbName}`);
      await prisma.$disconnect();
      return;
    }

    log(`Found ${testProjects.length} test projects in ${dbName}:`);
    testProjects.forEach((project: any) => {
      console.log(`  - ${project.name} (${project.git_repo_path})`);
    });

    // Delete test projects and their related data (cascaded)
    for (const project of testProjects) {
      await prisma.project.delete({
        where: { id: project.id }
      });
      log(`Deleted project: ${project.name}`);
      
      // Clean up the git repository directory if it exists and is in tmp
      if (project.git_repo_path.includes('/tmp/')) {
        try {
          if (fs.existsSync(project.git_repo_path)) {
            fs.rmSync(project.git_repo_path, { recursive: true, force: true });
            log(`Cleaned up repo directory: ${project.git_repo_path}`);
          }
        } catch (error) {
          console.warn(`Failed to cleanup directory ${project.git_repo_path}:`, error);
        }
      }
    }

    await prisma.$disconnect();
    log(`Successfully cleaned up ${testProjects.length} test projects from ${dbName}`);
  } catch (error) {
    console.error(`Error cleaning up ${dbName}:`, error);
  }
} */

async function setupTestDatabase() {
  log('Setting up test database...');
  
  // Ensure test database exists and has correct schema
  const testDbPath = './prisma/kanban-test.db';
  
  // Create directory if it doesn't exist
  const testDbDir = path.dirname(testDbPath);
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
    log(`Created directory: ${testDbDir}`);
  }

  // Push schema to test database
  runCommand(
    'KANBAN_DATABASE_URL="file:./prisma/kanban-test.db" npx prisma db push',
    'Push schema to test database'
  );
  
  log('Test database setup complete');
}

async function main() {
  log('Starting test project cleanup...');

  try {
    // 1. Setup test database with proper schema
    await setupTestDatabase();

    // 2. Clean up development database
    // await cleanupDatabase(DEV_DATABASE, 'development database');

    // 3. Clean up test database  
    // await cleanupDatabase(TEST_DATABASE, 'test database');

    // 4. Clean up any orphaned tmp directories
    const tmpDirs = ['/tmp'];
    for (const tmpDir of tmpDirs) {
      if (fs.existsSync(tmpDir)) {
        const entries = fs.readdirSync(tmpDir);
        const testDirs = entries.filter(entry => 
          entry.includes('test-') || 
          entry.includes('Task-Details-Test') ||
          entry.includes('playwright')
        );
        
        for (const testDir of testDirs) {
          const fullPath = path.join(tmpDir, testDir);
          try {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
              fs.rmSync(fullPath, { recursive: true, force: true });
              log(`Cleaned up orphaned tmp directory: ${fullPath}`);
            }
          } catch (error) {
            console.warn(`Failed to cleanup tmp directory ${fullPath}:`, error);
          }
        }
      }
    }

    log('Test project cleanup completed successfully');
  } catch (error) {
    console.error('Test project cleanup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { /* cleanupDatabase, */ setupTestDatabase };