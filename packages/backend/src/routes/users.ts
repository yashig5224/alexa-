import { Router } from 'express';
import { TeamService } from '@trackmate/database';

export const usersRouter = Router();

// GET /api/users
usersRouter.get('/', async (_req, res) => {
  try {
    const list = await TeamService.getUsers();
    res.json({ users: list, total: list.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /api/users/:id
usersRouter.get('/:id', async (req, res) => {
  try {
    const user = await TeamService.getUserById(req.params['id']!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});
