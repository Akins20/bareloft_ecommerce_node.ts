import axios from 'axios';

const API_URL = 'http://localhost:3007/api/v1/auth';

async function testOTPFlow() {
  try {
    console.log('🧪 Testing OTP Email Flow\n');

    const testEmail = 'ogunbiyi456@gmail.com';
    const testPhone = '+2348012345678';

    // Test 1: Request OTP for email (lowercase purpose)
    console.log('📧 Test 1: Requesting OTP for email verification...');
    try {
      const otpResponse = await axios.post(`${API_URL}/request-otp`, {
        email: testEmail,
        purpose: 'login'  // lowercase as expected by validation
      });

      console.log('✅ OTP Request Response:');
      console.log(JSON.stringify(otpResponse.data, null, 2));
    } catch (error: any) {
      console.error('❌ OTP Request Error:', error.response?.data || error.message);
    }

    console.log('\n---\n');

    // Test 2: Request OTP for phone
    console.log('📱 Test 2: Requesting OTP for phone verification...');
    try {
      const phoneOtpResponse = await axios.post(`${API_URL}/request-otp`, {
        phoneNumber: testPhone,
        purpose: 'login'  // lowercase as expected by validation
      });

      console.log('✅ Phone OTP Request Response:');
      console.log(JSON.stringify(phoneOtpResponse.data, null, 2));
    } catch (error: any) {
      console.error('❌ Phone OTP Request Error:', error.response?.data || error.message);
    }

    console.log('\n---\n');

    // Test 3: Check server logs for OTP codes
    console.log('💡 Check your server console for the actual OTP codes!');
    console.log('💡 Check your email inbox at:', testEmail);

  } catch (error) {
    console.error('❌ Test Error:', error);
  }
}

testOTPFlow();
