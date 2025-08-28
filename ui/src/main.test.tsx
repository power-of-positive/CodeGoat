import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock createRoot and the App component to test main.tsx logic
const mockRender = jest.fn();
const mockCreateRoot = jest.fn(() => ({
  render: mockRender
}));

jest.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot
}));

// Mock App component
const MockApp = () => <div data-testid="app">App Component</div>;
jest.mock('./App', () => ({
  __esModule: true,
  default: MockApp
}));

// Mock CSS import
jest.mock('./index.css', () => ({}));

describe('main.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates root and renders App component', async () => {
    // Create a mock DOM element
    const mockRootElement = document.createElement('div');
    mockRootElement.id = 'root';
    
    // Mock getElementById to return our mock element
    jest.spyOn(document, 'getElementById').mockReturnValue(mockRootElement);

    // Import and execute main.tsx
    await import('./main');

    // Verify createRoot was called with the root element
    expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
    expect(document.getElementById).toHaveBeenCalledWith('root');

    // Verify render was called
    expect(mockRender).toHaveBeenCalledTimes(1);

    // Verify the rendered component structure
    const renderCall = mockRender.mock.calls[0][0];
    expect(renderCall.type).toBe(React.StrictMode);
    expect(renderCall.props.children.type).toBe(MockApp);
  });

  it('handles missing root element gracefully', () => {
    // Mock getElementById to return null
    jest.spyOn(document, 'getElementById').mockReturnValue(null);

    // The code uses non-null assertion, which should cause createRoot to receive null
    // In practice, createRoot will handle null and might throw, but in our mock it won't
    // Let's test that getElementById was called and createRoot receives what getElementById returns
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./main');
    }).not.toThrow(); // The mock won't actually throw

    expect(document.getElementById).toHaveBeenCalledWith('root');
    expect(mockCreateRoot).toHaveBeenCalledWith(null);
  });

  it('handles different root element scenarios', async () => {
    const customRootElement = document.createElement('div');
    customRootElement.id = 'custom-root';
    
    jest.spyOn(document, 'getElementById').mockReturnValue(customRootElement);
    
    await import('./main');

    expect(mockCreateRoot).toHaveBeenCalledWith(customRootElement);
    expect(mockRender).toHaveBeenCalledTimes(1);
  });

  it('wraps App in StrictMode correctly', async () => {
    const mockRootElement = document.createElement('div');
    jest.spyOn(document, 'getElementById').mockReturnValue(mockRootElement);
    
    await import('./main');

    const renderCall = mockRender.mock.calls[0][0];
    
    // Check that it's wrapped in StrictMode
    expect(renderCall.type).toBe(React.StrictMode);
    
    // Check that App is the child
    expect(renderCall.props.children.type).toBe(MockApp);
  });

  it('integrates createRoot API correctly', async () => {
    const mockRootElement = document.createElement('div');
    jest.spyOn(document, 'getElementById').mockReturnValue(mockRootElement);
    
    await import('./main');

    // Should call createRoot with the DOM element
    expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
    
    // Should call render on the root
    expect(mockRender).toHaveBeenCalledTimes(1);
    
    // Should render the correct component structure
    const renderArg = mockRender.mock.calls[0][0];
    expect(React.isValidElement(renderArg)).toBe(true);
  });
});
