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
    console.log(`Running: ${command}`);
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
  console.log('🗄️  Setting up CodeGoat databases...');
  
  // Ensure prisma directory exists
  const prismaDir = path.join(__dirname, '../prisma');
  if (!fs.existsSync(prismaDir)) {
    fs.mkdirSync(prismaDir, { recursive: true });
  }

  // Generate Prisma client
  console.log('\n📦 Generating Prisma client...');
  runCommand('npm run db:generate');

  // Setup development database
  console.log('\n🚀 Setting up development database...');
  if (!fs.existsSync(DEV_DB)) {
    console.log('Development database not found, creating...');
    runCommand('npm run db:push');
  } else {
    console.log('Development database exists');
  }

  // Setup test database
  console.log('\n🧪 Setting up test database...');
  runCommand('npm run db:test:reset');

  console.log('\n✅ Database setup complete!');
  console.log('\nDatabase files:');
  console.log(`  Development: ${DEV_DB}`);
  console.log(`  Test: ${TEST_DB}`);
  
  console.log('\nUseful commands:');
  console.log('  npm run db:studio - Open dev database in Prisma Studio');
  console.log('  npm run db:test:studio - Open test database in Prisma Studio');
  console.log('  npm run db:test:reset - Reset test database');
}

function cleanTestData() {
  console.log('🧹 Cleaning test data from development database...');
  
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

    console.log(`Found ${testProjects.length} test projects to clean up:`);
    testProjects.forEach(project => {
      console.log(`  - ${project.name} (${project.id})`);
    });

    // Delete test projects (this will cascade to tasks and attempts)
    for (const project of testProjects) {
      await tx.project.delete({
        where: { id: project.id }
      });
    }

    console.log(`✅ Cleaned ${testProjects.length} test projects from development database`);
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
  console.log('Database Setup Script');
  console.log('Usage:');
  console.log('  node scripts/database-setup.js setup - Setup dev and test databases');
  console.log('  node scripts/database-setup.js clean - Clean test data from dev database');
}