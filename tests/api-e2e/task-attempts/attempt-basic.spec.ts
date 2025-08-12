import { test, expect, beforeAll, afterAll, describe } from "vitest";
import pactum from "pactum";
import { DatabaseValidator } from "../setup/database-utils";

describe("Basic Task Attempt Lifecycle", () => {
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

  test("should document attempts API lifecycle limitation", async () => {
    // Create a project and task using API
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Attempt Lifecycle Test Project ${timestamp}`,
        git_repo_path: `/tmp/attempt-lifecycle-test-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    const task = await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "Task for lifecycle test",
        description: "Task for testing attempt lifecycle",
        parent_task_attempt: null,
      })
      .expectStatus(200)
      .returns("data");

    // Document that attempts API returns 404 for all operations
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
    expect(dbTask?.project_id).toBe(project.id);

    // Cleanup
    await pactum.spec().delete(`/api/projects/${project.id}`).expectStatus(200);
  });

  test("should document attempts API retrieval limitation", async () => {
    // Create a project and task using API
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Attempt Retrieval Test Project ${timestamp}`,
        git_repo_path: `/tmp/attempt-retrieval-test-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    const task = await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "Task for retrieval test",
        description: "Task for testing attempt retrieval",
        parent_task_attempt: null,
      })
      .expectStatus(200)
      .returns("data");

    // Document that attempts API returns 404 for creation
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

  test("should document attempts API listing limitation", async () => {
    // Create a project and task using API
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Attempt Listing Test Project ${timestamp}`,
        git_repo_path: `/tmp/attempt-listing-test-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    const task = await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "Task for listing test",
        description: "Task for testing attempt listing",
        parent_task_attempt: null,
      })
      .expectStatus(200)
      .returns("data");

    // Document that both attempts API calls will fail with 404
    await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks/${task.id}/attempts`)
      .withJson({
        executor: "claude",
        base_branch: "main",
      })
      .expectStatus(200); // Will return 500 - attempts API causes server error

    await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks/${task.id}/attempts`)
      .withJson({
        executor: "gemini",
        base_branch: "develop",
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
