#!/usr/bin/env npx tsx

import { PrismaClient, BDDScenarioStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function findOrCreateTestTask() {
  let task = await prisma.task.findFirst({
    where: { status: BDDScenarioStatus.PENDING }
  });

  if (!task) {
    // Create a dummy task for testing
    task = await prisma.task.create({
      data: {
        id: 'bdd-test-task',
        title: 'BDD Testing Task',
        content: 'Task for testing BDD scenarios functionality',
        status: BDDScenarioStatus.PENDING,
        priority: 'MEDIUM',
        taskType: 'TASK'
      }
    });
    console.log('Created test task:', task.id);
  }
  
  return task;
}

function getSampleScenarios(taskId: string): ScenarioData[] {
  return [
    {
      taskId,
      title: 'User Login Flow',
      feature: 'Authentication',
      description: 'Test user login with valid credentials',
      gherkinContent: `Feature: User Login
        
Scenario: Successful login with valid credentials
  Given I am on the login page
  When I enter valid username "testuser"
  And I enter valid password "password123"
  And I click the login button
  Then I should be redirected to the dashboard
  And I should see a welcome message`,
      status: BDDScenarioStatus.PENDING
    },
    {
      taskId,
      title: 'Task Creation',
      feature: 'Task Management',
      description: 'Test creating a new task',
      gherkinContent: `Feature: Task Management
        
Scenario: Create a new task successfully
  Given I am on the tasks page
  When I click the "Create Task" button
  And I enter task title "Test Task"
  And I enter task description "This is a test task"
  And I click "Save"
  Then I should see the new task in the list
  And I should see a success message`,
      status: BDDScenarioStatus.PENDING
    },
    {
      taskId,
      title: 'Analytics Dashboard',
      feature: 'Analytics',
      description: 'Test analytics dashboard displays correctly',
      gherkinContent: `Feature: Analytics Dashboard
        
Scenario: View validation analytics
  Given I am on the analytics page
  When the page loads
  Then I should see validation run statistics
  And I should see success rate charts
  And I should see recent validation runs`,
      status: BDDScenarioStatus.PASSED
    }
  ];
}

interface ScenarioData {
  taskId: string;
  title: string;
  feature: string;
  description: string;
  gherkinContent: string;
  status: BDDScenarioStatus;
  playwrightTestFile?: string;
  playwrightTestName?: string;
}

async function createScenariosFromData(scenarios: ScenarioData[]) {
  let createdCount = 0;
  for (const scenarioData of scenarios) {
    const existing = await prisma.bDDScenario.findFirst({
      where: { title: scenarioData.title }
    });

    if (!existing) {
      await prisma.bDDScenario.create({
        data: scenarioData
      });
      createdCount++;
      console.log(`✅ Created scenario: ${scenarioData.title}`);
    } else {
      console.log(`⚠️ Scenario already exists: ${scenarioData.title}`);
    }
  }
  
  return createdCount;
}

async function createSampleScenarios() {
  try {
    console.log('Creating sample BDD scenarios...');
    
    const task = await findOrCreateTestTask();
    const scenarios = getSampleScenarios(task.id);
    const createdCount = await createScenariosFromData(scenarios);

    console.log(`\n🎉 Successfully created ${createdCount} BDD scenarios!`);
    console.log('You can now view them in the BDD Tests page.');

  } catch (error) {
    console.error('❌ Error creating BDD scenarios:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  createSampleScenarios().catch(console.error);
}

export { createSampleScenarios };