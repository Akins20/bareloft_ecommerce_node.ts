const { PrismaClient } = require('@prisma/client');

async function getLatestOTP() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    
    const latestOTP = await prisma.oTPCode.findFirst({
      where: {
        email: 'test.e2e.user@bareloft.com',
        purpose: 'SIGNUP',
        isUsed: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (latestOTP) {
      console.log('✅ LATEST OTP:', latestOTP.code);
      console.log('Expires at:', latestOTP.expiresAt);
      console.log('Created at:', latestOTP.createdAt);
      console.log('Attempts used:', latestOTP.attempts, '/', latestOTP.maxAttempts);
    } else {
      console.log('❌ No unused OTP found');
      
      // Check for any OTP for this email
      const anyOTP = await prisma.oTPCode.findFirst({
        where: { email: 'test.e2e.user@bareloft.com' },
        orderBy: { createdAt: 'desc' }
      });
      
      if (anyOTP) {
        console.log('Found OTP (might be used):', anyOTP.code);
        console.log('Is used:', anyOTP.isUsed);
        console.log('Purpose:', anyOTP.purpose);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getLatestOTP();