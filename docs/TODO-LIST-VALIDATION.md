# Todo List Validation Hook

The todo list validation hook is a pre-commit hook that automatically validates the format of todo list files and provides guidance on the next task to work on.

## Features

- ✅ **Multi-format support**: Works with both Markdown (.md) and JSON (.json) todo lists
- 🔍 **Format validation**: Ensures todo items have required fields and proper structure
- 📊 **Progress tracking**: Shows completion statistics and project progress
- 🎯 **Task prioritization**: Automatically identifies the next highest-priority task to work on
- 🚀 **Pre-commit integration**: Runs automatically before each commit to ensure consistency

## Supported File Formats

### 1. Markdown Format (`TODO-Kanban-Implementation.md`)

The hook can parse markdown files with the following structure:

```markdown
### KANBAN-001: Task Title
**Priority**: High  
**Estimated Hours**: 16  

**Description**: Task description

**Acceptance Criteria**:
- [ ] Criterion 1
- [x] Criterion 2
- [ ] Criterion 3
```

### 2. JSON Format (`.claude_todo.json` or `todo-list.json`)

The hook supports JSON files with this structure:

```json
[
  {
    "id": "kanban-001",
    "content": "Task description",
    "status": "pending",
    "priority": "high"
  },
  {
    "id": "todo-002",
    "content": "Another task",
    "status": "completed",
    "priority": "medium"
  }
]
```

## File Priority Order

The hook searches for todo list files in this order:

1. `TODO-Kanban-Implementation.md` (Markdown format)
2. `.claude_todo.json` (JSON format) 
3. `todo-list.json` (JSON format)

The first file found will be used for validation.

## Todo Item Structure

Each todo item must have the following fields:

### Required Fields

- **id**: Unique identifier (format: `kanban-XXX` or `todo-XXX`)
- **content**: Task description (non-empty string)
- **status**: Current status (`pending`, `in_progress`, `completed`)
- **priority**: Task priority (`high`, `medium`, `low`)

### Valid Status Values

- `pending`: Task not yet started
- `in_progress`: Task currently being worked on
- `completed`: Task finished successfully

### Valid Priority Values

- `high`: Critical/urgent tasks
- `medium`: Important but not urgent tasks
- `low`: Nice-to-have tasks

## Task Prioritization Logic

The hook determines the next task using this priority logic:

1. **Status Priority**: `in_progress` > `pending` (skips `completed`)
2. **Priority Level**: `high` > `medium` > `low`

**Example Priority Order**:
1. High priority, in_progress
2. High priority, pending
3. Medium priority, in_progress
4. Medium priority, pending
5. Low priority, in_progress
6. Low priority, pending

## Usage

### Manual Validation

Run the validation script manually:

```bash
# Using npm script
npm run todo:validate

# Using npx directly
npx ts-node scripts/validate-todo-list.ts
```

### Pre-commit Hook Integration

The hook runs automatically during git commits as part of the pre-commit process:

```bash
git add .
git commit -m "your commit message"
# Hook runs automatically and shows next task
```

## Output Example

```
🔍 Todo List Validation Hook

📖 Found todo list: TODO-Kanban-Implementation.md
🔍 Validating todo list format...
✅ Todo list format is valid

📊 Project Statistics:
✅ Completed: 17
🔄 In Progress: 1  
📋 Pending: 4
📈 Progress: 77% (17/22)

🎯 Next Task to Work On:
ID: kanban-008
Task: Add real-time updates via WebSockets
Priority: medium
Status: in_progress

💡 This task is already in progress. Continue working on it!

✅ Todo list validation passed
```

## Error Handling

### Common Validation Errors

1. **Missing todo list file**:
   ```
   ❌ No todo list file found. Expected files:
      • TODO-Kanban-Implementation.md
      • .claude_todo.json  
      • todo-list.json
   ```

2. **Invalid ID format**:
   ```
   ❌ Todo list validation failed:
      • Todo item 5: Invalid ID format (expected: kanban-XXX or todo-XXX)
   ```

3. **Invalid status**:
   ```
   ❌ Todo list validation failed:
      • Todo item 3: Invalid status (unknown_status)
   ```

4. **Duplicate IDs**:
   ```
   ❌ Todo list validation failed:
      • Duplicate todo IDs found: kanban-001, kanban-005
   ```

### Exit Codes

- **0**: Validation successful
- **1**: Validation failed (blocks commit)

## Integration with Development Workflow

The validation hook integrates seamlessly with the existing pre-commit workflow:

```bash
# Pre-commit sequence:
1. lint-staged (code formatting)
2. type-check (TypeScript validation)
3. duplication-check (code duplication)
4. npm test (unit tests)
5. E2E tests (end-to-end testing)
6. todo:validate (todo list validation) ← NEW
7. ai-review (AI code review)
```

## Configuration

### Adding to .gitignore

The following todo list files are ignored by git to prevent conflicts:

```gitignore
# Todo list files (temporary/runtime)
.claude_todo.json
todo-list.json
```

The main `TODO-Kanban-Implementation.md` file is tracked in git as the authoritative source.

### Customizing File Paths

To add support for additional todo list files, edit `scripts/validate-todo-list.ts`:

```typescript
const TODO_LIST_FILES = [
  path.join(process.cwd(), 'TODO-Kanban-Implementation.md'),
  path.join(process.cwd(), '.claude_todo.json'),
  path.join(process.cwd(), 'todo-list.json'),
  path.join(process.cwd(), 'your-custom-todo.json') // Add here
];
```

## Benefits

### For Developers

- 🎯 **Clear priorities**: Always know what to work on next
- 📊 **Progress visibility**: See completion stats at a glance  
- 🔄 **Consistency**: Ensures todo lists maintain proper format
- 🚀 **Automated workflow**: No manual todo list checking needed

### For Project Management

- 📈 **Progress tracking**: Quantitative completion metrics
- 🎯 **Priority management**: Enforces consistent priority handling
- 🔍 **Quality control**: Prevents malformed todo entries
- 📋 **Standardization**: Consistent todo list structure across projects

## Troubleshooting

### Hook Not Running

Check if the hook is properly configured:

```bash
# Verify husky is installed
ls .husky/

# Check pre-commit hook content
cat .husky/pre-commit
```

### TypeScript Compilation Issues

Ensure ts-node is installed:

```bash
npm install -D ts-node typescript
```

### Permission Issues

Make sure the script is executable:

```bash
chmod +x scripts/validate-todo-list.ts
```

## Future Enhancements

- [ ] Web dashboard for todo visualization
- [ ] Integration with external project management tools
- [ ] Automatic todo status updates based on commit messages
- [ ] Time tracking integration
- [ ] Team collaboration features
- [ ] Custom validation rules per project