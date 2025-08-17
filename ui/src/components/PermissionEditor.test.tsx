import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissionEditor } from './PermissionEditor';
import { permissionApi } from '../lib/api';
import { ActionType, PermissionScope } from '../../shared/types';

// Mock the API
jest.mock('../lib/api', () => ({
  permissionApi: {
    getConfig: jest.fn(),
    getRules: jest.fn(),
    getDefaultConfigs: jest.fn(),
    createRule: jest.fn(),
    updateRule: jest.fn(),
    deleteRule: jest.fn(),
    testPermission: jest.fn(),
    updateConfig: jest.fn(),
  },
}));

const mockPermissionApi = permissionApi as any;

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('PermissionEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockPermissionApi.getConfig.mockResolvedValue({
      defaultAllow: false,
      enableLogging: true,
      strictMode: true,
      rules: []
    });
    
    mockPermissionApi.getRules.mockResolvedValue([
      {
        id: '1',
        action: ActionType.FILE_READ,
        scope: PermissionScope.WORKTREE,
        allowed: true,
        reason: 'Allow file reading in worktree',
        priority: 100
      }
    ]);
    
    mockPermissionApi.getDefaultConfigs.mockResolvedValue({
      restrictive: {
        defaultAllow: false,
        enableLogging: true,
        strictMode: true,
        rules: []
      },
      permissive: {
        defaultAllow: true,
        enableLogging: false,
        strictMode: false,
        rules: []
      },
      development: {
        defaultAllow: true,
        enableLogging: true,
        strictMode: false,
        rules: []
      }
    });
  });

  it('renders permission editor with header', async () => {
    renderWithQueryClient(<PermissionEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('Permission Editor')).toBeInTheDocument();
      expect(screen.getByText('Configure security permissions for the Claude executor')).toBeInTheDocument();
    });
  });

  it('displays global configuration options', async () => {
    renderWithQueryClient(<PermissionEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('Global Configuration')).toBeInTheDocument();
      expect(screen.getByText('Default Allow')).toBeInTheDocument();
      expect(screen.getByText('Enable Logging')).toBeInTheDocument();
      expect(screen.getByText('Strict Mode')).toBeInTheDocument();
    });
  });

  it('displays permission rules list', async () => {
    renderWithQueryClient(<PermissionEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('Permission Rules (1)')).toBeInTheDocument();
      expect(screen.getByText('file read')).toBeInTheDocument();
      expect(screen.getByText('Allow file reading in worktree')).toBeInTheDocument();
    });
  });

  it('shows add rule button', async () => {
    renderWithQueryClient(<PermissionEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Rule')).toBeInTheDocument();
    });
  });

  it('opens create form when add rule is clicked', async () => {
    renderWithQueryClient(<PermissionEditor />);
    
    await waitFor(() => {
      const addButton = screen.getByText('Add Rule');
      fireEvent.click(addButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Create New Rule')).toBeInTheDocument();
      expect(screen.getByLabelText('Action')).toBeInTheDocument();
      expect(screen.getByLabelText('Scope')).toBeInTheDocument();
      expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    });
  });

  it('shows test permission button', async () => {
    renderWithQueryClient(<PermissionEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Permission')).toBeInTheDocument();
    });
  });

  it('opens test form when test permission is clicked', async () => {
    renderWithQueryClient(<PermissionEditor />);
    
    await waitFor(() => {
      const testButton = screen.getByRole('button', { name: /test permission/i });
      fireEvent.click(testButton);
    });
    
    await waitFor(() => {
      expect(screen.getByLabelText('Action')).toBeInTheDocument();
    });
  });

  it('displays default configuration options', async () => {
    renderWithQueryClient(<PermissionEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('Load Default Configuration:')).toBeInTheDocument();
      expect(screen.getByText('restrictive')).toBeInTheDocument();
      expect(screen.getByText('permissive')).toBeInTheDocument();
      expect(screen.getByText('development')).toBeInTheDocument();
    });
  });

  it('handles create rule form submission', async () => {
    mockPermissionApi.createRule.mockResolvedValue({
      id: '2',
      action: ActionType.FILE_WRITE,
      scope: PermissionScope.GLOBAL,
      allowed: false,
      reason: 'Test rule',
      priority: 200
    });

    renderWithQueryClient(<PermissionEditor />);
    
    // Open create form
    await waitFor(() => {
      const addButton = screen.getByText('Add Rule');
      fireEvent.click(addButton);
    });
    
    // Fill form
    await waitFor(() => {
      const actionSelect = screen.getByLabelText('Action');
      fireEvent.change(actionSelect, { target: { value: ActionType.FILE_WRITE } });
      
      const denyRadio = screen.getByLabelText('Deny');
      fireEvent.click(denyRadio);
      
      const priorityInput = screen.getByLabelText('Priority');
      fireEvent.change(priorityInput, { target: { value: '200' } });
      
      const reasonTextarea = screen.getByLabelText('Reason (optional)');
      fireEvent.change(reasonTextarea, { target: { value: 'Test rule' } });
    });
    
    // Submit form
    await waitFor(() => {
      const createButton = screen.getByText('Create Rule');
      fireEvent.click(createButton);
    });
    
    await waitFor(() => {
      expect(mockPermissionApi.createRule).toHaveBeenCalledWith({
        action: ActionType.FILE_WRITE,
        scope: PermissionScope.GLOBAL,
        allowed: false,
        reason: 'Test rule',
        priority: 200
      });
    });
  });

  it('handles permission testing', async () => {
    mockPermissionApi.testPermission.mockResolvedValue({
      allowed: true,
      reason: 'Allowed by default configuration'
    });

    renderWithQueryClient(<PermissionEditor />);
    
    // Open test form
    await waitFor(() => {
      const testButton = screen.getByText('Test Permission');
      fireEvent.click(testButton);
    });
    
    // Fill test form
    await waitFor(() => {
      const actionSelect = screen.getByLabelText('Action');
      fireEvent.change(actionSelect, { target: { value: ActionType.FILE_READ } });
      
      const targetInput = screen.getByLabelText('Target (optional)');
      fireEvent.change(targetInput, { target: { value: '/tmp/test.txt' } });
    });
    
    // Submit test
    await waitFor(() => {
      const testSubmitButton = screen.getByTestId('test-permission-submit');
      fireEvent.click(testSubmitButton);
    });
    
    await waitFor(() => {
      expect(mockPermissionApi.testPermission).toHaveBeenCalledWith({
        action: ActionType.FILE_READ,
        target: '/tmp/test.txt'
      });
    });
  });

  it('displays loading state', () => {
    mockPermissionApi.getConfig.mockReturnValue(new Promise(() => {})); // Never resolves
    mockPermissionApi.getRules.mockReturnValue(new Promise(() => {})); // Never resolves
    
    renderWithQueryClient(<PermissionEditor />);
    
    expect(screen.getByText('Loading permissions configuration...')).toBeInTheDocument();
  });

  it('shows empty state when no rules exist', async () => {
    mockPermissionApi.getRules.mockResolvedValue([]);
    
    renderWithQueryClient(<PermissionEditor />);
    
    await waitFor(() => {
      expect(screen.getByText('No permission rules configured. Add a rule to get started.')).toBeInTheDocument();
    });
  });

  it('sorts rules by priority', async () => {
    mockPermissionApi.getRules.mockResolvedValue([
      {
        id: '1',
        action: ActionType.FILE_READ,
        scope: PermissionScope.WORKTREE,
        allowed: true,
        priority: 100
      },
      {
        id: '2',
        action: ActionType.FILE_WRITE,
        scope: PermissionScope.GLOBAL,
        allowed: false,
        priority: 200
      }
    ]);
    
    renderWithQueryClient(<PermissionEditor />);
    
    await waitFor(() => {
      const rules = screen.getAllByText(/Priority:/);
      expect(rules[0]).toHaveTextContent('Priority: 200');
      expect(rules[1]).toHaveTextContent('Priority: 100');
    });
  });

  it('handles configuration updates', async () => {
    mockPermissionApi.updateConfig.mockResolvedValue({
      defaultAllow: true,
      enableLogging: true,
      strictMode: true,
      rules: []
    });

    renderWithQueryClient(<PermissionEditor />);
    
    await waitFor(() => {
      const defaultAllowCheckbox = screen.getByLabelText('Default Allow');
      fireEvent.click(defaultAllowCheckbox);
    });
    
    await waitFor(() => {
      expect(mockPermissionApi.updateConfig).toHaveBeenCalledWith({
        defaultAllow: true
      });
    });
  });
});