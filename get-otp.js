const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getLatestOTP() {
  try {
    const otp = await prisma.otpcode.findFirst({
      where: {
        phoneNumber: '+2348012345678'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (otp) {
      console.log('Latest OTP:', otp.code);
      console.log('Expires at:', otp.expiresAt);
      console.log('Phone:', otp.phoneNumber);
    } else {
      console.log('No OTP found for +2348012345678');
      // Check if there are any users with admin role
      const adminUsers = await prisma.user.findMany({
        where: {
          role: 'ADMIN'
        },
        select: {
          id: true,
          phoneNumber: true,
          email: true,
          firstName: true,
          lastName: true
        }
      });
      console.log('Admin users found:', adminUsers);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getLatestOTP();