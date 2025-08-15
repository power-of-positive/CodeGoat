import { describe, it, expect } from '@jest/globals';
import { add, multiply, divide } from '@/components/utils/math';
import { toPrettyCase, toKebabCase, toCamelCase, toSnakeCase, truncate } from '@/utils/string';

describe('Math utilities', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should add negative numbers', () => {
      expect(add(-2, -3)).toBe(-5);
    });

    it('should handle zero', () => {
      expect(add(0, 5)).toBe(5);
      expect(add(5, 0)).toBe(5);
    });
  });

  describe('multiply', () => {
    it('should multiply two positive numbers', () => {
      expect(multiply(2, 3)).toBe(6);
    });

    it('should multiply by zero', () => {
      expect(multiply(5, 0)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(multiply(-2, 3)).toBe(-6);
      expect(multiply(-2, -3)).toBe(6);
    });
  });

  describe('divide', () => {
    it('should divide two positive numbers', () => {
      expect(divide(6, 3)).toBe(2);
    });

    it('should handle decimals', () => {
      expect(divide(5, 2)).toBe(2.5);
    });

    it('should throw error on division by zero', () => {
      expect(() => divide(5, 0)).toThrow('Division by zero');
    });
  });
});

describe('String utilities', () => {
  describe('toPrettyCase', () => {
    it('should convert snake_case to Pretty Case', () => {
      expect(toPrettyCase('hello_world')).toBe('Hello World');
    });

    it('should handle single words', () => {
      expect(toPrettyCase('test')).toBe('Test');
    });
  });

  describe('toKebabCase', () => {
    it('should convert spaces to kebab-case', () => {
      expect(toKebabCase('Hello World')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(toKebabCase('Hello   World  Test')).toBe('hello-world-test');
    });
  });

  describe('toCamelCase', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(toCamelCase('hello-world')).toBe('helloWorld');
    });

    it('should convert snake_case to camelCase', () => {
      expect(toCamelCase('hello_world')).toBe('helloWorld');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(toSnakeCase('helloWorld')).toBe('hello_world');
    });

    it('should handle PascalCase', () => {
      expect(toSnakeCase('HelloWorld')).toBe('hello_world');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('This is a long string', 10)).toBe('This is...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('Short', 10)).toBe('Short');
    });

    it('should use custom suffix', () => {
      expect(truncate('This is a long string', 10, '…')).toBe('This is a…');
    });
  });
});