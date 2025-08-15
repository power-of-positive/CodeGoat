// Tab types for task details and other tabbed interfaces
export type TabType = 
  | 'overview' 
  | 'logs' 
  | 'processes' 
  | 'files' 
  | 'diff' 
  | 'settings'
  | 'details'
  | 'templates'
  | 'attempts';

export interface TabConfig {
  id: TabType;
  label: string;
  icon?: string;
  disabled?: boolean;
  badge?: string | number;
}