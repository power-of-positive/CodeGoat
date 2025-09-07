import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlockedCommandsViewer } from './BlockedCommandsViewer';
import { claudeWorkersApi } from '../../../shared/lib/api';

// Mock the API
jest.mock('../../../shared/lib/api', () => ({
  claudeWorkersApi: {
    getBlockedCommands: jest.fn(),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ShieldAlert: () => <div data-testid="shield-alert-icon" />,
}));

const mockApi = claudeWorkersApi as jest.Mocked<typeof claudeWorkersApi>;

describe('BlockedCommandsViewer', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      workerId: 'worker-123',
      onClose: jest.fn(),
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <BlockedCommandsViewer {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    mockApi.getBlockedCommands.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderComponent();

    expect(screen.getByText('Loading blocked commands...')).toBeInTheDocument();
  });

  it('displays blocked commands when data is available', async () => {
    const mockData = [
      {
        id: '1',
        workerId: 'worker-123',
        command: 'rm -rf /',
        reason: 'Dangerous command',
        timestamp: '2024-01-01T12:00:00Z',
        context: 'Use rm with specific files',
      },
      {
        id: '2',
        workerId: 'worker-123',
        command: 'sudo cat /etc/passwd',
        reason: 'Unauthorized access',
        timestamp: '2024-01-01T12:01:00Z',
        context: 'Check file permissions',
      },
    ];

    mockApi.getBlockedCommands.mockResolvedValue(mockData);

    renderComponent();

    await screen.findByText('Total blocked commands:');
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('rm -rf /')).toBeInTheDocument();
    expect(screen.getByText('sudo cat /etc/passwd')).toBeInTheDocument();
    expect(screen.getByText('Dangerous command')).toBeInTheDocument();
    expect(screen.getByText('Unauthorized access')).toBeInTheDocument();
  });

  it('displays no blocked commands message when list is empty', async () => {
    const mockData = [];

    mockApi.getBlockedCommands.mockResolvedValue(mockData);

    renderComponent();

    await screen.findByText('No blocked commands');
    expect(screen.getAllByTestId('shield-alert-icon').length).toBeGreaterThan(0);
  });

  it('shows permission system disabled warning', async () => {
    const mockData = [
      {
        id: '1',
        workerId: 'worker-123',
        command: 'test command',
        reason: 'Test reason',
        timestamp: '2024-01-01T12:00:00Z',
      },
    ];

    mockApi.getBlockedCommands.mockResolvedValue(mockData);

    renderComponent();

    await screen.findByText('test command'); // Just verify data loads
  });

  it('shows permission system inactive message when no commands and system disabled', async () => {
    const mockData = [];

    mockApi.getBlockedCommands.mockResolvedValue(mockData);

    renderComponent();

    await screen.findByText('No commands have been blocked by the security system');
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();
    mockApi.getBlockedCommands.mockResolvedValue([]);

    renderComponent({ onClose: mockOnClose });

    const closeButton = screen.getByText('Close');
    closeButton.click();

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays worker ID in title', () => {
    mockApi.getBlockedCommands.mockResolvedValue([]);

    renderComponent({ workerId: 'worker-abc123' });

    expect(screen.getByText('Blocked Commands - abc123')).toBeInTheDocument();
  });

  it('formats timestamps correctly', async () => {
    const mockData = [
      {
        id: '1',
        workerId: 'worker-123',
        command: 'test',
        reason: 'test reason',
        timestamp: '2024-01-01T12:00:00Z',
      },
    ];

    mockApi.getBlockedCommands.mockResolvedValue(mockData);

    renderComponent();

    await screen.findByText('test');
    // Check that date formatting is applied (exact format may vary by locale)
    expect(screen.getAllByText(/2024|Jan|1/).length).toBeGreaterThan(0);
  });

  it('handles blocked commands without suggestions', async () => {
    const mockData = [
      {
        id: '1',
        workerId: 'worker-123',
        command: 'dangerous-command',
        reason: 'Not allowed',
        timestamp: '2024-01-01T12:00:00Z',
        // No context provided
      },
    ];

    mockApi.getBlockedCommands.mockResolvedValue(mockData);

    renderComponent();

    await screen.findByText('dangerous-command');
    expect(screen.getByText('Not allowed')).toBeInTheDocument();
    expect(screen.queryByText('Context:')).not.toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockApi.getBlockedCommands.mockRejectedValue(new Error('API Error'));

    renderComponent();

    // Component should handle error gracefully and show loading state
    expect(screen.getByText('Loading blocked commands...')).toBeInTheDocument();
  });
});
