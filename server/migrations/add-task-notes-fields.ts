import { sql } from "drizzle-orm";
import { db } from "../db";

export async function addTaskNotesFields() {
  console.log("Starting task notes fields migration...");

  try {
    // Check if client_notes and admin_notes columns already exist
    const clientNotesExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_tasks' 
        AND column_name = 'client_notes'
      );
    `);

    if (!clientNotesExists.rows[0].exists) {
      console.log("Adding client_notes field to project_tasks table...");
      await db.execute(sql`
        ALTER TABLE project_tasks
        ADD COLUMN client_notes TEXT;
      `);
      console.log("client_notes field added successfully");
    } else {
      console.log("client_notes field already exists, skipping");
    }

    const adminNotesExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_tasks' 
        AND column_name = 'admin_notes'
      );
    `);

    if (!adminNotesExists.rows[0].exists) {
      console.log("Adding admin_notes field to project_tasks table...");
      await db.execute(sql`
        ALTER TABLE project_tasks
        ADD COLUMN admin_notes TEXT;
      `);
      console.log("admin_notes field added successfully");
    } else {
      console.log("admin_notes field already exists, skipping");
    }

    console.log("Task notes fields migration completed successfully");
  } catch (error) {
    console.error("Error in task notes fields migration:", error);
    throw error;
  }
}
