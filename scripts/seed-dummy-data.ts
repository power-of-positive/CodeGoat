import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { parseDuration } from '../src/utils/parse-duration';

const prisma = new PrismaClient();

async function seedDummyData() {
  console.log('🌱 Starting to seed dummy data...');

  try {
    // Create Projects
    console.log('📁 Creating projects...');
    const projects = await Promise.all([
      prisma.project.upsert({
        where: { id: 'project-1' },
        update: {},
        create: {
          id: 'project-1',
          name: 'E-Commerce Platform',
          description: 'Modern e-commerce platform with React and Node.js',
          gitRepoPath: '/Users/dev/projects/ecommerce-platform',
          setupScript: 'npm install && npm run setup',
          devScript: 'npm run dev',
          cleanupScript: 'npm run cleanup',
        },
      }),
      prisma.project.upsert({
        where: { id: 'project-2' },
        update: {},
        create: {
          id: 'project-2',
          name: 'AI Dashboard',
          description: 'Analytics dashboard for AI model performance tracking',
          gitRepoPath: '/Users/dev/projects/ai-dashboard',
          setupScript: 'yarn install',
          devScript: 'yarn dev',
          cleanupScript: 'yarn cleanup',
        },
      }),
      prisma.project.upsert({
        where: { id: 'project-3' },
        update: {},
        create: {
          id: 'project-3',
          name: 'Mobile Banking App',
          description: 'React Native mobile banking application',
          gitRepoPath: '/Users/dev/projects/mobile-banking',
          setupScript: 'npm install && pod install',
          devScript: 'npm start',
          cleanupScript: 'npm run clean',
        },
      }),
    ]);

    // Create Tasks
    console.log('📝 Creating tasks...');
    const taskData = [
      // E-Commerce Platform tasks
      {
        id: 'task-ec-1',
        projectId: 'project-1',
        title: 'Implement shopping cart',
        description: 'Add shopping cart functionality with Redux',
        status: 'completed',
        priority: 'high',
        taskType: 'story',
      },
      {
        id: 'task-ec-2',
        projectId: 'project-1',
        title: 'Add payment gateway',
        description: 'Integrate Stripe payment processing',
        status: 'in_progress',
        priority: 'urgent',
        taskType: 'task',
      },
      {
        id: 'task-ec-3',
        projectId: 'project-1',
        title: 'Create product search',
        description: 'Implement Elasticsearch for product search',
        status: 'todo',
        priority: 'medium',
        taskType: 'task',
      },
      {
        id: 'task-ec-4',
        projectId: 'project-1',
        title: 'Add user reviews',
        description: 'Allow users to rate and review products',
        status: 'todo',
        priority: 'low',
        taskType: 'story',
      },
      {
        id: 'task-ec-5',
        projectId: 'project-1',
        title: 'Fix checkout bug',
        description: 'Resolve issue with discount code application',
        status: 'in_progress',
        priority: 'urgent',
        taskType: 'task',
      },

      // AI Dashboard tasks
      {
        id: 'task-ai-1',
        projectId: 'project-2',
        title: 'Create metrics dashboard',
        description: 'Real-time metrics visualization with D3.js',
        status: 'completed',
        priority: 'high',
        taskType: 'story',
      },
      {
        id: 'task-ai-2',
        projectId: 'project-2',
        title: 'Add model comparison',
        description: 'Compare performance across different models',
        status: 'completed',
        priority: 'medium',
        taskType: 'task',
      },
      {
        id: 'task-ai-3',
        projectId: 'project-2',
        title: 'Implement data export',
        description: 'Export reports to PDF and CSV',
        status: 'in_progress',
        priority: 'medium',
        taskType: 'task',
      },
      {
        id: 'task-ai-4',
        projectId: 'project-2',
        title: 'Add alerting system',
        description: 'Send alerts when metrics exceed thresholds',
        status: 'todo',
        priority: 'high',
        taskType: 'story',
      },
      {
        id: 'task-ai-5',
        projectId: 'project-2',
        title: 'Optimize queries',
        description: 'Improve database query performance',
        status: 'todo',
        priority: 'low',
        taskType: 'task',
      },

      // Mobile Banking tasks
      {
        id: 'task-mb-1',
        projectId: 'project-3',
        title: 'Implement biometric auth',
        description: 'Add Face ID and fingerprint authentication',
        status: 'completed',
        priority: 'urgent',
        taskType: 'story',
      },
      {
        id: 'task-mb-2',
        projectId: 'project-3',
        title: 'Create transfer flow',
        description: 'Money transfer between accounts',
        status: 'completed',
        priority: 'high',
        taskType: 'story',
      },
      {
        id: 'task-mb-3',
        projectId: 'project-3',
        title: 'Add transaction history',
        description: 'Searchable transaction history with filters',
        status: 'in_progress',
        priority: 'medium',
        taskType: 'task',
      },
      {
        id: 'task-mb-4',
        projectId: 'project-3',
        title: 'Implement push notifications',
        description: 'Real-time transaction notifications',
        status: 'todo',
        priority: 'medium',
        taskType: 'task',
      },
      {
        id: 'task-mb-5',
        projectId: 'project-3',
        title: 'Add dark mode',
        description: 'Support for dark theme',
        status: 'todo',
        priority: 'low',
        taskType: 'task',
      },
    ];

    const tasks = await Promise.all(
      taskData.map(task =>
        prisma.task.upsert({
          where: { id: task.id },
          update: {},
          create: {
            id: task.id,
            projectId: task.projectId,
            title: task.title,
            content: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            taskType: task.taskType,
            startTime:
              task.status !== 'todo'
                ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
                : null,
            endTime:
              task.status === 'completed'
                ? new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000)
                : null,
            duration:
              task.status === 'completed'
                ? parseDuration(`${Math.floor(Math.random() * 48)}h ${Math.floor(Math.random() * 60)}m`)
                : null,
          },
        })
      )
    );

    // Create Task Attempts
    console.log('🔄 Creating task attempts...');
    const attemptData = [
      { taskId: 'task-ec-1', status: 'completed', executor: 'claude-3-opus' },
      { taskId: 'task-ec-2', status: 'failed', executor: 'claude-3-sonnet' },
      { taskId: 'task-ec-2', status: 'completed', executor: 'claude-3-opus' },
      { taskId: 'task-ai-1', status: 'completed', executor: 'gpt-4-turbo' },
      { taskId: 'task-ai-2', status: 'failed', executor: 'claude-3-sonnet' },
      { taskId: 'task-mb-1', status: 'completed', executor: 'claude-3-opus' },
    ];

    const attempts = await Promise.all(
      attemptData.map((attempt, index) =>
        prisma.taskAttempt.create({
          data: {
            id: `attempt-${index + 1}`,
            taskId: attempt.taskId,
            worktreePath: `/tmp/worktree-${index + 1}`,
            branchName: `feature/task-${index + 1}`,
            executor: attempt.executor,
            status: attempt.status,
            mergeCommit: attempt.status === 'completed' ? `abc${index}def` : null,
            stdout: attempt.status === 'completed' ? 'Task completed successfully' : null,
            stderr: attempt.status === 'failed' ? 'Error: Task execution failed' : null,
            completedAt:
              attempt.status === 'completed'
                ? new Date(Date.now() - (7 - index) * 24 * 60 * 60 * 1000)
                : null,
          },
        })
      )
    );

    // Create BDD Scenarios
    console.log('🎭 Creating BDD scenarios...');
    const scenarioData = [
      {
        id: 'bdd-1',
        taskId: 'task-ec-1',
        title: 'User can add items to cart',
        feature: 'Shopping Cart',
        description: 'Verify that users can add products to their shopping cart',
        gherkinContent: `Feature: Shopping Cart
  Scenario: Add item to cart
    Given I am on the product page
    When I click "Add to Cart"
    Then the item should appear in my cart
    And the cart count should increase by 1`,
        status: 'passed',
      },
      {
        id: 'bdd-2',
        taskId: 'task-ec-1',
        title: 'User can remove items from cart',
        feature: 'Shopping Cart',
        description: 'Verify that users can remove products from their cart',
        gherkinContent: `Feature: Shopping Cart
  Scenario: Remove item from cart
    Given I have items in my cart
    When I click "Remove"
    Then the item should be removed
    And the cart count should decrease`,
        status: 'passed',
      },
      {
        id: 'bdd-3',
        taskId: 'task-ec-2',
        title: 'Process credit card payment',
        feature: 'Payment Processing',
        description: 'Verify credit card payment flow',
        gherkinContent: `Feature: Payment
  Scenario: Credit card payment
    Given I am on checkout
    When I enter valid card details
    And I click "Pay Now"
    Then payment should be processed
    And I should see confirmation`,
        status: 'pending',
      },
      {
        id: 'bdd-4',
        taskId: 'task-mb-1',
        title: 'Face ID authentication',
        feature: 'Biometric Auth',
        description: 'User can login with Face ID',
        gherkinContent: `Feature: Authentication
  Scenario: Face ID login
    Given Face ID is enabled
    When I open the app
    Then I should be prompted for Face ID
    And login should succeed after verification`,
        status: 'passed',
      },
    ];

    const scenarios = await Promise.all(
      scenarioData.map(scenario =>
        prisma.bDDScenario.create({
          data: {
            id: scenario.id,
            taskId: scenario.taskId,
            title: scenario.title,
            feature: scenario.feature,
            description: scenario.description,
            gherkinContent: scenario.gherkinContent,
            status: scenario.status,
            executedAt:
              scenario.status !== 'pending'
                ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000)
                : null,
            executionDuration:
              scenario.status !== 'pending' ? Math.floor(Math.random() * 300000) : null,
          },
        })
      )
    );

    // Create Validation Runs
    console.log('✅ Creating validation runs...');
    const validationRunData = [
      {
        taskId: 'task-ec-1',
        success: true,
        environment: 'development',
        totalStages: 14,
        passedStages: 14,
      },
      { taskId: 'task-ec-1', success: true, environment: 'ci', totalStages: 14, passedStages: 14 },
      {
        taskId: 'task-ec-2',
        success: false,
        environment: 'development',
        totalStages: 14,
        passedStages: 12,
      },
      {
        taskId: 'task-ai-1',
        success: true,
        environment: 'development',
        totalStages: 14,
        passedStages: 14,
      },
      { taskId: 'task-ai-2', success: false, environment: 'ci', totalStages: 14, passedStages: 11 },
      {
        taskId: 'task-mb-1',
        success: true,
        environment: 'development',
        totalStages: 14,
        passedStages: 14,
      },
      {
        taskId: 'task-mb-2',
        success: true,
        environment: 'development',
        totalStages: 14,
        passedStages: 13,
      },
    ];

    const validationRuns = await Promise.all(
      validationRunData.map((run, index) =>
        prisma.validationRun.create({
          data: {
            id: `val-run-${index + 1}`,
            taskId: run.taskId,
            timestamp: new Date(Date.now() - (7 - index) * 24 * 60 * 60 * 1000),
            totalTime: Math.floor(Math.random() * 600000 + 60000), // 1-10 minutes
            success: run.success,
            environment: run.environment,
            totalStages: run.totalStages,
            passedStages: run.passedStages,
            failedStages: run.totalStages - run.passedStages,
            triggerType: index % 2 === 0 ? 'manual' : 'hook',
            gitCommit: `${Math.random().toString(36).substring(2, 9)}abcdef`,
            gitBranch: index % 3 === 0 ? 'main' : index % 3 === 1 ? 'develop' : 'feature/test',
          },
        })
      )
    );

    // Create Execution Metrics
    console.log('📊 Creating execution metrics...');
    const metricsData = [
      { executorId: 'claude-1', taskCount: 15, successCount: 13, avgDuration: 3600000 },
      { executorId: 'claude-2', taskCount: 8, successCount: 7, avgDuration: 2400000 },
      { executorId: 'claude-3', taskCount: 12, successCount: 10, avgDuration: 4200000 },
    ];

    const metrics = await Promise.all(
      metricsData.map((metric, index) =>
        prisma.executionMetric.create({
          data: {
            id: `metric-${index + 1}`,
            attemptId: `attempt-${index + 1}`,
            modelUsed: metric.executorId,
            promptTokens: Math.floor(Math.random() * 2000 + 500),
            completionTokens: Math.floor(Math.random() * 1000 + 200),
            durationMs: metric.avgDuration,
            success: metric.successCount > 0,
            validationPassed: metric.successCount > 0,
          },
        })
      )
    );

    // Create AI Models
    console.log('🤖 Creating AI models...');
    const aiModels = await Promise.all([
      prisma.aiModel.upsert({
        where: { name: 'claude-3-opus' },
        update: {},
        create: {
          id: 'model-1',
          name: 'claude-3-opus',
          description: 'Anthropic Claude 3 Opus model',
          endpointUrl: 'https://api.anthropic.com/v1/messages',
          apiKey: 'dummy-key-1',
          provider: 'anthropic',
          modelId: 'claude-3-opus-20240229',
          enabled: true,
        },
      }),
      prisma.aiModel.upsert({
        where: { name: 'gpt-4-turbo' },
        update: {},
        create: {
          id: 'model-2',
          name: 'gpt-4-turbo',
          description: 'OpenAI GPT-4 Turbo model',
          endpointUrl: 'https://api.openai.com/v1/chat/completions',
          apiKey: 'dummy-key-2',
          provider: 'openai',
          modelId: 'gpt-4-turbo-preview',
          enabled: true,
        },
      }),
      prisma.aiModel.upsert({
        where: { name: 'claude-3-sonnet' },
        update: {},
        create: {
          id: 'model-3',
          name: 'claude-3-sonnet',
          description: 'Anthropic Claude 3 Sonnet model',
          endpointUrl: 'https://api.anthropic.com/v1/messages',
          apiKey: 'dummy-key-3',
          provider: 'anthropic',
          modelId: 'claude-3-sonnet-20240229',
          enabled: true,
        },
      }),
    ]);

    // Count all created records
    const counts = {
      projects: await prisma.project.count(),
      tasks: await prisma.task.count(),
      taskAttempts: await prisma.taskAttempt.count(),
      bddScenarios: await prisma.bDDScenario.count(),
      validationRuns: await prisma.validationRun.count(),
      executionMetrics: await prisma.executionMetric.count(),
      aiModels: await prisma.aiModel.count(),
    };

    console.log('\n✨ Database seeded successfully!');
    console.log('📊 Summary:');
    console.log(`  - Projects: ${counts.projects}`);
    console.log(`  - Tasks: ${counts.tasks}`);
    console.log(`  - Task Attempts: ${counts.taskAttempts}`);
    console.log(`  - BDD Scenarios: ${counts.bddScenarios}`);
    console.log(`  - Validation Runs: ${counts.validationRuns}`);
    console.log(`  - Execution Metrics: ${counts.executionMetrics}`);
    console.log(`  - AI Models: ${counts.aiModels}`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDummyData().catch(error => {
  console.error(error);
  process.exit(1);
});
