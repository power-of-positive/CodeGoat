#!/usr/bin/env node

/**
 * TypeScript Preference Checker
 * 
 * This script ensures that TypeScript files are preferred over JavaScript files
 * in the codebase to maintain consistency and type safety.
 */

const fs = require('fs');
const path = require('path');

function getAllFiles(dir, extension) {
  const files = [];
  
  function walkDir(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && item !== 'node_modules' && item !== 'dist' && item !== '.git') {
        walkDir(fullPath);
      } else if (stat.isFile() && item.endsWith(extension)) {
        const relativePath = path.relative(dir, fullPath);
        files.push(relativePath);
      }
    }
  }
  
  walkDir(dir);
  return files;
}

function checkTypeScriptPreference() {
  console.log('🔍 Checking TypeScript preference...');
  
  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.log('✅ No src directory found, skipping TypeScript preference check');
    return;
  }
  
  let issues = [];
  
  // Get all .js files (excluding test files)
  const jsFiles = getAllFiles(srcDir, '.js').filter(file => 
    !file.includes('.test.js') && 
    !file.includes('.spec.js') && 
    !file.includes('.d.ts')
  );
  
  // Check for .js files that should be .ts
  for (const jsFile of jsFiles) {
    const tsFile = jsFile.replace(/\.js$/, '.ts');
    const tsFilePath = path.join(srcDir, tsFile);
    
    if (!fs.existsSync(tsFilePath)) {
      issues.push(`JavaScript file found without TypeScript equivalent: ${jsFile}`);
    }
  }
  
  if (issues.length > 0) {
    console.error('❌ TypeScript preference violations found:');
    issues.forEach(issue => console.error(`  - ${issue}`));
    process.exit(1);
  }
  
  console.log('✅ TypeScript preference check passed');
}

if (require.main === module) {
  checkTypeScriptPreference();
}

module.exports = { checkTypeScriptPreference };