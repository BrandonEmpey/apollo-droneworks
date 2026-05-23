import { db } from './db';
import { socialMediaAccounts, socialPosts } from '@shared/schema';

// Create tables directly using SQL
async function createSocialMediaTables() {
  console.log('Creating social media tables...');
  
  try {
    // Create social_media_accounts table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS social_media_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        account_id TEXT NOT NULL,
        account_name TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry TIMESTAMP,
        connected BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create social_posts table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS social_posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        media_url TEXT,
        media_type TEXT,
        scheduled_for TIMESTAMP,
        published BOOLEAN NOT NULL DEFAULT FALSE,
        published_to JSONB DEFAULT '[]',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('Social media tables created successfully');
  } catch (error) {
    console.error('Error creating social media tables:', error);
    throw error;
  }
}

// Execute the migration
createSocialMediaTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });