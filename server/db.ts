import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Convert Supabase URL to PostgreSQL connection string if needed
let dbUrl = process.env.DATABASE_URL;
if (process.env.DATABASE_URL.startsWith('http')) {
  console.log("⚠️  DATABASE_URL appears to be a Supabase REST URL, not a direct PostgreSQL connection.");
  console.log("   The app will start but may have limited database functionality.");
  console.log("   For full functionality, please provide the direct PostgreSQL connection string from:");
  console.log("   Supabase Dashboard → Settings → Database → Connection string → URI");
  
  // For now, we'll create a dummy connection to prevent the app from crashing
  // This allows the app to start and use Supabase API endpoints that don't require direct DB access
  dbUrl = "postgresql://dummy:dummy@localhost:5432/dummy";
}

// Configure postgres.js client for Supabase
const client = postgres(dbUrl, {
  prepare: false, // Disable prepared statements for better Supabase compatibility
  max: 10, // Connection pool size
});

export const db = drizzle(client, { schema });
