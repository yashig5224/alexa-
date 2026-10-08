import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env['DATABASE_URL'] ?? './dev.db';

async function runMigrations(): Promise<void> {
  console.log(`📦 Running migrations on: ${DATABASE_URL}`);

  const sqlite = new Database(DATABASE_URL);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite);

  const migrationsFolder = path.join(__dirname, 'migrations');
  migrate(db, { migrationsFolder });

  console.log('✅ Migrations complete.');
  sqlite.close();
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
