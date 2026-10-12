import { Router } from 'express';
import { ProjectService, TaskService, TeamService } from '@trackmate/database';
import { z } from 'zod';
import { mcpClient } from '../services/mcpClient.js';

export const projectsRouter = Router();

const CreateProjectSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().optional(),
  status:      z.enum(['active', 'on_hold', 'completed', 'archived']).default('active'),
  githubRepo:  z.string().optional(),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
});

const UpdateProjectSchema = CreateProjectSchema.partial();

// GET /api/projects
projectsRouter.get('/', async (req, res) => {
  try {
    const status = req.query['status'] as any;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;
    const offset = req.query['offset'] ? parseInt(req.query['offset'] as string, 10) : undefined;

    const list = await ProjectService.getProjects({ status, limit, offset });
    res.json({ projects: list, total: list.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /api/projects/:id
projectsRouter.get('/:id', async (req, res) => {
  try {
    const project = await ProjectService.getProjectById(req.params['id']!);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ project });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// POST /api/projects
projectsRouter.post('/', async (req, res) => {
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors });
    return;
  }

  const ownerId = (req.headers['x-user-id'] as string) ?? 'demo-user';

  try {
    const project = await ProjectService.createProject(parsed.data, ownerId);
    res.status(201).json({ project });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// PATCH /api/projects/:id
projectsRouter.patch('/:id', async (req, res) => {
  const parsed = UpdateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors });
    return;
  }

  try {
    const updated = await ProjectService.updateProject(req.params['id']!, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ project: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// DELETE /api/projects/:id
projectsRouter.delete('/:id', async (req, res) => {
  try {
    const success = await ProjectService.deleteProject(req.params['id']!);
    if (!success) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /api/projects/:id/status (Project Progress metrics & blockers)
projectsRouter.get('/:id/status', async (req, res) => {
  try {
    const progress = await ProjectService.getProjectStatus(req.params['id']!);
    if (!progress) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /api/projects/:id/tasks
projectsRouter.get('/:id/tasks', async (req, res) => {
  try {
    const tasks = await TaskService.getTasks({ projectId: req.params['id']! });
    res.json({ tasks, total: tasks.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /api/projects/:id/members
projectsRouter.get('/:id/members', async (req, res) => {
  try {
    const members = await TeamService.getProjectMembers(req.params['id']!);
    res.json({ members, total: members.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// POST /api/projects/:id/members
projectsRouter.post('/:id/members', async (req, res) => {
  const { userId, role } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    const member = await TeamService.addMember(req.params['id']!, userId, role);
    res.status(201).json({ member });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? String(err) });
  }
});

// POST /api/projects/:id/summarize
projectsRouter.post('/:id/summarize', async (req, res) => {
  try {
    const summary = await ProjectService.summarizeProject(req.params['id']!);
    res.json({ summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /api/projects/:id/github-issues
projectsRouter.get('/:id/github-issues', async (req, res) => {
  try {
    const result = await mcpClient.callTool('get_github_issues', { projectId: req.params['id']! });
    const textPart = result.content?.find(c => c.type === 'text')?.text;
    if (!textPart) {
      res.json({ issues: [], total: 0 });
      return;
    }
    const parsed = JSON.parse(textPart);
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// POST /api/projects/:id/convert-issue
projectsRouter.post('/:id/convert-issue', async (req, res) => {
  try {
    const { title, description, issueNumber, issueUrl, priority } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    const task = await TaskService.createTask({
      title,
      description: description ?? null,
      status: 'todo',
      priority: priority ?? 'medium',
      projectId: req.params['id']!,
      tags: ['github', `issue-${issueNumber ?? 'ref'}`],
      githubIssueUrl: issueUrl ?? null,
    });
    res.status(201).json({ task });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});
