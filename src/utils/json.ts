/**
 * Safe JSON utilities that handle circular references and other edge cases
 */

/**
 * Safely stringify an object, handling circular references and other problematic cases
 * @param obj The object to stringify
 * @param space Optional spacing for formatting
 * @returns Safe JSON string or fallback message
 */
export function safeStringify(obj: unknown, space?: number): string {
  if (obj === null || obj === undefined) {
    return String(obj);
  }

  if (typeof obj === 'string') {
    return obj;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }

  if (typeof obj === 'function') {
    return '[Function]';
  }

  // For objects, use a safe stringify approach
  try {
    const replacer = createSafeReplacer();
    return JSON.stringify(obj, replacer, space);
  } catch (error) {
    return handleStringifyError(error);
  }
}

/**
 * Create a replacer function that safely handles circular references and problematic objects
 * @returns JSON replacer function
 */
function createSafeReplacer(): (key: string, value: unknown) => unknown {
  const seen = new WeakSet();

  return (key: string, value: unknown): unknown => {
    if (value !== null && typeof value === 'object') {
      // Skip circular references
      if (seen.has(value as object)) {
        return '[Circular Reference]';
      }
      seen.add(value as object);

      return handleProblematicObjects(value);
    }

    return value;
  };
}

/**
 * Handle objects that are known to cause JSON stringification issues
 * @param value The object value to handle
 * @returns Safe representation of the object
 */
function handleProblematicObjects(value: object): unknown {
  // Handle functions
  if (typeof value === 'function') {
    return '[Function]';
  }

  // Handle Error objects specially
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack?.substring(0, 200) + '...',
    };
  }

  // Handle specific problematic constructor objects
  if (value.constructor) {
    return handleConstructorObjects(value);
  }

  return value;
}

/**
 * Handle objects with specific constructor names that cause issues
 * @param value The object with a constructor
 * @returns Safe representation or original value
 */
function handleConstructorObjects(value: object): unknown {
  const constructorName = value.constructor.name;

  // Handle network objects that cause circular references
  if (
    constructorName === 'TLSSocket' ||
    constructorName === 'HTTPParser' ||
    constructorName === 'ClientRequest' ||
    constructorName === 'IncomingMessage'
  ) {
    return `[${constructorName}]`;
  }

  // Handle other Node.js streams and buffers
  if (constructorName === 'Buffer') {
    return `[Buffer ${(value as Buffer).length} bytes]`;
  }

  if (constructorName === 'ReadableState' || constructorName === 'WritableState') {
    return `[${constructorName}]`;
  }

  return value;
}

/**
 * Handle errors that occur during JSON stringification
 * @param error The error that occurred
 * @returns Fallback error message
 */
function handleStringifyError(error: unknown): string {
  if (error instanceof Error && error.message.includes('circular')) {
    return '[Object with circular references]';
  }

  return `[Unstringifiable object: ${error instanceof Error ? error.message : 'Unknown error'}]`;
}

/**
 * Get a safe preview of an object (truncated version)
 * @param obj The object to preview
 * @param maxLength Maximum length of preview
 * @returns Safe preview string
 */
export function safePreview(obj: unknown, maxLength: number = 200): string {
  const stringified = safeStringify(obj);
  if (stringified.length <= maxLength) {
    return stringified;
  }
  return stringified.substring(0, maxLength) + '...';
}

/**
 * Calculate the approximate size of an object in bytes
 * @param obj The object to measure
 * @returns Size description string
 */
export function getSafeSize(obj: unknown): string {
  if (typeof obj === 'string') {
    return `${obj.length} bytes`;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return `${String(obj).length} bytes`;
  }

  if (obj === null || obj === undefined) {
    return '4 bytes';
  }

  try {
    const stringified = safeStringify(obj);
    return `${stringified.length} bytes`;
  } catch {
    return 'Unable to calculate size';
  }
}
