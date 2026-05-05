// Adds admin-controlled visibility + stable ordering to projects.
//
//   sort_order            — int, default 0. Lower = earlier in the Home list.
//                          FRS = 0, HTIS smoke = 1, Beyond-FRS = 2.
//   visible_to_non_admin  — boolean, default TRUE. Admin/delivery always see
//                          the project; other reviewers only when flag is set.
//
// Idempotent. Also seeds the initial values for the three existing projects so
// a fresh migration matches the user's requested default: Beyond-FRS hidden
// from non-admins, HTIS smoke at position 2.
import { pool } from "../server/config/db";

async function main() {
  await pool.query(`
    ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
  `);
  await pool.query(`
    ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS visible_to_non_admin boolean NOT NULL DEFAULT true;
  `);

  // Seed sort_order + visibility for the three known slugs. Using UPDATE with a
  // WHERE clause keyed on slug so running this on a DB that already contains
  // only a subset of the projects is still safe.
  await pool.query(`UPDATE projects SET sort_order = 0, visible_to_non_admin = true  WHERE slug = 'hirestream-v1.4';`);
  await pool.query(`UPDATE projects SET sort_order = 1, visible_to_non_admin = true  WHERE slug = 'hirestream-htis-smoke';`);
  await pool.query(`UPDATE projects SET sort_order = 2, visible_to_non_admin = false WHERE slug = 'hirestream-v1.5-extras';`);

  console.log("Migration OK — projects.sort_order + projects.visible_to_non_admin ready.");
  console.log("Defaults applied: FRS=0 visible, HTIS smoke=1 visible, Beyond-FRS=2 hidden.");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
