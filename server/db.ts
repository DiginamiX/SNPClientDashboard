import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure postgres.js client for Supabase
const client = postgres(process.env.DATABASE_URL, {
  prepare: false, // Disable prepared statements for better Supabase compatibility
  max: 10, // Connection pool size
});

export const db = drizzle(client, { schema });
