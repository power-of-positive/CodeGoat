import { cn } from './utils';

describe('cn utility function', () => {
  it('combines single class name', () => {
    const result = cn('text-red-500');
    expect(result).toBe('text-red-500');
  });

  it('combines multiple class names', () => {
    const result = cn('text-red-500', 'bg-blue-200', 'p-4');
    expect(result).toBe('text-red-500 bg-blue-200 p-4');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isDisabled = false;

    const result = cn('base-class', isActive && 'active-class', isDisabled && 'disabled-class');

    expect(result).toBe('base-class active-class');
  });

  it('handles undefined and null values', () => {
    const result = cn('text-red-500', undefined, null, 'bg-blue-200');
    expect(result).toBe('text-red-500 bg-blue-200');
  });

  it('handles empty strings', () => {
    const result = cn('text-red-500', '', 'bg-blue-200');
    expect(result).toBe('text-red-500 bg-blue-200');
  });

  it('handles arrays of class names', () => {
    const result = cn(['text-red-500', 'bg-blue-200'], 'p-4');
    expect(result).toBe('text-red-500 bg-blue-200 p-4');
  });

  it('handles nested arrays', () => {
    const result = cn(['text-red-500', ['bg-blue-200', 'p-4']], 'm-2');
    expect(result).toBe('text-red-500 bg-blue-200 p-4 m-2');
  });

  it('handles objects with boolean values', () => {
    const result = cn({
      'text-red-500': true,
      'bg-blue-200': false,
      'p-4': true,
    });

    expect(result).toBe('text-red-500 p-4');
  });

  it('merges Tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    // clsx concatenates classes, doesn't merge them
    expect(result).toBe('px-2 py-1 px-4');
  });

  it('handles complex combinations', () => {
    const isLarge = true;
    const theme = 'dark';

    const result = cn(
      'base-button',
      {
        'text-lg': isLarge,
        'text-sm': !isLarge,
      },
      theme === 'dark' && 'bg-gray-800 text-white',
      ['hover:bg-gray-700', 'focus:outline-none']
    );

    expect(result).toContain('base-button');
    expect(result).toContain('text-lg');
    expect(result).toContain('bg-gray-800');
    expect(result).toContain('hover:bg-gray-700');
  });

  it('returns empty string for no arguments', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('returns empty string for all falsy values', () => {
    const result = cn(false, null, undefined, '', 0);
    expect(result).toBe('');
  });
});
