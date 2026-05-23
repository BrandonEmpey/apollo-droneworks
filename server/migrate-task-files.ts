import { sql } from "drizzle-orm";
import { db } from "./db";

async function migrateTaskFiles() {
  console.log('Starting task files migration...');
  
  try {
    // Check if task_files table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'task_files'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('Task files table already exists, skipping creation');
    } else {
      // Create task_files table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS task_files (
          id SERIAL PRIMARY KEY,
          task_id INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          url TEXT NOT NULL,
          file_type VARCHAR(50) DEFAULT 'link',
          uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      console.log('Task files table created successfully');
      
      // Create index for faster queries by task_id
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS task_files_task_id_idx ON task_files(task_id);
      `);
      
      console.log('Task files index created successfully');
    }
    
    console.log('Task files migration completed successfully');
  } catch (error) {
    console.error('Error during task files migration:', error);
    throw error;
  }
}

// Run the migration
migrateTaskFiles()
  .then(() => {
    console.log('Task files migration completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error during task files migration:', err);
    process.exit(1);
  });