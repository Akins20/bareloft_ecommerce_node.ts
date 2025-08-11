const { PrismaClient } = require('@prisma/client');

async function testUserCreation() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('Connected to database');
    
    // Test user creation with null phoneNumber
    const userData = {
      phoneNumber: null,
      firstName: "Test",
      lastName: "User",
      email: "test.e2e.user@bareloft.com",
      role: "CUSTOMER",
    };
    
    console.log('Attempting to create user with data:', userData);
    
    const user = await prisma.user.create({
      data: userData
    });
    
    console.log('✅ User created successfully:', user);
    
  } catch (error) {
    console.error('❌ User creation failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUserCreation();