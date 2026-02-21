import { ClaudeLogProcessor } from '../../utils/claude-log-processor';

describe('ClaudeLogProcessor', () => {
  let processor: ClaudeLogProcessor;

  beforeEach(() => {
    processor = new ClaudeLogProcessor();
  });

  it('skips system init events', () => {
    const entries = processor.toNormalizedEntries({ type: 'system', subtype: 'init' } as any, '');
    expect(entries).toEqual([]);
  });

  it('formats system messages with subtype', () => {
    const entries = processor.toNormalizedEntries({ type: 'system', subtype: 'warning' } as any, '');
    expect(entries[0]).toMatchObject({ content: 'System: warning' });
  });

  it('captures assistant messages and model initialization', () => {
    const entries = processor.toNormalizedEntries(
      {
        type: 'assistant',
        message: {
          model: 'claude-3',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'thinking', thinking: 'Considering options' },
            { type: 'tool_use', name: 'write_file', input: { file_path: 'app.ts' } },
            { type: 'unknown' },
          ],
        },
      } as any,
      ''
    );

    expect(entries).toHaveLength(4); // system init + 3 content entries
    expect(entries[0].content).toContain('System initialized with model');
    expect(entries[1].entry_type.type).toBe('assistant_message');
    expect(entries[2].entry_type.type).toBe('thinking');
    expect(entries[3].entry_type.type).toBe('tool_use');
    expect(entries[3].entry_type).toMatchObject({ action_type: { action: 'file_edit' } });
  });

  it('maps user messages to normalized entries', () => {
    const entries = processor.toNormalizedEntries(
      {
        type: 'user',
        message: {
          content: [{ type: 'text', text: 'Run tests' }],
        },
      } as any,
      ''
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].entry_type.type).toBe('user_message');
  });

  it('normalizes tool_use events with inferred action types', () => {
    const cases: Array<[string, unknown, string]> = [
      ['read_file', { file_path: 'src/app.ts' }, 'file_read'],
      ['multiedit', { edits: [{ old_string: 'a', new_string: 'b' }], path: 'app.ts' }, 'file_edit'],
      ['bash_exec', {}, 'command_run'],
      ['code_search', {}, 'search'],
      ['web_fetcher', {}, 'web_fetch'],
      ['task_create_tool', {}, 'task_create'],
      ['todo_manager', {}, 'todo_management'],
      ['plan_summary', {}, 'plan_presentation'],
      ['unknown_tool', {}, 'command_run'],
    ];

    for (const [name, input, expected] of cases) {
      const [entry] = processor.toNormalizedEntries(
        {
          type: 'tool_use',
          tool_name: name,
          input,
        } as any,
        ''
      );
      expect(entry.entry_type).toMatchObject({ action_type: { action: expected } });
    }
  });

  it('returns fallback entry for unrecognized types', () => {
    const entries = processor.toNormalizedEntries({ type: 'mystery' } as any, '');
    expect(entries[0].content).toBe('Unrecognized JSON message from Claude');
  });
});
