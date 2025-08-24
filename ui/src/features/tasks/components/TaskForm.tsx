import React, { useState } from 'react';
import { Edit, Plus } from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Task } from '../../../shared/types/index';

interface TaskFormProps {
  task?: Task;
  onSave: (task: Omit<Task, 'id'> | Task) => void;
  onCancel: () => void;
}

export function TaskForm({ task, onSave, onCancel }: TaskFormProps) {
  const [content, setContent] = useState(task?.content || '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'medium');
  const [status, setStatus] = useState<Task['status']>(task?.status || 'pending');
  const [taskType, setTaskType] = useState<Task['taskType']>(task?.taskType || 'task');
  const [executorId, setExecutorId] = useState(task?.executorId || 'claude_code');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      return;
    }

    const taskData = {
      content: content.trim(),
      priority,
      status,
      taskType,
      executorId,
      ...(task && {
        id: task.id,
        startTime: task.startTime,
        endTime: task.endTime,
        duration: task.duration,
        bddScenarios: task.bddScenarios,
      }),
    };

    onSave(taskData);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {task ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {task ? 'Edit Task' : 'Create New Task'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="task-content" className="block text-sm font-medium text-gray-700 mb-2">
              Task Description *
            </label>
            <textarea
              id="task-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md text-sm resize-vertical"
              rows={4}
              placeholder="Describe what needs to be accomplished..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task['status'])}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as Task['taskType'])}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="task">Technical Task</option>
                <option value="story">User Story</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Executor
              </label>
              <input
                type="text"
                value={executorId}
                onChange={(e) => setExecutorId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                placeholder="claude_code"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" size="sm">
              {task ? 'Update Task' : 'Create Task'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}