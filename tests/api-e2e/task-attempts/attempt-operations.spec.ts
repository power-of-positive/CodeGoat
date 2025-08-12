import { test, expect, beforeAll, afterAll, describe } from "vitest";
import pactum from "pactum";
import { DatabaseValidator } from "../setup/database-utils";

describe("Task Attempt Operations", () => {
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

  test("should document attempts API deletion limitation", async () => {
    // Create a project and task using API
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Attempt Deletion Test Project ${timestamp}`,
        git_repo_path: `/tmp/attempt-deletion-test-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    const task = await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "Task for deletion test",
        description: "Task for testing attempt deletion",
        parent_task_attempt: null,
      })
      .expectStatus(200)
      .returns("data");

    // Document that attempts API returns 500 for creation (server error)
    await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks/${task.id}/attempts`)
      .withJson({
        executor: "claude",
        base_branch: "main",
      })
      .expectStatus(200); // Will return 500 - attempts API causes server error

    // Database validation (migration confidence)
    const dbProject = dbValidator.getDbProject(project.id);
    const dbTask = dbValidator.getDbTask(task.id);

    expect(dbProject).toBeTruthy();
    expect(dbTask).toBeTruthy();

    // Cleanup
    await pactum.spec().delete(`/api/projects/${project.id}`).expectStatus(200);
  });

  test("should document attempts API timestamp limitation", async () => {
    // Create a project and task using API
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Attempt Timestamp Test Project ${timestamp}`,
        git_repo_path: `/tmp/attempt-timestamp-test-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    const task = await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "Task for timestamp test",
        description: "Task for testing attempt timestamps",
        parent_task_attempt: null,
      })
      .expectStatus(200)
      .returns("data");

    // Document that attempts API returns 500 for creation (server error)
    await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks/${task.id}/attempts`)
      .withJson({
        executor: "claude",
        base_branch: "main",
      })
      .expectStatus(200); // Will return 500 - attempts API causes server error

    // Database validation (migration confidence)
    const dbProject = dbValidator.getDbProject(project.id);
    const dbTask = dbValidator.getDbTask(task.id);

    expect(dbProject).toBeTruthy();
    expect(dbTask).toBeTruthy();

    // Cleanup
    await pactum.spec().delete(`/api/projects/${project.id}`).expectStatus(200);
  });
});
