import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Temporary fix for Replit environment variable caching issue - use correct Supabase Transaction pooler URL
const correctDatabaseUrl = 'postgresql://postgres.vdykrlyybwwbcqqcgjbp:twRRKUJ8wSo6QFWC@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

// Configure postgres.js client for Supabase
const client = postgres(correctDatabaseUrl, {
  prepare: false, // Disable prepared statements for better Supabase compatibility
  max: 10, // Connection pool size
});

export const db = drizzle(client, { schema });
