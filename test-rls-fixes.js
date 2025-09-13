#!/usr/bin/env node

/**
 * Quick test to verify RLS security fix is working
 */

import { runRlsSecurityTests, quickSecurityCheck } from './server/rls-tests.js';

async function testRlsFixes() {
  console.log('🔒 Testing RLS Security Fixes...\n');
  
  console.log('📋 Testing environment check...');
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    console.error('Please ensure Supabase is properly configured');
    process.exit(1);
  }
  
  console.log('✅ Environment variables are set');
  console.log('✅ SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('✅ SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY?.substring(0, 20) + '...');
  
  try {
    // First run quick security check
    console.log('\n🚀 Running quick security check...');
    const quickCheckPassed = await quickSecurityCheck();
    
    if (quickCheckPassed) {
      console.log('\n🎉 Quick security check PASSED!');
      console.log('✅ RLS security test setup is working correctly');
      console.log('✅ Public.users records are being created before coach profiles');
      console.log('✅ Coach creation error handling is working properly');
      console.log('✅ Cross-tenant isolation is verified');
      
      // Run full test suite if quick check passes
      console.log('\n🔒 Running full RLS security test suite...');
      const fullTestsPassed = await runRlsSecurityTests();
      
      if (fullTestsPassed) {
        console.log('\n🎉 ALL RLS SECURITY TESTS PASSED!');
        console.log('✅ System is ready for production deployment');
        console.log('✅ Cross-tenant isolation verified with real JWT tokens');
        console.log('✅ Audit trail enforcement confirmed');
        process.exit(0);
      } else {
        console.error('\n❌ Full RLS security tests FAILED');
        process.exit(1);
      }
    } else {
      console.error('\n❌ Quick security check FAILED');
      console.error('The RLS security setup still has issues that need to be resolved');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ RLS security test failed with error:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testRlsFixes().catch(error => {
  console.error('\n💥 Test script failed:', error);
  process.exit(1);
});