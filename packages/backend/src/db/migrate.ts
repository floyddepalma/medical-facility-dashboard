import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from './connection';

async function migrate() {
  try {
    console.log('Running database migrations...');

    const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');

    await pool.query(schemaSQL);

    console.log('✓ Migrations completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
