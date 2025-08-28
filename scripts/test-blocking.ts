#!/usr/bin/env npx tsx

/**
 * Test blocking behavior and error messages
 */

import { runPrecommitChecks } from './lib';

// Constants
const SEPARATOR_LINE_LENGTH = 80;

async function main(): Promise<void> {
  console.error('🧪 Testing comprehensive blocking system...');

  try {
    const result = await runPrecommitChecks();

    console.error('\n='.repeat(SEPARATOR_LINE_LENGTH));
    console.error('RESULT:', JSON.stringify(result, null, 2));
    console.error('='.repeat(SEPARATOR_LINE_LENGTH));

    if (result.decision === 'block') {
      console.error('\n🚫 BLOCKED - Claude would receive this feedback:');
      console.error(result.reason);
      process.exit(1);
    } else {
      console.error('\n✅ APPROVED - Claude would be allowed to continue');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
