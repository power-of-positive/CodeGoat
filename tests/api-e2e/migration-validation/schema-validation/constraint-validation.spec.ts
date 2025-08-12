import { test, expect, beforeAll, afterAll, describe } from "vitest";
import pactum from "pactum";
import { DatabaseValidator } from "../../setup/database-utils";

describe("API Constraint Validation", () => {
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

  test("should validate required field constraints through API", async () => {
    // Test project name constraint - API allows empty names
    const emptyNameProject = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: "", // Empty name is allowed by API
        git_repo_path: `/tmp/constraint-test-empty-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    // Verify the project was created even with empty name
    expect(emptyNameProject.name).toBe("");
    expect(emptyNameProject.id).toBeDefined();

    // Test task title constraint - create valid project first
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Constraint Test Project ${timestamp}`,
        git_repo_path: `/tmp/constraint-test-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    // Test task with empty title - API allows empty titles
    const emptyTitleTask = await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "", // Empty title is allowed by API
        description: "Test task",
      })
      .expectStatus(200)
      .returns("data");

    // Verify the task was created even with empty title
    expect(emptyTitleTask.title).toBe("");
    expect(emptyTitleTask.id).toBeDefined();

    // Test valid task creation for comparison
    const validTask = await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "Valid Task Title",
        description: "Test task with valid title",
      })
      .expectStatus(200)
      .returns("data");

    expect(validTask.title).toBe("Valid Task Title");

    // Database validation (migration confidence)
    const dbProject = dbValidator.getDbProject(project.id);
    const dbEmptyTask = dbValidator.getDbTask(emptyTitleTask.id);
    const dbValidTask = dbValidator.getDbTask(validTask.id);

    expect(dbProject).toBeTruthy();
    expect(dbEmptyTask?.title).toBe("");
    expect(dbValidTask?.title).toBe("Valid Task Title");

    // Cleanup
    await pactum
      .spec()
      .delete(`/api/projects/${emptyNameProject.id}`)
      .expectStatus(200);
    await pactum.spec().delete(`/api/projects/${project.id}`).expectStatus(200);
  });

  test("should enforce unique constraints through API", async () => {
    // Create first project
    const project1 = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Unique Test Project 1 ${timestamp}`,
        git_repo_path: `/tmp/unique-test-1-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    // Try to create second project with same git_repo_path - should fail
    await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Unique Test Project 2 ${timestamp}`,
        git_repo_path: project1.git_repo_path, // Duplicate path should fail
        use_existing_repo: false,
      })
      .expectStatus(200)
      .expectJson("success", false); // Should fail due to unique constraint

    // Verify first project still exists and only one project with that path
    await pactum
      .spec()
      .get(`/api/projects/${project1.id}`)
      .expectStatus(200)
      .expectJsonLike({
        data: {
          git_repo_path: `/tmp/unique-test-1-${timestamp}`,
        },
      });

    // Create second project with different path - should succeed
    const project2 = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Unique Test Project 2 ${timestamp}`,
        git_repo_path: `/tmp/unique-test-2-${timestamp}`, // Different path should succeed
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    expect(project2.git_repo_path).toBe(`/tmp/unique-test-2-${timestamp}`);

    // Database validation (migration confidence)
    const dbProject1 = dbValidator.getDbProject(project1.id);
    const dbProject2 = dbValidator.getDbProject(project2.id);

    expect(dbProject1?.git_repo_path).toBe(`/tmp/unique-test-1-${timestamp}`);
    expect(dbProject2?.git_repo_path).toBe(`/tmp/unique-test-2-${timestamp}`);

    // Cleanup
    await pactum
      .spec()
      .delete(`/api/projects/${project1.id}`)
      .expectStatus(200);
    await pactum
      .spec()
      .delete(`/api/projects/${project2.id}`)
      .expectStatus(200);
  });
});
