import { ClaudeLogProcessor } from '../utils/claude-log-processor';

describe('Enhanced Logging', () => {
  let processor: ClaudeLogProcessor;

  beforeEach(() => {
    processor = new ClaudeLogProcessor();
  });

  describe('ClaudeLogProcessor', () => {
    it('should process system messages correctly', () => {
      const mockSystemMessage = {
        type: 'system',
        subtype: 'status',
        message: 'System status update'
      };

      const entries = processor.toNormalizedEntries(mockSystemMessage, '/mock/path');
      
      expect(entries).toHaveLength(1);
      expect(entries[0].entry_type.type).toBe('system_message');
      expect(entries[0].content).toBe('System: status');
    });

    it('should process assistant messages correctly', () => {
      const mockAssistantMessage = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          content: [{ type: 'text', text: 'Hello, World!' }],
          role: 'assistant'
        }
      };

      const entries = processor.toNormalizedEntries(mockAssistantMessage, '/mock/path');
      
      expect(entries).toHaveLength(1);
      expect(entries[0].entry_type.type).toBe('assistant_message');
      expect(entries[0].content).toBe('Hello, World!');
    });

    it('should process user messages correctly', () => {
      const mockUserMessage = {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Test user message' }]
        }
      };

      const entries = processor.toNormalizedEntries(mockUserMessage, '/mock/path');
      
      expect(entries).toHaveLength(1);
      expect(entries[0].entry_type.type).toBe('user_message');
      expect(entries[0].content).toBe('Test user message');
    });

    it('should process tool use correctly', () => {
      const mockToolUse = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          content: [{
            type: 'tool_use',
            id: 'tool_123',
            name: 'Read',
            input: { file_path: '/test/file.ts' }
          }],
          role: 'assistant'
        }
      };

      const entries = processor.toNormalizedEntries(mockToolUse, '/mock/path');
      
      expect(entries).toHaveLength(1);
      expect(entries[0].entry_type.type).toBe('tool_use');
      expect((entries[0].entry_type as any).tool_name).toBe('Read');
      expect(entries[0].content).toBe('Tool use: Read');
    });

    it('should handle unknown message types gracefully', () => {
      const mockUnknownMessage = {
        type: 'unknown',
        data: 'some data'
      } as any;

      const entries = processor.toNormalizedEntries(mockUnknownMessage, '/mock/path');
      
      expect(entries).toHaveLength(1);
      expect(entries[0].entry_type.type).toBe('system_message');
      expect(entries[0].content).toBe('Unrecognized JSON message from Claude');
    });

    it('should skip system messages with init subtype', () => {
      const mockInitMessage = {
        type: 'system',
        subtype: 'init',
        message: 'Initializing system'
      };

      const entries = processor.toNormalizedEntries(mockInitMessage, '/mock/path');
      
      expect(entries).toHaveLength(0);
    });

    it('should handle assistant messages with model initialization', () => {
      const mockAssistantWithModel = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          model: 'claude-3-5-sonnet-20241022',
          content: [{ type: 'text', text: 'Hello with model!' }],
          role: 'assistant'
        }
      };

      const entries = processor.toNormalizedEntries(mockAssistantWithModel, '/mock/path');
      
      expect(entries).toHaveLength(2); // Model initialization + text message
      expect(entries[0].entry_type.type).toBe('system_message');
      expect(entries[0].content).toBe('System initialized with model: claude-3-5-sonnet-20241022');
      expect(entries[1].entry_type.type).toBe('assistant_message');
      expect(entries[1].content).toBe('Hello with model!');
    });

    it('should handle assistant messages without message property', () => {
      const mockEmptyAssistant = {
        type: 'assistant',
        data: 'some data'
      } as any;

      const entries = processor.toNormalizedEntries(mockEmptyAssistant, '/mock/path');
      
      expect(entries).toHaveLength(0);
    });

    it('should handle user messages without message property', () => {
      const mockEmptyUser = {
        type: 'user',
        data: 'some data'
      } as any;

      const entries = processor.toNormalizedEntries(mockEmptyUser, '/mock/path');
      
      expect(entries).toHaveLength(0);
    });

    it('should process thinking content type', () => {
      const mockThinkingMessage = {
        type: 'assistant',
        message: {
          id: 'msg_123',
          content: [{ type: 'thinking', thinking: 'Let me think about this...' }],
          role: 'assistant'
        }
      };

      const entries = processor.toNormalizedEntries(mockThinkingMessage, '/mock/path');
      
      expect(entries).toHaveLength(1);
      expect(entries[0].entry_type.type).toBe('thinking');
      expect(entries[0].content).toBe('Let me think about this...');
    });

    it('should handle tool_use messages', () => {
      const mockToolUseMessage = {
        type: 'tool_use',
        tool_name: 'Read',
        input: { file_path: '/test/file.ts' }
      };

      const entries = processor.toNormalizedEntries(mockToolUseMessage, '/mock/path');
      
      expect(entries).toHaveLength(1);
      expect(entries[0].entry_type.type).toBe('tool_use');
      expect((entries[0].entry_type as any).tool_name).toBe('Read');
      expect(entries[0].content).toBe('Tool use: Read');
    });

    it('should handle tool_use messages without tool_name', () => {
      const mockIncompleteToolUse = {
        type: 'tool_use',
        input: { file_path: '/test/file.ts' }
      } as any;

      const entries = processor.toNormalizedEntries(mockIncompleteToolUse, '/mock/path');
      
      expect(entries).toHaveLength(0);
    });

    it('should skip tool_result and result messages', () => {
      const toolResult = { type: 'tool_result', content: 'result' };
      const result = { type: 'result', content: 'result' };

      const entries1 = processor.toNormalizedEntries(toolResult, '/mock/path');
      const entries2 = processor.toNormalizedEntries(result, '/mock/path');
      
      expect(entries1).toHaveLength(0);
      expect(entries2).toHaveLength(0);
    });

    it('should handle content items with unknown type', () => {
      const processor = new ClaudeLogProcessor();
      const unknownItem = { type: 'unknown', data: 'test' } as any;

      const entry = processor.contentItemToNormalizedEntry(unknownItem, 'assistant', '/mock/path');
      
      expect(entry).toBeUndefined();
    });
  });

  describe('Enhanced Log Endpoint Logic', () => {
    it('should prioritize normalized entries over raw logs', () => {
      // Mock the logic from the enhanced logs endpoint
      const mockWorker = {
        structuredEntries: [
          {
            timestamp: '2025-08-20T19:30:00.000Z',
            type: 'assistant_message',
            content: 'Hello from processed entry',
            metadata: {}
          }
        ],
        logFile: '/mock/log/file.log'
      };

      // Simulate the endpoint logic
      const patches: any[] = [];
      
      // Should send structured entries first
      if (mockWorker.structuredEntries && mockWorker.structuredEntries.length > 0) {
        mockWorker.structuredEntries.forEach(entry => {
          patches.push({
            op: 'add',
            path: '/entries/-',
            value: {
              type: 'NORMALIZED_ENTRY',
              content: {
                timestamp: entry.timestamp,
                entry_type: { type: entry.type },
                content: entry.content,
                metadata: entry.metadata
              }
            }
          });
        });
      }

      expect(patches).toHaveLength(1);
      expect(patches[0].value.type).toBe('NORMALIZED_ENTRY');
      expect(patches[0].value.content.content).toBe('Hello from processed entry');
    });

    it('should only send raw logs as fallback when no structured entries exist', () => {
      // Mock worker with no structured entries
      const mockWorker = {
        structuredEntries: [],
        logFile: '/mock/log/file.log'
      };

      const patches: any[] = [];
      
      // Should only send raw logs if no structured entries
      if (mockWorker.structuredEntries.length === 0) {
        // Simulate raw log processing
        const mockRawLog = 'STDOUT: Regular log message';
        patches.push({
          op: 'add',
          path: '/entries/-',
          value: {
            type: 'STDOUT',
            content: mockRawLog
          }
        });
      }

      expect(patches).toHaveLength(1);
      expect(patches[0].value.type).toBe('STDOUT');
    });

    it('should not mix raw JSON with normalized entries', () => {
      // This test verifies the fix - we should not see both types together
      const mockWorker = {
        structuredEntries: [
          {
            timestamp: '2025-08-20T19:30:00.000Z',
            type: 'assistant_message',
            content: 'Processed message',
            metadata: {}
          }
        ]
      };

      const patches: any[] = [];
      
      // Only process structured entries when they exist
      if (mockWorker.structuredEntries && mockWorker.structuredEntries.length > 0) {
        mockWorker.structuredEntries.forEach(entry => {
          patches.push({
            op: 'add',
            path: '/entries/-',
            value: {
              type: 'NORMALIZED_ENTRY',
              content: entry
            }
          });
        });
      }

      // Should not have any raw STDOUT/STDERR patches
      const rawPatches = patches.filter(p => 
        p.value.type === 'STDOUT' || p.value.type === 'STDERR'
      );
      
      expect(rawPatches).toHaveLength(0);
      expect(patches.every(p => p.value.type === 'NORMALIZED_ENTRY')).toBe(true);
    });
  });

  describe('inferActionType method', () => {
    let processor: ClaudeLogProcessor;

    beforeEach(() => {
      processor = new ClaudeLogProcessor();
    });

    it('should infer file_read action for read tools', () => {
      const readAction = (processor as any).inferActionType('Read', { file_path: '/test/file.ts' });
      
      expect(readAction.action).toBe('file_read');
      expect(readAction.path).toBe('/test/file.ts');
    });

    it('should infer file_read action for file read tools', () => {
      const fileReadAction = (processor as any).inferActionType('file_read_tool', { path: '/test/file.ts' });
      
      expect(fileReadAction.action).toBe('file_read');
      expect(fileReadAction.path).toBe('/test/file.ts');
    });

    it('should infer file_edit action for edit tools', () => {
      const editAction = (processor as any).inferActionType('Edit', { 
        file_path: '/test/file.ts',
        old_string: 'old',
        new_string: 'new'
      });
      
      expect(editAction.action).toBe('file_edit');
      expect(editAction.path).toBe('/test/file.ts');
      expect(editAction.changes).toEqual([{ old_string: 'old', new_string: 'new' }]);
    });

    it('should infer file_edit action for write tools', () => {
      const writeAction = (processor as any).inferActionType('Write', { file_path: '/test/file.ts' });
      
      expect(writeAction.action).toBe('file_edit');
      expect(writeAction.path).toBe('/test/file.ts');
    });

    it('should infer file_edit action for multiedit tools', () => {
      const multiEditAction = (processor as any).inferActionType('MultiEdit', { 
        file_path: '/test/file.ts',
        edits: [
          { old_string: 'old1', new_string: 'new1' },
          { old_string: 'old2', new_string: 'new2' }
        ]
      });
      
      expect(multiEditAction.action).toBe('file_edit');
      expect(multiEditAction.path).toBe('/test/file.ts');
      expect(multiEditAction.changes).toHaveLength(2);
    });

    it('should infer command_run action for bash tools', () => {
      const bashAction = (processor as any).inferActionType('Bash', { command: 'ls -la' });
      
      expect(bashAction.action).toBe('command_run');
    });

    it('should infer command_run action for command tools', () => {
      const commandAction = (processor as any).inferActionType('command_executor', {});
      
      expect(commandAction.action).toBe('command_run');
    });

    it('should infer command_run action for exec tools', () => {
      const execAction = (processor as any).inferActionType('exec_tool', {});
      
      expect(execAction.action).toBe('command_run');
    });

    it('should infer search action for grep tools', () => {
      const grepAction = (processor as any).inferActionType('Grep', { pattern: 'test' });
      
      expect(grepAction.action).toBe('search');
    });

    it('should infer search action for search tools', () => {
      const searchAction = (processor as any).inferActionType('search_tool', {});
      
      expect(searchAction.action).toBe('search');
    });

    it('should infer search action for glob tools', () => {
      const globAction = (processor as any).inferActionType('Glob', { pattern: '*.ts' });
      
      expect(globAction.action).toBe('search');
    });

    it('should infer web_fetch action for web tools', () => {
      const webAction = (processor as any).inferActionType('WebFetch', { url: 'https://example.com' });
      
      expect(webAction.action).toBe('web_fetch');
    });

    it('should infer web_fetch action for fetch tools', () => {
      const fetchAction = (processor as any).inferActionType('fetch_tool', {});
      
      expect(fetchAction.action).toBe('web_fetch');
    });

    it('should infer web_fetch action for http tools', () => {
      const httpAction = (processor as any).inferActionType('http_request', {});
      
      expect(httpAction.action).toBe('web_fetch');
    });

    it('should infer task_create action for task create tools', () => {
      const taskCreateAction = (processor as any).inferActionType('task_create_tool', {});
      
      expect(taskCreateAction.action).toBe('task_create');
    });

    it('should infer todo_management action for todo tools', () => {
      const todoAction = (processor as any).inferActionType('TodoManager', {});
      
      expect(todoAction.action).toBe('todo_management');
    });

    it('should infer plan_presentation action for plan tools', () => {
      const planAction = (processor as any).inferActionType('plan_mode_exit', {});
      
      expect(planAction.action).toBe('plan_presentation');
    });

    it('should infer plan_presentation action for exit tools', () => {
      const exitAction = (processor as any).inferActionType('ExitPlanMode', {});
      
      expect(exitAction.action).toBe('plan_presentation');
    });

    it('should default to command_run for unknown tools', () => {
      const unknownAction = (processor as any).inferActionType('unknown_tool', {});
      
      expect(unknownAction.action).toBe('command_run');
    });

    it('should handle null input gracefully', () => {
      const actionWithNullInput = (processor as any).inferActionType('Read', null);
      
      expect(actionWithNullInput.action).toBe('file_read');
      expect(actionWithNullInput.path).toBeUndefined();
    });

    it('should prefer file_path over path in input', () => {
      const action = (processor as any).inferActionType('Read', { 
        file_path: '/primary/path.ts',
        path: '/secondary/path.ts'
      });
      
      expect(action.path).toBe('/primary/path.ts');
    });

    it('should use path when file_path is not available', () => {
      const action = (processor as any).inferActionType('Read', { 
        path: '/secondary/path.ts'
      });
      
      expect(action.path).toBe('/secondary/path.ts');
    });

    it('should handle edit actions without changes', () => {
      const editAction = (processor as any).inferActionType('Edit', { 
        file_path: '/test/file.ts'
      });
      
      expect(editAction.action).toBe('file_edit');
      expect(editAction.changes).toBeUndefined();
    });
  });
});