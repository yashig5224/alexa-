import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectMongoDB, disconnectMongoDB, SeedService } from '@trackmate/database';

beforeAll(async () => {
  await connectMongoDB();
  await SeedService.seedMongoDB();
});

afterAll(async () => {
  await disconnectMongoDB();
});

describe('MCP Tool Schemas (unit)', () => {
  it('get_tasks definition has correct name', async () => {
    const { get_tasks_definition } = await import('../../src/tools/tasks.js');
    expect(get_tasks_definition.name).toBe('get_tasks');
  });

  it('create_task definition requires title and projectId', async () => {
    const { create_task_definition } = await import('../../src/tools/tasks.js');
    const schema = create_task_definition.inputSchema as { required?: string[] };
    expect(schema.required).toContain('title');
    expect(schema.required).toContain('projectId');
  });

  it('get_project_status definition requires projectId', async () => {
    const { get_project_status_definition } = await import('../../src/tools/projects.js');
    const schema = get_project_status_definition.inputSchema as { required?: string[] };
    expect(schema.required).toContain('projectId');
  });

  it('TOOL_DEFINITIONS contains exactly 12 tools', async () => {
    const { TOOL_DEFINITIONS } = await import('../../src/tools/index.js');
    expect(TOOL_DEFINITIONS).toHaveLength(12);
  });

  it('ALL_TOOLS registry contains all 12 tool names', async () => {
    const { ALL_TOOLS } = await import('../../src/tools/index.js');
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

describe('MCP Tool Execution & Error Handling (unit)', () => {
  let createdTaskId: string;

  it('1. get_projects returns structured project list', async () => {
    const { get_projects } = await import('../../src/tools/projects.js');
    const res = await get_projects({});
    expect(res.isError).toBeFalsy();
    const data = JSON.parse(res.content[0]!.text as string);
    expect(Array.isArray(data.projects)).toBe(true);
    expect(data.projects.length).toBeGreaterThan(0);
  });

  it('2. get_tasks returns tasks with tags and priority', async () => {
    const { get_tasks } = await import('../../src/tools/tasks.js');
    const res = await get_tasks({ limit: 10 });
    expect(res.isError).toBeFalsy();
    const data = JSON.parse(res.content[0]!.text as string);
    expect(Array.isArray(data.tasks)).toBe(true);
  });

  it('3. create_task creates a task with schema validation', async () => {
    const { create_task } = await import('../../src/tools/tasks.js');
    const { get_projects } = await import('../../src/tools/projects.js');
    const pRes = await get_projects({ limit: 1 });
    const pData = JSON.parse(pRes.content[0]!.text as string);
    const projectId = pData.projects[0].id;

    const res = await create_task({
      title: 'Unit Test Task',
      priority: 'high',
      projectId,
      dueDate: '2026-12-31',
      tags: ['test', 'mcp'],
    });

    expect(res.isError).toBeFalsy();
    const text = res.content[0]!.text as string;
    expect(text).toContain('Task created successfully');
    const idMatch = text.match(/ID:\s*([^\s\n]+)/i);
    expect(idMatch).toBeTruthy();
    createdTaskId = idMatch![1]!;
  });

  it('3b. create_task fails with structured error when required fields are missing', async () => {
    const { create_task } = await import('../../src/tools/tasks.js');
    const res = await create_task({ priority: 'high' }); // missing title & projectId
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toContain('Error');
  });

  it('4. update_task updates an existing task', async () => {
    const { update_task } = await import('../../src/tools/tasks.js');
    const res = await update_task({
      id: createdTaskId,
      status: 'in_progress',
      priority: 'critical',
    });
    expect(res.isError).toBeFalsy();
    expect(res.content[0]!.text).toContain('updated successfully');
  });

  it('4b. update_task returns error for nonexistent task', async () => {
    const { update_task } = await import('../../src/tools/tasks.js');
    const res = await update_task({
      id: '00000000-0000-0000-0000-000000000000',
      status: 'done',
    });
    expect(res.isError).toBe(true);
  });

  it('5. get_project_status computes progress and blockers', async () => {
    const { get_project_status } = await import('../../src/tools/projects.js');
    const { get_projects } = await import('../../src/tools/projects.js');
    const pRes = await get_projects({ limit: 1 });
    const pData = JSON.parse(pRes.content[0]!.text as string);
    const projectId = pData.projects[0].id;

    const res = await get_project_status({ projectId });
    expect(res.isError).toBeFalsy();
    const data = JSON.parse(res.content[0]!.text as string);
    expect(typeof data.completionPercentage).toBe('number');
    expect(Array.isArray(data.blockers)).toBe(true);
  });

  it('5b. get_project_status returns error for invalid projectId', async () => {
    const { get_project_status } = await import('../../src/tools/projects.js');
    const res = await get_project_status({ projectId: 'non-existent-id' });
    expect(res.isError).toBe(true);
  });

  it('6. get_deadlines returns upcoming tasks', async () => {
    const { get_deadlines } = await import('../../src/tools/deadlines.js');
    const res = await get_deadlines({ withinDays: 30 });
    expect(res.isError).toBeFalsy();
    const data = JSON.parse(res.content[0]!.text as string);
    expect(Array.isArray(data.deadlines)).toBe(true);
  });

  it('7. get_daily_priorities calculates weighted urgency ranking', async () => {
    const { get_daily_priorities } = await import('../../src/tools/priorities.js');
    const res = await get_daily_priorities({ limit: 5 });
    expect(res.isError).toBeFalsy();
    const data = JSON.parse(res.content[0]!.text as string);
    expect(Array.isArray(data.topPriorities)).toBe(true);
    if (data.topPriorities.length > 0) {
      expect(typeof data.topPriorities[0].score).toBe('number');
      expect(Array.isArray(data.topPriorities[0].reasons)).toBe(true);
    }
  });
});
