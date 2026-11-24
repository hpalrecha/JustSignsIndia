/**
 * Grants (or changes) a Finance role for a Just Signs ERP login. No password: the password is checked
 * by the Just Signs ERPNext at sign-in. A row is only needed to grant 'admin', or to grant 'nsm' to
 * someone whose ERP designation does not already derive to NSM (server/erp/tier-rules.ts).
 *
 *   npx tsx scripts/create-erp-user.ts <erp-login-email> "<name>" <nsm|admin> [--inactive]
 *
 * --inactive keeps the row but blocks the person (it also blocks an ERP-derived NSM).
 * Uses CUSTOM_DATABASE_URL, else DATABASE_URL. Creates the table if it is missing.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function main() {
  const [username, name, role, flag] = process.argv.slice(2);
  if (!username || !name || (role !== 'nsm' && role !== 'admin') || (flag && flag !== '--inactive')) {
    console.error('Usage: npx tsx scripts/create-erp-user.ts <erp-login-email> "<name>" <nsm|admin> [--inactive]');
    process.exit(1);
  }
  const connectionString = process.env.CUSTOM_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Set CUSTOM_DATABASE_URL or DATABASE_URL.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS erp_users (
        id serial PRIMARY KEY,
        username text NOT NULL UNIQUE,
        name text,
        role text NOT NULL DEFAULT 'nsm' CONSTRAINT erp_users_role_check CHECK (role IN ('nsm','admin')),
        active boolean DEFAULT true,
        created_at timestamptz DEFAULT now()
      )`);
    const r = await pool.query(
      `INSERT INTO erp_users (username, name, role, active) VALUES (lower($1), $2, $3, $4)
       ON CONFLICT (username) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, active = EXCLUDED.active
       RETURNING id, username, name, role, active`,
      [username.trim(), name, role, flag !== '--inactive'],
    );
    console.log('Saved:', r.rows[0]);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
