import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Safety check: Ensure DATABASE_URL is in PostgreSQL format, not HTTPS
if (process.env.DATABASE_URL.startsWith('http')) {
  throw new Error(
    "DATABASE_URL must be a PostgreSQL connection string (postgres://...), not an HTTPS URL. " +
    "Use the Supabase Direct connection string from Settings → Database → Connection string → URI"
  );
}

// Configure postgres.js client for Supabase
const client = postgres(process.env.DATABASE_URL, {
  prepare: false, // Disable prepared statements for better Supabase compatibility
  max: 10, // Connection pool size
});

export const db = drizzle(client, { schema });
