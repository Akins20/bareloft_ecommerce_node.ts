// Database Seed Script for Admin User
// Run this script in your backend environment

const bcrypt = require('bcrypt');

async function createAdminUser(userModel) {
  console.log('🌱 Seeding admin user...');
  
  // Check if admin already exists
  const existingAdmin = await userModel.findOne({ 
    email: 'ogunbiye@gmail.com' 
  }).catch(() => null);
  
  if (existingAdmin) {
    console.log('✅ Admin user already exists with email: ogunbiye@gmail.com');
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
    emailVerified: true,
    phoneNumber: '+2348012345678',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  console.log('📝 Creating admin user with data:', {
    ...adminUserData,
    password: '[HASHED]' // Don't log the actual password
  });

  try {
    // Create the admin user
    const adminUser = await userModel.create(adminUserData);
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: ogunbiye@gmail.com');
    console.log('🔑 Password: admin123');
    console.log('👑 Role: SUPER_ADMIN');
    console.log('🆔 User ID:', adminUser._id || adminUser.id);
    
    return adminUser;
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    throw error;
  }
}

// Specific implementations for different ORMs/databases

// For MongoDB/Mongoose
async function seedWithMongoose(UserModel) {
  return await createAdminUser({
    findOne: (query) => UserModel.findOne(query),
    create: (data) => UserModel.create(data)
  });
}

// For Prisma
async function seedWithPrisma(prisma) {
  return await createAdminUser({
    findOne: (query) => prisma.user.findFirst({ where: query }),
    create: (data) => prisma.user.create({ data })
  });
}

// For Sequelize
async function seedWithSequelize(UserModel) {
  return await createAdminUser({
    findOne: (query) => UserModel.findOne({ where: query }),
    create: (data) => UserModel.create(data)
  });
}

// Generic function for raw SQL
async function seedWithRawSQL(db, tableName = 'users') {
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  // Check if admin exists
  const checkQuery = `SELECT * FROM ${tableName} WHERE email = ?`;
  const existing = await db.query(checkQuery, ['ogunbiye@gmail.com']);
  
  if (existing && existing.length > 0) {
    console.log('✅ Admin user already exists');
    return existing[0];
  }
  
  // Insert admin user
  const insertQuery = `
    INSERT INTO ${tableName} (
      email, password, firstName, lastName, role, isActive, 
      emailVerified, phoneNumber, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  
  const values = [
    'ogunbiye@gmail.com',
    hashedPassword,
    'Admin',
    'User',
    'SUPER_ADMIN',
    true,
    true,
    '+2348012345678'
  ];
  
  await db.query(insertQuery, values);
  console.log('✅ Admin user created successfully via raw SQL!');
  
  return { email: 'ogunbiye@gmail.com', role: 'SUPER_ADMIN' };
}

// Export all functions
module.exports = {
  createAdminUser,
  seedWithMongoose,
  seedWithPrisma,
  seedWithSequelize,
  seedWithRawSQL
};

// Usage examples:
console.log(`
📚 USAGE EXAMPLES:

// For Mongoose:
const { seedWithMongoose } = require('./database-seed');
const User = require('./models/User');
seedWithMongoose(User);

// For Prisma:
const { seedWithPrisma } = require('./database-seed');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
seedWithPrisma(prisma);

// For Sequelize:
const { seedWithSequelize } = require('./database-seed');
const { User } = require('./models');
seedWithSequelize(User);

// For Raw SQL:
const { seedWithRawSQL } = require('./database-seed');
seedWithRawSQL(yourDbConnection, 'users');
`);

// If running directly, show instructions
if (require.main === module) {
  console.log('⚠️  This script needs to be integrated into your backend.');
  console.log('Copy the appropriate function to your backend seed script.');
  console.log('See usage examples above ☝️');
}