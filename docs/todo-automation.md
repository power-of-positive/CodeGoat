# Todo List Automation System

## Overview

The todo list automation system automatically tracks task completion through git commits, providing seamless integration between development workflow and task management.

## How It Works

### 1. Commit Message Format

Use this format for automatic todo list updates:
```
Task XX: Brief description of what was done
```

Where `XX` is the task ID from `todo-list.json`.

**Examples:**
- `Task 66: Implement automated todo completion via pre-commit hooks`
- `Task 55: Ensure validation stages appear in settings-defined order`

**Alternative formats also supported:**
- `Task ID-XX: description`
- `XX: description`

### 2. Automatic Processing

When you commit with the correct format:

1. **Pre-commit validation** runs (existing validation pipeline)
2. **Commit succeeds** if validation passes
3. **Post-commit hook** automatically:
   - Extracts task ID from commit message
   - Marks task as `completed` in `todo-list.json`
   - Adds `endTime` timestamp
   - Calculates `duration` if `startTime` exists
   - Updates progress statistics

### 3. Git Hooks

#### Pre-commit Hook (`.git/hooks/pre-commit`)
- Runs validation pipeline from `settings.json`
- Blocks commits if validation fails
- Ensures code quality before allowing commits

#### Prepare-commit-msg Hook (`.git/hooks/prepare-commit-msg`)
- Shows helpful guidance about commit message format
- Lists current in-progress and high-priority tasks
- Helps developers choose which task to work on

#### Post-commit Hook (`.git/hooks/post-commit`)
- Automatically updates `todo-list.json` after successful commits
- Provides progress feedback

### 4. Commit Template

A commit message template (`.gitmessage`) provides:
- Format guidance
- Best practices
- Example commit messages

Configure it with: `git config commit.template .gitmessage`

## Workflow

### Starting a Task
1. Mark task as `in_progress` in todo list
2. Add `startTime` if tracking duration
3. Begin development work

### Completing a Task
1. Finish your implementation
2. Run tests locally: `npm test`
3. Commit with format: `Task XX: what you accomplished`
4. **Automation handles the rest!**

### Benefits

- **Zero manual todo management** - tasks auto-complete on successful commits
- **Enforced quality** - pre-commit validation ensures code quality
- **Accurate timing** - automatic duration calculation
- **Progress tracking** - real-time completion statistics
- **Consistency** - standardized commit message format

## Configuration

### Validation Pipeline
Configured in `settings.json` under `validation.stages`:
- Todo list validation (blocks commits with unfinished tasks)
- Uncommitted files check (encourages regular commits)
- Linting, type checking, tests, etc.

### Commit Template
- Location: `.gitmessage`
- Configure: `git config commit.template .gitmessage`
- Provides format guidance and examples

### Scripts
- `scripts/validate-todo-list.ts` - Todo list validation
- `scripts/update-todo-from-commit.ts` - Automatic todo updates
- `scripts/check-uncommitted-files.ts` - Uncommitted files validation

## Troubleshooting

### Task Not Auto-Completing
1. Check commit message format: `Task XX: description`
2. Verify task ID exists in `todo-list.json`
3. Ensure post-commit hook is executable: `chmod +x .git/hooks/post-commit`

### Validation Failing
1. Run `npx ts-node scripts/validate-task.ts` for details
2. Fix issues reported by validation stages
3. Retry commit

### Template Not Showing
1. Verify template is configured: `git config commit.template`
2. Use `git commit` (not `git commit -m`) to see template

## Integration with Claude Code

This system integrates seamlessly with Claude Code's stop hook:
- Claude Code is blocked from stopping if unfinished tasks exist
- Validation pipeline runs before task completion
- Automatic todo updates maintain accurate task state
- Progress tracking provides visibility into development workflow

## Files Created/Modified

- `.gitmessage` - Commit message template
- `.git/hooks/post-commit` - Automatic todo updates
- `.git/hooks/prepare-commit-msg` - Commit guidance
- `scripts/update-todo-from-commit.ts` - Todo update logic
- `settings.json` - Todo list validation stage

This automation system ensures that your development workflow and task management stay perfectly synchronized with minimal manual effort.