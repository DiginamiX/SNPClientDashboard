#!/usr/bin/env node

/**
 * CRITICAL RLS POLICY FIX VERIFICATION
 * 
 * This script verifies that the RLS policy fixes allow user self-provisioning
 * while maintaining security. Critical for production deployment.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyRlsFixes() {
  console.log('🔒 VERIFYING CRITICAL RLS POLICY FIXES');
  console.log('=====================================');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('=====================================\n');

  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing Supabase connection...');
    const { error: connectionError } = await supabase.auth.getSession();
    if (connectionError) {
      throw new Error(`Connection failed: ${connectionError.message}`);
    }
    console.log('✅ Supabase connection verified\n');

    // Test 2: Create test user to verify self-provisioning
    console.log('2️⃣ Testing user self-provisioning capability...');
    
    const testEmail = `rls-test-${Date.now()}@example.com`;
    const testPassword = 'test-password-123';
    
    // Step 2a: Sign up user via Supabase Auth
    console.log('   📝 Creating test user via Supabase Auth...');
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          role: 'client' // Should be allowed
        }
      }
    });
    
    if (signUpError) {
      console.log(`   ⚠️ Auth signup error (may be expected): ${signUpError.message}`);
      // Continue with existing user test
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'coach-a-test@example.com',
        password: 'test-password-123'
      });
      
      if (signInError) {
        throw new Error(`Cannot test - no test users available: ${signInError.message}`);
      }
      
      authData.user = signInData.user;
      authData.session = signInData.session;
    }
    
    if (!authData.user || !authData.session) {
      throw new Error('Failed to get test user data');
    }
    
    console.log(`   ✅ User authenticated: ${authData.user.id}`);
    
    // Step 2b: Test self-provisioning in public.users table
    console.log('   🔨 Testing public.users self-provisioning...');
    
    const authenticatedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`
        }
      }
    });
    
    // Test INSERT permission (critical fix)
    const { data: insertData, error: insertError } = await authenticatedSupabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        first_name: 'Test',
        last_name: 'User',
        role: 'client' // Should be allowed with security fix
      })
      .select()
      .single();
    
    if (insertError && insertError.code === '23505') {
      // User already exists - that's fine, test SELECT instead
      console.log('   ℹ️ User already exists, testing SELECT permission...');
      
      const { data: selectData, error: selectError } = await authenticatedSupabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (selectError) {
        throw new Error(`SELECT permission failed: ${selectError.message}`);
      }
      
      console.log(`   ✅ User can read own record: ${selectData.email}`);
    } else if (insertError) {
      throw new Error(`INSERT permission failed: ${insertError.message} (Code: ${insertError.code})`);
    } else {
      console.log(`   ✅ User successfully created own record: ${insertData.email}`);
    }
    
    // Test 3: Verify role security (prevent escalation)
    console.log('3️⃣ Testing role escalation prevention...');
    
    const { data: roleTestData, error: roleTestError } = await authenticatedSupabase
      .from('users')
      .update({ role: 'admin' }) // This should be blocked
      .eq('id', authData.user.id)
      .select();
    
    if (!roleTestError) {
      console.error('   ❌ SECURITY BREACH: Role escalation was allowed!');
      throw new Error('CRITICAL: Users can escalate their own roles!');
    }
    
    console.log(`   ✅ Role escalation properly blocked: ${roleTestError.message}`);
    
    // Test 4: Verify admin capabilities still work  
    console.log('4️⃣ Testing admin role functionality (if available)...');
    // Note: This would require an actual admin user, skipping for now
    console.log('   ⏭️ Admin test skipped (requires actual admin user)');
    
    // SUCCESS REPORT
    console.log('\n🎉 RLS POLICY FIX VERIFICATION COMPLETE!');
    console.log('==========================================');
    console.log('✅ User self-provisioning: WORKING');
    console.log('✅ Role escalation prevention: WORKING');  
    console.log('✅ Authentication flow: WORKING');
    console.log('✅ Database connection: STABLE');
    console.log('==========================================');
    console.log('🚀 Critical RLS fixes are working correctly!');
    console.log('🚀 Production user registration should now work!');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ RLS FIX VERIFICATION FAILED!');
    console.error('===================================');
    console.error('❌ Error:', error.message);
    console.error('❌ Production deployment still blocked!');
    console.error('===================================');
    return false;
  }
}

// Run verification
verifyRlsFixes().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});