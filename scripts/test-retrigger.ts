#!/usr/bin/env npx tsx

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Test the re-trigger functionality directly

async function testRetrigger() {
  console.log('Testing re-trigger with multi-line prompt...\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionFile = path.join(process.cwd(), 'logs', `test-session-${timestamp}.json`);
  const formattedFile = path.join(process.cwd(), 'logs', `test-session-${timestamp}-formatted.txt`);

  // Create logs dir
  const logsDir = path.dirname(sessionFile);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Multi-line prompt that would be used for validation
  const prompt = `Fix the following validation issues:

Please check the logs for validation issues.

Please address all the issues and ensure the code passes validation.`;

  // Build command args like the script does
  const args = ['claude', '-p', prompt, '--output-format=stream-json', '--verbose'];

  console.log('Command args:');
  console.log('  claude');
  console.log('  -p');
  console.log(`  <prompt with ${prompt.length} chars and ${prompt.split('\n').length} lines>`);
  console.log('  --output-format=stream-json');
  console.log('  --verbose');
  console.log();

  // Spawn claude process
  const child = spawn(args[0], args.slice(1), {
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  let outputBuffer = '';
  let errorBuffer = '';
  let dataReceived = false;

  child.stdout?.on('data', data => {
    const chunk = data.toString();
    outputBuffer += chunk;
    process.stdout.write(chunk);
    if (!dataReceived) {
      console.log(`\n>>> Receiving stdout (${chunk.length} bytes)...\n`);
      dataReceived = true;
    }
  });

  child.stderr?.on('data', data => {
    const chunk = data.toString();
    errorBuffer += chunk;
    process.stderr.write(chunk);
    if (!dataReceived) {
      console.log(`\n>>> Receiving stderr (${chunk.length} bytes)...\n`);
      dataReceived = true;
    }
  });

  child.on('close', code => {
    console.log(`\n>>> Process exited with code: ${code}`);
    console.log(
      `>>> Total output: ${outputBuffer.length} bytes (stdout), ${errorBuffer.length} bytes (stderr)`
    );
    console.log(`>>> Data received: ${dataReceived}`);

    const fullOutput = outputBuffer + errorBuffer;

    if (fullOutput.trim()) {
      fs.writeFileSync(sessionFile, fullOutput);
      console.log(`>>> Saved to: ${sessionFile}`);

      // Try to format
      try {
        const lines = fullOutput.trim().split('\n');
        let formatted = 'Test Session Output\n===================\n\n';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const obj = JSON.parse(line);
              if (obj.type === 'assistant' && obj.message?.content) {
                formatted += 'Claude Response:\n';
                const content = Array.isArray(obj.message.content)
                  ? obj.message.content.map((c: { text?: string }) => c.text || '').join('')
                  : obj.message.content;
                formatted += content + '\n\n';
              } else if (obj.result) {
                formatted += `Result: ${obj.result}\n\n`;
              }
            } catch {
              // Not JSON, add as-is
              formatted += line + '\n';
            }
          }
        }

        fs.writeFileSync(formattedFile, formatted);
        console.log(`>>> Formatted output saved to: ${formattedFile}`);
      } catch (e) {
        console.log(`>>> Could not format output: ${e}`);
      }
    } else {
      console.log('>>> No output captured!');
      fs.writeFileSync(
        sessionFile,
        `{"note": "No output captured", "timestamp": "${new Date().toISOString()}"}`
      );
      fs.writeFileSync(formattedFile, 'No output captured');
    }
  });

  child.on('error', error => {
    console.error('>>> Failed to spawn claude:', error);
  });
}

testRetrigger().catch(console.error);
