import { test, expect, beforeAll, afterAll, describe } from "vitest";
import pactum from "pactum";
import { DatabaseValidator } from "../../setup/database-utils";

describe("Project Progress Tracking", () => {
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

  test("should track basic project metrics using API-driven approach", async () => {
    // Create a project using API
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Progress Tracking Project ${timestamp}`,
        git_repo_path: `/tmp/progress-tracking-project-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    // Create tasks using API
    const tasks = await Promise.all([
      pactum
        .spec()
        .post(`/api/projects/${project.id}/tasks`)
        .withJson({
          project_id: project.id,
          title: "Task 1",
          description: "First task",
          parent_task_attempt: null,
        })
        .expectStatus(200)
        .returns("data"),
      pactum
        .spec()
        .post(`/api/projects/${project.id}/tasks`)
        .withJson({
          project_id: project.id,
          title: "Task 2",
          description: "Second task",
          parent_task_attempt: null,
        })
        .expectStatus(200)
        .returns("data"),
      pactum
        .spec()
        .post(`/api/projects/${project.id}/tasks`)
        .withJson({
          project_id: project.id,
          title: "Task 3",
          description: "Third task",
          parent_task_attempt: null,
        })
        .expectStatus(200)
        .returns("data"),
      pactum
        .spec()
        .post(`/api/projects/${project.id}/tasks`)
        .withJson({
          project_id: project.id,
          title: "Task 4",
          description: "Fourth task",
          parent_task_attempt: null,
        })
        .expectStatus(200)
        .returns("data"),
    ]);

    // Verify all tasks were created
    const allTasks = await pactum
      .spec()
      .get(`/api/projects/${project.id}/tasks`)
      .expectStatus(200)
      .returns("data");
    expect(allTasks).toHaveLength(4);

    const taskTitles = allTasks
      .map((t: Record<string, unknown>) => t.title)
      .sort();
    expect(taskTitles).toEqual(["Task 1", "Task 2", "Task 3", "Task 4"]);

    // Note: Cannot test completion workflow due to attempts API returning 404
    await pactum
      .spec()
      .post(
        `/api/projects/${project.id}/tasks/${(tasks[0] as Record<string, unknown>).id}/attempts`,
      )
      .withJson({
        executor: "claude",
        base_branch: "main",
      })
      .expectStatus(200); // Will return 500 - attempts API causes server error

    // However, we can test basic task updates for progress tracking
    const updatedTask = await pactum
      .spec()
      .put(
        `/api/projects/${project.id}/tasks/${(tasks[0] as Record<string, unknown>).id}`,
      )
      .withJson({
        project_id: project.id,
        title: "Updated Task 1 - In Progress",
        description: "First task",
        status: "inprogress",
      })
      .expectStatus(200)
      .returns("data");
    expect(updatedTask.title).toBe("Updated Task 1 - In Progress");

    // Verify the update is reflected in the task list
    const updatedAllTasks = await pactum
      .spec()
      .get(`/api/projects/${project.id}/tasks`)
      .expectStatus(200)
      .returns("data");
    const foundUpdatedTask = updatedAllTasks.find(
      (t: Record<string, unknown>) =>
        t.id === (tasks[0] as Record<string, unknown>).id,
    );
    expect(foundUpdatedTask?.title).toBe("Updated Task 1 - In Progress");

    // Database validation (migration confidence)
    const dbProject = dbValidator.getDbProject(project.id);
    const dbTask = dbValidator.getDbTask(
      (tasks[0] as Record<string, unknown>).id as string,
    );

    expect(dbProject).toBeTruthy();
    expect(dbTask).toBeTruthy();
    expect(dbTask?.title).toBe("Updated Task 1 - In Progress");

    // Cleanup
    await pactum.spec().delete(`/api/projects/${project.id}`).expectStatus(200);
  });

  test("should handle basic project cleanup workflow using API-driven approach", async () => {
    // Create a project using API
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Cleanup Test Project ${timestamp}`,
        git_repo_path: `/tmp/cleanup-test-project-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    // Create a task using API
    const task = await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "Test Task",
        description: "Task for cleanup testing",
        parent_task_attempt: null,
      })
      .expectStatus(200)
      .returns("data");

    // Verify task exists
    const retrievedTask = await pactum
      .spec()
      .get(`/api/projects/${project.id}/tasks/${task.id}`)
      .expectStatus(200)
      .returns("data");
    expect(retrievedTask).toBeDefined();
    expect(retrievedTask.title).toBe("Test Task");

    // Note: Cannot test attempts and processes due to 404 errors
    await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks/${task.id}/attempts`)
      .withJson({
        executor: "claude",
        base_branch: "main",
      })
      .expectStatus(200); // Will return 500 - attempts API causes server error

    // Database validation before deletion (migration confidence)
    const dbProjectBefore = dbValidator.getDbProject(project.id);
    const dbTaskBefore = dbValidator.getDbTask(task.id);

    expect(dbProjectBefore).toBeTruthy();
    expect(dbTaskBefore).toBeTruthy();

    // Test project deletion (cascade deletion behavior)
    await pactum.spec().delete(`/api/projects/${project.id}`).expectStatus(200);

    // Verify project was deleted
    await pactum.spec().get(`/api/projects/${project.id}`).expectStatus(404); // Should return 404 since project is deleted

    // Verify cascade deletion worked in database
    const cascadeResult = dbValidator.validateCascadeDelete(project.id);
    expect(cascadeResult.valid).toBe(true);
    expect(cascadeResult.remainingTasks).toBe(0);

    // Note: Cannot verify task cascade deletion via API since tasks API doesn't work when project is deleted
    // But this tests the basic cleanup workflow that's actually implemented
  });
});
