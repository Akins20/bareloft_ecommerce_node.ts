#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseHealth() {
  try {
    console.log('🔄 Checking database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test a simple query
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query test successful');
    
    // Check if critical tables exist
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('users', 'products', 'categories', 'orders')
    `;
    
    const expectedTables = ['users', 'products', 'categories', 'orders'];
    const existingTables = tables.map(t => t.tablename);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log(`⚠️ Missing tables: ${missingTables.join(', ')}`);
      console.log('🔄 This might be resolved by running database migrations');
      process.exit(1);
    }
    
    console.log('✅ All critical tables exist');
    console.log('🎉 Database health check passed!');
    
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  checkDatabaseHealth();
}

export { checkDatabaseHealth };