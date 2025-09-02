/* eslint-disable max-lines */
import {
  ThemeMode,
  BDDScenario,
  BDDScenarioExecution,
  BDDStepResult,
  Config,
  ValidationStage,
  ValidationRun,
  ValidationStageResult,
  ValidationMetrics,
  UserSystemInfo,
  Task,
  E2ETestResult,
  E2ETestSuite,
  E2ETestHistory,
} from './index';
import {
  NormalizedEntry,
  NormalizedEntryType,
  ClaudeActionType,
} from './logs';

describe('Shared Types', () => {
  describe('ThemeMode', () => {
    it('should define correct theme mode values', () => {
      expect(ThemeMode.LIGHT).toBe('light');
      expect(ThemeMode.DARK).toBe('dark');
      expect(ThemeMode.SYSTEM).toBe('system');
    });

    it('should contain all expected theme modes', () => {
      const themeModes = Object.values(ThemeMode);
      expect(themeModes).toHaveLength(3);
      expect(themeModes).toContain('light');
      expect(themeModes).toContain('dark');
      expect(themeModes).toContain('system');
    });
  });

  describe('Type Guards and Utilities', () => {
    describe('NormalizedEntryType type guards', () => {
      it('should validate user_message type', () => {
        const entryType: NormalizedEntryType = { type: 'user_message' };
        expect(entryType.type).toBe('user_message');
      });

      it('should validate assistant_message type', () => {
        const entryType: NormalizedEntryType = { type: 'assistant_message' };
        expect(entryType.type).toBe('assistant_message');
      });

      it('should validate tool_use type with tool_name', () => {
        const actionType: ClaudeActionType = { action: 'file_read', path: '/test/path' };
        const entryType: NormalizedEntryType = { 
          type: 'tool_use', 
          tool_name: 'file_reader',
          action_type: actionType 
        };
        expect(entryType.type).toBe('tool_use');
        expect(entryType.tool_name).toBe('file_reader');
        expect(entryType.action_type.action).toBe('file_read');
      });

      it('should validate system_message type', () => {
        const entryType: NormalizedEntryType = { type: 'system_message' };
        expect(entryType.type).toBe('system_message');
      });

      it('should validate error_message type', () => {
        const entryType: NormalizedEntryType = { type: 'error_message' };
        expect(entryType.type).toBe('error_message');
      });

      it('should validate thinking type', () => {
        const entryType: NormalizedEntryType = { type: 'thinking' };
        expect(entryType.type).toBe('thinking');
      });
    });

    describe('ClaudeActionType type guards', () => {
      it('should validate file_read action', () => {
        const action: ClaudeActionType = { action: 'file_read', path: '/test/file.ts' };
        expect(action.action).toBe('file_read');
        expect(action.path).toBe('/test/file.ts');
      });

      it('should validate file_write action', () => {
        const action: ClaudeActionType = { action: 'file_write', path: '/test/output.ts' };
        expect(action.action).toBe('file_write');
        expect(action.path).toBe('/test/output.ts');
      });

      it('should validate command_run action', () => {
        const action: ClaudeActionType = { action: 'command_run', command: 'npm test' };
        expect(action.action).toBe('command_run');
        expect(action.command).toBe('npm test');
      });

      it('should validate search action', () => {
        const action: ClaudeActionType = { action: 'search', query: 'test query' };
        expect(action.action).toBe('search');
        expect(action.query).toBe('test query');
      });

      it('should validate web_fetch action', () => {
        const action: ClaudeActionType = { action: 'web_fetch', url: 'https://example.com' };
        expect(action.action).toBe('web_fetch');
        expect(action.url).toBe('https://example.com');
      });

      it('should validate task_create action', () => {
        const action: ClaudeActionType = { action: 'task_create', description: 'Create new task' };
        expect(action.action).toBe('task_create');
        expect(action.description).toBe('Create new task');
      });

      it('should validate plan_presentation action', () => {
        const action: ClaudeActionType = { action: 'plan_presentation', plan: 'Project plan' };
        expect(action.action).toBe('plan_presentation');
        expect(action.plan).toBe('Project plan');
      });

      it('should validate other action', () => {
        const action: ClaudeActionType = { action: 'other', description: 'Custom action' };
        expect(action.action).toBe('other');
        expect(action.description).toBe('Custom action');
      });
    });
  });

  describe('Interface Structure Validation', () => {
    describe('NormalizedEntry', () => {
      it('should create valid NormalizedEntry', () => {
        const entry: NormalizedEntry = {
          timestamp: '2023-01-01T00:00:00Z',
          entry_type: { type: 'user_message' },
          content: 'Test message'
        };

        expect(entry.timestamp).toBe('2023-01-01T00:00:00Z');
        expect(entry.entry_type.type).toBe('user_message');
        expect(entry.content).toBe('Test message');
      });

      it('should allow null timestamp', () => {
        const entry: NormalizedEntry = {
          timestamp: null,
          entry_type: { type: 'assistant_message' },
          content: 'Test response'
        };

        expect(entry.timestamp).toBeNull();
        expect(entry.entry_type.type).toBe('assistant_message');
        expect(entry.content).toBe('Test response');
      });
    });

    describe('BDDScenario', () => {
      it('should create valid BDDScenario with required fields', () => {
        const scenario: BDDScenario = {
          id: 'test-1',
          title: 'Test Scenario',
          feature: 'Test Feature',
          description: 'Test description',
          gherkinContent: 'Given... When... Then...',
          given: 'initial condition',
          when: 'action occurs',
          then: 'expected result',
          status: 'pending'
        };

        expect(scenario.id).toBe('test-1');
        expect(scenario.title).toBe('Test Scenario');
        expect(scenario.status).toBe('pending');
      });

      it('should support all status values', () => {
        const statuses: Array<BDDScenario['status']> = ['pending', 'passed', 'failed', 'skipped'];
        
        statuses.forEach(status => {
          const scenario: BDDScenario = {
            id: `test-${status}`,
            title: 'Test',
            feature: 'Feature',
            description: 'Description',
            gherkinContent: 'Gherkin',
            given: 'Given',
            when: 'When',
            then: 'Then',
            status
          };
          
          expect(scenario.status).toBe(status);
        });
      });

      it('should create BDDScenario with optional fields', () => {
        const scenario: BDDScenario = {
          id: 'test-complete',
          title: 'Complete Scenario',
          feature: 'Complete Feature',
          description: 'Complete description',
          gherkinContent: 'Complete gherkin',
          given: 'complete condition',
          when: 'complete action',
          then: 'complete result',
          status: 'passed',
          executedAt: '2023-01-01T00:00:00Z',
          executionDuration: 1500,
          errorMessage: 'No errors',
          playwrightTestFile: 'test.spec.ts',
          playwrightTestName: 'test name',
          cucumberSteps: ['step1', 'step2'],
          executionHistory: []
        };

        expect(scenario.executedAt).toBe('2023-01-01T00:00:00Z');
        expect(scenario.executionDuration).toBe(1500);
        expect(scenario.errorMessage).toBe('No errors');
        expect(scenario.playwrightTestFile).toBe('test.spec.ts');
        expect(scenario.playwrightTestName).toBe('test name');
        expect(scenario.cucumberSteps).toHaveLength(2);
        expect(scenario.executionHistory).toHaveLength(0);
      });
    });

    describe('BDDScenarioExecution', () => {
      it('should create valid BDDScenarioExecution', () => {
        const execution: BDDScenarioExecution = {
          id: 'exec-1',
          scenarioId: 'scenario-1',
          status: 'passed',
          executedAt: '2023-01-01T00:00:00Z'
        };

        expect(execution.id).toBe('exec-1');
        expect(execution.scenarioId).toBe('scenario-1');
        expect(execution.status).toBe('passed');
        expect(execution.executedAt).toBe('2023-01-01T00:00:00Z');
      });

      it('should support all execution status values', () => {
        const statuses: Array<BDDScenarioExecution['status']> = ['pending', 'passed', 'failed', 'skipped'];
        
        statuses.forEach(status => {
          const execution: BDDScenarioExecution = {
            id: `exec-${status}`,
            scenarioId: 'scenario-1',
            status,
            executedAt: '2023-01-01T00:00:00Z'
          };
          
          expect(execution.status).toBe(status);
        });
      });
    });

    describe('BDDStepResult', () => {
      it('should create valid BDDStepResult', () => {
        const stepResult: BDDStepResult = {
          step: 'Given I have a test',
          status: 'passed'
        };

        expect(stepResult.step).toBe('Given I have a test');
        expect(stepResult.status).toBe('passed');
      });

      it('should support all step status values', () => {
        const statuses: Array<BDDStepResult['status']> = ['passed', 'failed', 'skipped'];
        
        statuses.forEach(status => {
          const stepResult: BDDStepResult = {
            step: 'Test step',
            status,
            duration: 100,
            error: status === 'failed' ? 'Test error' : undefined
          };
          
          expect(stepResult.status).toBe(status);
        });
      });
    });

    describe('ValidationStage', () => {
      it('should create valid ValidationStage', () => {
        const stage: ValidationStage = {
          id: 'lint',
          name: 'Linting',
          command: 'npm run lint',
          enabled: true,
          timeout: 30000,
          continueOnFailure: false,
          priority: 1
        };

        expect(stage.id).toBe('lint');
        expect(stage.name).toBe('Linting');
        expect(stage.command).toBe('npm run lint');
        expect(stage.enabled).toBe(true);
        expect(stage.timeout).toBe(30000);
        expect(stage.continueOnFailure).toBe(false);
        expect(stage.priority).toBe(1);
      });
    });

    describe('ValidationRun', () => {
      it('should create valid ValidationRun', () => {
        const stageResult: ValidationStageResult = {
          id: 'lint',
          name: 'Linting',
          success: true,
          duration: 5000,
          attempt: 1,
          status: 'passed' as const
        };

        const run: ValidationRun = {
          id: 'run-1',
          timestamp: '2023-01-01T00:00:00Z',
          stages: [stageResult],
          success: true,
          duration: 5000,
          overallStatus: 'passed' as const
        };

        expect(run.id).toBe('run-1');
        expect(run.stages).toHaveLength(1);
        expect(run.success).toBe(true);
        expect(run.duration).toBe(5000);
      });
    });

    describe('ValidationMetrics', () => {
      it('should create valid ValidationMetrics', () => {
        const metrics: ValidationMetrics = {
          totalRuns: 10,
          successfulRuns: 8,
          failedRuns: 2,
          successRate: 80,
          averageDuration: 15000,
          stageMetrics: {
            'lint': {
              id: 'lint',
              name: 'Linting',
              enabled: true,
              attempts: 10,
              successes: 9,
              successRate: 90,
              averageDuration: 3000,
              totalRuns: 10
            }
          }
        };

        expect(metrics.totalRuns).toBe(10);
        expect(metrics.successRate).toBe(80);
        expect(metrics.stageMetrics['lint'].successRate).toBe(90);
      });
    });

    describe('Config', () => {
      it('should create valid Config', () => {
        const config: Config = {
          theme: ThemeMode.DARK,
          enableMetrics: true,
          validationStages: []
        };

        expect(config.theme).toBe(ThemeMode.DARK);
        expect(config.enableMetrics).toBe(true);
        expect(config.validationStages).toHaveLength(0);
      });
    });

    describe('UserSystemInfo', () => {
      it('should create valid UserSystemInfo', () => {
        const config: Config = {
          theme: ThemeMode.SYSTEM,
          enableMetrics: false,
          validationStages: []
        };

        const systemInfo: UserSystemInfo = {
          os_type: 'darwin',
          architecture: 'arm64',
          shell: '/bin/zsh',
          home_directory: '/Users/test',
          current_directory: '/Users/test/project',
          config,
          environment: { NODE_ENV: 'test' },
          profiles: [{ name: 'default', path: '/Users/test/.profile' }]
        };

        expect(systemInfo.os_type).toBe('darwin');
        expect(systemInfo.config.theme).toBe(ThemeMode.SYSTEM);
        expect(systemInfo.environment?.NODE_ENV).toBe('test');
        expect(systemInfo.profiles?.[0].name).toBe('default');
      });

      it('should allow null environment and profiles', () => {
        const config: Config = {
          theme: ThemeMode.LIGHT,
          enableMetrics: true,
          validationStages: []
        };

        const systemInfo: UserSystemInfo = {
          os_type: 'linux',
          architecture: 'x64',
          shell: '/bin/bash',
          home_directory: '/home/test',
          current_directory: '/home/test/project',
          config,
          environment: null,
          profiles: null
        };

        expect(systemInfo.environment).toBeNull();
        expect(systemInfo.profiles).toBeNull();
      });
    });

    describe('Task', () => {
      it('should create valid Task with required fields', () => {
        const task: Task = {
          id: 'task-1',
          content: 'Test task content',
          status: 'pending',
          priority: 'medium',
          taskType: 'task'
        };

        expect(task.id).toBe('task-1');
        expect(task.content).toBe('Test task content');
        expect(task.status).toBe('pending');
        expect(task.priority).toBe('medium');
        expect(task.taskType).toBe('task');
      });

      it('should support all status values', () => {
        const statuses: Array<Task['status']> = ['pending', 'in_progress', 'completed'];
        
        statuses.forEach(status => {
          const task: Task = {
            id: `task-${status}`,
            content: 'Test content',
            status,
            priority: 'low',
            taskType: 'story'
          };
          
          expect(task.status).toBe(status);
        });
      });

      it('should support all priority values', () => {
        const priorities: Array<Task['priority']> = ['low', 'medium', 'high'];
        
        priorities.forEach(priority => {
          const task: Task = {
            id: `task-${priority}`,
            content: 'Test content',
            status: 'pending',
            priority,
            taskType: 'task'
          };
          
          expect(task.priority).toBe(priority);
        });
      });

      it('should support all taskType values', () => {
        const taskTypes: Array<Task['taskType']> = ['story', 'task'];
        
        taskTypes.forEach(taskType => {
          const task: Task = {
            id: `task-${taskType}`,
            content: 'Test content',
            status: 'pending',
            priority: 'medium',
            taskType
          };
          
          expect(task.taskType).toBe(taskType);
        });
      });

      it('should create Task with optional fields', () => {
        const task: Task = {
          id: 'task-complete',
          content: 'Complete task',
          status: 'completed',
          priority: 'high',
          taskType: 'story',
          startTime: '2023-01-01T00:00:00Z',
          endTime: '2023-01-01T01:00:00Z',
          duration: '1h',
          executorId: 'executor-1',
          bddScenarios: [],
          validationRuns: []
        };

        expect(task.startTime).toBe('2023-01-01T00:00:00Z');
        expect(task.endTime).toBe('2023-01-01T01:00:00Z');
        expect(task.duration).toBe('1h');
        expect(task.executorId).toBe('executor-1');
        expect(task.bddScenarios).toHaveLength(0);
        expect(task.validationRuns).toHaveLength(0);
      });
    });

    describe('E2E Test Types', () => {
      describe('E2ETestResult', () => {
        it('should create valid E2ETestResult', () => {
          const result: E2ETestResult = {
            id: 'test-1',
            testName: 'Login test',
            status: 'passed',
            duration: 2000,
            timestamp: '2023-01-01T00:00:00Z'
          };

          expect(result.id).toBe('test-1');
          expect(result.testName).toBe('Login test');
          expect(result.status).toBe('passed');
          expect(result.duration).toBe(2000);
          expect(result.timestamp).toBe('2023-01-01T00:00:00Z');
        });

        it('should support all test status values', () => {
          const statuses: Array<E2ETestResult['status']> = ['passed', 'failed', 'skipped'];
          
          statuses.forEach(status => {
            const result: E2ETestResult = {
              id: `test-${status}`,
              testName: 'Test name',
              status,
              duration: 1000,
              timestamp: '2023-01-01T00:00:00Z',
              error: status === 'failed' ? 'Test error' : undefined
            };
            
            expect(result.status).toBe(status);
          });
        });
      });

      describe('E2ETestSuite', () => {
        it('should create valid E2ETestSuite', () => {
          const suite: E2ETestSuite = {
            id: 'suite-1',
            name: 'Login Suite',
            tests: [],
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            duration: 0,
            timestamp: '2023-01-01T00:00:00Z'
          };

          expect(suite.id).toBe('suite-1');
          expect(suite.name).toBe('Login Suite');
          expect(suite.tests).toHaveLength(0);
          expect(suite.totalTests).toBe(0);
        });
      });

      describe('E2ETestHistory', () => {
        it('should create valid E2ETestHistory', () => {
          const history: E2ETestHistory = {
            id: 'history-1',
            suiteRuns: [],
            totalRuns: 0,
            successRate: 0,
            averageDuration: 0,
            lastRunTimestamp: '2023-01-01T00:00:00Z'
          };

          expect(history.id).toBe('history-1');
          expect(history.suiteRuns).toHaveLength(0);
          expect(history.totalRuns).toBe(0);
          expect(history.successRate).toBe(0);
        });
      });
    });
  });

  describe('Type Compatibility', () => {
    it('should ensure NormalizedEntry works with complex entry types', () => {
      const toolUseAction: ClaudeActionType = {
        action: 'file_read',
        path: '/test/file.ts'
      };

      const toolUseEntryType: NormalizedEntryType = {
        type: 'tool_use',
        tool_name: 'file_reader',
        action_type: toolUseAction
      };

      const entry: NormalizedEntry = {
        timestamp: '2023-01-01T00:00:00Z',
        entry_type: toolUseEntryType,
        content: 'Reading file content'
      };

      expect(entry.entry_type.type).toBe('tool_use');
      if (entry.entry_type.type === 'tool_use') {
        expect(entry.entry_type.action_type.action).toBe('file_read');
        if (entry.entry_type.action_type.action === 'file_read') {
          expect(entry.entry_type.action_type.path).toBe('/test/file.ts');
        }
      }
    });

    it('should ensure Task can contain BDDScenarios with executions', () => {
      const stepResult: BDDStepResult = {
        step: 'Given I am logged in',
        status: 'passed',
        duration: 500
      };

      const execution: BDDScenarioExecution = {
        id: 'exec-1',
        scenarioId: 'scenario-1',
        status: 'passed',
        executedAt: '2023-01-01T00:00:00Z',
        executionDuration: 2000,
        stepResults: [stepResult]
      };

      const scenario: BDDScenario = {
        id: 'scenario-1',
        title: 'Login Scenario',
        feature: 'Authentication',
        description: 'User login functionality',
        gherkinContent: 'Given... When... Then...',
        given: 'user is on login page',
        when: 'user enters credentials',
        then: 'user is logged in',
        status: 'passed',
        executionHistory: [execution]
      };

      const validationStageResult: ValidationStageResult = {
        id: 'test',
        name: 'Testing',
        success: true,
        duration: 5000,
        attempt: 1,
        status: 'passed' as const
      };

      const validationRun: ValidationRun = {
        id: 'run-1',
        timestamp: '2023-01-01T00:00:00Z',
        stages: [validationStageResult],
        success: true,
        duration: 5000,
        overallStatus: 'passed' as const
      };

      const task: Task = {
        id: 'task-1',
        content: 'Implement login functionality',
        status: 'completed',
        priority: 'high',
        taskType: 'story',
        bddScenarios: [scenario],
        validationRuns: [validationRun]
      };

      expect(task.bddScenarios).toHaveLength(1);
      expect(task.bddScenarios?.[0].executionHistory).toHaveLength(1);
      expect(task.validationRuns).toHaveLength(1);
    });
  });
});