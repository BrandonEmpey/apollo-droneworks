import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * This script migrates the database to add timelapse_items table
 */
async function main() {
  try {
    console.log('Starting timelapse table migration...');

    // Check if timelapse_items table exists
    const tableExists = await checkTableExists('timelapse_items');
    if (tableExists) {
      console.log('timelapse_items table already exists, skipping creation');
      return;
    }

    // Create timelapse_items table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS timelapse_items (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        media_type VARCHAR(50) NOT NULL, -- image, video, orthomosaic
        source_type VARCHAR(20) NOT NULL, -- upload, url
        capture_date TIMESTAMPTZ NOT NULL,
        metadata JSONB DEFAULT '{}',
        file_size INTEGER,
        uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('timelapse_items table created successfully');

    // Create indexes for faster queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS timelapse_items_task_id_idx ON timelapse_items(task_id);
      CREATE INDEX IF NOT EXISTS timelapse_items_project_id_idx ON timelapse_items(project_id);
      CREATE INDEX IF NOT EXISTS timelapse_items_capture_date_idx ON timelapse_items(capture_date);
    `);

    console.log('timelapse_items indexes created successfully');
    console.log('Timelapse tables migration completed successfully');
  } catch (error) {
    console.error('Error migrating timelapse tables:', error);
  }
}

async function checkTableExists(tableName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
    );
  `);
  
  return result.rows[0]?.exists === true;
}

main().then(() => {
  console.log('Timelapse migration completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
