import {
  mapPrismaProjectToApi,
  mapPrismaTaskToApi,
  mapPrismaTaskToApiWithStatus,
  mapPrismaTaskAttemptToApi,
  mapPrismaTaskTemplateToApi,
  mapPrismaExecutionProcessToApi,
  mapPrismaAiModelToApi,
  mapPrismaExecutionMetricToApi,
  parseJsonSafely,
} from '../../utils/kanban-mappers';

// Mock Prisma types
type MockPrismaProject = {
  id: string;
  name: string;
  description: string | null;
  gitRepoPath: string;
  setupScript: string | null;
  devScript: string | null;
  cleanupScript: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockPrismaTask = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  parentTaskAttempt: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockPrismaTaskAttempt = {
  id: string;
  taskId: string;
  branchName: string;
  mergeCommit: string | null;
  executor: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
};

type MockPrismaTaskTemplate = {
  id: string;
  projectId: string | null;
  title: string;
  description: string | null;
  templateName: string;
  createdAt: Date;
  updatedAt: Date;
};

type MockPrismaExecutionProcess = {
  id: string;
  taskAttemptId: string;
  processType: 'SETUPSCRIPT' | 'CODINGAGENT' | 'DEVSERVER' | 'VALIDATION' | 'CLEANUP';
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'KILLED';
  exitCode: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockPrismaAiModel = {
  id: string;
  name: string;
  description: string | null;
  endpointUrl: string;
  provider: string;
  modelId: string;
  parameters: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MockPrismaExecutionMetric = {
  id: string;
  attemptId: string;
  modelUsed: string;
  promptTokens: number | null;
  completionTokens: number | null;
  durationMs: number | null;
  success: boolean;
  validationPassed: boolean | null;
  costEstimate: number | null;
  createdAt: Date;
};

describe('Kanban Mappers', () => {
  const mockDate = new Date('2024-01-15T10:30:00Z');

  describe('mapPrismaProjectToApi', () => {
    it('should map Prisma project to API project', () => {
      const prismaProject: MockPrismaProject = {
        id: 'proj1',
        name: 'Test Project',
        description: 'A test project',
        gitRepoPath: '/path/to/repo',
        setupScript: 'npm install',
        devScript: 'npm run dev',
        cleanupScript: 'npm run clean',
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapPrismaProjectToApi(prismaProject as any);

      expect(result).toEqual({
        id: 'proj1',
        name: 'Test Project',
        description: 'A test project',
        git_repo_path: '/path/to/repo',
        setup_script: 'npm install',
        dev_script: 'npm run dev',
        cleanup_script: 'npm run clean',
        created_at: mockDate,
        updated_at: mockDate,
      });
    });

    it('should handle null optional fields', () => {
      const prismaProject: MockPrismaProject = {
        id: 'proj1',
        name: 'Test Project',
        description: null,
        gitRepoPath: '/path/to/repo',
        setupScript: null,
        devScript: null,
        cleanupScript: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapPrismaProjectToApi(prismaProject as any);

      expect(result.description).toBeUndefined();
      expect(result.setup_script).toBeUndefined();
      expect(result.dev_script).toBeUndefined();
      expect(result.cleanup_script).toBeUndefined();
    });
  });

  describe('mapPrismaTaskToApi', () => {
    it('should map Prisma task to API task', () => {
      const prismaTask: MockPrismaTask = {
        id: 'task1',
        projectId: 'proj1',
        title: 'Test Task',
        description: 'A test task',
        status: 'IN_PROGRESS',
        parentTaskAttempt: 'attempt1',
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapPrismaTaskToApi(prismaTask as any);

      expect(result).toEqual({
        id: 'task1',
        project_id: 'proj1',
        title: 'Test Task',
        description: 'A test task',
        status: 'in_progress',
        parent_task_attempt: 'attempt1',
        created_at: mockDate.toISOString(),
        updated_at: mockDate.toISOString(),
      });
    });

    it('should handle null optional fields', () => {
      const prismaTask: MockPrismaTask = {
        id: 'task1',
        projectId: 'proj1',
        title: 'Test Task',
        description: null,
        status: 'PENDING',
        parentTaskAttempt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapPrismaTaskToApi(prismaTask as any);

      expect(result.description).toBeUndefined();
      expect(result.parent_task_attempt).toBeUndefined();
      expect(result.status).toBe('pending');
    });
  });

  describe('mapPrismaTaskToApiWithStatus', () => {
    it('should map task with attempt status flags', () => {
      const prismaTaskWithAttempts = {
        id: 'task1',
        projectId: 'proj1',
        title: 'Test Task',
        description: 'A test task',
        status: 'IN_PROGRESS',
        parentTaskAttempt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
        attempts: [
          {
            id: 'attempt1',
            status: 'RUNNING',
            mergeCommit: null,
            executor: 'CLAUDE_CODE',
          },
          {
            id: 'attempt2',
            status: 'COMPLETED',
            mergeCommit: 'abc123',
            executor: 'GPT4',
          },
        ],
      };

      const result = mapPrismaTaskToApiWithStatus(prismaTaskWithAttempts as any);

      expect(result.has_in_progress_attempt).toBe(true);
      expect(result.has_merged_attempt).toBe(true);
      expect(result.last_attempt_failed).toBe(false);
      expect(result.base_coding_agent).toBe('CLAUDE_CODE');
    });

    it('should handle failed last attempt', () => {
      const prismaTaskWithAttempts = {
        id: 'task1',
        projectId: 'proj1',
        title: 'Test Task',
        description: 'A test task',
        status: 'FAILED',
        parentTaskAttempt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
        attempts: [
          {
            id: 'attempt1',
            status: 'COMPLETED',
            mergeCommit: null,
            executor: 'CLAUDE_CODE',
          },
          {
            id: 'attempt2',
            status: 'FAILED',
            mergeCommit: null,
            executor: 'GPT4',
          },
        ],
      };

      const result = mapPrismaTaskToApiWithStatus(prismaTaskWithAttempts as any);

      expect(result.has_in_progress_attempt).toBe(false);
      expect(result.has_merged_attempt).toBe(false);
      expect(result.last_attempt_failed).toBe(true);
      expect(result.base_coding_agent).toBe('CLAUDE_CODE');
    });

    it('should handle empty attempts array', () => {
      const prismaTaskWithAttempts = {
        id: 'task1',
        projectId: 'proj1',
        title: 'Test Task',
        description: 'A test task',
        status: 'PENDING',
        parentTaskAttempt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
        attempts: [],
      };

      const result = mapPrismaTaskToApiWithStatus(prismaTaskWithAttempts as any);

      expect(result.has_in_progress_attempt).toBe(false);
      expect(result.has_merged_attempt).toBe(false);
      expect(result.last_attempt_failed).toBe(false);
      expect(result.base_coding_agent).toBe('CLAUDE_CODE');
    });
  });

  describe('mapPrismaTaskAttemptToApi', () => {
    it('should map Prisma task attempt to API task attempt', () => {
      const prismaAttempt: MockPrismaTaskAttempt = {
        id: 'attempt1',
        taskId: 'task1',
        branchName: 'feature/test',
        mergeCommit: 'abc123',
        executor: 'CLAUDE_CODE',
        status: 'COMPLETED',
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapPrismaTaskAttemptToApi(prismaAttempt as any);

      expect(result).toEqual({
        id: 'attempt1',
        task_id: 'task1',
        container_ref: undefined,
        branch: 'feature/test',
        base_branch: 'main',
        merge_commit: 'abc123',
        executor: 'CLAUDE_CODE',
        base_coding_agent: 'CLAUDE_CODE',
        pr_url: undefined,
        pr_number: undefined,
        pr_status: undefined,
        pr_merged_at: undefined,
        worktree_deleted: false,
        setup_completed_at: undefined,
        created_at: mockDate.toISOString(),
        updated_at: mockDate.toISOString(),
      });
    });

    it('should handle null merge commit', () => {
      const prismaAttempt: MockPrismaTaskAttempt = {
        id: 'attempt1',
        taskId: 'task1',
        branchName: 'feature/test',
        mergeCommit: null,
        executor: 'CLAUDE_CODE',
        status: 'RUNNING',
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapPrismaTaskAttemptToApi(prismaAttempt as any);

      expect(result.merge_commit).toBeUndefined();
    });
  });

  describe('mapPrismaTaskTemplateToApi', () => {
    it('should map Prisma task template to API task template', () => {
      const prismaTemplate: MockPrismaTaskTemplate = {
        id: 'template1',
        projectId: 'proj1',
        title: 'Test Template',
        description: 'A test template',
        templateName: 'test-template',
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapPrismaTaskTemplateToApi(prismaTemplate as any);

      expect(result).toEqual({
        id: 'template1',
        project_id: 'proj1',
        title: 'Test Template',
        description: 'A test template',
        template_name: 'test-template',
        created_at: mockDate.toISOString(),
        updated_at: mockDate.toISOString(),
      });
    });

    it('should handle null project ID and description', () => {
      const prismaTemplate: MockPrismaTaskTemplate = {
        id: 'template1',
        projectId: null,
        title: 'Test Template',
        description: null,
        templateName: 'test-template',
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapPrismaTaskTemplateToApi(prismaTemplate as any);

      expect(result.project_id).toBeUndefined();
      expect(result.description).toBeUndefined();
    });
  });

  describe('mapPrismaExecutionProcessToApi', () => {
    it('should map Prisma execution process to API execution process', () => {
      const prismaProcess: MockPrismaExecutionProcess = {
        id: 'process1',
        taskAttemptId: 'attempt1',
        processType: 'CODINGAGENT',
        status: 'COMPLETED',
        exitCode: 1, // Use non-zero exit code to test BigInt conversion
        startedAt: mockDate,
        completedAt: new Date('2024-01-15T11:00:00Z'),
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapPrismaExecutionProcessToApi(prismaProcess as any);

      expect(result).toEqual({
        id: 'process1',
        task_attempt_id: 'attempt1',
        run_reason: 'codingagent',
        status: 'completed',
        exit_code: BigInt(1),
        started_at: mockDate.toISOString(),
        completed_at: '2024-01-15T11:00:00.000Z',
        created_at: mockDate.toISOString(),
        updated_at: mockDate.toISOString(),
      });
    });

    it('should map different process types correctly', () => {
      const processTypes = [
        { input: 'SETUPSCRIPT', expected: 'setupscript' },
        { input: 'DEVSERVER', expected: 'devserver' },
        { input: 'VALIDATION', expected: 'cleanupscript' },
        { input: 'CLEANUP', expected: 'cleanupscript' },
        { input: 'UNKNOWN', expected: 'codingagent' }, // fallback
      ];

      processTypes.forEach(({ input, expected }) => {
        const prismaProcess: MockPrismaExecutionProcess = {
          id: 'process1',
          taskAttemptId: 'attempt1',
          processType: input as any,
          status: 'RUNNING',
          exitCode: null,
          startedAt: null,
          completedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        };

        const result = mapPrismaExecutionProcessToApi(prismaProcess as any);
        expect(result.run_reason).toBe(expected);
      });
    });

    it('should map different status types correctly', () => {
      const statusTypes = [
        { input: 'RUNNING', expected: 'running' },
        { input: 'COMPLETED', expected: 'completed' },
        { input: 'FAILED', expected: 'failed' },
        { input: 'KILLED', expected: 'killed' },
        { input: 'UNKNOWN', expected: 'running' }, // fallback
      ];

      statusTypes.forEach(({ input, expected }) => {
        const prismaProcess: MockPrismaExecutionProcess = {
          id: 'process1',
          taskAttemptId: 'attempt1',
          processType: 'CODINGAGENT',
          status: input as any,
          exitCode: null,
          startedAt: null,
          completedAt: null,
          createdAt: mockDate,
          updatedAt: mockDate,
        };

        const result = mapPrismaExecutionProcessToApi(prismaProcess as any);
        expect(result.status).toBe(expected);
      });
    });

    it('should handle null values correctly', () => {
      const prismaProcess: MockPrismaExecutionProcess = {
        id: 'process1',
        taskAttemptId: 'attempt1',
        processType: 'CODINGAGENT',
        status: 'RUNNING',
        exitCode: null,
        startedAt: null,
        completedAt: null,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapPrismaExecutionProcessToApi(prismaProcess as any);

      expect(result.exit_code).toBeUndefined();
      expect(result.started_at).toBe(mockDate.toISOString()); // Falls back to createdAt
      expect(result.completed_at).toBeUndefined();
    });

    it('should handle zero exit code correctly', () => {
      const prismaProcess: MockPrismaExecutionProcess = {
        id: 'process1',
        taskAttemptId: 'attempt1',
        processType: 'CODINGAGENT',
        status: 'COMPLETED',
        exitCode: 0, // Zero exit code should be treated as falsy and return undefined
        startedAt: mockDate,
        completedAt: mockDate,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapPrismaExecutionProcessToApi(prismaProcess as any);

      expect(result.exit_code).toBeUndefined(); // Because 0 is falsy
    });
  });

  describe('mapPrismaAiModelToApi', () => {
    it('should map Prisma AI model to API AI model', () => {
      const prismaModel: MockPrismaAiModel = {
        id: 'model1',
        name: 'Test Model',
        description: 'A test model',
        endpointUrl: 'https://api.example.com',
        provider: 'OpenAI',
        modelId: 'gpt-4',
        parameters: '{"temperature": 0.7}',
        enabled: true,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapPrismaAiModelToApi(prismaModel as any);

      expect(result).toEqual({
        id: 'model1',
        name: 'Test Model',
        description: 'A test model',
        endpoint_url: 'https://api.example.com',
        provider: 'OpenAI',
        model_id: 'gpt-4',
        parameters: { temperature: 0.7 },
        enabled: true,
        created_at: mockDate.toISOString(),
        updated_at: mockDate.toISOString(),
      });
    });

    it('should handle null optional fields', () => {
      const prismaModel: MockPrismaAiModel = {
        id: 'model1',
        name: 'Test Model',
        description: null,
        endpointUrl: 'https://api.example.com',
        provider: 'OpenAI',
        modelId: 'gpt-4',
        parameters: null,
        enabled: false,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      const result = mapPrismaAiModelToApi(prismaModel as any);

      expect(result.description).toBeUndefined();
      expect(result.parameters).toBeUndefined();
    });
  });

  describe('mapPrismaExecutionMetricToApi', () => {
    it('should map Prisma execution metric to API execution metric', () => {
      const prismaMetric: MockPrismaExecutionMetric = {
        id: 'metric1',
        attemptId: 'attempt1',
        modelUsed: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        durationMs: 1500,
        success: true,
        validationPassed: true,
        costEstimate: 0.05,
        createdAt: mockDate,
      };

      const result = mapPrismaExecutionMetricToApi(prismaMetric as any);

      expect(result).toEqual({
        id: 'metric1',
        attempt_id: 'attempt1',
        model_used: 'gpt-4',
        prompt_tokens: 100,
        completion_tokens: 50,
        duration_ms: 1500,
        success: true,
        validation_passed: true,
        cost_estimate: 0.05,
        created_at: mockDate.toISOString(),
      });
    });

    it('should handle null optional fields', () => {
      const prismaMetric: MockPrismaExecutionMetric = {
        id: 'metric1',
        attemptId: 'attempt1',
        modelUsed: 'gpt-4',
        promptTokens: null,
        completionTokens: null,
        durationMs: null,
        success: false,
        validationPassed: null,
        costEstimate: null,
        createdAt: mockDate,
      };

      const result = mapPrismaExecutionMetricToApi(prismaMetric as any);

      expect(result.prompt_tokens).toBeUndefined();
      expect(result.completion_tokens).toBeUndefined();
      expect(result.duration_ms).toBeUndefined();
      expect(result.validation_passed).toBeUndefined();
      expect(result.cost_estimate).toBeUndefined();
    });
  });

  describe('parseJsonSafely', () => {
    it('should parse valid JSON', () => {
      const result = parseJsonSafely('{"key": "value"}', {});
      expect(result).toEqual({ key: 'value' });
    });

    it('should return default value for invalid JSON', () => {
      const defaultValue = { default: true };
      const result = parseJsonSafely('invalid json', defaultValue);
      expect(result).toBe(defaultValue);
    });

    it('should return default value for null input', () => {
      const defaultValue = { default: true };
      const result = parseJsonSafely(null, defaultValue);
      expect(result).toBe(defaultValue);
    });

    it('should return default value for undefined input', () => {
      const defaultValue = { default: true };
      const result = parseJsonSafely(undefined, defaultValue);
      expect(result).toBe(defaultValue);
    });

    it('should return default value for empty string', () => {
      const defaultValue = { default: true };
      const result = parseJsonSafely('', defaultValue);
      expect(result).toBe(defaultValue);
    });
  });
});