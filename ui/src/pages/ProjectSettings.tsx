import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Save, X, FolderGit2, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '../shared/ui/button';
import { Card, CardContent } from '../shared/ui/card';
import { Input } from '../shared/ui/input';
import { AgentSelector, AgentBadge } from '../shared/components/AgentSelector';
import { projectsApi, Project, CreateProjectData, UpdateProjectData } from '../shared/lib/projects-api';

type AgentType = 'claude_code' | 'openai_codex' | 'openai_o1' | 'anthropic_api' | 'custom';

const ProjectSettings: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    description: '',
    gitRepoPath: '',
    agentType: 'claude_code',
    setupScript: '',
    devScript: '',
    cleanupScript: '',
  });

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectData }) =>
      projectsApi.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingId(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      gitRepoPath: '',
      agentType: 'claude_code',
      setupScript: '',
      devScript: '',
      cleanupScript: '',
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleEdit = (project: Project) => {
    setFormData({
      name: project.name,
      description: project.description || '',
      gitRepoPath: project.gitRepoPath,
      agentType: project.agentType,
      setupScript: project.setupScript,
      devScript: project.devScript,
      cleanupScript: project.cleanupScript,
    });
    setEditingId(project.id);
    setIsCreating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this project? This will also delete all associated tasks.')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="h-7 w-7" />
            Project Settings
          </h1>
          <p className="text-gray-600">Manage projects and configure AI agents</p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          disabled={isCreating || editingId !== null}
          data-testid="create-project-button"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Project' : 'Create New Project'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Project"
                    required
                    data-testid="project-name-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Git Repository Path *
                  </label>
                  <Input
                    value={formData.gitRepoPath}
                    onChange={e => setFormData({ ...formData, gitRepoPath: e.target.value })}
                    placeholder="/path/to/repo"
                    required
                    data-testid="git-repo-path-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Input
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Project description"
                  data-testid="project-description-input"
                />
              </div>

              <AgentSelector
                value={formData.agentType as AgentType}
                onChange={agentType => setFormData({ ...formData, agentType })}
                showDescription={true}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Setup Script
                  </label>
                  <Input
                    value={formData.setupScript}
                    onChange={e => setFormData({ ...formData, setupScript: e.target.value })}
                    placeholder="npm install"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dev Script</label>
                  <Input
                    value={formData.devScript}
                    onChange={e => setFormData({ ...formData, devScript: e.target.value })}
                    placeholder="npm run dev"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cleanup Script
                  </label>
                  <Input
                    value={formData.cleanupScript}
                    onChange={e => setFormData({ ...formData, cleanupScript: e.target.value })}
                    placeholder="npm run cleanup"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? 'Update' : 'Create'} Project
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Projects List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Projects ({projects.length})</h2>
        {projects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderGit2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-4">Create your first project to get started</p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(project => (
              <Card key={project.id} data-testid={`project-card-${project.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(project)}
                        disabled={isCreating || editingId !== null}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(project.id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FolderGit2 className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 font-mono">{project.gitRepoPath}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <AgentBadge agentType={project.agentType} />
                    </div>

                    {project._count && (
                      <div className="flex gap-4 text-sm text-gray-600 pt-2 border-t">
                        <span>{project._count.tasks} tasks</span>
                        <span>{project._count.taskTemplates} templates</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectSettings;
