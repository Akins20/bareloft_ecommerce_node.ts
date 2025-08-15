const { PrismaClient } = require('@prisma/client');

async function getLatestAdminOTP() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    
    const latestOTP = await prisma.oTPCode.findFirst({
      where: {
        phoneNumber: '+2348098765432',
        purpose: 'LOGIN',
        isUsed: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (latestOTP) {
      console.log('✅ ADMIN OTP:', latestOTP.code);
      console.log('Expires at:', latestOTP.expiresAt);
      console.log('Created at:', latestOTP.createdAt);
      console.log('Attempts used:', latestOTP.attempts, '/', latestOTP.maxAttempts);
    } else {
      console.log('❌ No unused Admin OTP found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getLatestAdminOTP();