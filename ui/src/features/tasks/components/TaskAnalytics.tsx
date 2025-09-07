import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Play,
  TrendingUp,
  Calendar,
  Users,
  Award,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Badge } from '../../../shared/ui/badge';
import { taskApi } from '../../../shared/lib/api';
import { TaskAnalyticsData, Task } from '../../../shared/types/index';

// Constants
const DEFAULT_DAYS_PERIOD = 30;
const CHART_HEIGHT = 300;
const DOT_RADIUS = 4;
const LINE_STROKE_WIDTH = 2;
const MAX_SCROLL_HEIGHT_REM = 20; // 20rem = 80 in Tailwind units
const STALE_TIME_MINUTES = 5;
const MINUTES_PER_HOUR = 60;
const MILLISECONDS_PER_SECOND = 1000;
const MINUTES_TO_MILLISECONDS = MINUTES_PER_HOUR * MILLISECONDS_PER_SECOND;
const LOADING_SKELETON_COUNT = 4;

// Priority colors for charts
const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#6B7280',
} as const;

// Status colors
const STATUS_COLORS = {
  completed: '#10B981',
  in_progress: '#3B82F6',
  pending: '#6B7280',
} as const;

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'green' | 'blue' | 'yellow' | 'gray';
}

function MetricCard({ title, value, subtitle, icon: Icon, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    gray: 'text-gray-600 bg-gray-50',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TaskRowProps {
  task: Task;
}

function TaskRow({ task }: TaskRowProps) {
  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  } as const;

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return 'N/A';
    }
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <Link
          to={`/tasks/${task.id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate flex items-center gap-1"
        >
          {task.content}
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <Badge className={`text-xs ${priorityColors[task.priority]}`}>{task.priority}</Badge>
          {task.executorId && (
            <Badge
              variant="outline"
              className="text-xs bg-purple-50 border-purple-300 text-purple-700"
            >
              👤 {task.executorId}
            </Badge>
          )}
          {task.duration && (
            <span className="text-xs text-gray-500">Duration: {task.duration}</span>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-900">{formatDate(task.endTime)}</p>
      </div>
    </div>
  );
}

export function TaskAnalytics() {
  const {
    data: analytics,
    isLoading,
    error,
    refetch,
  } = useQuery<TaskAnalyticsData>({
    queryKey: ['task-analytics'],
    queryFn: () => taskApi.getTaskAnalytics(),
    staleTime: STALE_TIME_MINUTES * MINUTES_TO_MILLISECONDS,
  });

  const chartData = useMemo(() => {
    if (!analytics) {
      return { priorityData: [], completionData: [], dailyData: [] };
    }

    const priorityData = [
      {
        name: 'High Priority',
        total: analytics.priorityBreakdown.high.total,
        completed: analytics.priorityBreakdown.high.completed,
        completionRate: parseFloat(analytics.priorityBreakdown.high.completionRate),
        fill: PRIORITY_COLORS.high,
      },
      {
        name: 'Medium Priority',
        total: analytics.priorityBreakdown.medium.total,
        completed: analytics.priorityBreakdown.medium.completed,
        completionRate: parseFloat(analytics.priorityBreakdown.medium.completionRate),
        fill: PRIORITY_COLORS.medium,
      },
      {
        name: 'Low Priority',
        total: analytics.priorityBreakdown.low.total,
        completed: analytics.priorityBreakdown.low.completed,
        completionRate: parseFloat(analytics.priorityBreakdown.low.completionRate),
        fill: PRIORITY_COLORS.low,
      },
    ];

    const completionData = [
      {
        name: 'Completed',
        value: analytics.overview.completedTasks,
        fill: STATUS_COLORS.completed,
      },
      {
        name: 'In Progress',
        value: analytics.overview.inProgressTasks,
        fill: STATUS_COLORS.in_progress,
      },
      {
        name: 'Pending',
        value: analytics.overview.pendingTasks,
        fill: STATUS_COLORS.pending,
      },
    ];

    const dailyData = analytics.dailyCompletions.map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      completed: day.completed,
    }));

    return { priorityData, completionData, dailyData };
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {Array.from({ length: LOADING_SKELETON_COUNT }, (_, i) => i + 1).map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to load task analytics
            </h3>
            <p className="text-gray-600 mb-4">
              There was an error loading the task analytics data.
            </p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Analytics</h1>
            <p className="text-gray-600">Track task completion statistics and performance</p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <TrendingUp className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Tasks"
            value={analytics.overview.totalTasks}
            icon={Users}
            color="gray"
          />
          <MetricCard
            title="Completed"
            value={analytics.overview.completedTasks}
            subtitle={`${analytics.overview.completionRate}% completion rate`}
            icon={CheckCircle}
            color="green"
          />
          <MetricCard
            title="In Progress"
            value={analytics.overview.inProgressTasks}
            icon={Play}
            color="blue"
          />
          <MetricCard
            title="Average Time"
            value={`${analytics.overview.averageCompletionTimeMinutes}m`}
            subtitle="Per completed task"
            icon={Clock}
            color="yellow"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Priority Completion Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Completion Rate by Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={chartData.priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'completionRate' ? `${value}%` : value,
                      name === 'completionRate'
                        ? 'Completion Rate'
                        : name === 'total'
                          ? 'Total Tasks'
                          : 'Completed Tasks',
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="total" fill="#E5E7EB" name="Total Tasks" />
                  <Bar dataKey="completed" fill="#10B981" name="Completed Tasks" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Task Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <PieChart>
                  <Pie
                    data={chartData.completionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.completionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Daily Completions Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {`Daily Task Completions (Last ${DEFAULT_DAYS_PERIOD} Days)`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10B981"
                  strokeWidth={LINE_STROKE_WIDTH}
                  dot={{ fill: '#10B981', strokeWidth: LINE_STROKE_WIDTH, r: DOT_RADIUS }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Completions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recent Completions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {analytics.recentCompletions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No completed tasks found</div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: `${MAX_SCROLL_HEIGHT_REM}rem` }}>
                {analytics.recentCompletions.map(completion => (
                  <TaskRow
                    key={completion.id}
                    task={{
                      id: completion.id,
                      content: completion.title,
                      status: 'completed' as const,
                      taskType: 'task' as const,
                      priority: completion.priority,
                      duration: `${completion.duration}ms`,
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
