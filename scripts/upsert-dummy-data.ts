import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { parseDuration } from '../src/utils/parse-duration';

const prisma = new PrismaClient();

async function upsertDummyData() {
  console.log('🌱 Starting to upsert dummy data...');

  try {
    // Upsert Projects
    console.log('📁 Upserting projects...');
    const projects = await Promise.all([
      prisma.project.upsert({
        where: { id: 'project-ecom' },
        update: {},
        create: {
          id: 'project-ecom',
          name: 'E-Commerce Platform',
          description: 'Modern e-commerce platform with React and Node.js',
          gitRepoPath: '/Users/dev/projects/ecommerce-platform-demo',
          setupScript: 'npm install && npm run setup',
          devScript: 'npm run dev',
          cleanupScript: 'npm run cleanup',
        },
      }),
      prisma.project.upsert({
        where: { id: 'project-ai-dash' },
        update: {},
        create: {
          id: 'project-ai-dash',
          name: 'AI Analytics Dashboard',
          description: 'Analytics dashboard for AI model performance tracking',
          gitRepoPath: '/Users/dev/projects/ai-dashboard-demo',
          setupScript: 'yarn install',
          devScript: 'yarn dev',
          cleanupScript: 'yarn cleanup',
        },
      }),
      prisma.project.upsert({
        where: { id: 'project-mobile-bank' },
        update: {},
        create: {
          id: 'project-mobile-bank',
          name: 'Mobile Banking App',
          description: 'React Native mobile banking application',
          gitRepoPath: '/Users/dev/projects/mobile-banking-demo',
          setupScript: 'npm install && pod install',
          devScript: 'npm start',
          cleanupScript: 'npm run clean',
        },
      }),
    ]);

    // Upsert Tasks
    console.log('📝 Upserting tasks...');
    const taskData = [
      // E-Commerce Platform tasks
      {
        id: 'CODEGOAT-002',
        projectId: 'project-ecom',
        title: 'Implement shopping cart',
        description: 'Add shopping cart functionality with Redux',
        status: 'completed',
        priority: 'high',
        taskType: 'story',
      },
      {
        id: 'CODEGOAT-003',
        projectId: 'project-ecom',
        title: 'Add payment gateway',
        description: 'Integrate Stripe payment processing',
        status: 'in_progress',
        priority: 'urgent',
        taskType: 'task',
      },
      {
        id: 'CODEGOAT-004',
        projectId: 'project-ecom',
        title: 'Create product search',
        description: 'Implement Elasticsearch for product search',
        status: 'pending',
        priority: 'medium',
        taskType: 'task',
      },
      {
        id: 'CODEGOAT-005',
        projectId: 'project-ecom',
        title: 'Add user reviews',
        description: 'Allow users to rate and review products',
        status: 'pending',
        priority: 'low',
        taskType: 'story',
      },
      {
        id: 'CODEGOAT-006',
        projectId: 'project-ecom',
        title: 'Fix checkout bug',
        description: 'Resolve issue with discount code application',
        status: 'in_progress',
        priority: 'urgent',
        taskType: 'task',
      },

      // AI Dashboard tasks
      {
        id: 'CODEGOAT-007',
        projectId: 'project-ai-dash',
        title: 'Create metrics dashboard',
        description: 'Real-time metrics visualization with D3.js',
        status: 'completed',
        priority: 'high',
        taskType: 'story',
      },
      {
        id: 'CODEGOAT-008',
        projectId: 'project-ai-dash',
        title: 'Add model comparison',
        description: 'Compare performance across different models',
        status: 'completed',
        priority: 'medium',
        taskType: 'task',
      },
      {
        id: 'CODEGOAT-009',
        projectId: 'project-ai-dash',
        title: 'Implement data export',
        description: 'Export reports to PDF and CSV',
        status: 'in_progress',
        priority: 'medium',
        taskType: 'task',
      },
      {
        id: 'CODEGOAT-010',
        projectId: 'project-ai-dash',
        title: 'Add alerting system',
        description: 'Send alerts when metrics exceed thresholds',
        status: 'pending',
        priority: 'high',
        taskType: 'story',
      },
      {
        id: 'CODEGOAT-011',
        projectId: 'project-ai-dash',
        title: 'Optimize queries',
        description: 'Improve database query performance',
        status: 'pending',
        priority: 'low',
        taskType: 'task',
      },

      // Mobile Banking tasks
      {
        id: 'CODEGOAT-012',
        projectId: 'project-mobile-bank',
        title: 'Implement biometric auth',
        description: 'Add Face ID and fingerprint authentication',
        status: 'completed',
        priority: 'urgent',
        taskType: 'story',
      },
      {
        id: 'CODEGOAT-013',
        projectId: 'project-mobile-bank',
        title: 'Create transfer flow',
        description: 'Money transfer between accounts',
        status: 'completed',
        priority: 'high',
        taskType: 'story',
      },
      {
        id: 'CODEGOAT-014',
        projectId: 'project-mobile-bank',
        title: 'Add transaction history',
        description: 'Searchable transaction history with filters',
        status: 'in_progress',
        priority: 'medium',
        taskType: 'task',
      },
      {
        id: 'CODEGOAT-015',
        projectId: 'project-mobile-bank',
        title: 'Implement push notifications',
        description: 'Real-time transaction notifications',
        status: 'pending',
        priority: 'medium',
        taskType: 'task',
      },
      {
        id: 'CODEGOAT-016',
        projectId: 'project-mobile-bank',
        title: 'Add dark mode',
        description: 'Support for dark theme',
        status: 'pending',
        priority: 'low',
        taskType: 'task',
      },

      // Additional standalone todo tasks (without projectId for API visibility)
      {
        id: 'CODEGOAT-017',
        projectId: null,
        title: 'Refactor authentication module',
        description: 'Improve code organization and security',
        status: 'pending',
        priority: 'high',
        taskType: 'task',
      },
      {
        id: 'CODEGOAT-018',
        projectId: null,
        title: 'Update dependencies',
        description: 'Update all npm packages to latest versions',
        status: 'pending',
        priority: 'medium',
        taskType: 'task',
      },
      {
        id: 'CODEGOAT-019',
        projectId: null,
        title: 'Add error monitoring',
        description: 'Implement Sentry for error tracking',
        status: 'in_progress',
        priority: 'high',
        taskType: 'story',
      },
      {
        id: 'CODEGOAT-020',
        projectId: null,
        title: 'Performance optimization',
        description: 'Optimize API response times and database queries',
        status: 'completed',
        priority: 'medium',
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
            status: task.status as 'pending' | 'in_progress' | 'completed',
            priority: task.priority as 'low' | 'medium' | 'high' | 'urgent',
            taskType: task.taskType as 'story' | 'task',
            startTime:
              task.status !== 'pending'
                ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
                : null,
            endTime:
              task.status === 'completed'
                ? new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000)
                : null,
          },
        })
      )
    );

    // Upsert AI Models
    console.log('🤖 Upserting AI models...');
    const aiModels = await Promise.all([
      prisma.aiModel.upsert({
        where: { name: 'claude-3-opus' },
        update: {},
        create: {
          id: 'model-opus-001',
          name: 'claude-3-opus',
          description: 'Anthropic Claude 3 Opus model',
          endpointUrl: 'https://api.anthropic.com/v1/messages',
          apiKey: 'dummy-key-opus',
          provider: 'anthropic',
          modelId: 'claude-3-opus-20240229',
          enabled: true,
        },
      }),
      prisma.aiModel.upsert({
        where: { name: 'gpt-4-turbo' },
        update: {},
        create: {
          id: 'model-gpt4-001',
          name: 'gpt-4-turbo',
          description: 'OpenAI GPT-4 Turbo model',
          endpointUrl: 'https://api.openai.com/v1/chat/completions',
          apiKey: 'dummy-key-gpt4',
          provider: 'openai',
          modelId: 'gpt-4-turbo-preview',
          enabled: true,
        },
      }),
      prisma.aiModel.upsert({
        where: { name: 'claude-3-sonnet' },
        update: {},
        create: {
          id: 'model-sonnet-001',
          name: 'claude-3-sonnet',
          description: 'Anthropic Claude 3 Sonnet model',
          endpointUrl: 'https://api.anthropic.com/v1/messages',
          apiKey: 'dummy-key-sonnet',
          provider: 'anthropic',
          modelId: 'claude-3-sonnet-20240229',
          enabled: true,
        },
      }),
    ]);

    // Upsert BDD Scenarios
    console.log('🎭 Upserting BDD scenarios...');
    const scenarioData = [
      {
        id: 'bdd-cart-001',
        taskId: 'CODEGOAT-002',
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
        id: 'bdd-cart-002',
        taskId: 'CODEGOAT-002',
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
        id: 'bdd-payment-001',
        taskId: 'CODEGOAT-003',
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
        id: 'bdd-auth-001',
        taskId: 'CODEGOAT-012',
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
      {
        id: 'bdd-dashboard-001',
        taskId: 'CODEGOAT-007',
        title: 'Metrics visualization',
        feature: 'Dashboard',
        description: 'User can view real-time metrics',
        gherkinContent: `Feature: Metrics Dashboard
  Scenario: View real-time metrics
    Given I am logged in
    When I navigate to dashboard
    Then I should see real-time metrics
    And charts should update automatically`,
        status: 'passed',
      },
    ];

    const scenarios = await Promise.all(
      scenarioData.map(scenario =>
        prisma.bDDScenario.upsert({
          where: { id: scenario.id },
          update: {},
          create: {
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

    // Upsert Validation Runs
    console.log('✅ Upserting validation runs...');
    const validationRunData = [
      {
        id: 'val-ecom-cart',
        taskId: 'CODEGOAT-002',
        success: true,
        environment: 'development',
        totalStages: 14,
        passedStages: 14,
      },
      {
        id: 'val-ecom-payment',
        taskId: 'CODEGOAT-003',
        success: false,
        environment: 'development',
        totalStages: 14,
        passedStages: 12,
      },
      {
        id: 'val-ai-dashboard',
        taskId: 'CODEGOAT-007',
        success: true,
        environment: 'development',
        totalStages: 14,
        passedStages: 14,
      },
      {
        id: 'val-ai-comparison',
        taskId: 'CODEGOAT-008',
        success: false,
        environment: 'ci',
        totalStages: 14,
        passedStages: 11,
      },
      {
        id: 'val-mobile-auth',
        taskId: 'CODEGOAT-012',
        success: true,
        environment: 'development',
        totalStages: 14,
        passedStages: 14,
      },
      {
        id: 'val-mobile-transfer',
        taskId: 'CODEGOAT-013',
        success: true,
        environment: 'development',
        totalStages: 14,
        passedStages: 13,
      },
      {
        id: 'val-auth-refactor',
        taskId: 'CODEGOAT-017',
        success: false,
        environment: 'development',
        totalStages: 14,
        passedStages: 10,
      },
      {
        id: 'val-error-monitoring',
        taskId: 'CODEGOAT-019',
        success: true,
        environment: 'ci',
        totalStages: 14,
        passedStages: 14,
      },
    ];

    const validationRuns = await Promise.all(
      validationRunData.map((run, index) =>
        prisma.validationRun.upsert({
          where: { id: run.id },
          update: {},
          create: {
            id: run.id,
            taskId: run.taskId,
            timestamp: new Date(Date.now() - (8 - index) * 24 * 60 * 60 * 1000),
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

    // Count all records
    const counts = {
      projects: await prisma.project.count(),
      tasks: await prisma.task.count(),
      bddScenarios: await prisma.bDDScenario.count(),
      validationRuns: await prisma.validationRun.count(),
      aiModels: await prisma.aiModel.count(),
    };

    console.log('\n✨ Database upserted successfully!');
    console.log('📊 Summary:');
    console.log(`  - Projects: ${counts.projects}`);
    console.log(`  - Tasks: ${counts.tasks}`);
    console.log(`  - BDD Scenarios: ${counts.bddScenarios}`);
    console.log(`  - Validation Runs: ${counts.validationRuns}`);
    console.log(`  - AI Models: ${counts.aiModels}`);
  } catch (error) {
    console.error('❌ Error upserting database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

upsertDummyData().catch(error => {
  console.error(error);
  process.exit(1);
});
