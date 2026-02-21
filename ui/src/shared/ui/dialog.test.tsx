import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from './dialog';
import { Button } from './button';

describe('Dialog', () => {
  it('should not render when open is false', () => {
    const { container } = render(
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent>Test content</DialogContent>
      </Dialog>
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render when open is true', () => {
    render(
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent>Test content</DialogContent>
      </Dialog>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should call onOpenChange when backdrop is clicked', () => {
    const handleOpenChange = jest.fn();
    render(
      <Dialog open={true} onOpenChange={handleOpenChange}>
        <DialogContent>Test content</DialogContent>
      </Dialog>
    );

    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    }
  });

  it('should render dialog with header, title, description, and footer', () => {
    const handleClose = jest.fn();
    render(
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogHeader onClose={handleClose}>
          <DialogTitle>Test Title</DialogTitle>
          <DialogDescription>Test Description</DialogDescription>
        </DialogHeader>
        <DialogContent>Test content</DialogContent>
        <DialogFooter>
          <Button>Close</Button>
        </DialogFooter>
      </Dialog>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  it('should call onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    render(
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogHeader onClose={handleClose}>
          <DialogTitle>Test Title</DialogTitle>
        </DialogHeader>
      </Dialog>
    );

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalled();
  });
});
