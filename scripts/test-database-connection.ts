import postgres from 'postgres';

// This script tests the database connection
// You need to set the DATABASE_URL environment variable before running this script

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please set it to your Supabase database connection string');
  console.error('Format: postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres');
  process.exit(1);
}

console.log('🔍 Testing database connection...');

try {
  const client = postgres(process.env.DATABASE_URL, { prepare: false });
  
  // Test a simple query
  client`SELECT 1 as test`.then(result => {
    console.log('✅ Database connection successful');
    console.log('Test query result:', result);
    
    // Close the connection
    client.end();
  }).catch(error => {
    console.error('❌ Database connection failed:', error.message);
    client.end();
  });
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
}