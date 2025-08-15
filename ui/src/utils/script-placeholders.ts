import { createContext } from 'react';

// Script placeholder utilities for project forms
export interface ScriptPlaceholderStrategy {
  name: string;
  description: string;
  generate: (context: Record<string, unknown>) => string;
}

// Script placeholder context
export const ScriptPlaceholderContext = createContext<{
  strategies: ScriptPlaceholderStrategy[];
  selectedStrategy?: string;
  setSelectedStrategy: (strategy: string) => void;
}>({
  strategies: [],
  setSelectedStrategy: () => {}
});

// Create default script placeholder strategy
export function createScriptPlaceholderStrategy(
  name: string,
  description: string,
  generator: (context: Record<string, unknown>) => string
): ScriptPlaceholderStrategy {
  return {
    name,
    description,
    generate: generator
  };
}

// Default strategies
export const defaultScriptStrategies: ScriptPlaceholderStrategy[] = [
  createScriptPlaceholderStrategy(
    'basic',
    'Basic project setup',
    () => 'npm install && npm start'
  ),
  createScriptPlaceholderStrategy(
    'python',
    'Python project setup',
    () => 'pip install -r requirements.txt && python main.py'
  ),
  createScriptPlaceholderStrategy(
    'rust',
    'Rust project setup', 
    () => 'cargo build && cargo run'
  )
];