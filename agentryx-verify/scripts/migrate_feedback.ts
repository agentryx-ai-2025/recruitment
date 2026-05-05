import pg from "pg";
import "dotenv/config";

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const pool = new pg.Pool({ connectionString: url });

  // Enums — idempotent via DO blocks (CREATE TYPE has no IF NOT EXISTS).
  await pool.query(`DO $$ BEGIN
    CREATE TYPE feedback_type AS ENUM ('new_feature','enhancement','bug','ux','similar_sw','other');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await pool.query(`DO $$ BEGIN
    CREATE TYPE feedback_status AS ENUM ('submitted','triaged','planned','in_progress','shipped','declined','duplicate');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  // feedback_items
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback_items (
      id varchar(21) PRIMARY KEY,
      reference_code varchar(24) NOT NULL,
      project_id varchar(21) REFERENCES projects(id) ON DELETE SET NULL,
      submitter_reviewer_id varchar(21) NOT NULL REFERENCES reviewers(id),
      type feedback_type NOT NULL,
      title text NOT NULL,
      description text NOT NULL,
      area varchar(40),
      similar_to text,
      status feedback_status NOT NULL DEFAULT 'submitted',
      priority varchar(16) NOT NULL DEFAULT 'normal',
      assigned_to_id varchar(21) REFERENCES reviewers(id),
      admin_notes text,
      linked_to_item_ref varchar(24),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS feedback_code_idx ON feedback_items(reference_code)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS feedback_project_idx ON feedback_items(project_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS feedback_status_idx ON feedback_items(status)`);

  // feedback_comments
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback_comments (
      id varchar(21) PRIMARY KEY,
      feedback_id varchar(21) NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
      reviewer_id varchar(21) NOT NULL REFERENCES reviewers(id),
      body text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS feedback_comments_fb_idx ON feedback_comments(feedback_id)`);

  // Verify
  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM feedback_items) AS items,
      (SELECT COUNT(*)::int FROM feedback_comments) AS comments`);
  console.log("migration OK. existing rows:", counts.rows[0]);
  await pool.end();
})();
