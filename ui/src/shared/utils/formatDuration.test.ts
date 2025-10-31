import { formatDuration, formatDurationDetailed, parseDuration } from './formatDuration';

describe('formatDuration', () => {
  it('should format seconds correctly', () => {
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(30000)).toBe('30s');
  });

  it('should format minutes correctly', () => {
    expect(formatDuration(60000)).toBe('1m');
    expect(formatDuration(150000)).toBe('2m 30s');
    expect(formatDuration(300000)).toBe('5m');
  });

  it('should format hours correctly', () => {
    expect(formatDuration(3600000)).toBe('1h');
    expect(formatDuration(5400000)).toBe('1h 30m');
    expect(formatDuration(7200000)).toBe('2h');
  });

  it('should format days correctly', () => {
    expect(formatDuration(86400000)).toBe('1d');
    expect(formatDuration(90000000)).toBe('1d 1h');
    expect(formatDuration(172800000)).toBe('2d');
  });

  it('should format complex durations correctly', () => {
    expect(formatDuration(90061000)).toBe('1d 1h 1m');
    expect(formatDuration(3661000)).toBe('1h 1m');
  });

  it('should handle null, undefined, and zero', () => {
    expect(formatDuration(null)).toBe('N/A');
    expect(formatDuration(undefined)).toBe('N/A');
    expect(formatDuration(0)).toBe('N/A');
  });

  it('should not show seconds when larger units are present', () => {
    expect(formatDuration(3665000)).toBe('1h 1m'); // 1h 1m 5s -> only shows 1h 1m
  });
});

describe('formatDurationDetailed', () => {
  it('should format with full unit names', () => {
    expect(formatDurationDetailed(5000)).toBe('5 seconds');
    expect(formatDurationDetailed(60000)).toBe('1 minute');
    expect(formatDurationDetailed(120000)).toBe('2 minutes');
    expect(formatDurationDetailed(3600000)).toBe('1 hour');
    expect(formatDurationDetailed(86400000)).toBe('1 day');
  });

  it('should use singular and plural correctly', () => {
    expect(formatDurationDetailed(1000)).toBe('1 second');
    expect(formatDurationDetailed(2000)).toBe('2 seconds');
    expect(formatDurationDetailed(60000)).toBe('1 minute');
    expect(formatDurationDetailed(120000)).toBe('2 minutes');
  });

  it('should format complex durations with commas', () => {
    expect(formatDurationDetailed(5400000)).toBe('1 hour, 30 minutes');
    expect(formatDurationDetailed(90000000)).toBe('1 day, 1 hour');
  });

  it('should handle null, undefined, and zero', () => {
    expect(formatDurationDetailed(null)).toBe('N/A');
    expect(formatDurationDetailed(undefined)).toBe('N/A');
    expect(formatDurationDetailed(0)).toBe('N/A');
  });
});

describe('parseDuration', () => {
  it('should parse seconds', () => {
    expect(parseDuration('5s')).toBe(5000);
    expect(parseDuration('30s')).toBe(30000);
  });

  it('should parse minutes', () => {
    expect(parseDuration('1m')).toBe(60000);
    expect(parseDuration('2m 30s')).toBe(150000);
  });

  it('should parse hours', () => {
    expect(parseDuration('1h')).toBe(3600000);
    expect(parseDuration('1h 30m')).toBe(5400000);
  });

  it('should parse days', () => {
    expect(parseDuration('1d')).toBe(86400000);
    expect(parseDuration('1d 1h')).toBe(90000000);
  });

  it('should parse complex durations', () => {
    expect(parseDuration('1d 2h 30m 15s')).toBe(95415000);
    expect(parseDuration('2h 15m')).toBe(8100000);
  });

  it('should handle case insensitivity', () => {
    expect(parseDuration('1H 30M')).toBe(5400000);
    expect(parseDuration('1D')).toBe(86400000);
  });

  it('should handle N/A and empty strings', () => {
    expect(parseDuration('N/A')).toBe(0);
    expect(parseDuration('')).toBe(0);
  });

  it('should handle invalid formats', () => {
    expect(parseDuration('invalid')).toBe(0);
    expect(parseDuration('123')).toBe(0);
  });
});

describe('formatDuration and parseDuration roundtrip', () => {
  it('should be reversible for common durations', () => {
    const durations = [5000, 60000, 3600000, 5400000, 86400000, 90061000];

    for (const duration of durations) {
      const formatted = formatDuration(duration);
      const parsed = parseDuration(formatted);
      // Allow small discrepancies due to truncation of seconds in longer durations
      expect(Math.abs(parsed - duration)).toBeLessThan(60000); // Within 1 minute
    }
  });
});
