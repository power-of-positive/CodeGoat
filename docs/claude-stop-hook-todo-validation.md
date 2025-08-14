# Claude Stop Hook - Todo List Validation

## Overview

The Claude Code stop hook now includes todo list validation to ensure high priority tasks are completed before Claude stops working. This prevents Claude from ending sessions with unfinished critical work.

## How It Works

When Claude attempts to stop, the hook checks for a todo list in the `CLAUDE_TOOL_INPUT` environment variable and validates it according to these rules:

### Blocking Conditions

1. **High Priority Unfinished Tasks**: Any tasks with `priority: "high"` and `status: "pending"` or `"in_progress"` will block Claude from stopping
2. **Too Many Unfinished Tasks**: 10 or more unfinished tasks (regardless of priority) will block stopping
3. **Graceful Handling**: Parse errors or missing todo lists won't block - they allow completion

### Validation Levels

The hook uses a multi-stage validation approach:

1. **Todo List Validation** - Check for unfinished high priority tasks
2. **Uncommitted Files** - Ensure all changes are committed  
3. **Pre-commit Checks** - Run full validation pipeline
4. **LLM Code Review** - Final quality check

## Todo Item Format

```typescript
interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  priority: "high" | "medium" | "low";
  id: string;
}
```

### Example Todo List

```json
[
  {
    "content": "Fix critical bug in authentication system",
    "status": "pending",
    "priority": "high", 
    "id": "1"
  },
  {
    "content": "Update documentation",
    "status": "completed",
    "priority": "medium",
    "id": "2"
  }
]
```

## Usage

### With Claude Code Tool

When using the `TodoWrite` tool in Claude Code, the todo list is automatically passed to the stop hook via `CLAUDE_TOOL_INPUT`. No manual configuration needed.

### Manual Testing

You can test the validation manually:

```bash
export CLAUDE_TOOL_INPUT='[{"content":"Test task","status":"pending","priority":"high","id":"1"}]'
npx tsx scripts/claude-stop-hook.ts
```

### Testing Framework

Use the included test script:

```bash
npx tsx scripts/test-todo-validation.ts
```

## Hook Response Format

The hook returns JSON responses:

### Blocked (High Priority Tasks)
```json
{
  "decision": "block",
  "reason": "High priority tasks remain unfinished:\n  - Fix critical authentication bug\n  - Complete security audit"
}
```

### Blocked (Too Many Tasks)
```json
{
  "decision": "block", 
  "reason": "Too many unfinished tasks (12). Please complete some tasks before stopping."
}
```

### Approved
```json
{
  "decision": "approve"
}
```

## Configuration

### Priority Thresholds

- **High Priority**: Always blocks if unfinished
- **Medium/Low Priority**: Only blocks if 10+ unfinished tasks total

### Timeout Settings

- Global timeout: 2.5 minutes
- Pre-commit timeout: 2 minutes
- Prevents infinite loops in validation

## Benefits

1. **Ensures Task Completion**: High priority work won't be left unfinished
2. **Quality Assurance**: Maintains the existing validation pipeline 
3. **Flexible**: Graceful handling of edge cases and errors
4. **Transparent**: Clear feedback about why stopping was blocked
5. **Non-Intrusive**: Doesn't break existing workflows

## Troubleshooting

### Hook Not Blocking When Expected

- Check that `CLAUDE_TOOL_INPUT` contains valid JSON
- Verify tasks have `priority: "high"` and `status: "pending"`
- Test with `scripts/test-todo-validation.ts`

### Hook Blocking Unexpectedly  

- Check for uncommitted files (`git status`)
- Verify pre-commit checks are passing
- Review error messages in hook output

### Parse Errors

Parse errors won't block completion - this is intentional to prevent the hook from becoming too strict and breaking workflows.

## Examples

### Scenario 1: High Priority Task Blocks

```bash
# Todo list has high priority unfinished task
export CLAUDE_TOOL_INPUT='[{"content":"Fix security vulnerability","status":"pending","priority":"high","id":"1"}]'

# Hook will block with message:
# "High priority tasks remain unfinished: - Fix security vulnerability"
```

### Scenario 2: Only Medium Priority Tasks Allow

```bash  
# Todo list has only medium/low priority tasks
export CLAUDE_TOOL_INPUT='[{"content":"Update docs","status":"pending","priority":"medium","id":"1"}]'

# Hook allows completion (passes todo validation, checks other conditions)
```

### Scenario 3: All Tasks Completed

```bash
# All tasks are completed
export CLAUDE_TOOL_INPUT='[{"content":"Fix bug","status":"completed","priority":"high","id":"1"}]'

# Hook allows completion
```