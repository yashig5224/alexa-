import { Router } from 'express';
import { db, users } from '@trackmate/database';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'crypto';

export const usersRouter = Router();

function now() { return new Date().toISOString(); }

// GET /api/users
usersRouter.get('/', async (_req, res) => {
  try {
    const rows = await db.select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl, role: users.role }).from(users);
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/users/:id
usersRouter.get('/:id', async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.params['id']!)).limit(1);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const { ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
