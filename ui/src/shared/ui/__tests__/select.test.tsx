import { render, screen, fireEvent } from '@testing-library/react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SimpleSelect,
  Option,
} from '../select';

describe('Select Components', () => {
  describe('Select', () => {
    const mockOnValueChange = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render select with trigger and content', () => {
      render(
        <Select value="option1" onValueChange={mockOnValueChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" value="option1" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('option1')).toBeInTheDocument();
    });

    it('should toggle dropdown when trigger is clicked', () => {
      render(
        <Select value="" onValueChange={mockOnValueChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('button');

      // Initially closed - content should not be visible
      expect(screen.queryByText('Option 1')).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(trigger);
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();

      // Click to close
      fireEvent.click(trigger);
      expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
    });

    it('should call onValueChange when item is selected', () => {
      render(
        <Select value="" onValueChange={mockOnValueChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );

      // Open dropdown
      fireEvent.click(screen.getByRole('button'));

      // Select an option
      fireEvent.click(screen.getByText('Option 2'));

      expect(mockOnValueChange).toHaveBeenCalledWith('option2');
    });

    it('should apply custom className', () => {
      render(
        <Select value="" onValueChange={mockOnValueChange} className="custom-select">
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      const selectContainer = screen.getByRole('button').parentElement;
      expect(selectContainer).toHaveClass('custom-select');
    });
  });

  describe('SelectTrigger', () => {
    it('should render trigger button with children', () => {
      render(
        <SelectTrigger>
          <span>Trigger Content</span>
        </SelectTrigger>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Trigger Content')).toBeInTheDocument();
    });

    it('should display chevron down icon', () => {
      render(
        <SelectTrigger>
          <span>Trigger</span>
        </SelectTrigger>
      );

      // ChevronDown icon should be present
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should call setIsOpen when clicked', () => {
      const mockSetIsOpen = jest.fn();

      render(
        <SelectTrigger isOpen={false} setIsOpen={mockSetIsOpen}>
          <span>Click me</span>
        </SelectTrigger>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(mockSetIsOpen).toHaveBeenCalledWith(true);
    });

    it('should apply custom className', () => {
      render(
        <SelectTrigger className="custom-trigger">
          <span>Trigger</span>
        </SelectTrigger>
      );

      expect(screen.getByRole('button')).toHaveClass('custom-trigger');
    });

    it('should have proper accessibility attributes', () => {
      render(
        <SelectTrigger>
          <span>Accessible Trigger</span>
        </SelectTrigger>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  describe('SelectContent', () => {
    it('should not render when closed', () => {
      render(
        <SelectContent isOpen={false}>
          <SelectItem value="option1">Option 1</SelectItem>
        </SelectContent>
      );

      expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
    });

    it('should render when open', () => {
      render(
        <SelectContent isOpen={true}>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      );

      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <SelectContent isOpen={true} className="custom-content">
          <SelectItem value="option1">Option 1</SelectItem>
        </SelectContent>
      );

      const content = screen.getByText('Option 1').parentElement;
      expect(content).toHaveClass('custom-content');
    });

    it('should pass props to child items', () => {
      const mockOnValueChange = jest.fn();
      const mockSetIsOpen = jest.fn();

      render(
        <SelectContent
          isOpen={true}
          value="option1"
          onValueChange={mockOnValueChange}
          setIsOpen={mockSetIsOpen}
        >
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      );

      // Click on option 2
      fireEvent.click(screen.getByText('Option 2'));

      expect(mockOnValueChange).toHaveBeenCalledWith('option2');
      expect(mockSetIsOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('SelectItem', () => {
    it('should render item with children', () => {
      render(
        <SelectItem value="test" currentValue="other">
          Test Item
        </SelectItem>
      );

      expect(screen.getByText('Test Item')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should show selected state when currentValue matches', () => {
      render(
        <SelectItem value="selected" currentValue="selected">
          Selected Item
        </SelectItem>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-50', 'text-blue-700');
    });

    it('should not show selected state when currentValue does not match', () => {
      render(
        <SelectItem value="item1" currentValue="item2">
          Unselected Item
        </SelectItem>
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('bg-blue-50', 'text-blue-700');
    });

    it('should call onSelect when clicked', () => {
      const mockOnSelect = jest.fn();

      render(
        <SelectItem value="clickable" onSelect={mockOnSelect}>
          Clickable Item
        </SelectItem>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(mockOnSelect).toHaveBeenCalledWith('clickable');
    });

    it('should apply custom className', () => {
      render(
        <SelectItem value="item" className="custom-item">
          Custom Item
        </SelectItem>
      );

      expect(screen.getByRole('button')).toHaveClass('custom-item');
    });

    it('should handle missing onSelect gracefully', () => {
      render(<SelectItem value="safe">Safe Item</SelectItem>);

      // Should not crash when clicked without onSelect
      expect(() => {
        fireEvent.click(screen.getByRole('button'));
      }).not.toThrow();
    });
  });

  describe('SelectValue', () => {
    it('should display value when provided', () => {
      render(<SelectValue value="test value" placeholder="placeholder" />);

      expect(screen.getByText('test value')).toBeInTheDocument();
      expect(screen.queryByText('placeholder')).not.toBeInTheDocument();
    });

    it('should display placeholder when value is not provided', () => {
      render(<SelectValue placeholder="Select something" />);

      expect(screen.getByText('Select something')).toBeInTheDocument();
    });

    it('should display placeholder when value is empty', () => {
      render(<SelectValue value="" placeholder="Empty value" />);

      expect(screen.getByText('Empty value')).toBeInTheDocument();
    });

    it('should apply truncate class for long values', () => {
      render(<SelectValue value="Very long value that should be truncated" />);

      const span = screen.getByText('Very long value that should be truncated');
      expect(span).toHaveClass('truncate');
    });
  });

  describe('SimpleSelect', () => {
    it('should render native select element', () => {
      render(
        <SimpleSelect>
          <Option value="option1">Option 1</Option>
          <Option value="option2">Option 2</Option>
        </SimpleSelect>
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <SimpleSelect className="native-select">
          <Option value="option1">Option 1</Option>
        </SimpleSelect>
      );

      expect(screen.getByRole('combobox')).toHaveClass('native-select');
    });

    it('should forward props to select element', () => {
      const mockOnChange = jest.fn();

      render(
        <SimpleSelect value="option1" onChange={mockOnChange}>
          <Option value="option1">Option 1</Option>
          <Option value="option2">Option 2</Option>
        </SimpleSelect>
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('option1');

      fireEvent.change(select, { target: { value: 'option2' } });
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should handle disabled state', () => {
      render(
        <SimpleSelect disabled>
          <Option value="option1">Option 1</Option>
        </SimpleSelect>
      );

      expect(screen.getByRole('combobox')).toBeDisabled();
      expect(screen.getByRole('combobox')).toHaveClass(
        'disabled:cursor-not-allowed',
        'disabled:opacity-50'
      );
    });
  });

  describe('Option', () => {
    it('should render native option element', () => {
      render(
        <SimpleSelect>
          <Option value="test">Test Option</Option>
        </SimpleSelect>
      );

      expect(screen.getByText('Test Option')).toBeInTheDocument();
      const option = screen.getByText('Test Option') as HTMLOptionElement;
      expect(option.value).toBe('test');
    });

    it('should forward props to option element', () => {
      render(
        <SimpleSelect>
          <Option value="disabled-option" disabled>
            Disabled Option
          </Option>
        </SimpleSelect>
      );

      const option = screen.getByText('Disabled Option') as HTMLOptionElement;
      expect(option).toBeDisabled();
    });
  });

  describe('Integration tests', () => {
    it('should work as complete select component', () => {
      const mockOnValueChange = jest.fn();

      render(
        <Select value="" onValueChange={mockOnValueChange}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="red">Red</SelectItem>
            <SelectItem value="green">Green</SelectItem>
            <SelectItem value="blue">Blue</SelectItem>
          </SelectContent>
        </Select>
      );

      // Should show placeholder initially
      expect(screen.getByText('Choose an option')).toBeInTheDocument();

      // Open dropdown
      fireEvent.click(screen.getByRole('button'));

      // Should show all options
      expect(screen.getByText('Red')).toBeInTheDocument();
      expect(screen.getByText('Green')).toBeInTheDocument();
      expect(screen.getByText('Blue')).toBeInTheDocument();

      // Select green
      fireEvent.click(screen.getByText('Green'));

      // Should call onChange and close dropdown
      expect(mockOnValueChange).toHaveBeenCalledWith('green');
    });

    it('should show selected value in trigger', () => {
      render(
        <Select value="selected" onValueChange={() => {}}>
          <SelectTrigger>
            <SelectValue placeholder="Choose" value="selected" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="selected">Selected Option</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('selected')).toBeInTheDocument();
    });

    it('should handle complex children structures', () => {
      render(
        <Select value="" onValueChange={() => {}}>
          <SelectTrigger>
            <div>
              <SelectValue placeholder="Complex trigger" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <div>
              <SelectItem value="nested">
                <span>Nested Item</span>
              </SelectItem>
            </div>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Complex trigger')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Nested Item')).toBeInTheDocument();
    });
  });
});
