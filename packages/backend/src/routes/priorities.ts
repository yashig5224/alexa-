import { Router } from 'express';
import { PriorityService } from '@trackmate/database';

export const prioritiesRouter = Router();

// GET /api/priorities/today
prioritiesRouter.get('/today', async (req, res) => {
  try {
    const projectId = req.query['projectId'] as string | undefined;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;

    const priorities = await PriorityService.getDailyPriorities({ projectId, limit });
    res.json(priorities);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});
