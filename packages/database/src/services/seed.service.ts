import { UserModel, ProjectModel, TaskModel, ProjectMemberModel } from '../models/index.js';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]!;
}

export class SeedService {
  static async seedMongoDB(): Promise<void> {
    const existingProjects = await ProjectModel.countDocuments();
    if (existingProjects > 0) {
      console.log('🌱 [MongoDB] Database already seeded.');
      return;
    }

    console.log('🌱 [MongoDB] Seeding database with initial data...');

    // ── 1. Users ─────────────────────────────────────────────────────────────
    const users = await UserModel.create([
      {
        _id: 'user-alex-chen',
        name: 'Alex Chen',
        email: 'alex@trackmate.dev',
        avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex',
        role: 'owner',
      },
      {
        _id: 'user-jordan-lee',
        name: 'Jordan Lee',
        email: 'jordan@trackmate.dev',
        avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Jordan',
        role: 'member',
      },
      {
        _id: 'user-sam-rivera',
        name: 'Sam Rivera',
        email: 'sam@trackmate.dev',
        avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sam',
        role: 'member',
      },
    ]);

    const u1 = users[0]?._id ?? 'user-alex-chen';
    const u2 = users[1]?._id ?? 'user-jordan-lee';
    const u3 = users[2]?._id ?? 'user-sam-rivera';

    // ── 2. Projects ──────────────────────────────────────────────────────────
    const projects = await ProjectModel.create([
      {
        _id: '864ec0af-0f3e-440d-9722-e0081ec77c35',
        name: 'TrackMate AI',
        description: 'Agentic productivity platform for the Amazon Hackathon 2026',
        status: 'active',
        ownerId: u1,
        githubRepo: 'alexchen/trackmate-ai',
        color: '#6366f1',
      },
      {
        _id: 'proj-student-dashboard',
        name: 'Student Dashboard',
        description: 'University course tracker and GPA calculator',
        status: 'active',
        ownerId: u1,
        githubRepo: null,
        color: '#10b981',
      },
      {
        _id: 'proj-dev-cli',
        name: 'Open Source CLI Tool',
        description: 'Command-line utility for automating dev workflows',
        status: 'on_hold',
        ownerId: u2,
        githubRepo: 'jordanlee/dev-cli',
        color: '#f59e0b',
      },
    ]);

    const p1 = projects[0]?._id ?? '864ec0af-0f3e-440d-9722-e0081ec77c35';
    const p2 = projects[1]?._id ?? 'proj-student-dashboard';
    const p3 = projects[2]?._id ?? 'proj-dev-cli';

    // ── 3. Members ───────────────────────────────────────────────────────────
    await ProjectMemberModel.create([
      { projectId: p1, userId: u1, role: 'owner' },
      { projectId: p1, userId: u2, role: 'member' },
      { projectId: p1, userId: u3, role: 'member' },
      { projectId: p2, userId: u1, role: 'owner' },
      { projectId: p3, userId: u2, role: 'owner' },
      { projectId: p3, userId: u3, role: 'member' },
    ]);

    // ── 4. Tasks ─────────────────────────────────────────────────────────────
    await TaskModel.create([
      // TrackMate AI tasks
      {
        title: 'Implement MCP Streamable HTTP transport',
        description: 'Set up the POST /mcp endpoint per spec 2025-11-25',
        status: 'done',
        priority: 'critical',
        projectId: p1,
        assigneeId: u1,
        dueDate: daysFromNow(-3),
        tags: ['backend', 'mcp'],
      },
      {
        title: 'Finish authentication middleware',
        description: 'JWT validation and user session management',
        status: 'in_progress',
        priority: 'high',
        projectId: p1,
        assigneeId: u1,
        dueDate: daysFromNow(1),
        tags: ['backend', 'security'],
      },
      {
        title: 'Build AI assistant chat UI',
        description: 'Conversational interface with tool call transparency',
        status: 'in_progress',
        priority: 'high',
        projectId: p1,
        assigneeId: u2,
        dueDate: daysFromNow(2),
        tags: ['frontend', 'ai'],
      },
      {
        title: 'Integrate Amazon Bedrock Converse API',
        description: 'Connect the AI agent to Bedrock runtime via AWS SDK',
        status: 'todo',
        priority: 'high',
        projectId: p1,
        assigneeId: u1,
        dueDate: daysFromNow(3),
        tags: ['aws', 'ai', 'bedrock'],
      },
      {
        title: 'Write automated unit & integration tests',
        description: 'Cover all MCP tools, REST endpoints, and services',
        status: 'todo',
        priority: 'medium',
        projectId: p1,
        assigneeId: u3,
        dueDate: daysFromNow(4),
        tags: ['testing'],
      },
      {
        title: 'API rate limiting is not working',
        description: 'Rate limiter not applying correctly under load',
        status: 'blocked',
        priority: 'high',
        projectId: p1,
        assigneeId: u1,
        dueDate: daysFromNow(-1),
        tags: ['bug', 'backend'],
      },
      // Student Dashboard tasks
      {
        title: 'GPA calculation module',
        description: 'Weighted GPA calculator for multiple semesters',
        status: 'done',
        priority: 'high',
        projectId: p2,
        assigneeId: u1,
        dueDate: daysFromNow(-5),
        tags: ['feature'],
      },
      {
        title: 'Course schedule view',
        description: 'Weekly timetable with calendar layout',
        status: 'in_progress',
        priority: 'medium',
        projectId: p2,
        assigneeId: u1,
        dueDate: daysFromNow(7),
        tags: ['frontend'],
      },
      // CLI Tool tasks
      {
        title: 'Setup GitHub Actions CI/CD pipeline',
        description: 'Automated test suite and npm publication',
        status: 'todo',
        priority: 'low',
        projectId: p3,
        assigneeId: u2,
        dueDate: daysFromNow(14),
        tags: ['devops'],
      },
    ]);

    console.log('✅ [MongoDB] Database successfully seeded with 3 users, 3 projects, and 9 tasks!');
  }
}
