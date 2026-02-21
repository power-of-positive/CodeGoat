import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simpleSeed() {
  console.log('🌱 Starting simple seed...');

  try {
    // Create additional projects
    const project2 = await prisma.project.create({
      data: {
        id: 'proj-ecommerce',
        name: 'E-Commerce Platform',
        description: 'Modern e-commerce platform with React and Node.js',
        gitRepoPath: '/Users/dev/projects/ecommerce-platform',
        setupScript: 'npm install',
        devScript: 'npm run dev',
        cleanupScript: 'npm run clean',
      },
    });

    const project3 = await prisma.project.create({
      data: {
        id: 'proj-ai-dashboard',
        name: 'AI Analytics Dashboard',
        description: 'Real-time analytics dashboard for AI models',
        gitRepoPath: '/Users/dev/projects/ai-dashboard',
        setupScript: 'yarn install',
        devScript: 'yarn dev',
        cleanupScript: 'yarn clean',
      },
    });

    console.log('✅ Created projects');

    // Create more tasks
    const tasks = await Promise.all([
      prisma.task.create({
        data: {
          id: 'task-ecom-1',
          projectId: 'proj-ecommerce',
          title: 'Implement shopping cart',
          content: 'Implement shopping cart',
          description: 'Add shopping cart functionality with Redux',
          status: 'completed',
          priority: 'high',
          taskType: 'story',
          startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.task.create({
        data: {
          id: 'task-ecom-2',
          projectId: 'proj-ecommerce',
          title: 'Add payment gateway',
          content: 'Add payment gateway',
          description: 'Integrate Stripe payment processing',
          status: 'in_progress',
          priority: 'urgent',
          taskType: 'task',
          startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.task.create({
        data: {
          id: 'task-ai-1',
          projectId: 'proj-ai-dashboard',
          title: 'Create metrics dashboard',
          content: 'Create metrics dashboard',
          description: 'Real-time metrics visualization with D3.js',
          status: 'completed',
          priority: 'high',
          taskType: 'story',
          startTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.task.create({
        data: {
          id: 'task-ai-2',
          projectId: 'proj-ai-dashboard',
          title: 'Add model comparison',
          content: 'Add model comparison',
          description: 'Compare performance across different models',
          status: 'pending',
          priority: 'medium',
          taskType: 'task',
        },
      }),
    ]);

    console.log('✅ Created tasks');

    // Create some AI models
    const aiModels = await Promise.all([
      prisma.aiModel.create({
        data: {
          id: 'model-claude-opus',
          name: 'claude-3-opus',
          description: 'Anthropic Claude 3 Opus - Most capable model',
          endpointUrl: 'https://api.anthropic.com/v1/messages',
          apiKey: 'sk-ant-dummy-key-opus',
          provider: 'anthropic',
          modelId: 'claude-3-opus-20240229',
          enabled: true,
        },
      }),
      prisma.aiModel.create({
        data: {
          id: 'model-gpt4',
          name: 'gpt-4-turbo',
          description: 'OpenAI GPT-4 Turbo - Fast and capable',
          endpointUrl: 'https://api.openai.com/v1/chat/completions',
          apiKey: 'sk-dummy-openai-key',
          provider: 'openai',
          modelId: 'gpt-4-turbo-preview',
          enabled: true,
        },
      }),
    ]);

    console.log('✅ Created AI models');

    // Create some BDD scenarios
    const bddScenarios = await Promise.all([
      prisma.bDDScenario.create({
        data: {
          id: 'bdd-cart-1',
          taskId: 'task-ecom-1',
          title: 'User can add items to cart',
          feature: 'Shopping Cart',
          description: 'Verify users can add products to cart',
          gherkinContent: `Feature: Shopping Cart
Scenario: Add item to cart
  Given I am on the product page
  When I click "Add to Cart"
  Then the item should appear in my cart`,
          status: 'passed',
          executedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          executionDuration: 15000,
        },
      }),
      prisma.bDDScenario.create({
        data: {
          id: 'bdd-payment-1',
          taskId: 'task-ecom-2',
          title: 'Process credit card payment',
          feature: 'Payment',
          description: 'Verify credit card payment flow',
          gherkinContent: `Feature: Payment Processing
Scenario: Successful payment
  Given I have items in cart
  When I enter valid card details
  Then payment should be processed`,
          status: 'pending',
        },
      }),
    ]);

    console.log('✅ Created BDD scenarios');

    // Create validation runs
    const validationRuns = await Promise.all([
      prisma.validationRun.create({
        data: {
          id: 'val-run-1',
          taskId: 'task-ecom-1',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          totalTime: 180000, // 3 minutes
          totalStages: 14,
          passedStages: 14,
          failedStages: 0,
          success: true,
          triggerType: 'manual',
          environment: 'development',
          gitCommit: 'abc123def456',
          gitBranch: 'feature/shopping-cart',
        },
      }),
      prisma.validationRun.create({
        data: {
          id: 'val-run-2',
          taskId: 'task-ecom-2',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          totalTime: 240000, // 4 minutes
          totalStages: 14,
          passedStages: 12,
          failedStages: 2,
          success: false,
          triggerType: 'hook',
          environment: 'ci',
          gitCommit: 'def456ghi789',
          gitBranch: 'feature/payment-gateway',
        },
      }),
    ]);

    console.log('✅ Created validation runs');

    // Show final counts
    const counts = {
      projects: await prisma.project.count(),
      tasks: await prisma.task.count(),
      aiModels: await prisma.aiModel.count(),
      bddScenarios: await prisma.bDDScenario.count(),
      validationRuns: await prisma.validationRun.count(),
    };

    console.log('\n🎉 Seeding completed!');
    console.log('📊 Final counts:');
    console.log(`  Projects: ${counts.projects}`);
    console.log(`  Tasks: ${counts.tasks}`);
    console.log(`  AI Models: ${counts.aiModels}`);
    console.log(`  BDD Scenarios: ${counts.bddScenarios}`);
    console.log(`  Validation Runs: ${counts.validationRuns}`);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

simpleSeed().catch(error => {
  console.error('Failed to seed database:', error);
  process.exit(1);
});
