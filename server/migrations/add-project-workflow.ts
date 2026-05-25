import { db } from "../db";
import { sql } from "drizzle-orm";

export async function runProjectWorkflowMigration() {
  try {
    await db.execute(sql`
      ALTER TABLE client_projects
        ADD COLUMN IF NOT EXISTS drone_type VARCHAR(100),
        ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS project_deliverables (
        id          SERIAL PRIMARY KEY,
        project_id  INTEGER NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
        name        VARCHAR(255) NOT NULL,
        type        VARCHAR(100) NOT NULL DEFAULT 'file',
        status      VARCHAR(50)  NOT NULL DEFAULT 'pending',
        due_date    TIMESTAMPTZ,
        file_url    TEXT,
        notes       TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS project_files (
        id          SERIAL PRIMARY KEY,
        project_id  INTEGER NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
        file_name   VARCHAR(255) NOT NULL,
        file_path   TEXT NOT NULL,
        file_type   VARCHAR(50) NOT NULL DEFAULT 'other',
        file_size   INTEGER,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log("Project workflow migration completed successfully");
  } catch (err) {
    console.error("Project workflow migration failed:", err);
    throw err;
  }
}
