import { TestFixtures } from './fixtures';

export async function createMultipleProjects(fixtures: TestFixtures, count: number) {
  const projects = [];
  for (let i = 0; i < count; i++) {
    const project = await fixtures.insertProject({
      name: `Test Project ${i + 1}`,
      git_repo_path: `/tmp/test-projects/project-${i + 1}`
    });
    projects.push(project);
  }
  return projects;
}

export async function createCompleteProjectStructure(fixtures: TestFixtures) {
  const project = await fixtures.insertProject();
  
  const tasks = await Promise.all([
    fixtures.insertTask(project.id, { title: 'Setup project' }),
    fixtures.insertTask(project.id, { title: 'Implement feature A' }),
    fixtures.insertTask(project.id, { title: 'Add tests' })
  ]);

  const attempts = await Promise.all([
    fixtures.insertTaskAttempt(tasks[0].id),
    fixtures.insertTaskAttempt(tasks[1].id),
    fixtures.insertTaskAttempt(tasks[2].id)
  ]);

  const processes = await Promise.all([
    fixtures.insertExecutionProcess(attempts[0].id, { status: 'completed', exit_code: 0 }),
    fixtures.insertExecutionProcess(attempts[1].id, { status: 'running' }),
    fixtures.insertExecutionProcess(attempts[2].id, { status: 'failed', exit_code: 1 })
  ]);

  return { 
    project, 
    projects: [project], 
    tasks, 
    attempts, 
    processes,
    templates: []
  };
}

export async function createProjectWithNestedTasks(fixtures: TestFixtures) {
  const project = await fixtures.insertProject({ name: 'Complex Project' });
  
  const parentTask = await fixtures.insertTask(project.id, { 
    title: 'Epic: Implement User Management' 
  });

  const childTasks = await Promise.all([
    fixtures.insertTask(project.id, { 
      title: 'Create user model'
    }),
    fixtures.insertTask(project.id, { 
      title: 'Add authentication'
    }),
    fixtures.insertTask(project.id, { 
      title: 'Build user dashboard'
    })
  ]);

  const attempts = await Promise.all([
    fixtures.insertTaskAttempt(parentTask.id),
    ...childTasks.map(task => fixtures.insertTaskAttempt(task.id))
  ]);

  return { 
    project, 
    projects: [project], 
    parentTask, 
    childTasks, 
    tasks: [parentTask, ...childTasks], 
    attempts,
    processes: [],
    templates: []
  };
}

export async function createTestTemplates(fixtures: TestFixtures) {
  const project = await fixtures.insertProject({
    name: 'Template Test Project',
    git_repo_path: '/tmp/template-test-project'
  });
  
  return Promise.all([
    fixtures.insertTaskTemplate({
      template_name: 'bug-fix',
      title: 'Fix Bug',
      description: 'Template for fixing bugs',
      is_global: true,
      project_id: null
    }),
    fixtures.insertTaskTemplate({
      template_name: 'feature-dev',
      title: 'Develop Feature',
      description: 'Template for developing new features',
      is_global: false,
      project_id: project.id
    })
  ]).then(templates => ({ project, templates }));
}