import React from 'react';
import {
  SortAsc,
  SortDesc,
  Edit,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent } from '../shared/ui/card';
import { Badge } from '../shared/ui/badge';
import { Button } from '../shared/ui/button';
import { Task } from '../shared/types/index';

interface SortConfig {
  field: keyof Task | 'createdAt';
  direction: 'asc' | 'desc';
}

interface TaskTableProps {
  tasks: Task[];
  sortConfig: SortConfig;
  onSort: (field: keyof Task | 'createdAt') => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartWorker: (task: Task) => void;
  selectedTasks: string[];
  onTaskSelect: (taskId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800 border-gray-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-red-100 text-red-800 border-red-300',
} as const;

const statusConfig = {
  pending: {
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: AlertCircle,
    label: 'Pending',
  },
  in_progress: {
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Play,
    label: 'In Progress',
  },
  completed: {
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle,
    label: 'Completed',
  },
} as const;

export function TaskTable({
  tasks,
  sortConfig,
  onSort,
  onEdit,
  onDelete,
  onStartWorker,
  selectedTasks,
  onTaskSelect,
  onSelectAll,
}: TaskTableProps) {
  const getSortIcon = (field: keyof Task | 'createdAt') => {
    if (sortConfig.field !== field) {
      return <SortAsc className="h-4 w-4 opacity-0 group-hover:opacity-50" />;
    }
    return sortConfig.direction === 'asc' ? (
      <SortAsc className="h-4 w-4 text-blue-600" />
    ) : (
      <SortDesc className="h-4 w-4 text-blue-600" />
    );
  };

  const allSelected = tasks.length > 0 && selectedTasks.length === tasks.length;
  const someSelected = selectedTasks.length > 0;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-12 p-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = someSelected && !allSelected;
                      }
                    }}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </th>
                <th
                  className="text-left p-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 group"
                  onClick={() => onSort('id')}
                >
                  <div className="flex items-center gap-1">
                    ID
                    {getSortIcon('id')}
                  </div>
                </th>
                <th
                  className="text-left p-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 group"
                  onClick={() => onSort('content')}
                >
                  <div className="flex items-center gap-1">
                    Content
                    {getSortIcon('content')}
                  </div>
                </th>
                <th
                  className="text-left p-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 group"
                  onClick={() => onSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {getSortIcon('status')}
                  </div>
                </th>
                <th
                  className="text-left p-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 group"
                  onClick={() => onSort('priority')}
                >
                  <div className="flex items-center gap-1">
                    Priority
                    {getSortIcon('priority')}
                  </div>
                </th>
                <th className="text-left p-3 text-sm font-medium text-gray-700">
                  Duration
                </th>
                <th className="text-left p-3 text-sm font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tasks.map((task) => {
                const StatusIcon = statusConfig[task.status].icon;
                return (
                  <tr
                    key={task.id}
                    className={`hover:bg-gray-50 ${selectedTasks.includes(task.id) ? 'bg-blue-50' : ''}`}
                    data-testid="task-card"
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedTasks.includes(task.id)}
                        onChange={(e) =>
                          onTaskSelect(task.id, e.target.checked)
                        }
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-sm text-blue-600">
                        {task.id}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="max-w-md">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {task.content}
                        </p>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge
                        className={`${statusConfig[task.status].color} flex items-center gap-1 w-fit`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[task.status].label}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={priorityColors[task.priority]}>
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-gray-600">
                        {task.duration ? task.duration : 'N/A'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(task)}
                          aria-label={`Edit task ${task.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onStartWorker(task)}
                          aria-label={`Start worker for task ${task.id}`}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(task.id)}
                          aria-label={`Delete task ${task.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
