import { test, expect, beforeAll, afterAll, describe } from "vitest";
import pactum from "pactum";
import { DatabaseValidator } from "../../setup/database-utils";

describe("Table Structure Schema Validation", () => {
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

  test("should validate table structure through API compatibility", async () => {
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Table Structure Test Project ${timestamp}`,
        git_repo_path: `/tmp/table-structure-test-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    const task = await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "Table Structure Test Task",
        description: "Task for testing table structure compatibility",
      })
      .expectStatus(200)
      .returns("data");

    // Validate API response structure
    expect(project.id).toBeDefined();
    expect(task.id).toBeDefined();
    expect(task.project_id).toBe(project.id);

    // Validate database table structure (migration confidence)
    const dbProject = dbValidator.getDbProject(project.id);
    const dbTask = dbValidator.getDbTask(task.id);

    expect(dbProject).toBeTruthy();
    expect(dbTask).toBeTruthy();
    expect(dbTask?.project_id).toBe(project.id);

    // Cleanup
    await pactum.spec().delete(`/api/projects/${project.id}`).expectStatus(200);
  });
});
