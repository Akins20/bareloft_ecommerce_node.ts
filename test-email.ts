import { EmailHelper } from './src/utils/email/emailHelper';
import { config } from './src/config/environment';

async function testEmail() {
  try {
    console.log('🔄 Initializing email service...');
    await EmailHelper.initialize();

    console.log('\n📧 Email Configuration:');
    console.log('- SMTP User:', process.env.SMTP_USER || 'NOT SET');
    console.log('- SMTP Password:', process.env.SMTP_PASSWORD ? '***SET***' : 'NOT SET');
    console.log('- From Email:', process.env.FROM_EMAIL || 'NOT SET');
    console.log('- From Name:', process.env.FROM_NAME || 'Bareloft');

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error('\n❌ Email credentials not configured!');
      console.log('\nPlease set the following environment variables in your .env file:');
      console.log('SMTP_USER=your-gmail@gmail.com');
      console.log('SMTP_PASSWORD=your-app-password');
      console.log('FROM_EMAIL=your-email@gmail.com');
      console.log('\nNote: For Gmail, you need to use an App Password, not your regular password.');
      console.log('Generate one here: https://myaccount.google.com/apppasswords');
      process.exit(1);
    }

    const testRecipient = process.argv[2] || process.env.SMTP_USER;

    if (!testRecipient) {
      console.error('❌ No recipient email provided!');
      console.log('Usage: npx ts-node test-email.ts your-email@example.com');
      process.exit(1);
    }

    console.log(`\n📤 Sending test email to: ${testRecipient}`);

    const success = await EmailHelper.sendTestEmail(testRecipient);

    if (success) {
      console.log('\n✅ Test email sent successfully!');
      console.log(`Check inbox at: ${testRecipient}`);
    } else {
      console.error('\n❌ Failed to send test email. Check the logs above for details.');
    }

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error testing email:', error);
    process.exit(1);
  }
}

testEmail();
