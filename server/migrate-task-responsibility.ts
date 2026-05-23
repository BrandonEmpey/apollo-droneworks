import { sql } from 'drizzle-orm';
import { db } from './db';

/**
 * Migration script to update the project_tasks table
 * - Adds apolloResponsibility column
 * - Migrates data from assignedTo to apolloResponsibility
 * - Renames the existing column if needed
 */
async function main() {
  console.log('Starting task responsibility field migration...');

  try {
    // Check if the apolloResponsibility column already exists
    const checkColumn = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'project_tasks'
      AND column_name = 'apollo_responsibility';
    `);

    if (checkColumn.rows.length === 0) {
      console.log('Adding apollo_responsibility column to project_tasks table...');
      
      // Add the new column
      await db.execute(sql`
        ALTER TABLE project_tasks
        ADD COLUMN apollo_responsibility VARCHAR(255);
      `);
      
      // Copy data from assignedTo to apolloResponsibility
      console.log('Migrating data from assigned_to to apollo_responsibility...');
      await db.execute(sql`
        UPDATE project_tasks
        SET apollo_responsibility = assigned_to;
      `);
      
      console.log('Apollo responsibility field added and data migrated successfully');
    } else {
      console.log('Apollo responsibility field already exists, skipping migration');
    }
    
    // Now update the schema.ts file to reflect the change
    console.log('Task responsibility migration completed successfully!');
  } catch (error) {
    console.error('Error during task responsibility migration:', error);
    throw error;
  }
}

// Execute migration
main()
  .then(() => {
    console.log('Task responsibility migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during task responsibility migration:', error);
    process.exit(1);
  });