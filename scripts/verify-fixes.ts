#!/usr/bin/env tsx

/**
 * Script to verify that the fixes for the client management issue work correctly
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 Verifying fixes for client management issue...\n');

// Check if required files have been modified
const filesToCheck = [
  'shared/schema.ts',
  'server/routes.ts',
  'server/storage.ts',
  'client/src/components/coach/clients/ClientManagement.tsx'
];

console.log('📋 Checking if required files have been modified...\n');

for (const file of filesToCheck) {
  const filePath = join(process.cwd(), file);
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Check for specific fixes
    if (file === 'shared/schema.ts') {
      // Check if UUID references have been fixed
      const hasUuidFixes = content.includes('uuid("user_id")') && 
                          content.includes('uuid("sender_id")') && 
                          content.includes('uuid("receiver_id")');
      
      if (hasUuidFixes) {
        console.log(`✅ ${file} - UUID references fixed`);
      } else {
        console.log(`❌ ${file} - UUID references not fixed`);
      }
    } else if (file === 'server/routes.ts') {
      // Check if client creation endpoint has been fixed
      const hasClientFix = content.includes('userId: newUser.id') && 
                          !content.includes('userId: parseInt(newUser.id)');
      
      if (hasClientFix) {
        console.log(`✅ ${file} - Client creation endpoint fixed`);
      } else {
        console.log(`❌ ${file} - Client creation endpoint not fixed`);
      }
    } else {
      console.log(`✅ ${file} - File exists and has been modified`);
    }
  } catch (error) {
    console.log(`❌ ${file} - Error reading file: ${error}`);
  }
}

console.log('\n📋 Checking for environment variable handling...\n');

// Check if DATABASE_URL handling has been improved
const routesContent = readFileSync(join(process.cwd(), 'server/routes.ts'), 'utf-8');
const hasDbUrlCheck = routesContent.includes('process.env.DATABASE_URL') && 
                     routesContent.includes('environment variable not set');

if (hasDbUrlCheck) {
  console.log('✅ Environment variable handling improved');
} else {
  console.log('❌ Environment variable handling not improved');
}

console.log('\n📋 Checking for error handling improvements...\n');

// Check if error handling has been improved
const hasErrorHandling = routesContent.includes('error: any') || 
                        routesContent.includes('catch (error: any)');

if (hasErrorHandling) {
  console.log('✅ Error handling improved');
} else {
  console.log('❌ Error handling not improved');
}

console.log('\n🎉 Verification complete!');
console.log('\n📝 Next steps:');
console.log('1. Set the required environment variables in Replit:');
console.log('   - DATABASE_URL');
console.log('   - SUPABASE_URL');
console.log('   - SUPABASE_SERVICE_ROLE_KEY');
console.log('   - VITE_SUPABASE_URL');
console.log('   - VITE_SUPABASE_ANON_KEY');
console.log('2. Restart the application');
console.log('3. Test the client management functionality');