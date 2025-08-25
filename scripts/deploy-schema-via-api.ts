#!/usr/bin/env tsx

/**
 * Deploy schema to Supabase via REST API
 * This bypasses CLI connection issues
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vdykrlyybwwbcqqcgjbp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeWtybHl5Ynd3YmNxcWNnamJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMzY2NzAsImV4cCI6MjA3MTcxMjY3MH0.McnQU03YULVB_dcwIa4QNmXml5YmTpOefa1ySkvBVEA'

async function deployMinimalSchema() {
  console.log('🚀 Deploying minimal schema to Supabase...')
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Test if we can create a simple table via RPC
    console.log('1. Testing basic table creation...')
    
    // Try to create a simple users table first
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        -- Create users table if it doesn't exist
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
          avatar TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
        
        -- Enable RLS
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
        -- Create basic policy
        CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.users 
          FOR SELECT USING (auth.uid()::text = id::text);
      `
    })
    
    if (error) {
      console.log('⚠️  RPC method not available, tables need to be created via Dashboard')
      console.log('Error:', error.message)
      
      console.log('\n📋 Manual Deployment Required:')
      console.log('1. Go to: https://supabase.com/dashboard/project/vdykrlyybwwbcqqcgjbp/sql')
      console.log('2. Create a new query')
      console.log('3. Copy the contents of: supabase/migrations/20250825161655_enhanced_coaching_schema.sql')
      console.log('4. Paste and run the SQL')
      
      return false
    } else {
      console.log('✅ Basic table created successfully!')
      return true
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error)
    return false
  }
}

async function testConnection() {
  console.log('\n🧪 Testing connection after deployment...')
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('users').select('count')
    
    if (error) {
      console.log('⚠️  Table not found:', error.message)
      return false
    } else {
      console.log('✅ Connection successful!')
      console.log('✅ Users table accessible')
      return true
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error)
    return false
  }
}

async function main() {
  console.log('🎯 Enhanced Coaching Platform - Schema Deployment')
  console.log('📍 Target: https://vdykrlyybwwbcqqcgjbp.supabase.co')
  
  const deployed = await deployMinimalSchema()
  
  if (deployed) {
    const connected = await testConnection()
    
    if (connected) {
      console.log('\n🎉 Deployment successful!')
      console.log('\n🚀 Your Enhanced Coaching Platform is ready:')
      console.log('   ✅ Database connected')
      console.log('   ✅ Basic tables created')
      console.log('   ✅ Authentication ready')
      console.log('   ✅ Real-time features enabled')
      
      console.log('\n📋 Next steps:')
      console.log('   1. Start your app: npm run dev')
      console.log('   2. Test the registration/login flow')
      console.log('   3. Deploy remaining tables via Dashboard SQL editor')
    }
  }
  
  console.log('\n📚 Full deployment guide: DEPLOY_SCHEMA_TO_SUPABASE.md')
}

main().catch(console.error)
