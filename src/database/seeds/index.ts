#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Check if we're in production mode
    const isProduction = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      console.log('🏭 Production mode detected');
      
      // In production, only seed essential data if not already exists
      const existingCategories = await prisma.category.count();
      
      if (existingCategories === 0) {
        console.log('📦 Seeding essential categories...');
        
        await prisma.category.createMany({
          data: [
            {
              name: 'Electronics',
              slug: 'electronics',
              description: 'Electronic devices and accessories',
              isActive: true
            },
            {
              name: 'Fashion',
              slug: 'fashion',
              description: 'Clothing and fashion accessories',
              isActive: true
            },
            {
              name: 'Home & Living',
              slug: 'home-living',
              description: 'Home decor and living essentials',
              isActive: true
            }
          ]
        });
        
        console.log('✅ Essential categories seeded');
      } else {
        console.log('✅ Categories already exist, skipping...');
      }
      
    } else {
      console.log('🚧 Development mode detected');
      
      // Development seeding - more comprehensive test data
      console.log('📦 Seeding development data...');
      
      // Clear existing data in development
      await prisma.productReview.deleteMany();
      await prisma.orderItem.deleteMany();
      await prisma.cartItem.deleteMany();
      await prisma.order.deleteMany();
      await prisma.cart.deleteMany();
      await prisma.product.deleteMany();
      await prisma.category.deleteMany();
      await prisma.address.deleteMany();
      await prisma.user.deleteMany();
      
      // Seed categories
      const categories = await prisma.category.createMany({
        data: [
          {
            name: 'Electronics',
            slug: 'electronics',
            description: 'Electronic devices and accessories',
            isActive: true
          },
          {
            name: 'Fashion',
            slug: 'fashion',
            description: 'Clothing and fashion accessories',
            isActive: true
          },
          {
            name: 'Home & Living',
            slug: 'home-living',
            description: 'Home decor and living essentials',
            isActive: true
          },
          {
            name: 'Books',
            slug: 'books',
            description: 'Books and educational materials',
            isActive: true
          },
          {
            name: 'Sports',
            slug: 'sports',
            description: 'Sports equipment and accessories',
            isActive: true
          }
        ]
      });
      
      console.log(`✅ ${categories.count} categories seeded`);
      
      // Get created categories for product seeding
      const createdCategories = await prisma.category.findMany();
      
      // Seed sample products
      const products = await prisma.product.createMany({
        data: [
          {
            name: 'iPhone 15 Pro Max',
            slug: 'iphone-15-pro-max',
            description: 'Latest iPhone with advanced features',
            price: 75000000, // ₦750,000 in kobo
            costPrice: 65000000,
            sku: 'IPHONE15PM001',
            categoryId: createdCategories.find(c => c.slug === 'electronics')?.id || createdCategories[0].id,
            stockQuantity: 25,
            isActive: true,
            isFeatured: true,
            weight: 500,
            dimensions: '15x7.5x1cm'
          },
          {
            name: 'Nike Air Max 270',
            slug: 'nike-air-max-270',
            description: 'Comfortable running shoes',
            price: 8500000, // ₦85,000 in kobo
            costPrice: 6000000,
            sku: 'NIKE270001',
            categoryId: createdCategories.find(c => c.slug === 'fashion')?.id || createdCategories[1].id,
            stockQuantity: 50,
            isActive: true,
            isFeatured: false,
            weight: 300,
            dimensions: '30x20x10cm'
          },
          {
            name: 'Samsung 4K Smart TV 55"',
            slug: 'samsung-4k-smart-tv-55',
            description: '55-inch 4K Smart TV with HDR',
            price: 45000000, // ₦450,000 in kobo
            costPrice: 38000000,
            sku: 'SAMSUNG55TV001',
            categoryId: createdCategories.find(c => c.slug === 'electronics')?.id || createdCategories[0].id,
            stockQuantity: 15,
            isActive: true,
            isFeatured: true,
            weight: 18000,
            dimensions: '123x71x6cm'
          }
        ]
      });
      
      console.log(`✅ ${products.count} products seeded`);
    }
    
    console.log('🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { main as seedDatabase };