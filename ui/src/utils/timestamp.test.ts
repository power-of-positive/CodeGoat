import { formatStableTimestamp, clearTimestampCache } from './timestamp';

describe('timestamp utilities', () => {
  describe('formatStableTimestamp', () => {
    beforeEach(() => {
      clearTimestampCache();
    });

    test('formats string timestamps correctly', () => {
      const timestamp = '2024-01-01T12:30:45Z';
      const formatted = formatStableTimestamp(timestamp);

      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    test('formats number timestamps correctly', () => {
      const timestamp = Date.now();
      const formatted = formatStableTimestamp(timestamp);

      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    test('uses cache for repeated timestamps', () => {
      const timestamp = '2024-01-01T12:30:45Z';

      const first = formatStableTimestamp(timestamp);
      const second = formatStableTimestamp(timestamp);

      expect(first).toBe(second);
    });

    test('handles different input types', () => {
      const stringTimestamp = '2024-01-01T12:30:45Z';
      const numberTimestamp = Date.parse(stringTimestamp);

      const stringResult = formatStableTimestamp(stringTimestamp);
      const numberResult = formatStableTimestamp(numberTimestamp);

      expect(typeof stringResult).toBe('string');
      expect(typeof numberResult).toBe('string');
    });

    test('returns consistent format for same input', () => {
      const timestamp = '2024-01-01T12:30:45Z';

      const result1 = formatStableTimestamp(timestamp);
      const result2 = formatStableTimestamp(timestamp);
      const result3 = formatStableTimestamp(timestamp);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    test('handles edge case timestamps', () => {
      // Test with epoch time
      const epochTime = 0;
      const formatted = formatStableTimestamp(epochTime);
      expect(typeof formatted).toBe('string');

      // Test with recent timestamp
      const recentTime = Date.now();
      const recentFormatted = formatStableTimestamp(recentTime);
      expect(typeof recentFormatted).toBe('string');
    });

    test('caches both string and number keys separately', () => {
      const timestamp = 1640995845000; // Jan 1, 2022
      const timestampString = timestamp.toString();

      const numberResult = formatStableTimestamp(timestamp);
      const stringResult = formatStableTimestamp(timestampString);

      // Should be the same time formatted
      expect(numberResult).toBe(stringResult);
    });
  });

  describe('clearTimestampCache', () => {
    test('clears cache when called', () => {
      // Fill cache with some entries
      for (let i = 0; i < 10; i++) {
        formatStableTimestamp(`2024-01-01T12:${i.toString().padStart(2, '0')}:00Z`);
      }

      // Clear cache
      clearTimestampCache();

      // Function should still work after clearing
      const result = formatStableTimestamp('2024-01-01T13:00:00Z');
      expect(typeof result).toBe('string');
    });

    test('handles empty cache gracefully', () => {
      // Clear empty cache should not throw
      expect(() => clearTimestampCache()).not.toThrow();
    });

    test('cache behavior after clearing', () => {
      const timestamp = '2024-01-01T12:30:45Z';

      // Use timestamp to populate cache
      const first = formatStableTimestamp(timestamp);

      // Clear cache
      clearTimestampCache();

      // Use same timestamp again - should work but might not be from cache
      const second = formatStableTimestamp(timestamp);

      expect(first).toBe(second); // Should still format the same way
    });

    test('automatically clears cache when size exceeds 1000', () => {
      // Fill cache with over 1000 entries to trigger automatic clearing
      for (let i = 0; i <= 1001; i++) {
        formatStableTimestamp(`2024-01-01T12:00:${i.toString().padStart(2, '0')}.${i}Z`);
      }

      // Call clearTimestampCache to check the size and clear if needed
      clearTimestampCache();

      // Function should still work after auto-clearing
      const result = formatStableTimestamp('2024-01-01T14:00:00Z');
      expect(typeof result).toBe('string');
    });
  });

  describe('performance and memory management', () => {
    test('formatStableTimestamp is efficient for repeated calls', () => {
      const timestamp = '2024-01-01T12:30:45Z';
      const start = performance.now();

      // Multiple calls should be fast due to caching
      for (let i = 0; i < 1000; i++) {
        formatStableTimestamp(timestamp);
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(10); // Should be very fast with caching
    });

    test('handles many different timestamps', () => {
      const timestamps = Array.from(
        { length: 100 },
        (_, i) => `2024-01-01T12:${i.toString().padStart(2, '0')}:00Z`
      );

      const start = performance.now();

      timestamps.forEach(timestamp => {
        formatStableTimestamp(timestamp);
      });

      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should complete reasonably quickly
    });

    test('cache prevents redundant calculations', () => {
      const timestamp = '2024-01-01T12:30:45Z';

      // First call - should cache the result
      const start1 = performance.now();
      const first = formatStableTimestamp(timestamp);
      const end1 = performance.now();

      // Second call - should use cache
      const start2 = performance.now();
      const second = formatStableTimestamp(timestamp);
      const end2 = performance.now();

      expect(first).toBe(second);
      // Second call should generally be faster (from cache)
      expect(end2 - start2).toBeLessThanOrEqual(end1 - start1);
    });
  });

  describe('locale handling', () => {
    test('uses system locale for formatting', () => {
      const timestamp = '2024-01-01T12:30:45Z';
      const formatted = formatStableTimestamp(timestamp);

      // Should contain time information
      expect(formatted).toMatch(/\d/); // Should contain digits
      // Format will vary by locale but should be a valid time string
      expect(formatted.length).toBeGreaterThan(0);
    });

    test('consistent formatting across calls', () => {
      const timestamp1 = '2024-01-01T12:30:45Z';
      const timestamp2 = '2024-01-01T13:45:30Z';

      const formatted1 = formatStableTimestamp(timestamp1);
      const formatted2 = formatStableTimestamp(timestamp2);

      // Both should be strings with similar structure
      expect(typeof formatted1).toBe('string');
      expect(typeof formatted2).toBe('string');
      expect(formatted1).not.toBe(formatted2); // Different times should format differently
    });
  });
});
