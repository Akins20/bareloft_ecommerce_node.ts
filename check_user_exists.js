const { PrismaClient } = require('@prisma/client');

async function checkUserExists() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    
    const user = await prisma.user.findFirst({
      where: { email: 'test.e2e.user@bareloft.com' }
    });
    
    if (user) {
      console.log('✅ User exists in database:', {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt
      });
    } else {
      console.log('❌ No user found with email test.e2e.user@bareloft.com');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserExists();