#!/usr/bin/env npx tsx

import fs from 'fs';
// import path from 'path'; // Not used currently
import { execSync } from 'child_process';

interface FileToRemove {
  path: string;
  reason: string;
  size: number;
}

function findEmptyFiles(): FileToRemove[] {
  const filesToRemove: FileToRemove[] = [];

  try {
    const emptyFiles = execSync(
      'find . -type f -size 0 -not -path "./node_modules/*" -not -path "./ui/node_modules/*" -not -path "./.git/*" -not -path "./dist/*" -not -path "./ui/dist/*" -not -path "./build/*" -not -path "./coverage/*" -not -path "./test-results/*" 2>/dev/null',
      { encoding: 'utf8' }
    )
      .trim()
      .split('\n')
      .filter(Boolean);

    for (const file of emptyFiles) {
      if (fs.existsSync(file)) {
        const stat = fs.statSync(file);
        // Skip certain files that should be empty
        if (file.includes('.gitkeep') || file.includes('.gitignore') || file.endsWith('.log')) {
          continue;
        }
        filesToRemove.push({ path: file, reason: 'Empty file (0 bytes)', size: stat.size });
      }
    }
  } catch {
    console.log('⚠️  Could not find empty files, continuing...');
  }

  return filesToRemove;
}

function findTempFiles(): FileToRemove[] {
  const filesToRemove: FileToRemove[] = [];
  const tempFiles = [
    './temp-test.js',
    './test-results.xml',
    './database.db', // if it's different from the main db
  ];

  for (const file of tempFiles) {
    if (fs.existsSync(file)) {
      const stat = fs.statSync(file);
      filesToRemove.push({ path: file, reason: 'Temporary test file', size: stat.size });
    }
  }

  return filesToRemove;
}

function findCoverageFiles(): FileToRemove[] {
  const filesToRemove: FileToRemove[] = [];
  const coverageFiles = [
    './ui/coverage/prettify.js',
    './coverage/lcov-report/prettify.js',
    './coverage/scripts/prettify.js',
  ];

  for (const file of coverageFiles) {
    if (fs.existsSync(file)) {
      const stat = fs.statSync(file);
      filesToRemove.push({ path: file, reason: 'Generated coverage file', size: stat.size });
    }
  }

  return filesToRemove;
}

function displayFilesToRemove(filesToRemove: FileToRemove[]): number {
  if (filesToRemove.length === 0) {
    console.log('✅ No empty or unnecessary files found to clean up!');
    return 0;
  }

  console.log('📋 Files to be removed:');
  console.log('='.repeat(60));

  let totalSize = 0;
  for (const file of filesToRemove) {
    console.log(`🗑️  ${file.path}`);
    console.log(`   └── ${file.reason} (${file.size} bytes)`);
    totalSize += file.size;
  }

  console.log('='.repeat(60));
  console.log(`📊 Total: ${filesToRemove.length} files, ${totalSize} bytes\n`);

  return totalSize;
}

function removeFiles(filesToRemove: FileToRemove[]): number {
  let removedCount = 0;
  for (const file of filesToRemove) {
    try {
      fs.unlinkSync(file.path);
      console.log(`✅ Removed: ${file.path}`);
      removedCount++;
    } catch (error) {
      console.log(`❌ Failed to remove: ${file.path} - ${error}`);
    }
  }
  return removedCount;
}

function cleanupEmptyDirectories(): void {
  console.log('\n🧹 Cleaning up empty directories...');
  try {
    execSync(
      'find . -type d -empty -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./ui/node_modules/*" -delete 2>/dev/null || true'
    );
    console.log('✅ Empty directories cleaned up');
  } catch {
    console.log('⚠️  Could not clean empty directories');
  }
}

async function cleanupEmptyFiles() {
  console.log('🧹 Starting cleanup of empty and unnecessary files...\n');

  const filesToRemove: FileToRemove[] = [
    ...findEmptyFiles(),
    ...findTempFiles(),
    ...findCoverageFiles(),
  ];

  const totalSize = displayFilesToRemove(filesToRemove);
  if (totalSize === 0) {
    return;
  }

  const removedCount = removeFiles(filesToRemove);
  console.log(`\n🎉 Successfully cleaned up ${removedCount} files!`);

  cleanupEmptyDirectories();
}

// Run if executed directly
if (require.main === module) {
  cleanupEmptyFiles().catch(console.error);
}

export { cleanupEmptyFiles };
