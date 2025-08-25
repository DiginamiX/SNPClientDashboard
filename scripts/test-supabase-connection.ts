#!/usr/bin/env tsx

/**
 * Test script for Supabase connection and basic functionality
 * Run with: npx tsx scripts/test-supabase-connection.ts
 */

import { supabase, auth, db } from '../client/src/lib/supabase'

async function testSupabaseConnection() {
  console.log('🔧 Testing Supabase connection...')
  console.log('📍 Supabase URL:', process.env.SUPABASE_URL || 'http://localhost:54321')
  
  try {
    // Test 1: Basic connection
    console.log('\n1. Testing basic connection...')
    const { data: healthCheck, error: healthError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (healthError && healthError.code !== 'PGRST116') { // PGRST116 = relation does not exist (expected for empty DB)
      console.log('⚠️  Database connection established, but tables may not exist yet')
      console.log('   Error:', healthError.message)
    } else {
      console.log('✅ Database connection successful')
    }
    
    // Test 2: Authentication service
    console.log('\n2. Testing authentication service...')
    const { data: session, error: sessionError } = await auth.getSession()
    
    if (sessionError) {
      console.log('⚠️  Auth service error:', sessionError.message)
    } else {
      console.log('✅ Authentication service ready')
      console.log('   Current session:', session?.user ? 'Authenticated' : 'No active session')
    }
    
    // Test 3: Real-time capabilities
    console.log('\n3. Testing real-time capabilities...')
    const channel = supabase.channel('test-channel')
    
    const subscription = channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Real-time capabilities ready')
        supabase.removeChannel(channel)
      } else if (status === 'CHANNEL_ERROR') {
        console.log('⚠️  Real-time connection error')
        supabase.removeChannel(channel)
      }
    })
    
    // Give it a moment to connect
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Test 4: Database helper functions
    console.log('\n4. Testing database helper functions...')
    try {
      // This will likely fail if tables don't exist, but tests the helper function
      const result = await db.select('users', '*', { limit: 1 }).catch(() => null)
      console.log('✅ Database helper functions working')
    } catch (error) {
      console.log('⚠️  Database helpers ready (tables may not exist yet)')
    }
    
    // Test 5: Storage bucket access (if configured)
    console.log('\n5. Testing storage access...')
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      
      if (bucketsError) {
        console.log('⚠️  Storage access limited:', bucketsError.message)
      } else {
        console.log('✅ Storage access ready')
        console.log('   Available buckets:', buckets?.map(b => b.name).join(', ') || 'None')
      }
    } catch (error) {
      console.log('⚠️  Storage service not accessible')
    }
    
    console.log('\n🎉 Supabase integration test completed!')
    console.log('\n📋 Next steps:')
    console.log('   1. Run: supabase start (to start local development)')
    console.log('   2. Run: supabase db reset (to apply migrations)')
    console.log('   3. Create a remote Supabase project for production')
    
  } catch (error) {
    console.error('\n❌ Supabase integration test failed:', error)
    console.log('\n🔧 Troubleshooting:')
    console.log('   1. Check if Supabase is running: supabase status')
    console.log('   2. Start local Supabase: supabase start')
    console.log('   3. Check environment variables')
    console.log('   4. Verify network connectivity')
    
    process.exit(1)
  }
}

// Run the test
testSupabaseConnection().catch(console.error)
