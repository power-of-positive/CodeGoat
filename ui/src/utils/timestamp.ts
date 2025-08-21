// Utility for creating stable, memoized timestamps
// Prevents recalculation on every render

const timestampCache = new Map<string | number, string>();

export const formatStableTimestamp = (timestamp: string | number): string => {
  const key = typeof timestamp === 'string' ? timestamp : timestamp.toString();
  
  if (timestampCache.has(key)) {
    return timestampCache.get(key)!;
  }
  
  const formatted = typeof timestamp === 'number' 
    ? new Date(timestamp).toLocaleTimeString()
    : new Date(timestamp).toLocaleTimeString();
  
  timestampCache.set(key, formatted);
  return formatted;
};

// Clear cache when it gets too large to prevent memory leaks
export const clearTimestampCache = () => {
  if (timestampCache.size > 1000) {
    timestampCache.clear();
  }
};