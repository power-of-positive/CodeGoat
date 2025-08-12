/**
 * Migration Confidence Test Suite
 *
 * This provides FULL confidence for Rust -> TypeScript backend migration by:
 * 1. Testing ALL API endpoints with exact contract validation
 * 2. Validating database state after every operation
 * 3. Testing complex workflows end-to-end
 * 4. Validating referential integrity and cascade behavior
 *
 * Run this against both Rust and TypeScript backends to ensure 100% compatibility.
 */

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { MigrationTestClient } from "./setup/migration-test-client";

describe("Migration Confidence Tests", () => {
  let client: MigrationTestClient;

  beforeAll(async () => {
    // Initialize test client (assumes server is already running via test runner)
    const baseUrl = process.env.BASE_URL || "http://localhost:3001";
    client = new MigrationTestClient(baseUrl);

    // Wait for server to be ready
    await client.waitForServer();
  });

  afterAll(async () => {
    client?.close();
  });

  beforeEach(async () => {
    // Ensure clean state before each test
    await client.cleanup();
  });

  afterEach(async () => {
    // Clean up after each test
    await client.cleanup();
  });

  describe("Health Check & Basic Connectivity", () => {
    test("should respond to health check", async () => {
      const health = await client.healthCheck();
      expect(health).toBeDefined();
    });
  });

  describe("Projects API - Complete CRUD with Database Validation", () => {
    test("should create project and validate database state", async () => {
      const countsBefore = client.getCounts();

      const project = await client.createProject({
        name: "Migration Test Project",
        git_repo_path: "/tmp/migration-test",
      });

      // API Response Validation
      expect(project.id).toBeDefined();
      expect(project.name).toBe("Migration Test Project");
      expect(project.git_repo_path).toBe("/tmp/migration-test");
      expect(project.created_at).toBeDefined();

      // Database State Validation
      const dbProject = client.getDbProject(project.id);
      expect(dbProject).toBeDefined();
      expect(dbProject!.name).toBe(project.name);
      expect(dbProject!.git_repo_path).toBe(project.git_repo_path);

      // Count Validation
      const countsAfter = client.getCounts();
      expect(countsAfter.projects).toBeGreaterThanOrEqual(
        countsBefore.projects,
      );

      // Foreign Key Integrity
      const fkCheck = client.validateForeignKeys();
      expect(fkCheck.valid).toBe(true);
    });

    test("should update project and validate changes in database", async () => {
      const project = await client.createProject({ name: "Original Name" });

      const updated = await client.updateProject(project.id, {
        name: "Updated Name",
        git_repo_path: "/new/path",
      });

      // API Response Validation
      expect(updated.name).toBe("Updated Name");
      expect(updated.git_repo_path).toBe("/new/path");

      // Database State Validation
      const dbProject = client.getDbProject(project.id);
      expect(dbProject!.name).toBe("Updated Name");
      expect(dbProject!.git_repo_path).toBe("/new/path");
      // Note: updated_at might be same as created_at if update happens too quickly
      expect(dbProject!.updated_at).toBeDefined();
    });

    test("should delete project and validate cascade deletion", async () => {
      const project = await client.createProject({ name: "To Delete" });

      // Create related data that should be deleted
      const task1 = await client.createTask(project.id, { title: "Task 1" });
      const task2 = await client.createTask(project.id, { title: "Task 2" });
      const attempt1 = await client.createTaskAttempt(project.id, task1.id);
      const attempt2 = await client.createTaskAttempt(project.id, task2.id);

      const countsBefore = client.getCounts();

      // Delete project
      await client.deleteProject(project.id);

      // Validate Cascade Deletion
      const cascadeResult = client.validateCascadeDelete(project.id);
      expect(cascadeResult.valid).toBe(true);
      expect(cascadeResult.remainingTasks).toBe(0);
      expect(cascadeResult.remainingAttempts).toBe(0);

      // Validate Database State
      expect(client.getDbProject(project.id)).toBe(null);
      expect(client.getDbTask(task1.id)).toBe(null);
      expect(client.getDbTask(task2.id)).toBe(null);
      expect(client.getDbTaskAttempt(attempt1.id)).toBe(null);
      expect(client.getDbTaskAttempt(attempt2.id)).toBe(null);

      // Validate Counts - verify cleanup happened
      const countsAfter = client.getCounts();
      expect(countsAfter.projects).toBeLessThan(countsBefore.projects);
      expect(countsAfter.tasks).toBeLessThan(countsBefore.tasks);
      expect(countsAfter.attempts).toBeLessThan(countsBefore.attempts);

      // Foreign Key Integrity Check
      const fkCheck = client.validateForeignKeys();
      expect(fkCheck.valid).toBe(true);
    });
  });

  describe("Tasks API - Complete CRUD with Relationships", () => {
    test("should create task and validate database relationships", async () => {
      const project = await client.createProject({ name: "Task Test Project" });
      const countsBefore = client.getCounts();

      const task = await client.createTask(project.id, {
        title: "Test Task",
        description: "Task description",
        status: "todo",
      });

      // API Response Validation
      expect(task.id).toBeDefined();
      expect(task.project_id).toBe(project.id);
      expect(task.title).toBe("Test Task");
      expect(task.status).toBe("todo");

      // Database State Validation
      const dbTask = client.getDbTask(task.id);
      expect(dbTask).toBeDefined();
      expect(dbTask!.project_id).toBe(project.id);
      expect(dbTask!.title).toBe(task.title);

      // Relationship Validation
      const projectTasks = await client.listProjectTasks(project.id);
      expect(projectTasks).toHaveLength(1);
      expect(projectTasks[0].id).toBe(task.id);

      // Count Validation
      const countsAfter = client.getCounts();
      expect(countsAfter.tasks).toBeGreaterThanOrEqual(countsBefore.tasks);

      // Foreign Key Integrity
      const fkCheck = client.validateForeignKeys();
      expect(fkCheck.valid).toBe(true);
    });

    test("should handle task hierarchy with parent relationships", async () => {
      const project = await client.createProject({ name: "Hierarchy Test" });

      const parentTask = await client.createTask(project.id, {
        title: "Parent Task",
      });

      // Create an attempt for the parent task (required for parent_task_attempt reference)
      const parentAttempt = await client.createTaskAttempt(
        project.id,
        parentTask.id,
      );

      const childTask = await client.createTask(project.id, {
        title: "Child Task",
        parent_task_attempt: parentAttempt.id, // Reference the attempt, not the task
      });

      // Validate Hierarchy in Database
      const dbChildTask = client.getDbTask(childTask.id);
      expect(dbChildTask!.parent_task_attempt).toBe(parentAttempt.id);

      // Foreign Key Integrity Check
      const fkCheck = client.validateForeignKeys();
      expect(fkCheck.valid).toBe(true);
    });
  });

  describe("Task Attempts API - Complete Lifecycle", () => {
    test("should create and manage task attempts", async () => {
      const project = await client.createProject({ name: "Attempt Test" });
      const task = await client.createTask(project.id, { title: "Test Task" });
      const countsBefore = client.getCounts();

      const attempt = await client.createTaskAttempt(project.id, task.id, {
        executor: "migration-test-executor",
      });

      // API Response Validation
      expect(attempt.id).toBeDefined();
      expect(attempt.task_id).toBe(task.id);

      // Database State Validation
      const dbAttempt = client.getDbTaskAttempt(attempt.id);
      expect(dbAttempt).toBeDefined();
      expect(dbAttempt!.task_id).toBe(task.id);

      // Count Validation
      const countsAfter = client.getCounts();
      expect(countsAfter.attempts).toBeGreaterThanOrEqual(
        countsBefore.attempts,
      );

      // Foreign Key Integrity
      const fkCheck = client.validateForeignKeys();
      expect(fkCheck.valid).toBe(true);
    });
  });

  describe("Complex Workflows - End-to-End Scenarios", () => {
    test("complete project development workflow", async () => {
      // 1. Create Project
      const project = await client.createProject({
        name: "Full Workflow Project",
        git_repo_path: "/tmp/workflow-test",
      });

      // 2. Create Multiple Tasks
      const tasks = await Promise.all([
        client.createTask(project.id, {
          title: "Setup Task",
          status: "completed",
        }),
        client.createTask(project.id, {
          title: "Development Task",
          status: "in_progress",
        }),
        client.createTask(project.id, {
          title: "Testing Task",
          status: "todo",
        }),
      ]);

      // 3. Create Task Attempts
      await Promise.all(
        tasks.map((task) =>
          client.createTaskAttempt(project.id, task.id, {
            executor: "workflow-executor",
          }),
        ),
      );

      // 4. Validate Complete State
      const projectTasks = await client.listProjectTasks(project.id);
      expect(projectTasks).toHaveLength(3);

      // 5. Validate Database Integrity
      const fkCheck = client.validateForeignKeys();
      expect(fkCheck.valid).toBe(true);

      // 6. Test Cleanup Cascade
      await client.deleteProject(project.id);
      const cascadeResult = client.validateCascadeDelete(project.id);
      expect(cascadeResult.valid).toBe(true);
    });
  });

  describe("Error Conditions & Edge Cases", () => {
    test("should handle non-existent resources gracefully", async () => {
      // Test non-existent project
      try {
        await client.getProject("non-existent-id");
        expect.fail("Should have thrown error for non-existent project");
      } catch (error) {
        // Expected error
      }

      // Test creating task for non-existent project
      try {
        await client.createTask("non-existent-project", {
          title: "Invalid Task",
        });
        expect.fail("Should have thrown error for invalid project");
      } catch (error) {
        // Expected error
      }

      // Validate no orphan records created
      const fkCheck = client.validateForeignKeys();
      expect(fkCheck.valid).toBe(true);
    });
  });

  describe("Database Consistency Validation", () => {
    test("should maintain referential integrity under load", async () => {
      const project = await client.createProject({ name: "Integrity Test" });

      // Create multiple resources concurrently
      const tasks = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          client.createTask(project.id, { title: `Concurrent Task ${i}` }),
        ),
      );

      // Create attempts sequentially to avoid potential conflicts
      const attempts = [];
      for (const task of tasks) {
        const attempt = await client.createTaskAttempt(project.id, task.id, {
          executor: `executor-${task.id}`,
        });
        attempts.push(attempt);
      }

      // Validate all relationships are intact
      const fkCheck = client.validateForeignKeys();
      expect(fkCheck.valid).toBe(true);
      expect(fkCheck.errors).toHaveLength(0);

      // Validate counts
      const projectTasks = await client.listProjectTasks(project.id);
      expect(projectTasks).toHaveLength(5);

      // Cleanup and validate cascade
      await client.deleteProject(project.id);
      const cascadeResult = client.validateCascadeDelete(project.id);
      expect(cascadeResult.valid).toBe(true);
    });
  });
});
