import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number;
}

export interface IDatabase {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  close(): Promise<void>;
  type: 'postgres-pool' | 'pglite-embedded';
}

class DatabaseManager implements IDatabase {
  private pool: pg.Pool | null = null;
  private pglite: PGlite | null = null;
  public type: 'postgres-pool' | 'pglite-embedded' = 'pglite-embedded';
  private initPromise: Promise<void> | null = null;

  private async initialize(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    const isProduction = process.env.NODE_ENV === 'production';

    if (databaseUrl && databaseUrl.trim() !== '') {
      try {
        console.log('[Database] Connecting to PostgreSQL via DATABASE_URL...');
        const testPool = new pg.Pool({
          connectionString: databaseUrl,
          connectionTimeoutMillis: 5000,
          ssl: databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
        });
        await testPool.query('SELECT 1');
        this.pool = testPool;
        this.type = 'postgres-pool';
        console.log('[Database] Connected to PostgreSQL (Neon / External) successfully.');
        return;
      } catch (err: any) {
        console.error('[Database] PostgreSQL connection failed:', err.message);
        if (isProduction) {
          throw new Error(`Production database connection failed: ${err.message}. PGlite fallback is strictly prohibited in production.`);
        }
        console.log('[Database] Development environment detected: falling back to embedded PGlite for local testing.');
      }
    } else if (isProduction) {
      throw new Error('NODE_ENV=production requires DATABASE_URL to be set to a valid PostgreSQL instance (Neon). PGlite is prohibited in production.');
    }

    // Initialize PGlite (Embedded real PostgreSQL - Local development only)
    const baseDir = process.cwd().endsWith('server') ? process.cwd() : path.resolve(process.cwd(), 'server');
    const dataDir = path.resolve(baseDir, 'db', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    try {
      this.pglite = new PGlite(dataDir);
      await this.pglite.query('SELECT 1');
    } catch (err: any) {
      console.warn('[Database] PGlite directory recovered from lock/crash:', err.message);
      try {
        if (fs.existsSync(dataDir)) {
          fs.rmSync(dataDir, { recursive: true, force: true });
        }
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (rmErr) {
        console.warn('[Database] Directory cleanup warning:', rmErr);
      }
      this.pglite = new PGlite(dataDir);
      await this.pglite.query('SELECT 1');
    }

    this.type = 'pglite-embedded';
    console.log(`[Database] Embedded PostgreSQL (PGlite) initialized at: ${dataDir}`);

    // Ensure all tables and indexes exist from schema.sql
    const schemaPath = path.resolve(baseDir, 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      try {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        if (this.pool) {
          await this.pool.query(schemaSql);
        } else if (this.pglite) {
          await this.pglite.exec(schemaSql);
        }
      } catch (err: any) {
        console.warn('[Database] Schema execution note:', err.message);
      }
    }
  }

  public async getClient(): Promise<IDatabase> {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
    return this;
  }

  public async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    await this.getClient();

    if (this.pool) {
      const res = await this.pool.query(sql, params);
      return {
        rows: res.rows as T[],
        rowCount: res.rowCount ?? res.rows.length,
      };
    } else if (this.pglite) {
      const res = await this.pglite.query(sql, params);
      return {
        rows: (res.rows || []) as T[],
        rowCount: res.affectedRows ?? res.rows.length,
      };
    } else {
      throw new Error('[Database] No active database connection.');
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    if (this.pglite) {
      await this.pglite.close();
      this.pglite = null;
    }
  }
}

export const db = new DatabaseManager();

/**
 * Run migrations from schema.sql
 */
export async function runMigrations(): Promise<void> {
  const candidates = [
    path.resolve(__dirname, 'schema.sql'),
    path.resolve(__dirname, '../db/schema.sql'),
    path.resolve(__dirname, '../../db/schema.sql'),
    path.resolve(__dirname, '../../server/db/schema.sql'),
    path.resolve(process.cwd(), 'db/schema.sql'),
    path.resolve(process.cwd(), 'server/db/schema.sql'),
  ];
  const schemaPath = candidates.find(p => fs.existsSync(p));
  if (!schemaPath) {
    throw new Error(`[Database] Could not locate schema.sql in: ${candidates.join(', ')}`);
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('[Database] Running schema migrations...');
  
  // Split statements by semicolon where appropriate, or run full script
  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    await db.query(stmt);
  }

  console.log('[Database] Schema migrations completed successfully.');
}
