import path from 'path';

// Point test database to the seeded root dev.db
process.env['DATABASE_URL'] = path.resolve(__dirname, '../../../dev.db');
process.env['MCP_PORT'] = '3099';
process.env['AI_PROVIDER'] = 'mock';
