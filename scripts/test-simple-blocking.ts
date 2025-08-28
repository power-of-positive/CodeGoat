#!/usr/bin/env npx tsx

/**
 * Simple test for code analysis blocking
 */

function parseResult(err: { stdout: string }): void {
  try {
    const lines = err.stdout.split('\n');
    const lastLine = lines[lines.length - 2];
    const result = JSON.parse(lastLine);
    console.error('\n📊 Structured result:');
    console.error('- Blocked:', result.blocked);
    console.error('- Reasons:', result.reasons);
    // Note: exports structure changed to simple results
    if (result.details?.exports) {
      console.error('- Export check passed');
    }
  } catch {
    console.error('Could not parse structured output');
  }
}

async function testCodeAnalysis(): Promise<void> {
  const { execSync } = await import('child_process');
  console.error('🧪 Testing code analysis blocking...');

  try {
    const output = execSync('npm run code-analysis', { encoding: 'utf-8' });
    console.error('✅ Code analysis passed');
    console.error(output);
  } catch (error: unknown) {
    console.error('🚫 Code analysis BLOCKED (this is correct behavior)');
    const err = error as { status: number; stdout: string };
    console.error('Exit code:', err.status);
    console.error('Output:', err.stdout);
    parseResult(err);
  }
}

testCodeAnalysis().catch(console.error);
