// Quick script to update admin email
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateAdminEmail() {
  console.log('🔄 Updating admin email to ogunbiye@gmail.com...');
  
  try {
    const updatedAdmin = await prisma.user.update({
      where: { phoneNumber: '+2348012345678' },
      data: {
        email: 'ogunbiye@gmail.com'
      }
    });
    
    console.log('✅ Admin email updated successfully!');
    console.log('📧 Email:', updatedAdmin.email);
    console.log('📱 Phone:', updatedAdmin.phoneNumber);
    console.log('👑 Role:', updatedAdmin.role);
    console.log('🆔 User ID:', updatedAdmin.id);
    
  } catch (error) {
    console.error('❌ Failed to update admin email:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminEmail();