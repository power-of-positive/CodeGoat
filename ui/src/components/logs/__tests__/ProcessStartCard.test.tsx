import { render, screen } from '@testing-library/react';
import ProcessStartCard from '../ProcessStartCard';

describe('ProcessStartCard', () => {
  const basePayload = {
    runReason: 'codingagent',
    startedAt: '2024-01-01T12:30:45Z',
    status: 'running' as const
  };

  it('should render basic process information', () => {
    render(<ProcessStartCard payload={basePayload} />);
    
    expect(screen.getByText('Coding Agent')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
  });

  it('should format and display start time', () => {
    render(<ProcessStartCard payload={basePayload} />);
    
    // Should display formatted time (exact format depends on locale)
    const timeElement = screen.getByText(new Date(basePayload.startedAt).toLocaleTimeString());
    expect(timeElement).toBeInTheDocument();
  });

  it('should display process ID when provided', () => {
    const payloadWithPID = { ...basePayload, processId: 'process-123' };
    
    render(<ProcessStartCard payload={payloadWithPID} />);
    
    expect(screen.getByText('PID: process-123')).toBeInTheDocument();
  });

  it('should not display process ID when not provided', () => {
    render(<ProcessStartCard payload={basePayload} />);
    
    expect(screen.queryByText(/PID:/)).not.toBeInTheDocument();
  });

  describe('process types and icons', () => {
    const processTypes = [
      { runReason: 'setupscript', label: 'Setup Script' },
      { runReason: 'cleanupscript', label: 'Cleanup Script' },
      { runReason: 'codingagent', label: 'Coding Agent' },
      { runReason: 'devserver', label: 'Dev Server' },
      { runReason: 'worker', label: 'Claude Worker' },
      { runReason: 'unknown', label: 'Unknown' } // Test default case
    ];

    processTypes.forEach(({ runReason, label }) => {
      it(`should render correct label for ${runReason}`, () => {
        const payload = { ...basePayload, runReason };
        
        render(<ProcessStartCard payload={payload} />);
        
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  describe('status colors and styling', () => {
    const statuses = [
      { status: 'running', expectedClasses: ['bg-blue-100', 'text-blue-700'] },
      { status: 'completed', expectedClasses: ['bg-green-100', 'text-green-700'] },
      { status: 'failed', expectedClasses: ['bg-red-100', 'text-red-700'] },
      { status: 'pending', expectedClasses: ['bg-gray-100', 'text-gray-700'] }
    ] as const;

    statuses.forEach(({ status, expectedClasses }) => {
      it(`should apply correct styling for ${status} status`, () => {
        const payload = { ...basePayload, status };
        
        render(<ProcessStartCard payload={payload} />);
        
        const statusElement = screen.getByText(status);
        expectedClasses.forEach(className => {
          expect(statusElement).toHaveClass(className);
        });
      });
    });
  });

  it('should apply correct container styling', () => {
    const { container } = render(<ProcessStartCard payload={basePayload} />);
    
    const outerContainer = container.querySelector('.px-4');
    expect(outerContainer).toHaveClass('px-4', 'pt-4', 'pb-2');
    
    const card = container.querySelector('.bg-muted\\/50');
    expect(card).toHaveClass(
      'bg-muted/50',
      'border',
      'border-border',
      'rounded-lg',
      'p-2'
    );
  });

  it('should handle custom run reason with capitalization', () => {
    const payload = { ...basePayload, runReason: 'customprocess' };
    
    render(<ProcessStartCard payload={payload} />);
    
    expect(screen.getByText('Customprocess')).toBeInTheDocument();
  });

  it('should handle empty run reason', () => {
    const payload = { ...basePayload, runReason: '' };
    
    render(<ProcessStartCard payload={payload} />);
    
    // Should render empty string capitalized (just empty) - look for span with font-medium class
    const labelSpan = screen.getByText('running').parentElement?.parentElement?.querySelector('.font-medium');
    expect(labelSpan).toBeInTheDocument();
    expect(labelSpan?.textContent).toBe('');
  });

  it('should handle invalid date gracefully', () => {
    const payload = { ...basePayload, startedAt: 'invalid-date' };
    
    render(<ProcessStartCard payload={payload} />);
    
    // Should not crash, time display might show "Invalid Date" or similar
    expect(screen.getByText('Coding Agent')).toBeInTheDocument();
  });

  it('should display all icons for different process types', () => {
    const processTypes = ['setupscript', 'cleanupscript', 'codingagent', 'devserver', 'worker'];
    
    processTypes.forEach(runReason => {
      const { unmount } = render(<ProcessStartCard payload={{ ...basePayload, runReason }} />);
      
      // Icon should be present (we can't easily test specific icons, but container should have proper structure)
      const iconContainer = screen.getByText(runReason === 'setupscript' ? 'Setup Script' : 
                                           runReason === 'cleanupscript' ? 'Cleanup Script' :
                                           runReason === 'codingagent' ? 'Coding Agent' :
                                           runReason === 'devserver' ? 'Dev Server' :
                                           'Claude Worker').parentElement;
      expect(iconContainer).toBeInTheDocument();
      
      unmount();
    });
  });
});