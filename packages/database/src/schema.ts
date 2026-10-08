import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// Users table
// ─────────────────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  email:     text('email').notNull().unique(),
  avatarUrl: text('avatar_url'),
  role:      text('role', { enum: ['owner', 'admin', 'member', 'viewer'] }).notNull().default('member'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Projects table
// ─────────────────────────────────────────────────────────────────────────────
export const projects = sqliteTable('projects', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  description: text('description'),
  status:      text('status', { enum: ['active', 'on_hold', 'completed', 'archived'] }).notNull().default('active'),
  ownerId:     text('owner_id').notNull().references(() => users.id),
  githubRepo:  text('github_repo'),
  color:       text('color').notNull().default('#6366f1'),
  createdAt:   text('created_at').notNull(),
  updatedAt:   text('updated_at').notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Project Members (join table)
// ─────────────────────────────────────────────────────────────────────────────
export const projectMembers = sqliteTable('project_members', {
  id:        text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role:      text('role', { enum: ['owner', 'admin', 'member', 'viewer'] }).notNull().default('member'),
  joinedAt:  text('joined_at').notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Tasks table
// ─────────────────────────────────────────────────────────────────────────────
export const tasks = sqliteTable('tasks', {
  id:             text('id').primaryKey(),
  title:          text('title').notNull(),
  description:    text('description'),
  status:         text('status', { enum: ['todo', 'in_progress', 'in_review', 'done', 'blocked'] }).notNull().default('todo'),
  priority:       text('priority', { enum: ['low', 'medium', 'high', 'critical'] }).notNull().default('medium'),
  projectId:      text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  assigneeId:     text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  dueDate:        text('due_date'),               // ISO 8601 date "YYYY-MM-DD"
  tags:           text('tags').notNull().default('[]'), // JSON array stored as text
  githubIssueUrl: text('github_issue_url'),
  createdAt:      text('created_at').notNull(),
  updatedAt:      text('updated_at').notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  ownedProjects:  many(projects),
  projectMembers: many(projectMembers),
  assignedTasks:  many(tasks),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner:   one(users, { fields: [projects.ownerId], references: [users.id] }),
  members: many(projectMembers),
  tasks:   many(tasks),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user:    one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project:  one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
}));
