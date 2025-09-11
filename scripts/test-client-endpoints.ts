import { apiRequest } from '../client/src/lib/queryClient';

async function testClientEndpoints() {
  console.log('🔍 Testing client management endpoints...');
  
  try {
    // Test getting clients
    console.log('🔍 Testing GET /api/clients...');
    const response = await apiRequest('GET', '/api/clients');
    const clients = await response.json();
    console.log('✅ GET /api/clients successful:', clients);
  } catch (error) {
    console.error('❌ GET /api/clients failed:', error);
  }
  
  try {
    // Test adding a client
    console.log('🔍 Testing POST /api/clients...');
    const newClient = {
      firstName: 'Test',
      lastName: 'Client',
      email: 'test.client@example.com',
      packageType: 'standard'
    };
    
    const response = await apiRequest('POST', '/api/clients', newClient);
    const result = await response.json();
    console.log('✅ POST /api/clients successful:', result);
  } catch (error) {
    console.error('❌ POST /api/clients failed:', error);
  }
}

testClientEndpoints();