# Claude Task Orchestrator Demo

This demonstrates the complete Claude Task Orchestrator with real-time streaming functionality integrated into the Workers Dashboard.

## 🎯 Features Implemented

### 1. **Complete Orchestrator System**
- ✅ Database-driven task management (CODEGOAT-XXX tasks)
- ✅ Validation-driven retry loops with intelligent error feedback
- ✅ Real-time streaming of all orchestrator events (SSE)
- ✅ Claude Code execution with output streaming
- ✅ Comprehensive API endpoints
- ✅ CLI tools for direct usage
- ✅ Web UI integration in Workers Dashboard

### 2. **Real-Time Streaming**
- ✅ Server-Sent Events (SSE) for live updates
- ✅ Stream Claude's output as it types
- ✅ Watch validation stages run in real-time  
- ✅ See retry logic with specific error feedback
- ✅ Session-based filtering
- ✅ Multiple client support with auto-cleanup

### 3. **Web UI Integration**
- ✅ **Workers Dashboard** → "Show Orchestrator" button
- ✅ Start/Stop orchestrator controls
- ✅ Execute custom prompts with quick actions
- ✅ Real-time metrics and status monitoring
- ✅ Live stream viewer with colored event types
- ✅ Export/filter capabilities

## 🚀 How to Use

### **Option 1: Web Interface (Recommended)**
1. **Start the development server:**
   ```bash
   # Terminal 1: Backend
   npm run dev

   # Terminal 2: Frontend  
   cd ui && npm run dev
   ```

2. **Access the dashboard:**
   - Navigate to http://localhost:5173/workers
   - Click "Show Orchestrator" button
   - Click "Show Stream" to see real-time events

3. **Execute tasks:**
   - Use "Quick Actions" buttons for common tasks
   - Or write custom prompts in the text area
   - Watch real-time execution in the stream viewer

### **Option 2: CLI Interface**
```bash
# Terminal 1: Watch the stream
npx tsx scripts/stream-orchestrator.ts

# Terminal 2: Run orchestrator
npx tsx scripts/run-orchestrator.ts --prompt "Fix any TypeScript errors"

# Or continuous mode
npx tsx scripts/run-orchestrator.ts --continuous
```

### **Option 3: API Direct**
```bash
# Start orchestrator
curl -X POST http://localhost:3001/api/orchestrator/start \\
  -H "Content-Type: application/json" \\
  -d '{"options": {"enableValidation": true, "maxTaskRetries": 2}}'

# Execute prompt
curl -X POST http://localhost:3001/api/orchestrator/execute \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Create a test file with hello world",
    "options": {"enableValidation": false, "maxTaskRetries": 1}
  }'

# Watch stream
curl -N http://localhost:3001/api/orchestrator/stream
```

## 📊 What You'll See

### **Real-Time Events:**
- 🟢 **ORCHESTRATOR START** - System initialization  
- 🔵 **TASK START** - New task execution begins
- 🔵 **CLAUDE START** - Claude Code execution starts
- ⚪ **CLAUDE OUTPUT** - Live Claude responses (real-time!)
- 🟡 **VALIDATION START** - Validation pipeline begins
- 🟡 **VALIDATION STAGE** - Individual stage results (lint, tests, etc.)
- 🟢 **VALIDATION COMPLETE** - All stages passed
- 🟢 **TASK COMPLETE** - Task finished successfully
- 🟣 **RETRY ATTEMPT** - Task retry with error feedback

### **Web Dashboard Features:**
- **Status Panel**: Shows orchestrator state, session ID, settings
- **Metrics Cards**: Success rate, tasks processed, validation runs, avg duration
- **Quick Actions**: Pre-built prompts for common tasks
- **Custom Prompts**: Execute any Claude task with validation
- **Live Stream**: Terminal-style viewer with:
  - Color-coded event types
  - Real-time Claude output streaming
  - Pause/resume, filtering, export capabilities
  - Auto-scroll with manual override
  - Session filtering for multiple orchestrators

## 🔄 The Validation Loop

The orchestrator implements intelligent retry logic:

1. **Execute Task** → Claude runs with prompt
2. **Run Validation** → Database-configured stages (lint, tests, build, etc.)
3. **Check Results:**
   - ✅ **Success**: Complete task, fetch next
   - ❌ **Failure**: Create specific error feedback → Retry Claude with fixes

### **Error Feedback Example:**
```
The previous attempt failed validation. Here are the issues:

Validation Failures:
- Lint: Found 3 ESLint errors in src/utils/orchestrator.ts
- TypeScript: Type error on line 42: Property 'sessionId' does not exist
- Tests: 2 unit tests failed in orchestrator.test.ts

Please fix these specific issues and complete the task.
```

## 🎨 Integration Points

- **Existing Workers System**: Orchestrator appears alongside Claude workers
- **Database Integration**: Uses existing CODEGOAT task system
- **Validation Pipeline**: Leverages existing validation stages configuration
- **Permission System**: Integrated with existing command validation
- **Logging**: Uses existing Winston logging infrastructure
- **API**: RESTful endpoints with consistent error handling

## 📈 Benefits

1. **Autonomous Operation**: Set up tasks and let the orchestrator handle everything
2. **Intelligent Retries**: Claude gets specific error feedback for targeted fixes
3. **Complete Visibility**: See every step of execution in real-time
4. **Flexible Usage**: CLI, API, or Web UI - use what fits your workflow
5. **Database-Driven**: All tasks and results stored for analytics and history
6. **Validation-Enforced**: Nothing completes without passing your quality checks

The orchestrator transforms Claude from a one-shot tool into a persistent, intelligent agent that can work through complex tasks with validation loops and retry logic!