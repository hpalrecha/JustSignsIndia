import { pool } from '../db';

/**
 * Creates the Finance tables if they are missing. Runs once at startup; idempotent. Mirrors the
 * drizzle definitions in shared/schema.ts (erpUsers, financeAccessLog). No drizzle-kit push needed.
 */
export async function ensureFinanceTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS erp_users (
      id serial PRIMARY KEY,
      username text NOT NULL UNIQUE,
      name text,
      role text NOT NULL DEFAULT 'nsm' CONSTRAINT erp_users_role_check CHECK (role IN ('nsm','admin')),
      active boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS finance_access_log (
      id serial PRIMARY KEY,
      username text,
      role text,
      endpoint text NOT NULL,
      query jsonb,
      status integer,
      ip text,
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS finance_access_log_created_at_idx ON finance_access_log (created_at);
  `);
}
