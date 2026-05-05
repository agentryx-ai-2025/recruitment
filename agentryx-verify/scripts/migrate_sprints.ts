import pg from "pg";
import "dotenv/config";

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const pool = new pg.Pool({ connectionString: url });

  await pool.query(`DO $$ BEGIN
    CREATE TYPE sprint_status AS ENUM ('draft','in_progress','deployed','closed');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_sprints (
      id varchar(21) PRIMARY KEY,
      project_id varchar(21) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name text NOT NULL,
      build_ref varchar(40),
      notes text,
      fixed_item_refs text[] NOT NULL DEFAULT '{}',
      status sprint_status NOT NULL DEFAULT 'draft',
      created_by_reviewer_id varchar(21) NOT NULL REFERENCES reviewers(id),
      started_at timestamptz NOT NULL DEFAULT now(),
      deployed_at timestamptz,
      closed_at timestamptz
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS project_sprints_project_idx ON project_sprints(project_id)`);

  const counts = await pool.query(`SELECT COUNT(*)::int AS n FROM project_sprints`);
  console.log("migration OK. existing sprint rows:", counts.rows[0].n);
  await pool.end();
})();
