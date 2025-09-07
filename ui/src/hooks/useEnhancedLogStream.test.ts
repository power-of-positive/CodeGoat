import { renderHook, act } from '@testing-library/react';
import { useEnhancedLogStream } from './useEnhancedLogStream';

// Mock EventSource
class MockEventSource {
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  eventListeners: { [key: string]: ((event: MessageEvent) => void)[] } = {};

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  addEventListener(event: string, listener: (event: MessageEvent) => void) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);
  }

  removeEventListener(event: string, listener: (event: MessageEvent) => void) {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(listener);
      if (index > -1) {
        this.eventListeners[event].splice(index, 1);
      }
    }
  }

  dispatchEvent(event: string, data: any) {
    if (this.eventListeners[event]) {
      const messageEvent = new MessageEvent(event, { data: JSON.stringify(data) });
      this.eventListeners[event].forEach(listener => listener(messageEvent));
    }
  }

  close() {
    // Mock close implementation
  }
}

// Mock global EventSource
(global as any).EventSource = MockEventSource;

// Mock console methods to avoid noise in tests
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('useEnhancedLogStream', () => {
  let mockEventSource: MockEventSource;

  beforeEach(() => {
    jest.clearAllMocks();
    // Capture the EventSource instance for testing
    const OriginalEventSource = (global as any).EventSource;
    (global as any).EventSource = class extends OriginalEventSource {
      constructor(url: string) {
        super(url);
        mockEventSource = this as any;
      }
    } as any;
  });

  afterEach(() => {
    if (mockEventSource) {
      mockEventSource.close();
    }
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useEnhancedLogStream('worker-123', false));

    expect(result.current.entries).toEqual([]);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does not connect when disabled', () => {
    const { result } = renderHook(() => useEnhancedLogStream('worker-123', false));

    expect(result.current.entries).toEqual([]);
    expect(result.current.isConnected).toBe(false);
  });

  it('connects and creates process start entry when enabled', async () => {
    const { result } = renderHook(() => useEnhancedLogStream('worker-123', true));

    // Wait for connection to establish
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]).toMatchObject({
      id: 'worker-123-start',
      processId: 'worker-123',
      processName: 'Claude Worker',
      channel: 'process_start',
    });
  });

  it('processes json_patch events correctly', async () => {
    const { result } = renderHook(() => useEnhancedLogStream('worker-123', true));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Simulate receiving json_patch event
    const patches = [
      { value: { type: 'STDOUT', content: 'Hello world' } },
      { value: { type: 'STDERR', content: 'Error message' } },
      { value: { type: 'NORMALIZED_ENTRY', content: { type: 'info', message: 'Normalized log' } } },
    ];

    act(() => {
      mockEventSource.dispatchEvent('json_patch', patches);
    });

    expect(result.current.entries).toHaveLength(4); // 1 start + 3 patches

    const [startEntry, stdoutEntry, stderrEntry, normalizedEntry] = result.current.entries;

    expect(stdoutEntry.channel).toBe('stdout');
    expect(stdoutEntry.payload).toBe('Hello world');

    expect(stderrEntry.channel).toBe('stderr');
    expect(stderrEntry.payload).toBe('Error message');

    expect(normalizedEntry.channel).toBe('normalized');
    expect(normalizedEntry.payload).toEqual({ type: 'info', message: 'Normalized log' });
  });

  it('handles finished event', async () => {
    const { result } = renderHook(() => useEnhancedLogStream('worker-123', true));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      mockEventSource.dispatchEvent('finished', {});
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('handles error events', async () => {
    const { result } = renderHook(() => useEnhancedLogStream('worker-123', true));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    act(() => {
      if (mockEventSource.onerror) {
        mockEventSource.onerror(new Event('error'));
      }
    });

    expect(result.current.error).toBe('Connection failed');
    expect(result.current.isConnected).toBe(false);
  });

  it('handles invalid json_patch data gracefully', async () => {
    const { result } = renderHook(() => useEnhancedLogStream('worker-123', true));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Simulate invalid JSON
    act(() => {
      const invalidEvent = new MessageEvent('json_patch', { data: 'invalid json' });
      if (mockEventSource.eventListeners['json_patch']) {
        mockEventSource.eventListeners['json_patch'][0](invalidEvent);
      }
    });

    expect(result.current.error).toBe('Failed to process log update');
  });

  it('skips unknown patch types', async () => {
    const { result } = renderHook(() => useEnhancedLogStream('worker-123', true));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const patches = [
      { value: { type: 'UNKNOWN_TYPE', content: 'Should be skipped' } },
      { value: { type: 'STDOUT', content: 'Should be processed' } },
    ];

    act(() => {
      mockEventSource.dispatchEvent('json_patch', patches);
    });

    // Should only have start entry + 1 valid patch (not the unknown type)
    expect(result.current.entries).toHaveLength(2);
    expect(result.current.entries[1].payload).toBe('Should be processed');
  });

  it('clears entries when workerId changes', async () => {
    const { result, rerender } = renderHook(
      ({ workerId }) => useEnhancedLogStream(workerId, true),
      { initialProps: { workerId: 'worker-123' } }
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Add some entries
    const patches = [{ value: { type: 'STDOUT', content: 'Hello' } }];
    act(() => {
      mockEventSource.dispatchEvent('json_patch', patches);
    });

    expect(result.current.entries).toHaveLength(2);

    // Change workerId
    rerender({ workerId: 'worker-456' });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Should have new start entry only
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe('worker-456-start');
  });

  it('closes connection when disabled', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useEnhancedLogStream('worker-123', enabled),
      { initialProps: { enabled: true } }
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isConnected).toBe(true);

    // Disable the hook
    rerender({ enabled: false });

    expect(result.current.entries).toEqual([]);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles empty workerId', () => {
    const { result } = renderHook(() => useEnhancedLogStream('', true));

    expect(result.current.entries).toEqual([]);
    expect(result.current.isConnected).toBe(false);
  });

  it('increments entry counter correctly', async () => {
    const { result } = renderHook(() => useEnhancedLogStream('worker-123', true));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const patches = [
      { value: { type: 'STDOUT', content: 'First' } },
      { value: { type: 'STDOUT', content: 'Second' } },
    ];

    act(() => {
      mockEventSource.dispatchEvent('json_patch', patches);
    });

    expect(result.current.entries).toHaveLength(3);
    expect(result.current.entries[0].ts).toBe(0); // start entry
    expect(result.current.entries[1].ts).toBe(1); // first patch
    expect(result.current.entries[2].ts).toBe(2); // second patch
  });

  it('handles EventSource unavailable in test environment', () => {
    // Temporarily remove EventSource
    const originalEventSource = (global as any).EventSource;
    delete (global as any).EventSource;

    const { result } = renderHook(() => useEnhancedLogStream('worker-123', true));

    expect(result.current.entries).toEqual([]);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();

    // Restore EventSource
    (global as any).EventSource = originalEventSource;
  });

  afterAll(() => {
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });
});
