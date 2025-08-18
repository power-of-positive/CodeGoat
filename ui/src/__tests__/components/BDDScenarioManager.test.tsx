import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BDDScenarioManager } from '../../components/BDDScenarioManager';
import { BDDScenario } from '../../../shared/types';

const mockScenarios: BDDScenario[] = [
  {
    id: '1',
    title: 'User creates a new task',
    feature: 'Task Management',
    description: 'Testing task creation flow',
    gherkinContent: `Feature: Task Management
  As a user
  I want to create new tasks
  So that I can track my work

Scenario: User creates a new task
  Given I am on the task board
  When I click "Add Task"
  And I fill in the task details
  Then a new task should be created`,
    status: 'pending',
    executedAt: undefined,
    executionDuration: undefined,
    errorMessage: undefined,
  },
  {
    id: '2',
    title: 'User updates task status',
    feature: 'Task Management',
    description: 'Testing task status updates',
    gherkinContent: `Feature: Task Management
  As a user
  I want to update task status
  So that I can track progress

Scenario: User updates task status
  Given I have a pending task
  When I change the status to "in_progress"
  Then the task should be updated`,
    status: 'passed',
    executedAt: '2023-10-01T10:00:00Z',
    executionDuration: 1500,
    errorMessage: undefined,
  },
];

const mockHandlers = {
  onAddScenario: jest.fn(),
  onUpdateScenario: jest.fn(),
  onDeleteScenario: jest.fn(),
};

describe('BDDScenarioManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no scenarios exist', () => {
    render(
      <BDDScenarioManager
        scenarios={[]}
        onAddScenario={mockHandlers.onAddScenario}
        onUpdateScenario={mockHandlers.onUpdateScenario}
        onDeleteScenario={mockHandlers.onDeleteScenario}
      />
    );

    expect(screen.getByText('No BDD Scenarios')).toBeInTheDocument();
    expect(screen.getByText(/Add BDD scenarios to document and test/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add First Scenario/ })).toBeInTheDocument();
  });

  it('renders scenarios when they exist', () => {
    render(
      <BDDScenarioManager
        scenarios={mockScenarios}
        onAddScenario={mockHandlers.onAddScenario}
        onUpdateScenario={mockHandlers.onUpdateScenario}
        onDeleteScenario={mockHandlers.onDeleteScenario}
      />
    );

    expect(screen.getByText('User creates a new task')).toBeInTheDocument();
    expect(screen.getByText('User updates task status')).toBeInTheDocument();
    expect(screen.getAllByText(/Feature: Task Management/)).toHaveLength(2);
  });

  it('displays scenario status badges correctly', () => {
    render(
      <BDDScenarioManager
        scenarios={mockScenarios}
        onAddScenario={mockHandlers.onAddScenario}
        onUpdateScenario={mockHandlers.onUpdateScenario}
        onDeleteScenario={mockHandlers.onDeleteScenario}
      />
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
  });

  it('shows scenario statistics', () => {
    render(
      <BDDScenarioManager
        scenarios={mockScenarios}
        onAddScenario={mockHandlers.onAddScenario}
        onUpdateScenario={mockHandlers.onUpdateScenario}
        onDeleteScenario={mockHandlers.onDeleteScenario}
      />
    );

    expect(screen.getByText('Pending: 1')).toBeInTheDocument();
    expect(screen.getByText('Passed: 1')).toBeInTheDocument();
  });

  it('opens form when "Add Scenario" button is clicked', () => {
    render(
      <BDDScenarioManager
        scenarios={[]}
        onAddScenario={mockHandlers.onAddScenario}
        onUpdateScenario={mockHandlers.onUpdateScenario}
        onDeleteScenario={mockHandlers.onDeleteScenario}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add First Scenario/ });
    fireEvent.click(addButton);

    expect(screen.getByText('Create New BDD Scenario')).toBeInTheDocument();
    expect(screen.getByLabelText('Scenario Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Feature Name')).toBeInTheDocument();
  });

  it('can expand and collapse gherkin content', () => {
    render(
      <BDDScenarioManager
        scenarios={mockScenarios}
        onAddScenario={mockHandlers.onAddScenario}
        onUpdateScenario={mockHandlers.onUpdateScenario}
        onDeleteScenario={mockHandlers.onDeleteScenario}
      />
    );

    const showGherkinButtons = screen.getAllByText('Show Gherkin Content');
    expect(showGherkinButtons).toHaveLength(2);

    fireEvent.click(showGherkinButtons[0]);
    
    expect(screen.getByText('Hide Gherkin Content')).toBeInTheDocument();
    expect(screen.getByText(/Given I am on the task board/)).toBeInTheDocument();
  });

  it('calls onAddScenario when form is submitted', async () => {
    render(
      <BDDScenarioManager
        scenarios={[]}
        onAddScenario={mockHandlers.onAddScenario}
        onUpdateScenario={mockHandlers.onUpdateScenario}
        onDeleteScenario={mockHandlers.onDeleteScenario}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add First Scenario/ });
    fireEvent.click(addButton);

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByText('Create New BDD Scenario')).toBeInTheDocument();
    });

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Scenario Title'), {
      target: { value: 'Test scenario' },
    });
    fireEvent.change(screen.getByLabelText('Feature Name'), {
      target: { value: 'Test feature' },
    });
    fireEvent.change(screen.getByLabelText('Gherkin Content'), {
      target: { value: 'Given test\nWhen test\nThen test' },
    });

    // Find and click the submit button
    const addScenarioButtons = screen.getAllByText('Add Scenario');
    const submitButton = addScenarioButtons.find(button => 
      (button as HTMLElement).closest('form')
    );
    
    expect(submitButton).toBeDefined();
    if (submitButton) {
      fireEvent.click(submitButton);
    }

    await waitFor(() => {
      expect(mockHandlers.onAddScenario).toHaveBeenCalledWith({
        title: 'Test scenario',
        feature: 'Test feature',
        description: '',
        gherkinContent: 'Given test\nWhen test\nThen test',
        status: 'pending',
      });
    });
  });

  it('calls onDeleteScenario when delete button is clicked', () => {
    render(
      <BDDScenarioManager
        scenarios={mockScenarios}
        onAddScenario={mockHandlers.onAddScenario}
        onUpdateScenario={mockHandlers.onUpdateScenario}
        onDeleteScenario={mockHandlers.onDeleteScenario}
      />
    );

    // Find buttons by their specific class patterns or data attributes
    const allButtons = screen.getAllByRole('button');
    const deleteButtons = allButtons.filter(button => 
      button.innerHTML.includes('trash-2') || button.className.includes('destructive')
    );
    
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      expect(mockHandlers.onDeleteScenario).toHaveBeenCalledWith('1');
    } else {
      // Skip test if delete buttons not found with expected structure
      expect(deleteButtons.length).toBeGreaterThan(0);
    }
  });

  it('disables actions when readonly is true', () => {
    render(
      <BDDScenarioManager
        scenarios={mockScenarios}
        onAddScenario={mockHandlers.onAddScenario}
        onUpdateScenario={mockHandlers.onUpdateScenario}
        onDeleteScenario={mockHandlers.onDeleteScenario}
        readonly={true}
      />
    );

    expect(screen.queryByText('Add Scenario')).not.toBeInTheDocument();
    
    // Check that edit and delete buttons are not present by looking for their characteristic classes
    const allButtons = screen.queryAllByRole('button');
    const editButtons = allButtons.filter(button =>
      button.innerHTML.includes('edit') || button.className.includes('outline')
    );
    const deleteButtons = allButtons.filter(button =>
      button.innerHTML.includes('trash-2') || button.className.includes('destructive')
    );
    
    // In readonly mode, there should be no edit/delete buttons
    expect(editButtons.filter(btn => btn.innerHTML.includes('edit'))).toHaveLength(0);
    expect(deleteButtons.filter(btn => btn.innerHTML.includes('trash-2'))).toHaveLength(0);
  });

  it('shows execution details for completed scenarios', () => {
    render(
      <BDDScenarioManager
        scenarios={mockScenarios}
        onAddScenario={mockHandlers.onAddScenario}
        onUpdateScenario={mockHandlers.onUpdateScenario}
        onDeleteScenario={mockHandlers.onDeleteScenario}
      />
    );

    expect(screen.getByText(/Executed:/)).toBeInTheDocument();
    expect(screen.getByText(/Duration: 1500ms/)).toBeInTheDocument();
  });

  it('provides Gherkin template in form placeholder', () => {
    render(
      <BDDScenarioManager
        scenarios={[]}
        onAddScenario={mockHandlers.onAddScenario}
        onUpdateScenario={mockHandlers.onUpdateScenario}
        onDeleteScenario={mockHandlers.onDeleteScenario}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add First Scenario/ });
    fireEvent.click(addButton);

    // Wait for form to appear and find textarea
    const gherkinTextareas = screen.getAllByRole('textbox');
    const gherkinTextarea = gherkinTextareas.find(textarea => 
      textarea.getAttribute('placeholder')?.includes('Feature:')
    );
    
    expect(gherkinTextarea).toBeDefined();
    if (gherkinTextarea) {
      expect(gherkinTextarea.getAttribute('placeholder')).toContain('Feature:');
      expect(gherkinTextarea.getAttribute('placeholder')).toContain('Scenario:');
      expect(gherkinTextarea.getAttribute('placeholder')).toContain('Given');
      expect(gherkinTextarea.getAttribute('placeholder')).toContain('When');
      expect(gherkinTextarea.getAttribute('placeholder')).toContain('Then');
    }
  });
});