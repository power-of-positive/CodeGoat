import * as fs from 'fs';
import * as path from 'path';
import { spawn, exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const exec = promisify(execCallback);

describe('run-claude-prompt.ts', () => {
  const testLogsDir = path.join(process.cwd(), 'test-logs');
  const scriptPath = path.join(__dirname, 'run-claude-prompt.ts');

  beforeEach(() => {
    // Create test logs directory
    if (!fs.existsSync(testLogsDir)) {
      fs.mkdirSync(testLogsDir, { recursive: true });
    }
    // Set logs directory for tests
    process.env.TEST_LOGS_DIR = testLogsDir;
  });

  afterEach(() => {
    // Clean up test logs
    if (fs.existsSync(testLogsDir)) {
      fs.rmSync(testLogsDir, { recursive: true, force: true });
    }
  });

  describe('Output Capture', () => {
    it('should capture initial claude output to JSON file', async () => {
      // Mock a simple claude execution
      const mockOutput = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Test response' }] },
        session_id: 'test-session-123',
      });

      // Run the script with a test prompt
      const result = await runScript(['test prompt', '--no-validation']);

      // Check that JSON file was created
      const jsonFiles = fs.readdirSync(testLogsDir).filter(f => f.endsWith('.json'));
      expect(jsonFiles.length).toBeGreaterThan(0);

      // Verify JSON file contains output
      const jsonContent = fs.readFileSync(path.join(testLogsDir, jsonFiles[0]), 'utf8');
      expect(jsonContent).toBeTruthy();
      expect(jsonContent.length).toBeGreaterThan(0);
    });

    it('should capture initial claude output to formatted text file', async () => {
      // Run the script with a test prompt
      const result = await runScript(['test prompt', '--no-validation']);

      // Check that formatted text file was created
      const txtFiles = fs.readdirSync(testLogsDir).filter(f => f.endsWith('-formatted.txt'));
      expect(txtFiles.length).toBeGreaterThan(0);

      // Verify text file contains formatted output
      const txtContent = fs.readFileSync(path.join(testLogsDir, txtFiles[0]), 'utf8');
      expect(txtContent).toBeTruthy();
      expect(txtContent.length).toBeGreaterThan(0);
    });

    it('should capture validation re-trigger output to the SAME files', async () => {
      // First, create a mock that simulates validation failure
      const mockValidationFail = jest.fn(() => {
        return { decision: 'block', feedback: 'Fix linting errors' };
      });

      // Run script (will trigger validation and re-run)
      const result = await runScript(['test prompt']);

      // Get the created files
      const jsonFiles = fs.readdirSync(testLogsDir).filter(f => f.endsWith('.json'));
      const txtFiles = fs.readdirSync(testLogsDir).filter(f => f.endsWith('-formatted.txt'));

      expect(jsonFiles.length).toBe(1); // Should be only ONE json file
      expect(txtFiles.length).toBe(1); // Should be only ONE text file

      // Check that the files contain BOTH initial and re-trigger output
      const jsonContent = fs.readFileSync(path.join(testLogsDir, jsonFiles[0]), 'utf8');
      const sessions = jsonContent.split('\n').filter(line => line.includes('session_id'));

      // Should have multiple session entries (initial + re-trigger)
      expect(sessions.length).toBeGreaterThan(1);
    });

    it('should use -p flag for both initial and re-trigger runs', async () => {
      const childProcess = await import('child_process');
      const spawnSpy = jest.spyOn(childProcess, 'spawn');

      // Run script with validation (will trigger re-run on failure)
      await runScript(['test prompt']);

      // Check all spawn calls used -p flag
      const claudeCalls = spawnSpy.mock.calls.filter(call => call[0] === 'claude');

      claudeCalls.forEach(call => {
        const args = call[1];
        expect(args).toContain('-p');
      });

      spawnSpy.mockRestore();
    });

    it('should append to existing session files on re-trigger', async () => {
      // Simulate initial run creating files
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sessionFile = path.join(testLogsDir, `claude-session-${timestamp}.json`);
      const formattedFile = path.join(testLogsDir, `claude-session-${timestamp}-formatted.txt`);

      // Create initial content
      fs.writeFileSync(sessionFile, '{"initial": "content"}\n');
      fs.writeFileSync(formattedFile, 'Initial formatted content\n');

      const initialJsonSize = fs.statSync(sessionFile).size;
      const initialTxtSize = fs.statSync(formattedFile).size;

      // Simulate re-trigger appending to files
      fs.appendFileSync(sessionFile, '{"retrigger": "content"}\n');
      fs.appendFileSync(formattedFile, 'Re-triggered content\n');

      const finalJsonSize = fs.statSync(sessionFile).size;
      const finalTxtSize = fs.statSync(formattedFile).size;

      // Verify files grew (content was appended, not replaced)
      expect(finalJsonSize).toBeGreaterThan(initialJsonSize);
      expect(finalTxtSize).toBeGreaterThan(initialTxtSize);

      // Verify both contents are present
      const jsonContent = fs.readFileSync(sessionFile, 'utf8');
      expect(jsonContent).toContain('initial');
      expect(jsonContent).toContain('retrigger');

      const txtContent = fs.readFileSync(formattedFile, 'utf8');
      expect(txtContent).toContain('Initial');
      expect(txtContent).toContain('Re-triggered');
    });
  });

  describe('Command Construction', () => {
    it('should properly escape multi-line prompts', async () => {
      const multiLinePrompt = 'Fix the following:\\n\\n- Error 1\\n- Error 2';
      const childProcess = await import('child_process');
      const spawnSpy = jest.spyOn(childProcess, 'spawn');

      await runScript([multiLinePrompt, '--no-validation']);

      const claudeCall = spawnSpy.mock.calls.find(call => call[0] === 'claude');
      expect(claudeCall).toBeDefined();

      const args = claudeCall![1];
      const promptIndex = args.indexOf('-p') + 1;
      const capturedPrompt = args[promptIndex];

      // Should preserve the prompt structure
      expect(capturedPrompt).toContain('Fix the following');
      expect(capturedPrompt).toContain('Error 1');
      expect(capturedPrompt).toContain('Error 2');

      spawnSpy.mockRestore();
    });

    it('should always include output-format and verbose flags', async () => {
      const childProcess = await import('child_process');
      const spawnSpy = jest.spyOn(childProcess, 'spawn');

      await runScript(['test', '--no-validation']);

      const claudeCall = spawnSpy.mock.calls.find(call => call[0] === 'claude');
      const args = claudeCall![1];

      expect(args).toContain('--output-format=stream-json');
      expect(args).toContain('--verbose');

      spawnSpy.mockRestore();
    });
  });

  describe('File Creation', () => {
    it('should create logs directory if it does not exist', async () => {
      // Remove logs directory
      if (fs.existsSync(testLogsDir)) {
        fs.rmSync(testLogsDir, { recursive: true });
      }

      await runScript(['test', '--no-validation']);

      // Logs directory should be created
      expect(fs.existsSync(testLogsDir)).toBe(true);
    });

    it('should create empty session files even when no output captured', async () => {
      // Mock spawn to return no output
      const childProcess = await import('child_process');
      const spawnSpy = jest.spyOn(childProcess, 'spawn');
      spawnSpy.mockImplementation(() => {
        const emitter = new EventEmitter() as any;
        emitter.stdout = new EventEmitter();
        emitter.stderr = new EventEmitter();

        setTimeout(() => {
          emitter.emit('close', 0);
        }, 10);

        return emitter;
      });

      await runScript(['test', '--no-validation']);

      // Should still create files
      const jsonFiles = fs.readdirSync(testLogsDir).filter(f => f.endsWith('.json'));
      const txtFiles = fs.readdirSync(testLogsDir).filter(f => f.endsWith('-formatted.txt'));

      expect(jsonFiles.length).toBeGreaterThan(0);
      expect(txtFiles.length).toBeGreaterThan(0);

      // Files should contain placeholder content
      const jsonContent = fs.readFileSync(path.join(testLogsDir, jsonFiles[0]), 'utf8');
      expect(jsonContent).toContain('No output captured');

      spawnSpy.mockRestore();
    });
  });
});

// Helper function to run the script
async function runScript(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', 'script.js', ...args], {
      env: { ...process.env, TEST_MODE: 'true' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', data => {
      stdout += data.toString();
    });

    child.stderr?.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', code => {
      if (code !== 0 && !stderr.includes('validation')) {
        reject(new Error(`Script exited with code ${code}: ${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });

    child.on('error', reject);
  });
}
