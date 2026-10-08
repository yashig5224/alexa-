import { db } from './client.js';
import { users, projects, projectMembers, tasks } from './schema.js';
import { randomUUID } from 'crypto';

function now(): string {
  return new Date().toISOString();
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]!;
}

async function seed(): Promise<void> {
  console.log('🌱 Seeding database...');

  // ── Users ────────────────────────────────────────────────────────────────
  const userId1 = randomUUID();
  const userId2 = randomUUID();
  const userId3 = randomUUID();

  await db.insert(users).values([
    {
      id: userId1,
      name: 'Alex Chen',
      email: 'alex@trackmate.dev',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex',
      role: 'owner',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: userId2,
      name: 'Jordan Lee',
      email: 'jordan@trackmate.dev',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Jordan',
      role: 'member',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: userId3,
      name: 'Sam Rivera',
      email: 'sam@trackmate.dev',
      avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Sam',
      role: 'member',
      createdAt: now(),
      updatedAt: now(),
    },
  ]).onConflictDoNothing();

  // ── Projects ─────────────────────────────────────────────────────────────
  const project1Id = randomUUID();
  const project2Id = randomUUID();
  const project3Id = randomUUID();

  await db.insert(projects).values([
    {
      id: project1Id,
      name: 'TrackMate AI',
      description: 'Agentic productivity platform for the Amazon Hackathon 2026',
      status: 'active',
      ownerId: userId1,
      githubRepo: 'alexchen/trackmate-ai',
      color: '#6366f1',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: project2Id,
      name: 'Student Dashboard',
      description: 'University course tracker and GPA calculator',
      status: 'active',
      ownerId: userId1,
      githubRepo: null,
      color: '#10b981',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: project3Id,
      name: 'Open Source CLI Tool',
      description: 'Command-line utility for automating dev workflows',
      status: 'on_hold',
      ownerId: userId2,
      githubRepo: 'jordanlee/dev-cli',
      color: '#f59e0b',
      createdAt: now(),
      updatedAt: now(),
    },
  ]).onConflictDoNothing();

  // ── Project Members ───────────────────────────────────────────────────────
  await db.insert(projectMembers).values([
    { id: randomUUID(), projectId: project1Id, userId: userId1, role: 'owner', joinedAt: now() },
    { id: randomUUID(), projectId: project1Id, userId: userId2, role: 'member', joinedAt: now() },
    { id: randomUUID(), projectId: project1Id, userId: userId3, role: 'member', joinedAt: now() },
    { id: randomUUID(), projectId: project2Id, userId: userId1, role: 'owner', joinedAt: now() },
    { id: randomUUID(), projectId: project3Id, userId: userId2, role: 'owner', joinedAt: now() },
    { id: randomUUID(), projectId: project3Id, userId: userId3, role: 'member', joinedAt: now() },
  ]).onConflictDoNothing();

  // ── Tasks ─────────────────────────────────────────────────────────────────
  await db.insert(tasks).values([
    // TrackMate AI tasks
    {
      id: randomUUID(),
      title: 'Implement MCP Streamable HTTP transport',
      description: 'Set up the POST /mcp endpoint per spec 2025-11-25',
      status: 'done',
      priority: 'critical',
      projectId: project1Id,
      assigneeId: userId1,
      dueDate: daysFromNow(-3),
      tags: JSON.stringify(['backend', 'mcp']),
      githubIssueUrl: null,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: randomUUID(),
      title: 'Finish authentication middleware',
      description: 'JWT validation and user session management',
      status: 'in_progress',
      priority: 'high',
      projectId: project1Id,
      assigneeId: userId1,
      dueDate: daysFromNow(1),
      tags: JSON.stringify(['backend', 'security']),
      githubIssueUrl: null,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: randomUUID(),
      title: 'Build AI assistant chat UI',
      description: 'Conversational interface with tool call transparency',
      status: 'in_progress',
      priority: 'high',
      projectId: project1Id,
      assigneeId: userId2,
      dueDate: daysFromNow(2),
      tags: JSON.stringify(['frontend', 'ai']),
      githubIssueUrl: null,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: randomUUID(),
      title: 'Integrate Amazon Bedrock',
      description: 'Connect the AI agent to Bedrock via AWS SDK',
      status: 'todo',
      priority: 'high',
      projectId: project1Id,
      assigneeId: userId1,
      dueDate: daysFromNow(3),
      tags: JSON.stringify(['aws', 'ai']),
      githubIssueUrl: null,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: randomUUID(),
      title: 'Write unit tests for MCP tools',
      description: 'Cover all 12 MCP tools with Vitest',
      status: 'todo',
      priority: 'medium',
      projectId: project1Id,
      assigneeId: userId3,
      dueDate: daysFromNow(4),
      tags: JSON.stringify(['testing']),
      githubIssueUrl: null,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: randomUUID(),
      title: 'Write project README and docs',
      description: 'Architecture diagram, setup guide, demo script',
      status: 'todo',
      priority: 'medium',
      projectId: project1Id,
      assigneeId: userId2,
      dueDate: daysFromNow(5),
      tags: JSON.stringify(['docs']),
      githubIssueUrl: null,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: randomUUID(),
      title: 'API rate limiting is not working',
      description: 'Rate limiter not applying correctly under load',
      status: 'blocked',
      priority: 'high',
      projectId: project1Id,
      assigneeId: userId1,
      dueDate: daysFromNow(-1),
      tags: JSON.stringify(['bug', 'backend']),
      githubIssueUrl: null,
      createdAt: now(),
      updatedAt: now(),
    },
    // Student Dashboard tasks
    {
      id: randomUUID(),
      title: 'GPA calculation module',
      description: 'Weighted GPA calculator for multiple semesters',
      status: 'done',
      priority: 'high',
      projectId: project2Id,
      assigneeId: userId1,
      dueDate: daysFromNow(-5),
      tags: JSON.stringify(['feature']),
      githubIssueUrl: null,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: randomUUID(),
      title: 'Course schedule view',
      description: 'Weekly timetable with drag-and-drop',
      status: 'in_progress',
      priority: 'medium',
      projectId: project2Id,
      assigneeId: userId1,
      dueDate: daysFromNow(7),
      tags: JSON.stringify(['frontend']),
      githubIssueUrl: null,
      createdAt: now(),
      updatedAt: now(),
    },
    // CLI Tool tasks
    {
      id: randomUUID(),
      title: 'Setup CI/CD pipeline',
      description: 'GitHub Actions for testing and publishing to npm',
      status: 'todo',
      priority: 'low',
      projectId: project3Id,
      assigneeId: userId2,
      dueDate: daysFromNow(14),
      tags: JSON.stringify(['devops']),
      githubIssueUrl: null,
      createdAt: now(),
      updatedAt: now(),
    },
  ]).onConflictDoNothing();

  console.log('✅ Seed complete!');
  console.log(`   Users: 3`);
  console.log(`   Projects: 3`);
  console.log(`   Tasks: 10`);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
