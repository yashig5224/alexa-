import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../src/server.js';
import { connectMongoDB, disconnectMongoDB, SeedService } from '@trackmate/database';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

describe('TrackMate Phase 2 Backend REST API & Database Layer', () => {
  let server: Server;
  let baseUrl: string;
  let createdProjectId: string;
  let createdTaskId: string;

  beforeAll(async () => {
    await connectMongoDB();
    await SeedService.seedMongoDB();

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await disconnectMongoDB();
  });

  // ── Health ────────────────────────────────────────────────────────────────
  it('GET /health returns 200, service metadata and database info', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe('ok');
    expect(data.service).toBe('trackmate-backend');
    expect(data.database).toBe('MongoDB');
  });

  // ── Projects ──────────────────────────────────────────────────────────────
  it('GET /api/projects returns seeded projects list', async () => {
    const res = await fetch(`${baseUrl}/api/projects`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(Array.isArray(data.projects)).toBe(true);
    expect(data.projects.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/projects creates a new project via Mongoose service', async () => {
    const res = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated Test Project',
        description: 'Created during integration testing',
        status: 'active',
        color: '#10b981',
      }),
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.project).toBeDefined();
    expect(data.project.name).toBe('Automated Test Project');
    expect(data.project.id).toBeDefined();
    createdProjectId = data.project.id;
  });

  it('GET /api/projects/:id returns single project details', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.project.id).toBe(createdProjectId);
    expect(data.project.name).toBe('Automated Test Project');
  });

  it('PATCH /api/projects/:id updates project details', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Test Project',
        description: 'New description updated via PATCH',
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.project.name).toBe('Updated Test Project');
  });

  it('GET /api/projects/:id/status returns computed progress, % and blockers', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}/status`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.project).toBeDefined();
    expect(typeof data.totalTasks).toBe('number');
    expect(typeof data.completionPercentage).toBe('number');
    expect(Array.isArray(data.blockers)).toBe(true);
  });

  it('POST /api/projects/:id/summarize generates narrative summary', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}/summarize`, {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(typeof data.summary).toBe('string');
    expect(data.summary).toContain('Updated Test Project');
  });

  // ── Tasks ─────────────────────────────────────────────────────────────────
  it('POST /api/tasks creates a task linked to the project', async () => {
    const res = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Backend Integration Verification Task',
        description: 'Ensuring database service layer works cleanly',
        status: 'in_progress',
        priority: 'high',
        projectId: createdProjectId,
        dueDate: '2026-10-31',
        tags: ['testing', 'backend'],
      }),
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.task).toBeDefined();
    expect(data.task.title).toBe('Backend Integration Verification Task');
    expect(data.task.projectId).toBe(createdProjectId);
    createdTaskId = data.task.id;
  });

  it('GET /api/tasks retrieves task list filtered by project', async () => {
    const res = await fetch(`${baseUrl}/api/tasks?projectId=${createdProjectId}`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(Array.isArray(data.tasks)).toBe(true);
    expect(data.tasks.length).toBe(1);
    expect(data.tasks[0].id).toBe(createdTaskId);
  });

  it('PATCH /api/tasks/:id updates task status to done', async () => {
    const res = await fetch(`${baseUrl}/api/tasks/${createdTaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'done',
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.task.status).toBe('done');
  });

  // ── Deadlines & Priorities ────────────────────────────────────────────────
  it('GET /api/deadlines returns tasks due within window', async () => {
    const res = await fetch(`${baseUrl}/api/deadlines?withinDays=30`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(Array.isArray(data.deadlines)).toBe(true);
  });

  it('GET /api/priorities/today returns ranked priorities with scoring and reasons', async () => {
    const res = await fetch(`${baseUrl}/api/priorities/today?limit=5`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.date).toBeDefined();
    expect(Array.isArray(data.topPriorities)).toBe(true);
    if (data.topPriorities.length > 0) {
      expect(data.topPriorities[0].score).toBeGreaterThan(0);
      expect(Array.isArray(data.topPriorities[0].reasons)).toBe(true);
    }
  });

  // ── Users & Team Members ──────────────────────────────────────────────────
  it('GET /api/users returns registered team users', async () => {
    const res = await fetch(`${baseUrl}/api/users`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(Array.isArray(data.users)).toBe(true);
    expect(data.users.length).toBeGreaterThan(0);
  });

  it('POST /api/projects/:id/members adds a member to the project', async () => {
    const usersRes = await fetch(`${baseUrl}/api/users`);
    const usersData = (await usersRes.json()) as any;
    const testUserId = usersData.users[0].id;

    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        role: 'member',
      }),
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.member).toBeDefined();
    expect(data.member.projectId).toBe(createdProjectId);
    expect(data.member.user.id).toBe(testUserId);
  });

  it('GET /api/projects/:id/members lists members of the project', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}/members`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(Array.isArray(data.members)).toBe(true);
    expect(data.members.length).toBeGreaterThanOrEqual(1);
  });

  // ── Cleanup ───────────────────────────────────────────────────────────────
  it('DELETE /api/projects/:id cascades and deletes the project', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.success).toBe(true);

    // Verify 404
    const verifyRes = await fetch(`${baseUrl}/api/projects/${createdProjectId}`);
    expect(verifyRes.status).toBe(404);
  });
});
