import { renderHook, act } from '@testing-library/react';
import { useProcessesLogs, ExecutionProcess } from '../useProcessesLogs';

describe('useProcessesLogs', () => {
  const mockProcesses: ExecutionProcess[] = [
    {
      id: 'process-1',
      task_attempt_id: 'attempt-1',
      run_reason: 'codingagent',
      status: 'completed',
      started_at: '2024-01-01T00:00:00Z',
      completed_at: '2024-01-01T00:05:00Z'
    },
    {
      id: 'process-2',
      task_attempt_id: 'attempt-2', 
      run_reason: 'validation',
      status: 'failed',
      started_at: '2024-01-01T00:10:00Z',
      completed_at: '2024-01-01T00:12:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useProcessesLogs(mockProcesses));
    
    expect(result.current.isLoading).toBe(false); // Mock data loads synchronously
    expect(result.current.error).toBeNull();
    expect(result.current.entries).toBeDefined();
  });

  it('should handle empty processes list', () => {
    const { result } = renderHook(() => useProcessesLogs([]));
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.entries).toEqual([]);
  });

  it('should generate log entries for processes', () => {
    const { result } = renderHook(() => useProcessesLogs(mockProcesses));
    
    const { entries } = result.current;
    expect(entries.length).toBeGreaterThan(0);
    
    // Check for process start entries
    const processStartEntries = entries.filter(e => e.channel === 'process_start');
    expect(processStartEntries).toHaveLength(2);
    expect(processStartEntries[0].processId).toBe('process-1');
    expect(processStartEntries[1].processId).toBe('process-2');
    
    // Check for stdout entries
    const stdoutEntries = entries.filter(e => e.channel === 'stdout');
    expect(stdoutEntries.length).toBeGreaterThan(0);
    
    // Check entries are sorted by timestamp
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].ts).toBeGreaterThanOrEqual(entries[i - 1].ts);
    }
  });

  it('should generate stderr entries for failed processes', () => {
    const { result } = renderHook(() => useProcessesLogs(mockProcesses));
    
    const { entries } = result.current;
    const stderrEntries = entries.filter(e => e.channel === 'stderr');
    
    expect(stderrEntries.length).toBeGreaterThan(0);
    const failedProcessStderr = stderrEntries.find(e => e.processId === 'process-2');
    expect(failedProcessStderr).toBeDefined();
    expect(failedProcessStderr!.payload).toContain('[ERROR]');
  });

  it('should generate normalized conversation entries for codingagent processes', () => {
    const { result } = renderHook(() => useProcessesLogs(mockProcesses));
    
    const { entries } = result.current;
    const normalizedEntries = entries.filter(e => e.channel === 'normalized');
    
    expect(normalizedEntries.length).toBeGreaterThan(0);
    
    // All normalized entries should be from the codingagent process
    normalizedEntries.forEach(entry => {
      expect(entry.processId).toBe('process-1');
      expect(entry.processName).toBe('codingagent');
    });
    
    // Check for different types of normalized entries
    const userMessage = normalizedEntries.find(e => 
      typeof e.payload === 'object' && 'entry_type' in e.payload && e.payload.entry_type?.type === 'user_message'
    );
    const toolUse = normalizedEntries.find(e =>
      typeof e.payload === 'object' && 'entry_type' in e.payload && e.payload.entry_type?.type === 'tool_use'  
    );
    const assistantMessage = normalizedEntries.find(e =>
      typeof e.payload === 'object' && 'entry_type' in e.payload && e.payload.entry_type?.type === 'assistant_message'
    );
    
    expect(userMessage).toBeDefined();
    expect(toolUse).toBeDefined();
    expect(assistantMessage).toBeDefined();
  });

  it.skip('should enable streaming when flag is set', () => {
    const { result } = renderHook(() => useProcessesLogs(mockProcesses, true));
    
    const initialCount = result.current.entries.length;
    
    // Fast forward time to trigger streaming
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(result.current.entries.length).toBe(initialCount + 1);
    
    // Verify new entry is a streaming entry
    const lastEntry = result.current.entries[result.current.entries.length - 1];
    expect(lastEntry.id).toContain('stream-');
    expect(lastEntry.channel).toBe('stdout');
    expect(lastEntry.payload).toContain('Streaming log entry');
  });

  it.skip('should cleanup streaming interval on unmount', () => {
    const { unmount } = renderHook(() => useProcessesLogs(mockProcesses, true));
    
    // Verify interval is created
    expect(jest.getTimerCount()).toBe(1);
    
    unmount();
    
    // Verify interval is cleaned up
    expect(jest.getTimerCount()).toBe(0);
  });

  it('should update entries when processes change', () => {
    const { result, rerender } = renderHook(
      ({ processes }) => useProcessesLogs(processes),
      { initialProps: { processes: [mockProcesses[0]] } }
    );
    
    const initialCount = result.current.entries.length;
    
    // Update with more processes
    rerender({ processes: mockProcesses });
    
    expect(result.current.entries.length).toBeGreaterThan(initialCount);
  });

  it.skip('should handle errors gracefully', () => {
    // This test can cause issues by modifying Date.now globally
    // Mock Date.now to throw an error
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => {
      throw new Error('Mock error');
    });
    
    const { result } = renderHook(() => useProcessesLogs(mockProcesses));
    
    expect(result.current.error).toBe('Mock error');
    expect(result.current.isLoading).toBe(false);
    
    // Restore Date.now
    Date.now = originalDateNow;
  });

  it.skip('should handle streaming with no processes', () => {
    const { result } = renderHook(() => useProcessesLogs([], true));
    
    // Should not crash and should handle empty processes gracefully
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    // Should add streaming entry even with no initial processes
    expect(result.current.entries.length).toBe(1);
    const streamEntry = result.current.entries[0];
    expect(streamEntry.processId).toBe('unknown');
    expect(streamEntry.processName).toBe('stream');
  });
});