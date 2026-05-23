import { db } from './db';
import { sql } from 'drizzle-orm';

async function migrateProjectTasks() {
  console.log('Starting project tasks migration...');
  
  try {
    // Check if project_tasks table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'project_tasks'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('Project tasks table already exists, skipping creation');
    } else {
      // Create project_tasks table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS project_tasks (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          due_date TIMESTAMP WITH TIME ZONE,
          priority VARCHAR(20) DEFAULT 'medium',
          status VARCHAR(20) DEFAULT 'todo',
          assigned_to VARCHAR(100),
          completed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      console.log('Project tasks table created successfully');
      
      // Create index for faster queries by project_id
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS project_tasks_project_id_idx ON project_tasks(project_id);
      `);
      
      console.log('Project tasks index created successfully');
    }
    
    console.log('Project tasks migration completed successfully');
  } catch (error) {
    console.error('Error during project tasks migration:', error);
    throw error;
  }
}

// Run the migration
migrateProjectTasks()
  .then(() => {
    console.log('Project tasks migration completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error during project tasks migration:', err);
    process.exit(1);
  });