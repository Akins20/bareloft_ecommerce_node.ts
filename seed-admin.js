// Admin user seed script for Bareloft backend
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdminUser() {
  console.log('🌱 Seeding admin user...');
  
  try {
    // Check if admin already exists (by email or phone)
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'ogunbiye@gmail.com' },
          { phoneNumber: '+2348012345678' }
        ]
      }
    });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log('📧 Email:', existingAdmin.email || 'N/A');
      console.log('📱 Phone:', existingAdmin.phoneNumber || 'N/A');
      console.log('👑 Current Role:', existingAdmin.role);
      console.log('🆔 User ID:', existingAdmin.id);
      
      // Update to SUPER_ADMIN if not already
      if (existingAdmin.role !== 'SUPER_ADMIN') {
        console.log('🔄 Updating user to SUPER_ADMIN role...');
        const updatedAdmin = await prisma.user.update({
          where: { id: existingAdmin.id },
          data: {
            role: 'SUPER_ADMIN',
            email: existingAdmin.email || 'ogunbiye@gmail.com',
            password: existingAdmin.password || await bcrypt.hash('admin123', 12),
            isVerified: true,
            isActive: true
          }
        });
        console.log('✅ User updated to SUPER_ADMIN!');
        return updatedAdmin;
      }
      
      return existingAdmin;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminUserData = {
      email: 'ogunbiye@gmail.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User', 
      role: 'SUPER_ADMIN',
      isActive: true,
      isVerified: true,
      phoneNumber: '+2348012345678',
    };

    console.log('📝 Creating admin user with data:', {
      ...adminUserData,
      password: '[HASHED]' // Don't log the actual password
    });

    // Create the admin user
    const adminUser = await prisma.user.create({
      data: adminUserData
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: ogunbiye@gmail.com');
    console.log('🔑 Password: admin123');
    console.log('👑 Role: SUPER_ADMIN');
    console.log('📱 Phone: +2348012345678');
    console.log('🆔 User ID:', adminUser.id);
    
    return adminUser;
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('🎉 Admin seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Admin seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { createAdminUser };