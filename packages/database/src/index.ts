// ─────────────────────────────────────────────────────────────────────────────
// @trackmate/database — Public API
// ─────────────────────────────────────────────────────────────────────────────

// MongoDB / Mongoose connection & models
export * from './mongoose.js';
export * from './models/index.js';

// Unified Service Layer
export * from './services/index.js';

// Retain legacy SQLite exports for backward compatibility if needed
export { db } from './client.js';
export type { Db } from './client.js';
export * from './schema.js';
