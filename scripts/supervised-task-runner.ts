#!/usr/bin/env npx ts-node

import { ClaudeSupervisor } from './claude-supervisor';
import { promises as fs } from 'fs';

// Constants
const TASK_TIMEOUT_MINUTES = 45;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SEPARATOR_LINE_LENGTH = 80;

interface TodoTask {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  id: string;
}

class SupervisedTaskRunner {
  private supervisor: ClaudeSupervisor;
  private todoFile: string;

  constructor(todoFile: string = './todo-list.json') {
    this.todoFile = todoFile;
    this.supervisor = new ClaudeSupervisor({
      maxAttempts: 15,
      sessionTimeout: TASK_TIMEOUT_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND, // 45 minutes for complex tasks
    });
  }

  async loadTodos(): Promise<TodoTask[]> {
    try {
      const content = await fs.readFile(this.todoFile, 'utf8');
      return JSON.parse(content);
    } catch {
      console.log('📝 No todo file found, creating empty list');
      return [];
    }
  }

  async saveTodos(todos: TodoTask[]): Promise<void> {
    await fs.writeFile(this.todoFile, JSON.stringify(todos, null, 2));
  }

  async runTask(taskId: string): Promise<boolean> {
    const todos = await this.loadTodos();
    const task = todos.find(t => t.id === taskId);
    
    if (!task) {
      console.error(`❌ Task ${taskId} not found`);
      return false;
    }
    
    if (task.status === 'completed') {
      console.log(`✅ Task ${taskId} already completed`);
      return true;
    }

    console.log(`🎯 Starting supervised execution of task: ${task.content}`);
    
    // Mark task as in progress
    task.status = 'in_progress';
    await this.saveTodos(todos);

    // Generate comprehensive prompt for the task
    const prompt = this.generateTaskPrompt(task, todos);
    
    try {
      const result = await this.supervisor.runSession(prompt);
      
      if (result.success) {
        task.status = 'completed';
        console.log(`🎉 Task ${taskId} completed successfully!`);
      } else {
        task.status = 'pending';
        console.log(`❌ Task ${taskId} failed after ${result.attempts} attempts`);
      }
      
      await this.saveTodos(todos);
      return result.success;
      
    } catch (error) {
      console.error(`💥 Error running task ${taskId}:`, error);
      task.status = 'pending';
      await this.saveTodos(todos);
      return false;
    }
  }

  private generateTaskPrompt(task: TodoTask, allTodos: TodoTask[]): string {
    const pendingTasks = allTodos.filter(t => t.status === 'pending');
    const inProgressTasks = allTodos.filter(t => t.status === 'in_progress');
    
    let prompt = `🎯 SUPERVISED TASK EXECUTION

PRIMARY TASK: ${task.content}

CONTEXT:
- This task is part of a larger todo list with ${allTodos.length} total tasks
- ${pendingTasks.length} tasks are still pending
- ${inProgressTasks.length} tasks are in progress (including this one)

REQUIREMENTS:
1. Complete the primary task: "${task.content}"
2. Ensure ALL validation stages pass before completion
3. Fix any issues that arise during implementation
4. Do not stop until the task is fully complete and validated

VALIDATION REQUIREMENTS:
- All tests must pass (backend and frontend)
- TypeScript compilation must succeed  
- Linting must pass
- Code coverage requirements must be met
- E2E tests must pass
- All other validation pipeline stages must be green

RELATED TASKS (for context):`;

    // Show related tasks for context
    const relatedTasks = allTodos.filter(t => 
      t.id !== task.id && 
      (t.status === 'pending' || t.status === 'in_progress')
    ).slice(0, 5);
    
    for (const relatedTask of relatedTasks) {
      prompt += `\n- [${relatedTask.status.toUpperCase()}] ${relatedTask.content}`;
    }
    
    prompt += `\n\nIMPORTANT: This is a supervised session. If validation fails, you will be automatically restarted with feedback about the failures. Focus on robust, complete implementation that passes all validation stages.

Begin working on the primary task now.`;

    return prompt;
  }

  async runAllPendingTasks(): Promise<{completed: number, failed: number}> {
    const todos = await this.loadTodos();
    const pendingTasks = todos.filter(t => t.status === 'pending');
    
    console.log(`🎯 Starting supervised execution of ${pendingTasks.length} pending tasks`);
    
    let completed = 0;
    let failed = 0;
    
    for (const task of pendingTasks) {
      console.log(`\n${'='.repeat(SEPARATOR_LINE_LENGTH)}`);
      console.log(`📋 Task ${task.id}: ${task.content}`);
      console.log(`${'='.repeat(SEPARATOR_LINE_LENGTH)}\n`);
      
      const success = await this.runTask(task.id);
      
      if (success) {
        completed++;
        console.log(`✅ Task ${task.id} completed (${completed}/${pendingTasks.length})`);
      } else {
        failed++;
        console.log(`❌ Task ${task.id} failed (${failed} failures so far)`);
        
        // Ask user if they want to continue
        const continueAnswer = await this.askUser(`Continue with remaining tasks? (y/n): `);
        if (continueAnswer.toLowerCase() !== 'y') {
          console.log('🛑 Task execution stopped by user');
          break;
        }
      }
    }
    
    console.log(`\n📊 Task Execution Summary:`);
    console.log(`  Completed: ${completed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Success Rate: ${((completed / (completed + failed)) * 100).toFixed(1)}%`);
    
    return { completed, failed };
  }

  private async askUser(question: string): Promise<string> {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question(question, (answer: string) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  start(): void {
    this.supervisor.start();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log(`
🎯 Supervised Task Runner

Usage:
  npx ts-node scripts/supervised-task-runner.ts <command> [args]

Commands:
  run <taskId>           Run a specific task with supervision
  run-all                Run all pending tasks with supervision
  status                 Show task status
  
Examples:
  npx ts-node scripts/supervised-task-runner.ts run task-1
  npx ts-node scripts/supervised-task-runner.ts run-all
  npx ts-node scripts/supervised-task-runner.ts status
    `);
    process.exit(1);
  }

  const runner = new SupervisedTaskRunner();
  runner.start();
  
  try {
    switch (command) {
      case 'run': {
        const taskId = args[1];
        if (!taskId) {
          console.error('❌ Task ID required');
          process.exit(1);
        }
        const success = await runner.runTask(taskId);
        process.exit(success ? 0 : 1);
        break;
      }
        
      case 'run-all': {
        const results = await runner.runAllPendingTasks();
        process.exit(results.failed === 0 ? 0 : 1);
        break;
      }
        
      case 'status': {
        const todos = await runner.loadTodos();
        console.log(`📊 Task Status:`);
        console.log(`  Total: ${todos.length}`);
        console.log(`  Pending: ${todos.filter(t => t.status === 'pending').length}`);
        console.log(`  In Progress: ${todos.filter(t => t.status === 'in_progress').length}`);
        console.log(`  Completed: ${todos.filter(t => t.status === 'completed').length}`);
        break;
      }
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`💥 Error:`, error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { SupervisedTaskRunner };