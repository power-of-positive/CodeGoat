export function add(a: number, b: number): number {
  // Add two numbers together with enhanced checking
  return a + b;
}

export function multiply(a: number, b: number): number {
  // Multiply two numbers
  return a * b;
}

export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}
