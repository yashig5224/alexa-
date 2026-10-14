import { Router } from 'express';
import { GitHubService } from '@trackmate/database';

export const githubRouter = Router();

// GET /api/github/status — Connection status & configured repo
githubRouter.get('/status', async (_req, res) => {
  try {
    const status = await GitHubService.getConnectionStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /api/github/issues — Open issues (optionally filtered by project)
githubRouter.get('/issues', async (req, res) => {
  try {
    const projectId = req.query['projectId'] as string | undefined;
    const state = (req.query['state'] as 'open' | 'closed' | 'all') ?? 'open';
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;
    const result = await GitHubService.getIssues({ projectId, state, limit });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /api/github/pull-requests
githubRouter.get('/pull-requests', async (req, res) => {
  try {
    const projectId = req.query['projectId'] as string | undefined;
    const state = (req.query['state'] as 'open' | 'closed' | 'all') ?? 'open';
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;
    const result = await GitHubService.getPullRequests({ projectId, state, limit });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /api/github/stale-issues
githubRouter.get('/stale-issues', async (req, res) => {
  try {
    const projectId = req.query['projectId'] as string | undefined;
    const daysInactive = req.query['daysInactive'] ? parseInt(req.query['daysInactive'] as string, 10) : 14;
    const result = await GitHubService.getStaleIssues({ projectId, daysInactive });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});

// GET /api/github/activity-summary
githubRouter.get('/activity-summary', async (req, res) => {
  try {
    const projectId = req.query['projectId'] as string | undefined;
    const result = await GitHubService.summarizeActivity({ projectId });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? String(err) });
  }
});
