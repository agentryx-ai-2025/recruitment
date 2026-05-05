/**
 * Move every file at the bare `uploads/` root into its per-owner leaf
 * (uploads/verify/signoff/ or uploads/verify/feedback/) based on the
 * attachments.owner_type column. Idempotent.
 *
 * URL columns don't change — Verify serves attachments through the
 * authenticated /api/projects/attachments/:id endpoint which looks up the
 * file by the `filename` column, so only the disk location needs updating.
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import "dotenv/config";

const ROOT = path.resolve(process.cwd(), "uploads");
const SIGNOFF_DIR = path.join(ROOT, "verify", "signoff");
const FEEDBACK_DIR = path.join(ROOT, "verify", "feedback");

function mkdirp(p: string) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const pool = new pg.Pool({ connectionString: url });
  mkdirp(SIGNOFF_DIR); mkdirp(FEEDBACK_DIR);

  const rows = await pool.query(
    `SELECT id, owner_type, filename FROM attachments ORDER BY created_at`
  );
  let moved = 0, missing = 0, already = 0;
  for (const r of rows.rows) {
    const leaf = r.owner_type === "feedback" ? FEEDBACK_DIR : SIGNOFF_DIR;
    const src = path.join(ROOT, r.filename);
    const dest = path.join(leaf, r.filename);
    if (fs.existsSync(dest)) { already++; continue; }
    if (!fs.existsSync(src)) { missing++; continue; }
    fs.renameSync(src, dest);
    moved++;
  }
  console.log(`attachments: ${moved} moved, ${already} already in place, ${missing} not on disk (out of ${rows.rowCount})`);

  // Quarantine any stragglers in the bare root (not referenced by attachments).
  const orphanDir = path.join(ROOT, "verify", "orphans");
  mkdirp(orphanDir);
  let orphans = 0;
  for (const name of fs.readdirSync(ROOT)) {
    const p = path.join(ROOT, name);
    if (!fs.statSync(p).isFile()) continue;
    fs.renameSync(p, path.join(orphanDir, name));
    orphans++;
  }
  console.log(`orphans: quarantined ${orphans} unreferenced file(s) under verify/orphans/`);

  await pool.end();
})();
