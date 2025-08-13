import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export interface KeyboardShortcutsConfig {
  navigate: ReturnType<typeof useNavigate>;
  currentPath: string;
  hasOpenDialog?: boolean;
  closeDialog?: () => void;
  onC?: () => void;
  onEscape?: () => void;
  onEnter?: () => void;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const { navigate, currentPath, hasOpenDialog, closeDialog, onC, onEscape, onEnter } = config;

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Handle global shortcuts
      if (event.key === 'Escape') {
        if (hasOpenDialog && closeDialog) {
          closeDialog();
          return;
        }
      }

      if (event.key === 'Enter') {
        if (onEnter) {
          event.preventDefault();
          onEnter();
          return;
        }
      }

      // Handle shortcuts with modifiers
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault();
            // Could implement search/command palette
            break;
        }
        return;
      }

      // Handle letter shortcuts (only if no modifiers and not in dialog)
      if (!hasOpenDialog) {
        switch (event.key.toLowerCase()) {
          case 'c':
            if (onC) {
              event.preventDefault();
              onC();
            }
            break;
          case 'p':
            event.preventDefault();
            navigate('/projects');
            break;
          case 'd':
            event.preventDefault();
            navigate('/dashboard');
            break;
          case 'l':
            event.preventDefault();
            navigate('/logs');
            break;
          case 'a':
            event.preventDefault();
            navigate('/analytics');
            break;
          case 's':
            event.preventDefault();
            navigate('/settings');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [navigate, currentPath, hasOpenDialog, closeDialog, onC, onEscape, onEnter]);
}

export function useDialogKeyboardShortcuts(closeDialog: () => void) {
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDialog();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [closeDialog]);
}

// Kanban keyboard navigation hook
export function useKanbanKeyboardNavigation() {
  // Placeholder implementation
  return {
    handleKeyDown: (event: KeyboardEvent) => {
      console.log('Kanban keyboard navigation:', event.key);
    }
  };
}