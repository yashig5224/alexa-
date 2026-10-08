import { vi } from 'vitest';

// Use an in-memory test database for all tests
process.env['DATABASE_URL'] = ':memory:';
process.env['MCP_PORT'] = '3099';
process.env['AI_PROVIDER'] = 'mock';
