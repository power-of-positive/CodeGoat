import { describe, it, expect } from 'vitest';
import { add, multiply, divide } from './math';

describe('Math utilities', () => {
  describe('add', () => {
    it('should add two positive numbers correctly', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should add negative numbers correctly', () => {
      expect(add(-2, -3)).toBe(-5);
    });

    it('should add positive and negative numbers correctly', () => {
      expect(add(5, -3)).toBe(2);
      expect(add(-5, 3)).toBe(-2);
    });

    it('should handle zero correctly', () => {
      expect(add(0, 5)).toBe(5);
      expect(add(5, 0)).toBe(5);
      expect(add(0, 0)).toBe(0);
    });

    it('should handle decimal numbers correctly', () => {
      expect(add(1.5, 2.5)).toBe(4);
      expect(add(0.1, 0.2)).toBeCloseTo(0.3);
    });
  });

  describe('multiply', () => {
    it('should multiply two positive numbers correctly', () => {
      expect(multiply(3, 4)).toBe(12);
    });

    it('should multiply negative numbers correctly', () => {
      expect(multiply(-3, -4)).toBe(12);
      expect(multiply(-3, 4)).toBe(-12);
      expect(multiply(3, -4)).toBe(-12);
    });

    it('should handle zero correctly', () => {
      expect(multiply(0, 5)).toBe(0);
      expect(multiply(5, 0)).toBe(0);
      expect(multiply(0, 0)).toBe(0);
    });

    it('should handle decimal numbers correctly', () => {
      expect(multiply(2.5, 4)).toBe(10);
      expect(multiply(0.1, 0.2)).toBeCloseTo(0.02);
    });

    it('should handle multiplication by one', () => {
      expect(multiply(5, 1)).toBe(5);
      expect(multiply(1, 5)).toBe(5);
    });
  });

  describe('divide', () => {
    it('should divide two positive numbers correctly', () => {
      expect(divide(10, 2)).toBe(5);
    });

    it('should divide negative numbers correctly', () => {
      expect(divide(-10, -2)).toBe(5);
      expect(divide(-10, 2)).toBe(-5);
      expect(divide(10, -2)).toBe(-5);
    });

    it('should handle decimal division correctly', () => {
      expect(divide(7.5, 2.5)).toBe(3);
      expect(divide(1, 3)).toBeCloseTo(0.333333);
    });

    it('should handle division by one', () => {
      expect(divide(5, 1)).toBe(5);
    });

    it('should handle zero dividend', () => {
      expect(divide(0, 5)).toBe(0);
    });

    it('should throw error when dividing by zero', () => {
      expect(() => divide(5, 0)).toThrow('Division by zero');
      expect(() => divide(-5, 0)).toThrow('Division by zero');
      expect(() => divide(0, 0)).toThrow('Division by zero');
    });

    it('should handle very small divisors correctly', () => {
      expect(divide(1, 0.001)).toBe(1000);
    });
  });
});
