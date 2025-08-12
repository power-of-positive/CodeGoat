import { test, expect, beforeAll, afterAll, describe } from "vitest";
import pactum from "pactum";
import { DatabaseValidator } from "../setup/database-utils";

describe("Data Integrity and Migration", () => {
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

  test("should validate API data integrity using API-driven approach", async () => {
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Data Integrity Test Project ${timestamp}`,
        git_repo_path: `/tmp/data-integrity-test-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    // Create multiple tasks concurrently
    const [task1, task2] = await Promise.all([
      pactum
        .spec()
        .post(`/api/projects/${project.id}/tasks`)
        .withJson({
          project_id: project.id,
          title: "Task 1",
          description: "First task",
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
        })
        .expectStatus(200)
        .returns("data"),
    ]);

    // Validate project retrieval
    await pactum
      .spec()
      .get(`/api/projects/${project.id}`)
      .expectStatus(200)
      .expectJsonLike({
        data: {
          name: project.name,
          git_repo_path: project.git_repo_path,
        },
      });

    // Validate tasks retrieval and integrity
    const allTasks = await pactum
      .spec()
      .get(`/api/projects/${project.id}/tasks`)
      .expectStatus(200)
      .returns("data");
    expect(allTasks).toHaveLength(2);
    expect(
      (allTasks as Record<string, unknown>[])
        .map((t: Record<string, unknown>) => t.title)
        .sort(),
    ).toEqual(["Task 1", "Task 2"]);

    // Validate database integrity
    const dbProject = dbValidator.getDbProject(project.id);
    const dbTask1 = dbValidator.getDbTask(
      (task1 as Record<string, unknown>).id as string,
    );
    const dbTask2 = dbValidator.getDbTask(
      (task2 as Record<string, unknown>).id as string,
    );

    expect(dbProject).toBeTruthy();
    expect(dbTask1?.project_id).toBe(project.id);
    expect(dbTask2?.project_id).toBe(project.id);

    // Cleanup
    await pactum.spec().delete(`/api/projects/${project.id}`).expectStatus(200);
  });

  test("should validate API data type compatibility", async () => {
    const project = await pactum
      .spec()
      .post("/api/projects")
      .withJson({
        name: `Type Test Project ${timestamp}`,
        git_repo_path: `/tmp/type-test-${timestamp}`,
        use_existing_repo: false,
      })
      .expectStatus(200)
      .returns("data");

    const task = await pactum
      .spec()
      .post(`/api/projects/${project.id}/tasks`)
      .withJson({
        project_id: project.id,
        title: "Type Test Task",
        description: "Task for testing data types",
      })
      .expectStatus(200)
      .returns("data");

    // Validate task retrieval and data types
    const retrievedTask = await pactum
      .spec()
      .get(`/api/projects/${project.id}/tasks/${task.id}`)
      .expectStatus(200)
      .returns("data");

    // Validate timestamp fields exist and are valid
    expect((retrievedTask as Record<string, unknown>).created_at).toBeDefined();
    expect((retrievedTask as Record<string, unknown>).updated_at).toBeDefined();

    const createdAt = new Date(
      (retrievedTask as Record<string, unknown>).created_at as string,
    );
    const updatedAt = new Date(
      (retrievedTask as Record<string, unknown>).updated_at as string,
    );

    expect(createdAt.getTime()).toBeGreaterThan(0);
    expect(updatedAt.getTime()).toBeGreaterThan(0);

    // Validate field data types
    expect(typeof (retrievedTask as Record<string, unknown>).title).toBe(
      "string",
    );
    expect(typeof (retrievedTask as Record<string, unknown>).description).toBe(
      "string",
    );
    expect(typeof (retrievedTask as Record<string, unknown>).project_id).toBe(
      "string",
    );
    expect(typeof (retrievedTask as Record<string, unknown>).status).toBe(
      "string",
    );

    // Validate database type consistency
    const dbTask = dbValidator.getDbTask(task.id);
    expect(typeof dbTask?.title).toBe("string");
    expect(typeof dbTask?.description).toBe("string");
    expect(typeof dbTask?.project_id).toBe("string");

    // Cleanup
    await pactum.spec().delete(`/api/projects/${project.id}`).expectStatus(200);
  });
});
