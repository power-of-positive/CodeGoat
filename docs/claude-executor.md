# ClaudeCodeExecutor: TypeScript Executor Specification

## Overview

The `ClaudeCodeExecutor` is a TypeScript class that provides a programmatic interface for running the Claude CLI agent in a specified worktree directory, sending it a prompt, and collecting its output. It is designed to mirror the behavior of the Rust-based executor in the original backend, supporting integration into larger backend or workflow systems.

---

## Constructor

```
constructor(options: ClaudeExecutorOptions)
```

- **Parameters:**
  - `worktreeDir` (string): Directory in which the Claude agent process will run (typically a workspace or task-specific directory).
  - `claudeCommand` (string): Shell command to launch the Claude agent (e.g., `npx -y @anthropic-ai/claude-code@latest -p --dangerously-skip-permissions --verbose --output-format=stream-json`).

---

## Method: `spawn`

```
async spawn(prompt: string): Promise<{ stdout: string; stderr: string; exitCode: number }>
```

- **Parameters:**
  - `prompt` (string): The prompt to send to the Claude agent via stdin.

- **Behavior:**
  1. **Command Parsing:**
     - Splits the `claudeCommand` string into the executable and its arguments using a shell-like parser.
  2. **Process Spawning:**
     - Uses Node.js's `child_process.spawn` to launch the agent process:
       - Working directory is set to `worktreeDir`.
       - Stdin, stdout, and stderr are all piped.
       - `shell: false` for direct execution.
  3. **Prompt Piping:**
     - Writes the provided `prompt` to the agent's stdin and closes the stream.
  4. **Output Collection:**
     - Collects all data from stdout and stderr as strings.
     - Waits for the process to exit.
  5. **Result:**
     - Resolves with an object containing:
       - `stdout`: The full output from the agent's stdout.
       - `stderr`: The full output from the agent's stderr.
       - `exitCode`: The process exit code (or -1 if not available).

---

## Method: `parseShellCommand`

```
private parseShellCommand(cmd: string): string[]
```

- **Purpose:**
  - Splits a shell command string into an array of the executable and its arguments, handling quoted arguments.

---

## Example Usage

```
const executor = new ClaudeCodeExecutor({
  worktreeDir: '/tmp/my-worktree',
  claudeCommand: 'npx -y @anthropic-ai/claude-code@latest -p --dangerously-skip-permissions --verbose --output-format=stream-json',
});
const prompt = 'Write a hello world program in Python.';
const result = await executor.spawn(prompt);
console.log('Claude output:', result.stdout);
console.error('Claude errors:', result.stderr);
console.log('Exit code:', result.exitCode);
```

---

## Integration Points

- **Worktree Management:**
  - The executor runs the agent in a specific directory, ensuring isolation per workspace/task.
- **Shell Command Flexibility:**
  - The command can be customized for different agent versions or invocation methods.
- **Output Handling:**
  - The output can be further processed (e.g., parsed as JSON lines) by downstream logic.

---

## Summary

- The executor is a thin, robust wrapper for running the Claude CLI agent as a subprocess.
- It is responsible for:
  - Setting up the execution environment (worktree).
  - Sending the prompt.
  - Collecting all output and the exit code.
- It is designed to be easily integrated into a larger backend or workflow system, and to mirror the behavior of the Rust backend’s executor.
