import { Router } from 'express';
import { DeadlineService } from '@trackmate/database';

export const deadlinesRouter = Router();

// GET /api/deadlines
deadlinesRouter.get('/', async (req, res) => {
  try {
    const projectId = req.query['projectId'] as string | undefined;
    const withinDays = req.query['withinDays'] ? parseInt(req.query['withinDays'] as string, 10) : undefined;
    const includeOverdue = req.query['includeOverdue'] !== 'false';

    const tasks = await DeadlineService.getDeadlines({ projectId, withinDays, includeOverdue });
    res.json({ deadlines: tasks, total: tasks.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /api/deadlines/overdue
deadlinesRouter.get('/overdue', async (req, res) => {
  try {
    const projectId = req.query['projectId'] as string | undefined;
    const tasks = await DeadlineService.getOverdueTasks({ projectId });
    res.json({ overdueTasks: tasks, total: tasks.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});
