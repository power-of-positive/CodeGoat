import { test, expect, beforeAll, afterAll, describe } from "vitest";
import pactum from "pactum";
import { DatabaseValidator } from "../setup/database-utils";

describe("Basic Cascade Deletion Tests", () => {
  let dbValidator: DatabaseValidator;
  const timestamp = Date.now();

  beforeAll(async () => {
    pactum.request.setBaseUrl("http://localhost:3001");
    dbValidator = new DatabaseValidator();

    // Wait for server
    await pactum.spec().get("/api/health").expectStatus(200).toss();
  });

  afterAll(() => {
    dbValidator?.close();
  });

  test("should cascade delete tasks when project is deleted", async () => {
    // Create a project with tasks
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Cascade Delete Test Project ${timestamp}`,
        git_repo_path: `/tmp/cascade-delete-test-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    // Create some tasks for the project
    const task1 = await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "Task 1",
        description: "First task",
      })
      .expectStatus(200)
      .returns("data");

    const task2 = await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "Task 2",
        description: "Second task",
      })
      .expectStatus(200)
      .returns("data");

    // Verify tasks exist in database before deletion
    expect(dbValidator.getDbTask(task1.id)).toBeTruthy();
    expect(dbValidator.getDbTask(task2.id)).toBeTruthy();

    // Delete project - should cascade delete all tasks
    await pactum.spec().delete(`/api/projects/${project.id}`).expectStatus(200);

    // Verify cascade deletion worked
    const cascadeResult = dbValidator.validateCascadeDelete(project.id);
    expect(cascadeResult.valid).toBe(true);
    expect(cascadeResult.remainingTasks).toBe(0);
    expect(cascadeResult.remainingAttempts).toBe(0);

    // Verify tasks are deleted in database
    expect(dbValidator.getDbTask(task1.id)).toBe(null);
    expect(dbValidator.getDbTask(task2.id)).toBe(null);
  });

  test("should cascade delete task attempts when task is deleted", async () => {
    // Create a project and task
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Task Cascade Delete Test Project ${timestamp}`,
        git_repo_path: `/tmp/task-cascade-delete-test-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    const task = await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "Task to be deleted",
        description: "This task will be deleted",
      })
      .expectStatus(200)
      .returns("data");

    // Verify task exists in database
    expect(dbValidator.getDbTask(task.id)).toBeTruthy();

    // Verify task exists via API
    const tasksBefore = await pactum
      .spec()
      .get(`/api/projects/${project.id}/tasks`)
      .expectStatus(200)
      .returns("data");
    expect(tasksBefore).toHaveLength(1);

    // Delete task
    await pactum
      .spec()
      .delete(`/api/projects/${project.id}/tasks/${task.id}`)
      .expectStatus(200);

    // Verify task deletion in database
    expect(dbValidator.getDbTask(task.id)).toBe(null);

    // Verify task deletion via API
    const tasksAfter = await pactum
      .spec()
      .get(`/api/projects/${project.id}/tasks`)
      .expectStatus(200)
      .returns("data");
    expect(tasksAfter).toHaveLength(0);

    // Cleanup
    await pactum.spec().delete(`/api/projects/${project.id}`).expectStatus(200);
  });

  test.skip("should cascade delete execution processes when attempt is deleted", async () => {
    // SKIPPED: Task attempts API has timeout/git worktree issues
    // This test would validate that deleting a task attempt cascades to delete execution processes
    // Need to investigate timeout issues or mock git operations first

    // Create a project and task
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Attempt Cascade Delete Test Project ${timestamp}`,
        git_repo_path: `/tmp/attempt-cascade-delete-test-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "Task for attempt test",
        description: "Task for testing attempt deletion",
      })
      .expectStatus(200);

    // TODO: Test attempt creation and cascade deletion once timeout issues are resolved

    // Cleanup
    await pactum.spec().delete(`/api/projects/${project.id}`).expectStatus(200);
  });
});
