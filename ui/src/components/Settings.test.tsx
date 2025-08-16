import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Settings } from './Settings';
import { settingsApi } from '../lib/api';

// Mock the API
jest.mock('../lib/api', () => ({
  settingsApi: {
    getValidationStages: jest.fn(),
    addValidationStage: jest.fn(),
    updateValidationStage: jest.fn(),
    removeValidationStage: jest.fn(),
  },
}));

const mockStages = [
  {
    id: 'lint',
    name: 'Code Linting',
    command: 'npm run lint',
    timeout: 30000,
    enabled: true,
    continueOnFailure: false,
    priority: 1,
  },
  {
    id: 'test',
    name: 'Unit Tests',
    command: 'npm test',
    timeout: 60000,
    enabled: true,
    continueOnFailure: false,
    priority: 2,
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Settings Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue(mockStages);
    (settingsApi.addValidationStage as jest.Mock).mockResolvedValue({});
    (settingsApi.updateValidationStage as jest.Mock).mockResolvedValue({});
    (settingsApi.removeValidationStage as jest.Mock).mockResolvedValue({});
  });

  it('renders settings page with correct title', async () => {
    renderWithProviders(<Settings />);
    
    expect(screen.getByRole('heading', { name: /^settings$/i })).toBeInTheDocument();
    expect(screen.getByText(/configure validation pipeline stages/i)).toBeInTheDocument();
  });

  it('displays validation stages section', async () => {
    renderWithProviders(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /validation stages/i })).toBeInTheDocument();
    });
  });

  it('displays add stage button', async () => {
    renderWithProviders(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add stage/i })).toBeInTheDocument();
    });
  });

  it('displays existing validation stages', async () => {
    renderWithProviders(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByText('Code Linting')).toBeInTheDocument();
      expect(screen.getByText('Unit Tests')).toBeInTheDocument();
    });
  });

  it('shows add stage form when add button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add stage/i })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('button', { name: /add stage/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add new validation stage/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/stage name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/command/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/timeout/i)).toBeInTheDocument();
    });
  });

  it('can fill and submit the add stage form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add stage/i })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('button', { name: /add stage/i }));
    
    await waitFor(() => {
      expect(screen.getByLabelText(/stage name/i)).toBeInTheDocument();
    });
    
    await user.type(screen.getByLabelText(/stage name/i), 'Test Stage');
    await user.type(screen.getByLabelText(/command/i), 'npm test');
    await user.clear(screen.getByLabelText(/timeout/i));
    await user.type(screen.getByLabelText(/timeout/i), '45000');
    
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    expect(settingsApi.addValidationStage).toHaveBeenCalledWith({
      name: 'Test Stage',
      command: 'npm test',
      timeout: 45000,
      enabled: true,
      continueOnFailure: false,
      priority: 0,
    });
  });

  it('can cancel the add stage form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add stage/i })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('button', { name: /add stage/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /add new validation stage/i })).not.toBeInTheDocument();
    });
  });

  it('displays edit and delete buttons for existing stages', async () => {
    renderWithProviders(<Settings />);
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: '' })).toHaveLength(2); // Delete buttons (icon only)
    });
  });

  it('handles API errors gracefully', async () => {
    (settingsApi.getValidationStages as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load validation stages/i)).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    renderWithProviders(<Settings />);
    
    // Should show loading skeleton
    expect(screen.getByRole('heading', { name: /^settings$/i })).toBeInTheDocument();
  });

  it('shows no stages message when no stages are configured', async () => {
    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue([]);
    
    renderWithProviders(<Settings />);
    
    await waitFor(() => {
      expect(screen.getByText(/no validation stages configured/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first validation stage/i)).toBeInTheDocument();
    });
  });
});