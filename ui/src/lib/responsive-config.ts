// Responsive configuration utilities for Kanban layout

export function getMainContainerClasses(isPanelOpen: boolean): string {
  return isPanelOpen 
    ? 'flex flex-row h-screen overflow-hidden'
    : 'w-full h-screen overflow-auto';
}

export function getKanbanSectionClasses(isPanelOpen: boolean): string {
  return isPanelOpen
    ? 'flex-1 min-w-0 overflow-auto border-r border-gray-200 dark:border-gray-800'
    : 'w-full';
}

export function getPanelClasses(isPanelOpen: boolean): string {
  return isPanelOpen
    ? 'w-96 flex-shrink-0 overflow-auto bg-white dark:bg-gray-900'
    : 'hidden';
}

export function getTaskCardClasses(isDragging?: boolean): string {
  const baseClasses = 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-2 cursor-grab';
  const draggingClasses = isDragging ? 'opacity-50 rotate-1 scale-105' : '';
  return `${baseClasses} ${draggingClasses}`.trim();
}

export function getKanbanColumnClasses(): string {
  return 'bg-gray-50 dark:bg-gray-800 rounded-lg p-3 min-h-96 w-80';
}

export function getKanbanBoardClasses(): string {
  return 'flex gap-4 p-4 overflow-x-auto min-h-96';
}

// Additional missing exports
export function getBackdropClasses(isOpen: boolean): string {
  return isOpen 
    ? 'fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden'
    : 'hidden';
}

export function getTaskPanelClasses(isOpen: boolean): string {
  return isOpen
    ? 'fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-xl z-50 transform translate-x-0 md:relative md:translate-x-0 md:w-96 md:shadow-none'
    : 'transform translate-x-full md:w-0 md:overflow-hidden';
}