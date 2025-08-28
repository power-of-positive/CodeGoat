#!/usr/bin/env node
/**
 * Database Setup Script
 * Sets up separate databases for development and testing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEV_DB = path.join(__dirname, '../prisma/kanban.db');
const TEST_DB = path.join(__dirname, '../prisma/kanban-test.db');

function runCommand(command, options = {}) {
  try {
    console.error(`Running: ${command}`);
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      ...options 
    });
    return output;
  } catch (error) {
    console.error(`Error running command: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

function setupDatabases() {
  console.error('🗄️  Setting up CodeGoat databases...');
  
  // Ensure prisma directory exists
  const prismaDir = path.join(__dirname, '../prisma');
  if (!fs.existsSync(prismaDir)) {
    fs.mkdirSync(prismaDir, { recursive: true });
  }

  // Generate Prisma client
  console.error('\n📦 Generating Prisma client...');
  runCommand('npm run db:generate');

  // Setup development database
  console.error('\n🚀 Setting up development database...');
  if (!fs.existsSync(DEV_DB)) {
    console.error('Development database not found, creating...');
    runCommand('npm run db:push');
  } else {
    console.error('Development database exists');
  }

  // Setup test database
  console.error('\n🧪 Setting up test database...');
  runCommand('npm run db:test:reset');

  console.error('\n✅ Database setup complete!');
  console.error('\nDatabase files:');
  console.error(`  Development: ${DEV_DB}`);
  console.error(`  Test: ${TEST_DB}`);
  
  console.error('\nUseful commands:');
  console.error('  npm run db:studio - Open dev database in Prisma Studio');
  console.error('  npm run db:test:studio - Open test database in Prisma Studio');
  console.error('  npm run db:test:reset - Reset test database');
}

function cleanTestData() {
  console.error('🧹 Cleaning test data from development database...');
  
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${DEV_DB}`
      }
    }
  });

  return prisma.$transaction(async (tx) => {
    // Find test projects (those with names containing test patterns)
    const testProjects = await tx.project.findMany({
      where: {
        OR: [
          { name: { contains: 'Test' } },
          { name: { contains: 'test' } },
          { name: { contains: 'PROJECT' } },
          { name: { contains: 'Attempt' } },
          { name: { contains: 'Valid' } },
          { name: { contains: 'Dependent' } },
          { name: { contains: '1755079' } }, // Specific test pattern
        ]
      }
    });

    console.error(`Found ${testProjects.length} test projects to clean up:`);
    testProjects.forEach(project => {
      console.error(`  - ${project.name} (${project.id})`);
    });

    // Delete test projects (this will cascade to tasks and attempts)
    for (const project of testProjects) {
      await tx.project.delete({
        where: { id: project.id }
      });
    }

    console.error(`✅ Cleaned ${testProjects.length} test projects from development database`);
  }).finally(() => {
    return prisma.$disconnect();
  });
}

// Main execution
const action = process.argv[2];

if (action === 'clean') {
  cleanTestData().catch(console.error);
} else if (action === 'setup') {
  setupDatabases();
} else {
  console.error('Database Setup Script');
  console.error('Usage:');
  console.error('  node scripts/database-setup.js setup - Setup dev and test databases');
  console.error('  node scripts/database-setup.js clean - Clean test data from dev database');
}