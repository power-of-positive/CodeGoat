#!/usr/bin/env npx ts-node

/**
 * Script to verify the todo-list.json sync was successful
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

interface TodoTask {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

interface DbTaskWithScenarios {
  id: string;
  content: string;
  bddScenarios: Array<{
    title: string;
    status: string;
    feature: string;
  }>;
}

const prisma = new PrismaClient();

async function loadAndCompareData() {
  // Read todo-list.json
  const todoListPath = path.join(process.cwd(), 'todo-list.json');
  const todoData = JSON.parse(fs.readFileSync(todoListPath, 'utf8')) as TodoTask[];

  // Get tasks from database
  const dbTasks = await prisma.todoTask.findMany({
    include: {
      bddScenarios: true,
    },
  });

  console.log(`📋 Tasks in todo-list.json: ${todoData.length}`);
  console.log(`💾 Tasks in database: ${dbTasks.length}`);

  return { todoData, dbTasks };
}

function checkTaskConsistency(todoData: TodoTask[], dbTasks: DbTaskWithScenarios[]) {
  // Check if all tasks from todo-list.json are in database
  const todoIds = new Set(todoData.map(task => task.id));
  const dbIds = new Set(dbTasks.map(task => task.id));

  const missingInDb = todoData.filter(task => !dbIds.has(task.id));
  const extraInDb = dbTasks.filter(task => !todoIds.has(task.id));

  if (missingInDb.length > 0) {
    console.log(`❌ Missing tasks in database: ${missingInDb.length}`);
    missingInDb.forEach(task => {
      console.log(`  - ${task.id}: ${task.content.substring(0, 50)}...`);
    });
  } else {
    console.log('✅ All tasks from todo-list.json are in database');
  }

  if (extraInDb.length > 0) {
    console.log(`ℹ️  Extra tasks in database (not in todo-list.json): ${extraInDb.length}`);
    extraInDb.forEach(task => {
      console.log(`  - ${task.id}: ${task.content.substring(0, 50)}...`);
    });
  }
}

function analyzeBDDScenarios(dbTasks: DbTaskWithScenarios[]) {
  // Check BDD scenarios
  const totalScenarios = dbTasks.reduce((sum, task) => sum + task.bddScenarios.length, 0);
  const tasksWithScenarios = dbTasks.filter(task => task.bddScenarios.length > 0).length;
  const tasksWithoutScenarios = dbTasks.filter(task => task.bddScenarios.length === 0).length;

  console.log(`\n📝 BDD Scenarios Summary:`);
  console.log(`  - Total BDD scenarios: ${totalScenarios}`);
  console.log(`  - Tasks with scenarios: ${tasksWithScenarios}`);
  console.log(`  - Tasks without scenarios: ${tasksWithoutScenarios}`);

  if (tasksWithoutScenarios > 0) {
    console.log(`\n⚠️  Tasks without BDD scenarios:`);
    dbTasks
      .filter(task => task.bddScenarios.length === 0)
      .forEach(task => {
        console.log(`  - ${task.id}: ${task.content.substring(0, 50)}...`);
      });
  }
}

function showSampleScenarios(dbTasks: DbTaskWithScenarios[]) {
  // Sample some scenarios
  console.log(`\n📊 Sample BDD scenarios:`);
  const sampleTasks = dbTasks.filter(task => task.bddScenarios.length > 0).slice(0, 3);

  for (const task of sampleTasks) {
    console.log(`\n🔹 Task ${task.id}: ${task.content.substring(0, 40)}...`);
    task.bddScenarios.forEach((scenario, index) => {
      console.log(`  ${index + 1}. ${scenario.title} (${scenario.status})`);
      console.log(`     Feature: ${scenario.feature}`);
    });
  }
}

async function verifySyncResults() {
  try {
    console.log('🔍 Verifying sync results...');

    const { todoData, dbTasks } = await loadAndCompareData();

    checkTaskConsistency(todoData, dbTasks);
    analyzeBDDScenarios(dbTasks);
    showSampleScenarios(dbTasks);

    console.log('\n🎉 Verification completed!');
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifySyncResults().catch(console.error);
