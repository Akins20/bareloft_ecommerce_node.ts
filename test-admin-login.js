// Test admin login endpoint
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3008';

async function testAdminLogin() {
  console.log('🧪 Testing admin login endpoint...');
  
  const loginData = {
    email: 'ogunbiye@gmail.com',
    password: 'admin123'
  };
  
  try {
    console.log('📤 Sending login request to /api/v1/auth/email-login');
    console.log('📧 Email:', loginData.email);
    console.log('🔑 Password:', loginData.password);
    
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/email-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });
    
    const result = await response.json();
    
    console.log('📥 Response Status:', response.status);
    console.log('📄 Response:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('✅ Admin login successful!');
      console.log('👤 User:', result.data.user.firstName, result.data.user.lastName);
      console.log('👑 Role:', result.data.user.role);
      console.log('🎫 Access Token:', result.data.accessToken ? 'Present' : 'Missing');
    } else {
      console.log('❌ Admin login failed');
      console.log('🔍 Error:', result.message || 'Unknown error');
    }
    
  } catch (error) {
    console.error('💥 Network error:', error.message);
  }
}

testAdminLogin();