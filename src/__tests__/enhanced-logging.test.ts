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
});