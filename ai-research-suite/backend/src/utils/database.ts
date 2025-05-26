import knex, { Knex } from 'knex';
import { config } from '../config';
import { logger } from './logger';

let db: Knex;

export async function initializeDatabase(): Promise<void> {
  try {
    db = knex({
      client: 'pg',
      connection: config.database.url || {
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.name,
      },
      pool: {
        min: 2,
        max: 10,
      },
    });

    await db.raw('SELECT 1');
    logger.info('Database connection established');

    await runMigrations();
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

async function runMigrations(): Promise<void> {
  try {
    const pendingMigrations = await db.migrate.list();
    if (pendingMigrations[1].length > 0) {
      logger.info(`Running ${pendingMigrations[1].length} pending migrations`);
      await db.migrate.latest();
      logger.info('Database migrations completed');
    }
  } catch (error) {
    logger.error('Migration error:', error);
    throw error;
  }
}

export function getDb(): Knex {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    logger.info('Database connection closed');
  }
}