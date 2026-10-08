import { describe, it, expect, beforeAll } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { randomUUID } from 'crypto';

// Bootstrap an in-memory DB for tests
const sqlite = new Database(':memory:');
sqlite.pragma('foreign_keys = ON');

// Create schema directly for tests (avoids migration file dependency)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    owner_id TEXT NOT NULL REFERENCES users(id),
    github_repo TEXT,
    color TEXT NOT NULL DEFAULT '#6366f1',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS project_members (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    due_date TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    github_issue_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

import * as schema from '../../database/src/schema.js';
const db = drizzle(sqlite, { schema });

// Shared test data IDs
let testUserId: string;
let testProjectId: string;
let testTaskId: string;

function now() { return new Date().toISOString(); }

beforeAll(async () => {
  // Seed test data
  testUserId = randomUUID();
  testProjectId = randomUUID();
  testTaskId = randomUUID();

  await db.insert(schema.users).values({
    id: testUserId, name: 'Test User', email: 'test@test.com',
    role: 'owner', createdAt: now(), updatedAt: now(),
  });

  await db.insert(schema.projects).values({
    id: testProjectId, name: 'Test Project', status: 'active',
    ownerId: testUserId, color: '#6366f1', createdAt: now(), updatedAt: now(),
  });

  await db.insert(schema.tasks).values({
    id: testTaskId, title: 'Test Task', status: 'todo',
    priority: 'high', projectId: testProjectId,
    tags: '[]', createdAt: now(), updatedAt: now(),
  });
});

// We import tools AFTER DB is set up to avoid module-level DB errors in test env
// In real usage the tools import from @trackmate/database which uses process.env DATABASE_URL

describe('MCP Tool Schemas (unit)', () => {
  it('get_tasks definition has correct name', async () => {
    const { get_tasks_definition } = await import('../src/tools/tasks.js');
    expect(get_tasks_definition.name).toBe('get_tasks');
  });

  it('create_task definition requires title and projectId', async () => {
    const { create_task_definition } = await import('../src/tools/tasks.js');
    const schema = create_task_definition.inputSchema as { required?: string[] };
    expect(schema.required).toContain('title');
    expect(schema.required).toContain('projectId');
  });

  it('get_project_status definition requires projectId', async () => {
    const { get_project_status_definition } = await import('../src/tools/projects.js');
    const schema = get_project_status_definition.inputSchema as { required?: string[] };
    expect(schema.required).toContain('projectId');
  });

  it('TOOL_DEFINITIONS contains exactly 12 tools', async () => {
    const { TOOL_DEFINITIONS } = await import('../src/tools/index.js');
    expect(TOOL_DEFINITIONS).toHaveLength(12);
  });

  it('ALL_TOOLS registry contains all 12 tool names', async () => {
    const { ALL_TOOLS } = await import('../src/tools/index.js');
    const expected = [
      'get_tasks', 'get_task', 'create_task', 'update_task', 'delete_task',
      'get_projects', 'get_project_status',
      'get_deadlines', 'get_overdue_tasks',
      'get_daily_priorities',
      'get_github_issues',
      'summarize_project',
    ];
    expected.forEach(name => {
      expect(ALL_TOOLS).toHaveProperty(name);
      expect(typeof ALL_TOOLS[name]).toBe('function');
    });
  });
});
