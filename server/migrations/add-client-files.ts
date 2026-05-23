import { sql } from "drizzle-orm";
import { db } from "../db";

export async function addClientFiles() {
  console.log("Starting client files migration...");

  try {
    // Check if the client_files table already exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'client_files'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log("client_files table already exists, skipping creation");
      return;
    }

    // Create the client_files table
    await db.execute(sql`
      CREATE TABLE "client_files" (
        "id" SERIAL PRIMARY KEY,
        "client_id" INTEGER NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "file_url" TEXT NOT NULL,
        "file_type" VARCHAR(50) NOT NULL,
        "thumbnail_url" TEXT,
        "size" INTEGER NOT NULL,
        "uploaded_at" TIMESTAMPTZ NOT NULL,
        "expires_at" TIMESTAMPTZ,
        "is_public" BOOLEAN NOT NULL DEFAULT false,
        "booking_id" INTEGER REFERENCES "bookings"("id") ON DELETE SET NULL,
        "project_id" INTEGER REFERENCES "client_projects"("id") ON DELETE SET NULL
      );
    `);

    // Create indexes for performance
    await db.execute(sql`
      CREATE INDEX "client_files_client_id_idx" ON "client_files" ("client_id");
      CREATE INDEX "client_files_booking_id_idx" ON "client_files" ("booking_id");
      CREATE INDEX "client_files_project_id_idx" ON "client_files" ("project_id");
    `);

    console.log("Client files table created successfully");
  } catch (error) {
    console.error("Error creating client files table:", error);
    throw error;
  }

  console.log("Client files migration completed successfully");
}

// Execute migration directly
addClientFiles()
  .then(() => console.log("Migration completed successfully"))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });