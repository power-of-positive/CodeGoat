/**
 * Parse human-readable duration to milliseconds
 * Supports formats like: "2h 30m", "1d 3h 15m", "45m", "30s"
 * @param duration - Duration string (e.g., "2h 30m", "1d 3h 15m")
 * @returns Duration in milliseconds
 */
export function parseDuration(duration: string): number {
  if (!duration || duration === 'N/A') {
    return 0;
  }

  const parts = duration.toLowerCase().match(/(\d+)([dhms])/g);
  if (!parts) {
    return 0;
  }

  let totalMs = 0;
  for (const part of parts) {
    const match = part.match(/(\d+)([dhms])/);
    if (!match) continue;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        totalMs += value * 24 * 60 * 60 * 1000;
        break;
      case 'h':
        totalMs += value * 60 * 60 * 1000;
        break;
      case 'm':
        totalMs += value * 60 * 1000;
        break;
      case 's':
        totalMs += value * 1000;
        break;
    }
  }

  return totalMs;
}

/**
 * Format duration in milliseconds to human-readable format
 * @param durationMs - Duration in milliseconds
 * @returns Formatted duration string (e.g., "2h 30m", "45s", "1d 3h")
 */
export function formatDuration(durationMs: number | undefined | null): string {
  if (durationMs === undefined || durationMs === null || durationMs === 0) {
    return 'N/A';
  }

  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours % 24 > 0) {
    parts.push(`${hours % 24}h`);
  }
  if (minutes % 60 > 0) {
    parts.push(`${minutes % 60}m`);
  }
  if (seconds % 60 > 0 && parts.length === 0) {
    // Only show seconds if no larger units
    parts.push(`${seconds % 60}s`);
  }

  return parts.length > 0 ? parts.join(' ') : '0s';
}
