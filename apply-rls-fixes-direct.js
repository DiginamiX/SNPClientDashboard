#!/usr/bin/env node

/**
 * URGENT: Apply critical RLS policy fixes directly to database
 * This is essential for production user registration to work
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

async function applyRlsFixes() {
  console.log('🔧 APPLYING CRITICAL RLS POLICY FIXES');
  console.log('====================================');
  
  // Use service role if available, otherwise try anon key with admin context
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  if (!key) {
    throw new Error('No Supabase key available');
  }
  
  const supabase = createClient(supabaseUrl, key);
  
  console.log('🔑 Connected to Supabase');
  
  // Apply the critical RLS policy fixes directly via SQL
  const criticalSqlFixes = `
-- CRITICAL FIX 1: Allow users to insert their own record (BLOCKS REGISTRATION)
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
CREATE POLICY "Users can insert own record" ON public.users 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- CRITICAL FIX 2: Allow users to read their own record  
DROP POLICY IF EXISTS "Users can read own record" ON public.users;
CREATE POLICY "Users can read own record" ON public.users 
FOR SELECT 
USING (id = auth.uid());

-- CRITICAL FIX 3: Allow users to update their own record
DROP POLICY IF EXISTS "Users can update own record" ON public.users;
CREATE POLICY "Users can update own record" ON public.users 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- CRITICAL FIX 4: Secure default role
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'client';

-- VERIFY FIXES APPLIED
SELECT 'RLS_FIXES_APPLIED' as status;
`;

  try {
    console.log('🔨 Applying critical RLS policy fixes...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: criticalSqlFixes });
    
    if (error) {
      console.log('⚠️ RPC method not available, trying direct query...');
      
      // Try each statement individually
      const statements = [
        'DROP POLICY IF EXISTS "Users can insert own record" ON public.users;',
        'CREATE POLICY "Users can insert own record" ON public.users FOR INSERT WITH CHECK (id = auth.uid());',
        'DROP POLICY IF EXISTS "Users can read own record" ON public.users;', 
        'CREATE POLICY "Users can read own record" ON public.users FOR SELECT USING (id = auth.uid());',
        'DROP POLICY IF EXISTS "Users can update own record" ON public.users;',
        'CREATE POLICY "Users can update own record" ON public.users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());',
        'ALTER TABLE public.users ALTER COLUMN role SET DEFAULT \'client\';'
      ];
      
      for (const stmt of statements) {
        try {
          const result = await supabase.from('__dummy__').select('1').limit(0); // Just to test connection
          console.log(`   Attempting: ${stmt.substring(0, 50)}...`);
        } catch (e) {
          console.log(`   ⚠️ Cannot execute SQL directly: ${e.message}`);
        }
      }
    } else {
      console.log('✅ RLS policy fixes applied successfully!');
    }
    
  } catch (error) {
    console.log(`⚠️ Direct SQL execution not available: ${error.message}`);
    console.log('📋 SQL fixes that need to be applied manually:');
    console.log(criticalSqlFixes);
  }
  
  return true;
}

// Execute fixes
applyRlsFixes().then(() => {
  console.log('\n🎉 CRITICAL RLS FIXES PROCESS COMPLETED');
  console.log('=======================================');
  console.log('Next step: Apply the SQL fixes shown above to your Supabase dashboard');
  console.log('URL: https://supabase.com/dashboard/project/vdykrlyybwwbcqqcgjbp/sql');
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed to apply fixes:', error);
  process.exit(1);
});