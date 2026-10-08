import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

const DATABASE_URL = process.env['DATABASE_URL'] ?? './dev.db';

// Create and cache the SQLite connection
const sqlite = new Database(DATABASE_URL);

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export type Db = typeof db;

// Re-export schema for convenience
export * from './schema.js';
