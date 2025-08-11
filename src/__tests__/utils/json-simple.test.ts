import { safeStringify, safePreview, getSafeSize } from '../../utils/json';

describe('JSON Utils', () => {
  describe('safeStringify', () => {
    it('should stringify simple objects', () => {
      const obj = { name: 'John', age: 30, active: true };
      const result = safeStringify(obj);

      expect(result).toBe('{"name":"John","age":30,"active":true}');
    });

    it('should stringify with pretty printing', () => {
      const obj = { name: 'John', age: 30 };
      const result = safeStringify(obj, 2);

      expect(result).toBe('{\n  "name": "John",\n  "age": 30\n}');
    });

    it('should handle null and undefined', () => {
      expect(safeStringify(null)).toBe('null');
      expect(safeStringify(undefined)).toBe('undefined');
    });

    it('should handle primitive values', () => {
      expect(safeStringify(42)).toBe('42');
      expect(safeStringify('hello')).toBe('hello');
      expect(safeStringify(true)).toBe('true');
      expect(safeStringify(false)).toBe('false');
    });

    it('should handle arrays', () => {
      const arr = [1, 'two', { three: 3 }, null];
      const result = safeStringify(arr);

      expect(result).toBe('[1,"two",{"three":3},null]');
    });

    it('should handle circular references', () => {
      const obj: any = { name: 'circular' };
      obj.self = obj;

      const result = safeStringify(obj);

      expect(result).toContain('"name":"circular"');
      expect(result).toContain('[Circular Reference]');
    });

    it('should handle Error objects', () => {
      const obj = {
        name: 'test',
        error: new Error('Something went wrong'),
      };

      const result = safeStringify(obj);

      expect(result).toContain('"name":"test"');
      expect(result).toContain('Something went wrong');
    });

    it('should handle TLSSocket/HTTPParser objects', () => {
      // Mock objects that simulate the problematic network objects
      const socket: any = {
        _handle: {},
        readable: true,
        writable: true,
      };

      const parser: any = {
        socket: socket,
        incoming: null,
        outgoing: [],
      };

      socket.parser = parser;

      // This should not throw an error
      const result = safeStringify(socket);

      expect(result).toContain('"readable":true');
      expect(result).toContain('"writable":true');
      expect(result).toContain('[Circular Reference]');
    });

    it('should handle BigInt errors', () => {
      const obj = {
        name: 'test',
        bigValue: BigInt(123),
      };

      const result = safeStringify(obj);

      expect(result).toContain('[Unstringifiable object:');
      expect(result).toContain('BigInt');
    });

    it('should handle functions in objects', () => {
      const obj = {
        name: 'test',
        fn: function () {
          return 'hello';
        },
      };

      const result = safeStringify(obj);

      // Functions are omitted by JSON.stringify
      expect(result).toBe('{"name":"test"}');
    });

    it('should handle objects with no constructor', () => {
      const obj = Object.create(null);
      obj.name = 'test';

      const result = safeStringify(obj);

      expect(result).toContain('"name":"test"');
    });

    it('should handle ReadableState and WritableState objects', () => {
      const readableState = {
        constructor: { name: 'ReadableState' },
        buffer: [],
        ended: false,
      };

      const writableState = {
        constructor: { name: 'WritableState' },
        buffer: [],
        ended: false,
      };

      const obj = {
        readable: readableState,
        writable: writableState,
      };

      const result = safeStringify(obj);

      expect(result).toContain('[ReadableState]');
      expect(result).toContain('[WritableState]');
    });

    it('should handle Buffer objects with correct format', () => {
      const buffer = Buffer.from('test data');
      const obj = {
        constructor: { name: 'Buffer' },
        length: buffer.length,
      } as any;

      // Mock the Buffer-like object for constructor handling
      const result = safeStringify(obj);

      expect(result).toContain('[Buffer');
      expect(result).toContain('bytes]');
    });

    it('should handle specific network object constructors', () => {
      // Create mock objects with constructor names that cause issues
      const createMockObject = (constructorName: string) => {
        const obj = {};
        Object.defineProperty(obj, 'constructor', {
          value: { name: constructorName },
          writable: false,
        });
        return obj;
      };

      const tlsSocket = createMockObject('TLSSocket');
      const httpParser = createMockObject('HTTPParser');

      const container = { tlsSocket, httpParser };
      const result = safeStringify(container);

      expect(result).toContain('"tlsSocket":"[TLSSocket]"');
      expect(result).toContain('"httpParser":"[HTTPParser]"');
    });

    it('should handle Buffer objects', () => {
      const buffer = Buffer.from('hello');
      const obj = { data: buffer };

      const result = safeStringify(obj);

      // Buffers are serialized with their type and data array
      expect(result).toContain('"type":"Buffer"');
      expect(result).toContain('"data":[104,101,108,108,111]'); // 'hello' as byte array
    });
  });

  describe('safePreview', () => {
    it('should return full string if under limit', () => {
      const obj = { name: 'short' };
      const result = safePreview(obj, 200);

      expect(result).toBe('{"name":"short"}');
    });

    it('should truncate long strings', () => {
      const longObj = { name: 'x'.repeat(500) };
      const result = safePreview(longObj, 50);

      expect(result.length).toBe(53); // 50 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should use default max length', () => {
      const obj = { name: 'test' };
      const result = safePreview(obj);

      expect(result).toBe('{"name":"test"}');
    });
  });

  describe('getSafeSize', () => {
    it('should calculate string size', () => {
      expect(getSafeSize('hello')).toBe('5 bytes');
    });

    it('should calculate number size', () => {
      expect(getSafeSize(42)).toBe('2 bytes');
      expect(getSafeSize(true)).toBe('4 bytes');
    });

    it('should handle null and undefined', () => {
      expect(getSafeSize(null)).toBe('4 bytes');
      expect(getSafeSize(undefined)).toBe('4 bytes');
    });

    it('should calculate object size', () => {
      const obj = { name: 'test' };
      const result = getSafeSize(obj);

      expect(result).toContain('bytes');
      expect(parseInt(result)).toBeGreaterThan(0);
    });

    it('should handle problematic objects', () => {
      const obj: any = { name: 'test' };
      obj.self = obj; // Circular reference

      const result = getSafeSize(obj);

      expect(result).toContain('bytes');
    });

    it('should return error message when calculation fails', () => {
      // Create an object that will cause an error in the try-catch block
      // by making getSafeSize receive something that causes an exception
      const problematicObj = {
        toString: () => {
          throw new Error('toString error');
        },
      };

      // Since getSafeSize wraps in try-catch, it should handle this gracefully
      const result = getSafeSize(problematicObj);

      // The function should return a size or handle the error gracefully
      expect(typeof result).toBe('string');
      expect(result).toContain('bytes');
    });
  });

  describe('error handling', () => {
    let originalStringify: any;

    beforeEach(() => {
      originalStringify = JSON.stringify;
    });

    afterEach(() => {
      JSON.stringify = originalStringify;
    });

    it('should handle objects that throw during stringification', () => {
      const obj = {
        get problematic() {
          throw new Error('Access error');
        },
      };

      const result = safeStringify(obj);

      // Should not throw, should return some safe representation
      expect(typeof result).toBe('string');
    });

    it('should handle circular structure errors', () => {
      // This tests the error handling path
      const obj: any = { name: 'test' };
      obj.circular = obj;

      const result = safeStringify(obj);

      expect(result).toContain('circular');
      expect(result).toContain('[Circular Reference]');
    });

    it('should handle non-circular stringification errors', () => {
      // Mock JSON.stringify to throw a non-circular error
      JSON.stringify = jest.fn().mockImplementation(() => {
        throw new Error('Custom JSON error');
      });

      const obj = { name: 'test' };
      const result = safeStringify(obj);

      expect(result).toBe('[Unstringifiable object: Custom JSON error]');
    });

    it('should handle errors with no message', () => {
      // Mock JSON.stringify to throw an error with no message
      JSON.stringify = jest.fn().mockImplementation(() => {
        const error = new Error();
        error.message = '';
        throw error;
      });

      const obj = { name: 'test' };
      const result = safeStringify(obj);

      expect(result).toBe('[Unstringifiable object: ]');
    });

    it('should handle non-Error exceptions', () => {
      // Mock JSON.stringify to throw a non-Error value
      JSON.stringify = jest.fn().mockImplementation(() => {
        throw 'String error';
      });

      const obj = { name: 'test' };
      const result = safeStringify(obj);

      expect(result).toBe('[Unstringifiable object: Unknown error]');
    });
  });

  describe('edge cases', () => {
    it('should handle empty objects and arrays', () => {
      expect(safeStringify({})).toBe('{}');
      expect(safeStringify([])).toBe('[]');
    });

    it('should handle function values directly', () => {
      const func = function testFunction() {
        return 'test';
      };
      const result = safeStringify(func);

      // Functions are converted to string by safeStringify
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle getSafeSize with try-catch error path', () => {
      // Create an object that would cause an error in the size calculation
      const problematicObj = {
        toJSON: () => {
          throw new Error('toJSON error');
        },
      };

      const result = getSafeSize(problematicObj);

      // Should handle the error gracefully and still return a size
      expect(typeof result).toBe('string');
      expect(result).toContain('bytes');
    });

    it('should handle nested objects', () => {
      const obj = {
        level1: {
          level2: {
            value: 'deep',
          },
        },
      };

      const result = safeStringify(obj);

      expect(result).toContain('"value":"deep"');
    });

    it('should handle mixed type arrays', () => {
      const arr = [1, 'two', { three: 3 }, [4, 5]];
      const result = safeStringify(arr);

      expect(result).toBe('[1,"two",{"three":3},[4,5]]');
    });

    it('should handle Date objects', () => {
      const obj = {
        date: new Date('2023-01-01T10:00:00.000Z'),
      };

      const result = safeStringify(obj);

      expect(result).toContain('"date":"2023-01-01T10:00:00.000Z"');
    });
  });
});
