import 'dotenv/config';
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const adminPassword = await hashPassword("admin123");
  const clientPassword = await hashPassword("client123");

  // Upsert admin user — update email/password if username already exists
  await db.insert(schema.users).values({
    username: "admin",
    email: "admin@admin.com",
    password: adminPassword,
    firstName: "Admin",
    lastName: "User",
    isAdmin: true,
  }).onConflictDoUpdate({
    target: schema.users.username,
    set: {
      email: "admin@admin.com",
      password: adminPassword,
      isAdmin: true,
    }
  });

  console.log("✓ Admin user created/updated: admin@admin.com / admin123");

  // Create client user in customers table
  await db.insert(schema.customers).values({
    username: "client",
    email: "client@client.com",
    password: clientPassword,
    firstName: "Client",
    lastName: "User",
    name: "Client User",
    status: "active",
  }).onConflictDoNothing();

  console.log("✓ Client user created: client@client.com / client123");

  await pool.end();
  console.log("\nDone! You can now log in at http://localhost:3000/auth");
}

main().catch(console.error);
