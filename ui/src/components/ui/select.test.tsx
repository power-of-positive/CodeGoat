import { render, screen } from '@testing-library/react';
import { SimpleSelect as Select, Option } from './select';

describe('Select', () => {
  it('renders select element with options', () => {
    render(
      <Select data-testid="test-select">
        <Option value="option1">Option 1</Option>
        <Option value="option2">Option 2</Option>
      </Select>
    );

    const select = screen.getByTestId('test-select');
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Option 1');
    expect(options[1]).toHaveTextContent('Option 2');
  });

  it('applies custom className', () => {
    render(
      <Select className="custom-class" data-testid="test-select">
        <Option value="test">Test</Option>
      </Select>
    );

    const select = screen.getByTestId('test-select');
    expect(select).toHaveClass('custom-class');
  });

  it('forwards props to select element', () => {
    render(
      <Select defaultValue="option2" data-testid="test-select">
        <Option value="option1">Option 1</Option>
        <Option value="option2">Option 2</Option>
      </Select>
    );

    const select = screen.getByTestId('test-select') as HTMLSelectElement;
    expect(select.value).toBe('option2');
  });
});

describe('Option', () => {
  it('renders option with correct value and text', () => {
    render(
      <select>
        <Option value="test-value">Test Text</Option>
      </select>
    );

    const option = screen.getByRole('option');
    expect(option).toHaveAttribute('value', 'test-value');
    expect(option).toHaveTextContent('Test Text');
  });

  it('forwards props to option element', () => {
    render(
      <select>
        <Option value="test" disabled>
          Disabled Option
        </Option>
      </select>
    );

    const option = screen.getByRole('option');
    expect(option).toBeDisabled();
  });
});
