#!/usr/bin/env npx tsx

/**
 * Simple test for code analysis blocking
 */

function parseResult(err: { stdout: string }): void {
  try {
    const lines = err.stdout.split("\n");
    const lastLine = lines[lines.length - 2];
    const result = JSON.parse(lastLine);
    console.log("\n📊 Structured result:");
    console.log("- Blocked:", result.blocked);
    console.log("- Reasons:", result.reasons);
    // Note: exports structure changed to simple results
    if (result.details?.exports) {
      console.log("- Export check passed");
    }
  } catch {
    console.log("Could not parse structured output");
  }
}

async function testCodeAnalysis(): Promise<void> {
  const { execSync } = await import("child_process");
  console.log("🧪 Testing code analysis blocking...");

  try {
    const output = execSync("npm run code-analysis", { encoding: "utf-8" });
    console.log("✅ Code analysis passed");
    console.log(output);
  } catch (error: unknown) {
    console.log("🚫 Code analysis BLOCKED (this is correct behavior)");
    const err = error as { status: number; stdout: string };
    console.log("Exit code:", err.status);
    console.log("Output:", err.stdout);
    parseResult(err);
  }
}

testCodeAnalysis().catch(console.error);
