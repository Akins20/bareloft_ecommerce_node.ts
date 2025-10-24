import { EmailHelper } from '../utils/email/emailHelper';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test script to send an email using Resend API
 */
async function testResendEmail() {
  try {
    console.log('🚀 Testing Resend Email Integration...\n');

    // Initialize email service
    console.log('📧 Initializing email service...');
    await EmailHelper.initialize();

    // Test configuration
    console.log('\n🔍 Testing configuration...');
    const configTest = await EmailHelper.testConfiguration();
    if (!configTest) {
      console.error('❌ Configuration test failed. Please check your Resend API key.');
      process.exit(1);
    }
    console.log('✅ Configuration test passed!');

    // Send test email
    console.log('\n📤 Sending test email to ogunbiyi456@gmail.com...');
    const success = await EmailHelper.sendTestEmail('ogunbiyi456@gmail.com');

    if (success) {
      console.log('\n✅ Email sent successfully!');
      console.log('📬 Check your inbox at ogunbiyi456@gmail.com');
      console.log('💡 If you don\'t see it, check your spam folder.');
    } else {
      console.error('\n❌ Failed to send email. Check the logs above for details.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error testing email:', error);
    process.exit(1);
  }
}

// Run the test
testResendEmail();
