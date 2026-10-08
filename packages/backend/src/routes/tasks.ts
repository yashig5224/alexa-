import { Router } from 'express';
import { db, tasks } from '@trackmate/database';
import { eq, and, desc, asc, lt, ne, isNotNull } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'crypto';

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

function now() { return new Date().toISOString(); }
function parseTags(raw: string): string[] { try { return JSON.parse(raw); } catch { return []; } }

// GET /api/tasks
tasksRouter.get('/', async (req, res) => {
  try {
    const { projectId, status, priority, assigneeId } = req.query as Record<string, string>;
    const conditions = [];
    if (projectId)  conditions.push(eq(tasks.projectId, projectId));
    if (status)     conditions.push(eq(tasks.status, status as 'todo'));
    if (priority)   conditions.push(eq(tasks.priority, priority as 'low'));
    if (assigneeId) conditions.push(eq(tasks.assigneeId, assigneeId));

    const rows = await db.select().from(tasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tasks.priority), asc(tasks.dueDate));

    res.json({ tasks: rows.map(t => ({ ...t, tags: parseTags(t.tags) })) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/tasks/overdue
tasksRouter.get('/overdue', async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]!;
    const rows = await db.select().from(tasks)
      .where(and(isNotNull(tasks.dueDate), lt(tasks.dueDate, today), ne(tasks.status, 'done')));
    res.json({ tasks: rows.map(t => ({ ...t, tags: parseTags(t.tags) })) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/tasks/:id
tasksRouter.get('/:id', async (req, res) => {
  try {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, req.params['id']!)).limit(1);
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
    res.json({ task: { ...task, tags: parseTags(task.tags) } });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/tasks
tasksRouter.post('/', async (req, res) => {
  const parsed = CreateTaskSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors }); return; }

  try {
    const id = randomUUID();
    await db.insert(tasks).values({
      id,
      ...parsed.data,
      description: parsed.data.description ?? null,
      assigneeId: parsed.data.assigneeId ?? null,
      dueDate: parsed.data.dueDate ?? null,
      tags: JSON.stringify(parsed.data.tags),
      githubIssueUrl: parsed.data.githubIssueUrl ?? null,
      createdAt: now(),
      updatedAt: now(),
    });
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    res.status(201).json({ task: task ? { ...task, tags: parseTags(task.tags) } : null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /api/tasks/:id
tasksRouter.patch('/:id', async (req, res) => {
  const parsed = UpdateTaskSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors }); return; }

  try {
    const [existing] = await db.select().from(tasks).where(eq(tasks.id, req.params['id']!)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Task not found' }); return; }

    const { tags, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest, updatedAt: now() };
    if (tags !== undefined) updateData['tags'] = JSON.stringify(tags);

    await db.update(tasks).set(updateData).where(eq(tasks.id, req.params['id']!));
    const [updated] = await db.select().from(tasks).where(eq(tasks.id, req.params['id']!)).limit(1);
    res.json({ task: updated ? { ...updated, tags: parseTags(updated.tags) } : null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/tasks/:id
tasksRouter.delete('/:id', async (req, res) => {
  try {
    const [existing] = await db.select().from(tasks).where(eq(tasks.id, req.params['id']!)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Task not found' }); return; }

    await db.delete(tasks).where(eq(tasks.id, req.params['id']!));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
