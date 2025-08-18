import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar 
} from 'recharts';
import { taskApi, e2eTestingApi } from '../lib/api';
import { 
  Play, Link, FileText, Clock, CheckCircle, XCircle, 
  AlertTriangle, RefreshCw,
  TrendingUp, Activity
} from 'lucide-react';

const BDDTestsDashboard: React.FC = () => {
  const [selectedTaskType, setSelectedTaskType] = useState<'all' | 'story' | 'task'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'passed' | 'failed' | 'skipped'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState<number>(30); // days

  // Fetch all tasks with BDD scenarios
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskApi.getTasks(),
  });

  // Fetch E2E test analytics
  const { data: e2eAnalytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['e2e-analytics', timeRange],
    queryFn: () => e2eTestingApi.getAnalytics({ days: timeRange }),
  });

  // Fetch recent test suites
  const { data: testSuites, isLoading: suitesLoading, refetch: refetchSuites } = useQuery({
    queryKey: ['e2e-suites', timeRange],
    queryFn: () => e2eTestingApi.getTestSuites({ limit: 50 }),
  });


  // Trigger test run mutation
  const triggerTestMutation = useMutation({
    mutationFn: e2eTestingApi.triggerTestRun,
    onSuccess: () => {
      // Refresh data after a few seconds
      setTimeout(() => {
        refetchSuites();
        refetchAnalytics();
      }, 3000);
    },
  });

  const handleRefresh = () => {
    refetchTasks();
    refetchAnalytics();
    refetchSuites();
  };

  // Filter tasks based on criteria
  const filteredTasks = tasks?.filter(task => {
    const matchesType = selectedTaskType === 'all' || task.taskType === selectedTaskType;
    const matchesSearch = searchTerm === '' || 
      task.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.bddScenarios?.some(scenario => 
        scenario.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scenario.feature.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesType && matchesSearch;
  }) || [];

  // Get BDD scenarios with status filter
  const allScenarios = filteredTasks.flatMap(task => 
    task.bddScenarios?.map(scenario => ({ ...scenario, task })) || []
  );

  const filteredScenarios = allScenarios.filter(scenario =>
    selectedStatus === 'all' || scenario.status === selectedStatus
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'skipped': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'skipped': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (tasksLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">BDD Tests Dashboard</h1>
          <p className="text-gray-600 mt-2">
            View and manage BDD scenarios linked to E2E tests with execution history
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => triggerTestMutation.mutate({})}
            disabled={triggerTestMutation.isPending}
            size="sm"
          >
            <Play className="h-4 w-4 mr-2" />
            Run All Tests
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {e2eAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{e2eAnalytics.overview.totalTests}</div>
              <p className="text-xs text-muted-foreground">
                Across {e2eAnalytics.overview.totalSuites} test suites
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(e2eAnalytics.overview.successRate * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Last {timeRange} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(e2eAnalytics.overview.averageDuration / 1000).toFixed(1)}s
              </div>
              <p className="text-xs text-muted-foreground">
                Per test execution
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Runs</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{e2eAnalytics.overview.recentRuns}</div>
              <p className="text-xs text-muted-foreground">
                Last 24 hours
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="flex space-x-4">
        <div className="flex items-center space-x-2">
          <Label htmlFor="time-range">Time Range:</Label>
          <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Search scenarios, features, or tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        <Select value={selectedTaskType} onValueChange={(value) => setSelectedTaskType(value as typeof selectedTaskType)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Task Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="story">Stories Only</SelectItem>
            <SelectItem value="task">Technical Tasks</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as typeof selectedStatus)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="scenarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scenarios">BDD Scenarios</TabsTrigger>
          <TabsTrigger value="tests">E2E Tests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="mapping">Test Mapping</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-4">
          <div className="grid gap-4">
            {filteredScenarios.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No BDD scenarios found matching the current filters.</p>
                </CardContent>
              </Card>
            ) : (
              filteredScenarios.map((scenario) => (
                <Card key={scenario.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{scenario.title}</CardTitle>
                        <CardDescription>
                          <span className="font-medium">Feature:</span> {scenario.feature} | 
                          <span className="font-medium ml-2">Task:</span> {scenario.task?.content}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={scenario.status === 'passed' ? 'default' : 
                                   scenario.status === 'failed' ? 'destructive' : 'secondary'}
                          className={`${getStatusColor(scenario.status)} flex items-center space-x-1 ${
                            scenario.status === 'passed' ? 'bg-green-100 text-green-800 border-green-300' : ''
                          }`}
                        >
                          {getStatusIcon(scenario.status)}
                          <span className="capitalize">{scenario.status}</span>
                        </Badge>
                        {scenario.playwrightTestFile && (
                          <Badge variant="outline">
                            <Link className="h-3 w-3 mr-1" />
                            E2E Linked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">{scenario.description}</p>
                      
                      {scenario.playwrightTestFile && (
                        <div className="bg-blue-50 p-3 rounded-md">
                          <div className="flex items-center space-x-2 text-sm">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Linked Test:</span>
                            <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">
                              {scenario.playwrightTestFile}
                            </code>
                            {scenario.playwrightTestName && (
                              <>
                                <span>→</span>
                                <span className="italic">{scenario.playwrightTestName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        {scenario.playwrightTestFile && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => triggerTestMutation.mutate({
                              testFile: scenario.playwrightTestFile!,
                              testName: scenario.playwrightTestName
                            })}
                            disabled={triggerTestMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Run Test
                          </Button>
                        )}
                        {!scenario.playwrightTestFile && (
                          <Button size="sm" variant="outline">
                            <Link className="h-4 w-4 mr-1" />
                            Link to Test
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <div className="grid gap-4">
            {suitesLoading ? (
              <div className="text-center py-8">Loading test suites...</div>
            ) : testSuites?.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No E2E test suites found.</p>
                </CardContent>
              </Card>
            ) : (
              testSuites?.map((suite) => (
                <Card key={suite.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{suite.suiteName}</CardTitle>
                        <CardDescription>
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {suite.file}
                          </code>
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {new Date(suite.executedAt).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {suite.duration && `${(suite.duration / 1000).toFixed(1)}s`}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{suite.totalTests}</div>
                        <div className="text-xs text-gray-600">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{suite.passedTests}</div>
                        <div className="text-xs text-gray-600">Passed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{suite.failedTests}</div>
                        <div className="text-xs text-gray-600">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{suite.skippedTests}</div>
                        <div className="text-xs text-gray-600">Skipped</div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-1" />
                        View Results
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => triggerTestMutation.mutate({ testFile: suite.file })}
                        disabled={triggerTestMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Re-run
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {e2eAnalytics && (
            <>
              {/* Success Rate Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Success Rate Trend</CardTitle>
                  <CardDescription>Daily test success rates over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={e2eAnalytics.trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="successRate" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Test Volume Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Test Volume Trends</CardTitle>
                  <CardDescription>Daily test execution volumes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={e2eAnalytics.trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalRuns" fill="#3b82f6" name="Total Runs" />
                      <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Failing Tests */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Failing Tests</CardTitle>
                  <CardDescription>Tests with highest failure rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {e2eAnalytics.topFailingTests.map((test) => (
                      <div key={`${test.testFile}-${test.testName}`} className="flex items-center justify-between p-3 bg-red-50 rounded-md">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{test.testName}</div>
                          <div className="text-xs text-gray-600">{test.testFile}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-red-600">
                            {(test.failureRate * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-600">
                            {test.recentFailures} recent failures
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Mapping</CardTitle>
              <CardDescription>
                Link BDD scenarios to E2E tests for integrated testing workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Test mapping interface coming soon...
                <br />
                This will allow you to:
                <ul className="mt-4 text-left inline-block">
                  <li>• Link BDD scenarios to Playwright tests</li>
                  <li>• Map cucumber steps to test implementations</li>
                  <li>• Auto-discover test files and suggest mappings</li>
                  <li>• Bulk import existing test mappings</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BDDTestsDashboard;