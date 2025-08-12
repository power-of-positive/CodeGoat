import { test, expect, beforeAll, afterAll, describe } from "vitest";
import pactum from "pactum";
import { DatabaseValidator } from "../setup/database-utils";

describe("Basic Foreign Key Constraints Validation", () => {
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

  test("should enforce foreign key constraint for task.project_id", async () => {
    // Try to create task with non-existent project_id - should fail
    await pactum
      .spec()
      .post("/api/projects/non-existent-project-id/tasks")
      .withJson({
        project_id: "non-existent-project-id",
        title: "Test Task",
        description: "This should fail",
        parent_task_attempt: null,
      })
      .expectStatus(400); // Should fail due to invalid project ID
  });

  test("should enforce foreign key constraint for task_attempts.task_id", async () => {
    // Create a valid project first
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Foreign Key Test Project ${timestamp}`,
        git_repo_path: `/tmp/foreign-key-test-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    // Try to create task attempt with non-existent task_id - should fail
    await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks/non-existent-task-id/attempts`)
      .withJson({
        executor: "claude",
      })
      .expectStatus(400); // Should fail due to invalid task ID

    // Cleanup
    await pactum.spec().delete(`/api/projects/${project.id}`).expectStatus(200);
  });

  test("should allow valid foreign key references", async () => {
    // Create a valid project
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Valid Foreign Key Test Project ${timestamp}`,
        git_repo_path: `/tmp/valid-foreign-key-test-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    // Create task with valid project_id
    const task = await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "Valid Task",
        description: "This should succeed",
        parent_task_attempt: null,
      })
      .expectStatus(200)
      .expectJsonLike({
        data: {
          project_id: project.id,
          title: "Valid Task",
        },
      })
      .returns("data");

    // Validate database foreign key relationship
    const dbTask = dbValidator.getDbTask(task.id);
    expect(dbTask?.project_id).toBe(project.id);

    // Cleanup
    await pactum.spec().delete(`/api/projects/${project.id}`).expectStatus(200);
  });
});
