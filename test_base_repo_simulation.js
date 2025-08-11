const { PrismaClient } = require('@prisma/client');

async function testBaseRepositorySimulation() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    
    // Simulate what BaseRepository.getModel() does
    const modelName = "user";
    const model = prisma[modelName];
    
    if (!model) {
      console.log('❌ Model not found!');
      return;
    }
    
    console.log('✅ Model found:', typeof model);
    
    // Test the exact call that BaseRepository makes
    const userData = {
      phoneNumber: null,
      firstName: "Test",
      lastName: "User",
      email: "test.e2e.user@bareloft.com",
      role: "CUSTOMER",
    };
    
    const includeClause = { addresses: true };
    
    console.log('Attempting BaseRepository-style creation...');
    
    const user = await model.create({
      data: userData,
      include: includeClause,
    });
    
    console.log('✅ BaseRepository simulation successful:', user);
    
    // Cleanup
    await model.delete({ where: { id: user.id } });
    console.log('✅ Test user deleted');
    
  } catch (error) {
    console.error('❌ BaseRepository simulation failed:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Meta:', error.meta);
  } finally {
    await prisma.$disconnect();
  }
}

testBaseRepositorySimulation();