const { PrismaClient } = require('@prisma/client');

async function testUserCreationWithInclude() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    
    const userData = {
      phoneNumber: null,
      firstName: "Test",
      lastName: "User", 
      email: "test.e2e.user@bareloft.com",
      role: "CUSTOMER",
    };
    
    console.log('Testing user creation with include addresses...');
    
    const user = await prisma.user.create({
      data: userData,
      include: {
        addresses: true,
      }
    });
    
    console.log('✅ User created with include:', user);
    
    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✅ Test user deleted');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

testUserCreationWithInclude();