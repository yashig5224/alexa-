import { Router } from 'express';
import { TaskService, DeadlineService } from '@trackmate/database';
import { z } from 'zod';
import type { TaskStatus, TaskPriority } from '@trackmate/shared';

export const tasksRouter = Router();

const CreateTaskSchema = z.object({
  title:          z.string().min(1).max(200),
  description:    z.string().optional(),
  status:         z.enum(['todo', 'in_progress', 'in_review', 'done', 'blocked']).default('todo'),
  priority:       z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  projectId:      z.string().min(1),
  assigneeId:     z.string().optional(),
  dueDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tags:           z.array(z.string()).default([]),
  githubIssueUrl: z.string().url().optional(),
});

const UpdateTaskSchema = CreateTaskSchema.omit({ projectId: true }).partial();

// GET /api/tasks
tasksRouter.get('/', async (req, res) => {
  try {
    const { projectId, status, priority, assigneeId, overdue, dueBefore, dueAfter, limit, offset } =
      req.query as Record<string, string | undefined>;

    const tasks = await TaskService.getTasks({
      projectId,
      status: status as TaskStatus | undefined,
      priority: priority as TaskPriority | undefined,
      assigneeId,
      overdue: overdue === 'true',
      dueBefore,
      dueAfter,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    res.json({ tasks, total: tasks.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /api/tasks/overdue
tasksRouter.get('/overdue', async (req, res) => {
  try {
    const projectId = req.query['projectId'] as string | undefined;
    const tasks = await DeadlineService.getOverdueTasks({ projectId });
    res.json({ tasks, total: tasks.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /api/tasks/:id
tasksRouter.get('/:id', async (req, res) => {
  try {
    const task = await TaskService.getTaskById(req.params['id']!);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ task });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// POST /api/tasks
tasksRouter.post('/', async (req, res) => {
  const parsed = CreateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors });
    return;
  }

  try {
    const task = await TaskService.createTask(parsed.data);
    res.status(201).json({ task });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// PATCH /api/tasks/:id
tasksRouter.patch('/:id', async (req, res) => {
  const parsed = UpdateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors });
    return;
  }

  try {
    const updated = await TaskService.updateTask(req.params['id']!, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ task: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// DELETE /api/tasks/:id
tasksRouter.delete('/:id', async (req, res) => {
  try {
    const success = await TaskService.deleteTask(req.params['id']!);
    if (!success) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});
