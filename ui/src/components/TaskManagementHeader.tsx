import React from 'react';
import { Plus, Table, Grid3X3, Trash2 } from 'lucide-react';
import { Button } from '../shared/ui/button';
import { Badge } from '../shared/ui/badge';

type ViewMode = 'table' | 'grid';

interface TaskManagementHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onShowCreateForm: () => void;
  selectedTasksCount: number;
  onBulkDelete: () => void;
  tasksCount: number;
  filteredTasksCount: number;
}

export function TaskManagementHeader({
  viewMode,
  onViewModeChange,
  onShowCreateForm,
  selectedTasksCount,
  onBulkDelete,
  tasksCount,
  filteredTasksCount,
}: TaskManagementHeaderProps) {
  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
            <p className="text-gray-600 mt-1">
              Showing {filteredTasksCount} of {tasksCount} tasks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onShowCreateForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('table')}
            >
              <Table className="w-4 h-4 mr-2" />
              Table
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Grid
            </Button>
          </div>

          {selectedTasksCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedTasksCount} selected
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={onBulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}