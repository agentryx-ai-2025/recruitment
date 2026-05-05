// Adds two columns to `requirements` used for the HTIS findings integration:
//   external_refs text[]   — e.g. ['BUG-002'] — external tracker IDs that touch this row
//   source        varchar(20) — 'frs' | 'htis_new' | 'htis_smoke' — drives row styling
//
// Idempotent. Safe to re-run.
import { pool } from "../server/config/db";

async function main() {
  await pool.query(`
    ALTER TABLE requirements
      ADD COLUMN IF NOT EXISTS external_refs text[] NOT NULL DEFAULT '{}'::text[];
  `);
  await pool.query(`
    ALTER TABLE requirements
      ADD COLUMN IF NOT EXISTS source varchar(20) NOT NULL DEFAULT 'frs';
  `);
  console.log("Migration OK — requirements.external_refs + requirements.source ready.");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
