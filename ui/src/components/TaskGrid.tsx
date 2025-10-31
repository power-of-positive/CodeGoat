import React from 'react';
import {
  Edit,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '../shared/ui/card';
import { Badge } from '../shared/ui/badge';
import { Button } from '../shared/ui/button';
import { Task } from '../shared/types/index';
import { formatDuration } from '../shared/utils/formatDuration';

interface TaskGridProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartWorker: (task: Task) => void;
  selectedTasks: string[];
  onTaskSelect: (taskId: string, selected: boolean) => void;
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

export function TaskGrid({
  tasks,
  onEdit,
  onDelete,
  onStartWorker,
  selectedTasks,
  onTaskSelect,
}: TaskGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map((task) => {
        const StatusIcon = statusConfig[task.status]?.icon || AlertCircle;
        const isSelected = selectedTasks.includes(task.id);

        return (
          <div
            key={task.id}
            className={`group hover:shadow-md transition-all cursor-pointer ${
              isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => onTaskSelect(task.id, !isSelected)}
            data-testid="task-card"
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex gap-1 flex-wrap">
                    <Badge
                      className={`text-xs ${priorityColors[task.priority]}`}
                    >
                      {task.priority}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        task.taskType === 'story'
                          ? 'border-blue-300 text-blue-700 bg-blue-50'
                          : 'border-gray-300 text-gray-600 bg-gray-50'
                      }`}
                    >
                      {task.taskType === 'story' ? 'Story' : 'Task'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        onTaskSelect(task.id, e.target.checked);
                      }}
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-sm font-mono text-blue-600 mb-1">
                    {task.id}
                  </p>
                  <p className="text-sm text-gray-900 leading-relaxed line-clamp-3">
                    {task.content}
                  </p>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <Badge
                    className={`${statusConfig[task.status].color} flex items-center gap-1`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig[task.status].label}
                  </Badge>
                  {task.duration && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatDuration(task.duration)}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(task);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Edit task ${task.id}`}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartWorker(task);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Start worker for task ${task.id}`}
                    >
                      <Play className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(task.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Delete task ${task.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
