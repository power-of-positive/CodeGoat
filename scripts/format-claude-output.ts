#!/usr/bin/env npx tsx

import * as fs from 'fs';

interface StreamJsonMessage {
  type: 'assistant' | 'user';
  message: {
    role: 'assistant' | 'user';
    content: Array<{
      type: 'text' | 'tool_use' | 'tool_result';
      text?: string;
      name?: string;
      input?: unknown;
      content?: string;
      tool_use_id?: string;
    }>;
  };
  session_id: string;
}

function formatClaudeOutput(inputFile: string, outputFile: string): void {
  try {
    const rawContent = fs.readFileSync(inputFile, 'utf8');
    const lines = rawContent.trim().split('\n');

    let formattedOutput = '';
    // currentSessionId tracked but not used - keeping for potential future use
    // let currentSessionId = '';
    const sessionIds = new Set<string>();

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      try {
        const message: StreamJsonMessage = JSON.parse(line);

        // Check if this is a new session
        if (message.session_id && !sessionIds.has(message.session_id)) {
          sessionIds.add(message.session_id);
          // currentSessionId = message.session_id;
          formattedOutput += `=== Claude Session: ${message.session_id} ===\n\n`;
        }

        if (message.type === 'assistant' && message.message.role === 'assistant') {
          formattedOutput += '🤖 Claude:\n';

          for (const content of message.message.content) {
            if (content.type === 'text' && content.text) {
              formattedOutput += `${content.text}\n\n`;
            } else if (content.type === 'tool_use') {
              formattedOutput += `[Tool: ${content.name}]\n`;
              if (content.input) {
                formattedOutput += `Input: ${JSON.stringify(content.input, null, 2)}\n\n`;
              }
            }
          }
        } else if (message.type === 'user' && message.message.role === 'user') {
          formattedOutput += '👤 User:\n';

          for (const content of message.message.content) {
            if (content.type === 'tool_result') {
              formattedOutput += `[Tool Result]: ${content.content}\n\n`;
            } else if (content.content) {
              formattedOutput += `${content.content}\n\n`;
            }
          }
        }

        formattedOutput += '---\n\n';
      } catch {
        // Skip lines that aren't valid JSON
        continue;
      }
    }

    // Write formatted output
    fs.writeFileSync(outputFile, formattedOutput);
    console.log(`✅ Formatted output written to: ${outputFile}`);
    console.log(`📄 Session IDs: ${Array.from(sessionIds).join(', ')}`);
  } catch (error) {
    console.error('❌ Error formatting Claude output:', error);
    process.exit(1);
  }
}

// CLI usage
function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error(`Usage: npx tsx scripts/format-claude-output.ts <input-file> [output-file]

Examples:
  npx tsx scripts/format-claude-output.ts claude-session.json
  npx tsx scripts/format-claude-output.ts claude-session.json formatted-output.txt`);
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1] || inputFile.replace(/\.[^.]+$/, '-formatted.txt');

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    process.exit(1);
  }

  formatClaudeOutput(inputFile, outputFile);
}

if (require.main === module) {
  main();
}

export { formatClaudeOutput };
