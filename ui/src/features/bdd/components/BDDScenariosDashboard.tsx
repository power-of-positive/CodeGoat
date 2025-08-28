import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  RotateCcw,
  BarChart3,
} from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent } from '../../../shared/ui/card';
import { Input } from '../../../shared/ui/input';
import { ScenarioCard } from './BDDScenarioCard';
import { StatsCard } from './BDDStatsCard';

interface BDDScenario {
  id: string;
  todoTaskId: string;
  title: string;
  feature: string;
  description: string;
  gherkinContent: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  executedAt?: string;
  executionDuration?: number;
  errorMessage?: string;
  playwrightTestFile?: string;
  playwrightTestName?: string;
  createdAt: string;
  updatedAt: string;
  todoTask?: {
    id: string;
    content: string;
  };
}

interface BDDStats {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  skipped: number;
  passRate: number;
}

interface ExecutionResult {
  scenarioId: string;
  status: 'passed' | 'failed';
  executionDuration?: number;
  errorMessage?: string;
  environment?: string;
  executedBy?: string;
}

// API functions
const bddApi = {
  getScenarios: async (): Promise<BDDScenario[]> => {
    const response = await fetch('/api/bdd-scenarios');
    if (!response.ok) {
      throw new Error('Failed to fetch scenarios');
    }
    const data = await response.json();
    return data.data;
  },

  getStats: async (): Promise<BDDStats> => {
    const response = await fetch('/api/bdd-scenarios/stats');
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    const data = await response.json();
    return data.data;
  },

  createComprehensiveScenarios: async () => {
    const response = await fetch('/api/bdd-scenarios/comprehensive', {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to create scenarios');
    }
    return response.json();
  },

  executeScenario: async (scenarioId: string): Promise<ExecutionResult> => {
    const response = await fetch(`/api/bdd-scenarios/${scenarioId}/execute`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to execute scenario');
    }
    const data = await response.json();
    return data.data;
  },

  executeAllScenarios: async () => {
    const response = await fetch('/api/bdd-scenarios/execute-all', {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to execute all scenarios');
    }
    return response.json();
  },
};

export function BDDScenariosDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { 
    data: scenarios = [], 
    isLoading: scenariosLoading,
    error: scenariosError
  } = useQuery({
    queryKey: ['bdd-scenarios'],
    queryFn: bddApi.getScenarios,
    retry: false,
  });

  const { 
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useQuery({
    queryKey: ['bdd-stats'],
    queryFn: bddApi.getStats,
    retry: false,
  });

  const createScenariosMutation = useMutation({
    mutationFn: bddApi.createComprehensiveScenarios,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bdd-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['bdd-stats'] });
    },
  });

  const executeScenarioMutation = useMutation({
    mutationFn: bddApi.executeScenario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bdd-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['bdd-stats'] });
    },
  });

  const executeAllMutation = useMutation({
    mutationFn: bddApi.executeAllScenarios,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bdd-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['bdd-stats'] });
    },
  });

  const filteredScenarios = (scenarios || []).filter(scenario => {
    const matchesSearch = scenario.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scenario.feature.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || scenario.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExecuteScenario = (scenarioId: string) => {
    executeScenarioMutation.mutate(scenarioId);
  };

  if (scenariosLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading BDD scenarios...</p>
        </div>
      </div>
    );
  }

  if (scenariosError || statsError) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading BDD Scenarios</h3>
          <p className="text-gray-600">Failed to load BDD scenarios. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BDD Test Scenarios</h1>
          <p className="text-gray-600">
            Comprehensive behavioral test scenarios for user-facing features
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => createScenariosMutation.mutate()}
            disabled={createScenariosMutation.isPending}
            variant="outline"
          >
            {createScenariosMutation.isPending ? (
              <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4 mr-2" />
            )}
            Create Comprehensive Scenarios
          </Button>
          <Button
            onClick={() => executeAllMutation.mutate()}
            disabled={executeAllMutation.isPending || !scenarios || scenarios.length === 0}
          >
            {executeAllMutation.isPending ? (
              <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Execute All Scenarios
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatsCard
          title="Total Scenarios"
          count={stats?.total || 0}
          icon={BarChart3}
          testId="total-scenarios-count"
        />
        <StatsCard
          title="Passed"
          count={stats?.passed || 0}
          icon={CheckCircle}
          testId="passed-scenarios-count"
        />
        <StatsCard
          title="Failed"
          count={stats?.failed || 0}
          icon={XCircle}
          testId="failed-scenarios-count"
        />
        <StatsCard
          title="Pending"
          count={stats?.pending || 0}
          icon={Clock}
          testId="pending-scenarios-count"
        />
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                <p className="text-2xl font-bold" data-testid="pass-rate">
                  {stats?.passRate || 0}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search scenarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-scenarios"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            data-testid="status-filter"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>
      </div>

      {/* Scenarios List */}
      <div data-testid="scenarios-list">
        {filteredScenarios.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No BDD Scenarios Found
              </h3>
              <p className="text-gray-600 mb-4">
                {scenarios.length === 0
                  ? 'Create comprehensive BDD scenarios to get started with behavioral testing.'
                  : 'No scenarios match your current search and filter criteria.'
                }
              </p>
              {scenarios.length === 0 && (
                <Button
                  onClick={() => createScenariosMutation.mutate()}
                  disabled={createScenariosMutation.isPending}
                >
                  Create Comprehensive Scenarios
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onExecute={handleExecuteScenario}
              />
            ))}
          </div>
        )}
      </div>

      {/* Execution Status */}
      {(createScenariosMutation.isPending || executeScenarioMutation.isPending || executeAllMutation.isPending) && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 animate-spin" />
            <span>
              {createScenariosMutation.isPending && 'Creating scenarios...'}
              {executeScenarioMutation.isPending && 'Executing scenario...'}
              {executeAllMutation.isPending && 'Executing all scenarios...'}
            </span>
          </div>
        </div>
      )}

      {/* Success Messages */}
      {createScenariosMutation.isSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Created comprehensive BDD scenarios successfully!
        </div>
      )}
      
      {executeAllMutation.isSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Executed all scenarios successfully!
        </div>
      )}
    </div>
  );
}