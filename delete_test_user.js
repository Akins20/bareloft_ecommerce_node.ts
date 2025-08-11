const { PrismaClient } = require('@prisma/client');

async function deleteTestUser() {
  const prisma = new PrismaClient();
  try {
    await prisma.user.delete({ 
      where: { email: 'test.e2e.user@bareloft.com' } 
    });
    console.log('✅ Test user deleted');
  } catch (error) {
    console.log('Delete error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestUser();