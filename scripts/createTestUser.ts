#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestUser() {
  console.log('🔐 Creating test user for authentication testing...');

  try {

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@bareloft.com',
        phoneNumber: '+2348012345678', // Nigerian format
        isVerified: true, // Pre-verified for testing
        role: 'CUSTOMER',
        isActive: true,
        status: 'ACTIVE'
      }
    });

    console.log('✅ Test user created successfully:');
    console.log(`   ID: ${testUser.id}`);
    console.log(`   Name: ${testUser.firstName} ${testUser.lastName}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Phone: ${testUser.phoneNumber}`);
    console.log(`   Role: ${testUser.role}`);
    console.log(`   Verified: ${testUser.isVerified}`);

    // Create a default address for the test user
    const testAddress = await prisma.address.create({
      data: {
        userId: testUser.id,
        type: 'SHIPPING',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+2348012345678',
        addressLine1: '123 Test Street, Victoria Island',
        city: 'Lagos',
        state: 'Lagos State',
        postalCode: '101001',
        country: 'NG',
        isDefault: true
      }
    });

    console.log('✅ Default address created:');
    console.log(`   Address ID: ${testAddress.id}`);
    console.log(`   Location: ${testAddress.addressLine1}, ${testAddress.city}, ${testAddress.state}`);

    // Also create an admin test user
    const adminUser = await prisma.user.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@bareloft.com',
        phoneNumber: '+2348098765432',
        isVerified: true,
        role: 'ADMIN',
        isActive: true,
        status: 'ACTIVE'
      }
    });

    console.log('✅ Admin test user created successfully:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Phone: ${adminUser.phoneNumber}`);
    console.log(`   Role: ${adminUser.role}`);

    console.log('\\n🎯 Authentication Test Data:');
    console.log('📋 Customer Login:');
    console.log(`   Email: testuser@bareloft.com`);
    console.log(`   Phone: +2348012345678`);
    
    console.log('📋 Admin Login:');
    console.log(`   Email: admin@bareloft.com`);
    console.log(`   Phone: +2348098765432`);
    
    console.log('\\n📝 Note: Authentication is OTP-based (no passwords needed)');

    console.log('\\n🚀 Ready for authentication endpoint testing!');

  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log('⚠️  Test users may already exist. Checking existing users...');
      
      const existingUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: 'testuser@bareloft.com' },
            { email: 'admin@bareloft.com' }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          role: true,
          isVerified: true
        }
      });

      if (existingUsers.length > 0) {
        console.log('✅ Found existing test users:');
        existingUsers.forEach(user => {
          console.log(`   ${user.firstName} ${user.lastName} (${user.role})`);
          console.log(`   Email: ${user.email} | Phone: ${user.phoneNumber}`);
          console.log(`   Verified: ${user.isVerified} | ID: ${user.id}`);
          console.log('   ---');
        });
      }
    } else {
      console.error('❌ Error creating test user:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();