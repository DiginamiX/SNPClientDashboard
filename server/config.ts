const DEFAULT_SUPABASE_URL = "https://vdykrlyybwwbcqqcgjbp.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeWtybHl5Ynd3YmNxcWNnamJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMzY2NzAsImV4cCI6MjA3MTcxMjY3MH0.McnQU03YULVB_dcwIa4QNmXml5YmTpOefa1ySkvBVEA";

export const SUPABASE_URL =
  process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim().length > 0
    ? process.env.SUPABASE_URL
    : DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY.trim().length > 0
    ? process.env.SUPABASE_ANON_KEY
    : DEFAULT_SUPABASE_ANON_KEY;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn(
    "Using fallback Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY for production environments.",
  );
}

