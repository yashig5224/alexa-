import { Router } from 'express';
import { db, projects, tasks, projectMembers } from '@trackmate/database';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'crypto';

export const projectsRouter = Router();

const CreateProjectSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().optional(),
  status:      z.enum(['active', 'on_hold', 'completed', 'archived']).default('active'),
  githubRepo:  z.string().optional(),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
});

const UpdateProjectSchema = CreateProjectSchema.partial();

function now() { return new Date().toISOString(); }

// GET /api/projects
projectsRouter.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(projects);
    res.json({ projects: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/projects/:id
projectsRouter.get('/:id', async (req, res) => {
  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, req.params['id']!)).limit(1);
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/projects
projectsRouter.post('/', async (req, res) => {
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors }); return; }

  // TODO: replace with real auth user ID
  const ownerId = (req.headers['x-user-id'] as string) ?? 'demo-user';

  try {
    const id = randomUUID();
    await db.insert(projects).values({
      id, ...parsed.data, ownerId, createdAt: now(), updatedAt: now(),
      description: parsed.data.description ?? null,
      githubRepo: parsed.data.githubRepo ?? null,
    });
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /api/projects/:id
projectsRouter.patch('/:id', async (req, res) => {
  const parsed = UpdateProjectSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors }); return; }

  try {
    const [existing] = await db.select().from(projects).where(eq(projects.id, req.params['id']!)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Project not found' }); return; }

    await db.update(projects).set({ ...parsed.data, updatedAt: now() }).where(eq(projects.id, req.params['id']!));
    const [updated] = await db.select().from(projects).where(eq(projects.id, req.params['id']!)).limit(1);
    res.json({ project: updated });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/projects/:id
projectsRouter.delete('/:id', async (req, res) => {
  try {
    const [existing] = await db.select().from(projects).where(eq(projects.id, req.params['id']!)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Project not found' }); return; }

    await db.delete(projects).where(eq(projects.id, req.params['id']!));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/projects/:id/tasks
projectsRouter.get('/:id/tasks', async (req, res) => {
  try {
    const rows = await db.select().from(tasks).where(eq(tasks.projectId, req.params['id']!));
    const result = rows.map(t => ({
      ...t,
      tags: (() => { try { return JSON.parse(t.tags); } catch { return []; } })(),
    }));
    res.json({ tasks: result });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
