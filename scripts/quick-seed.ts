import { PrismaClient } from '@prisma/client';
import { parseDuration } from '../src/utils/parse-duration';

const prisma = new PrismaClient();

async function quickSeed() {
  console.log('🚀 Quick seeding dummy data...');

  try {
    // Add more tasks to the existing CodeGoat project
    const existingProject = await prisma.project.findFirst();
    const projectId = existingProject?.id || 'project1';

    console.log(`Using project: ${existingProject?.name} (${projectId})`);

    // Create diverse tasks
    const newTasks = await Promise.all([
      prisma.task.create({
        data: {
          id: 'task-frontend-1',
          projectId: projectId,
          title: 'Build React components',
          content: 'Build React components',
          description: 'Create reusable UI components for the dashboard',
          status: 'completed',
          priority: 'high',
          taskType: 'story',
          startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          duration: parseDuration('12h 45m'),
        },
      }),
      prisma.task.create({
        data: {
          id: 'task-backend-1',
          projectId: projectId,
          title: 'Implement REST API',
          content: 'Implement REST API',
          description: 'Create REST endpoints for user management',
          status: 'in_progress',
          priority: 'urgent',
          taskType: 'task',
          startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.task.create({
        data: {
          id: 'task-db-1',
          projectId: projectId,
          title: 'Database optimization',
          content: 'Database optimization',
          description: 'Optimize slow queries and add proper indexes',
          status: 'todo',
          priority: 'medium',
          taskType: 'task',
        },
      }),
      prisma.task.create({
        data: {
          id: 'task-testing-1',
          projectId: projectId,
          title: 'Write integration tests',
          content: 'Write integration tests',
          description: 'Add comprehensive test coverage for API endpoints',
          status: 'todo',
          priority: 'low',
          taskType: 'task',
        },
      }),
      prisma.task.create({
        data: {
          id: 'task-auth-1',
          projectId: projectId,
          title: 'User authentication system',
          content: 'User authentication system',
          description: 'Implement JWT-based authentication with refresh tokens',
          status: 'completed',
          priority: 'urgent',
          taskType: 'story',
          startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          duration: parseDuration('32h 20m'),
        },
      }),
    ]);

    console.log(`✅ Created ${newTasks.length} new tasks`);

    // Create some BDD scenarios
    const bddScenarios = await Promise.all([
      prisma.bDDScenario.create({
        data: {
          id: 'bdd-auth-login',
          taskId: 'task-auth-1',
          title: 'User login flow',
          feature: 'Authentication',
          description: 'Test user login with valid credentials',
          gherkinContent: `Feature: User Authentication
Scenario: Successful login
  Given I am on the login page
  When I enter valid email and password
  Then I should be redirected to dashboard
  And I should see welcome message`,
          status: 'passed',
          executedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          executionDuration: 5200,
        },
      }),
      prisma.bDDScenario.create({
        data: {
          id: 'bdd-api-crud',
          taskId: 'task-backend-1',
          title: 'API CRUD operations',
          feature: 'REST API',
          description: 'Test basic CRUD operations on user resource',
          gherkinContent: `Feature: User API
Scenario: Create user
  Given I have valid user data
  When I POST to /api/users
  Then user should be created
  And response should include user ID`,
          status: 'pending',
        },
      }),
      prisma.bDDScenario.create({
        data: {
          id: 'bdd-ui-components',
          taskId: 'task-frontend-1',
          title: 'UI component rendering',
          feature: 'React Components',
          description: 'Test that components render correctly',
          gherkinContent: `Feature: UI Components
Scenario: Button component
  Given I have a button component
  When I render it with props
  Then it should display correct text
  And handle click events`,
          status: 'passed',
          executedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          executionDuration: 2800,
        },
      }),
    ]);

    console.log(`✅ Created ${bddScenarios.length} BDD scenarios`);

    // Create validation runs
    const validationRuns = await Promise.all([
      prisma.validationRun.create({
        data: {
          id: 'val-auth-success',
          taskId: 'task-auth-1',
          timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
          totalTime: 145000,
          totalStages: 14,
          passedStages: 14,
          failedStages: 0,
          success: true,
          triggerType: 'manual',
          environment: 'development',
          gitCommit: 'a1b2c3d4e5f6',
          gitBranch: 'feature/auth-system',
        },
      }),
      prisma.validationRun.create({
        data: {
          id: 'val-frontend-partial',
          taskId: 'task-frontend-1',
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          totalTime: 198000,
          totalStages: 14,
          passedStages: 12,
          failedStages: 2,
          success: false,
          triggerType: 'hook',
          environment: 'ci',
          gitCommit: 'f6e5d4c3b2a1',
          gitBranch: 'feature/react-components',
        },
      }),
      prisma.validationRun.create({
        data: {
          id: 'val-backend-progress',
          taskId: 'task-backend-1',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          totalTime: 267000,
          totalStages: 14,
          passedStages: 10,
          failedStages: 4,
          success: false,
          triggerType: 'manual',
          environment: 'development',
          gitCommit: 'b2c3d4e5f6a1',
          gitBranch: 'feature/rest-api',
        },
      }),
    ]);

    console.log(`✅ Created ${validationRuns.length} validation runs`);

    // Create some AI models
    const aiModels = await Promise.all([
      prisma.aiModel.create({
        data: {
          id: 'model-claude-opus',
          name: 'claude-3-opus',
          description: 'Anthropic Claude 3 Opus - Most capable model',
          endpointUrl: 'https://api.anthropic.com/v1/messages',
          apiKey: 'sk-ant-dummy-opus',
          provider: 'anthropic',
          modelId: 'claude-3-opus-20240229',
          enabled: true,
        },
      }),
      prisma.aiModel.create({
        data: {
          id: 'model-claude-sonnet',
          name: 'claude-3-sonnet',
          description: 'Anthropic Claude 3 Sonnet - Balanced performance',
          endpointUrl: 'https://api.anthropic.com/v1/messages',
          apiKey: 'sk-ant-dummy-sonnet',
          provider: 'anthropic',
          modelId: 'claude-3-sonnet-20240229',
          enabled: true,
        },
      }),
      prisma.aiModel.create({
        data: {
          id: 'model-gpt4',
          name: 'gpt-4-turbo',
          description: 'OpenAI GPT-4 Turbo - Fast and capable',
          endpointUrl: 'https://api.openai.com/v1/chat/completions',
          apiKey: 'sk-dummy-openai',
          provider: 'openai',
          modelId: 'gpt-4-turbo-preview',
          enabled: true,
        },
      }),
    ]);

    console.log(`✅ Created ${aiModels.length} AI models`);

    // Final count
    const finalCounts = {
      projects: await prisma.project.count(),
      tasks: await prisma.task.count(),
      bddScenarios: await prisma.bDDScenario.count(),
      validationRuns: await prisma.validationRun.count(),
      aiModels: await prisma.aiModel.count(),
    };

    console.log('\n🎉 Database seeded successfully!');
    console.log('📊 Total records:');
    Object.entries(finalCounts).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`);
    });
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

quickSeed().catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
