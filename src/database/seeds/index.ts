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
              name: 'Men\'s Fashion',
              slug: 'mens-fashion',
              description: 'Stylish clothing and accessories for men',
              isActive: true
            },
            {
              name: 'Women\'s Fashion',
              slug: 'womens-fashion',
              description: 'Trendy outfits and accessories for women',
              isActive: true
            },
            {
              name: 'Traditional Wear',
              slug: 'traditional-wear',
              description: 'Nigerian traditional clothing and attire',
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
      await prisma.product.deleteMany();
      await prisma.category.deleteMany();
      await prisma.address.deleteMany();
      await prisma.user.deleteMany();
      
      // Seed fashion-focused categories
      const categories = await prisma.category.createMany({
        data: [
          {
            name: 'Men\'s Fashion',
            slug: 'mens-fashion',
            description: 'Stylish clothing and accessories for men',
            isActive: true
          },
          {
            name: 'Women\'s Fashion',
            slug: 'womens-fashion',
            description: 'Trendy outfits and accessories for women',
            isActive: true
          },
          {
            name: 'Shoes & Footwear',
            slug: 'shoes-footwear',
            description: 'Fashionable shoes for all occasions',
            isActive: true
          },
          {
            name: 'Bags & Accessories',
            slug: 'bags-accessories',
            description: 'Handbags, jewelry, and fashion accessories',
            isActive: true
          },
          {
            name: 'Traditional Wear',
            slug: 'traditional-wear',
            description: 'Nigerian traditional clothing and attire',
            isActive: true
          }
        ]
      });
      
      console.log(`✅ ${categories.count} categories seeded`);
      
      // Get created categories for product seeding
      const createdCategories = await prisma.category.findMany();
      
      // Seed fashion products with Nigerian market pricing
      const products = await prisma.product.createMany({
        data: [
          {
            name: 'Classic Men\'s Ankara Shirt',
            slug: 'classic-mens-ankara-shirt',
            description: 'Premium quality Nigerian Ankara fabric shirt with modern tailoring',
            price: 2500000, // ₦25,000 in kobo
            costPrice: 1800000,
            sku: 'ANKM001',
            categoryId: createdCategories.find(c => c.slug === 'mens-fashion')?.id || createdCategories[0].id,
            trackQuantity: true,
            stock: 30,
            isActive: true,
            isFeatured: true,
            weight: 250,
            dimensions: 'S, M, L, XL, XXL'
          },
          {
            name: 'Elegant Gele Head Wrap',
            slug: 'elegant-gele-head-wrap',
            description: 'Beautiful Nigerian gele for special occasions and weddings',
            price: 1500000, // ₦15,000 in kobo
            costPrice: 1000000,
            sku: 'GELEW001',
            categoryId: createdCategories.find(c => c.slug === 'womens-fashion')?.id || createdCategories[1].id,
            trackQuantity: true,
            stock: 45,
            isActive: true,
            isFeatured: true,
            weight: 150,
            dimensions: '2.5m x 1.2m'
          },
          {
            name: 'Designer Agbada with Embroidery',
            slug: 'designer-agbada-embroidery',
            description: 'Luxurious Nigerian Agbada with intricate embroidery for special events',
            price: 8500000, // ₦85,000 in kobo
            costPrice: 6000000,
            sku: 'AGBEM001',
            categoryId: createdCategories.find(c => c.slug === 'traditional-wear')?.id || createdCategories[4].id,
            trackQuantity: true,
            stock: 15,
            isActive: true,
            isFeatured: true,
            weight: 800,
            dimensions: 'S, M, L, XL, XXL'
          },
          {
            name: 'Premium Leather Loafers',
            slug: 'premium-leather-loafers',
            description: 'Italian-style leather loafers perfect for business and casual wear',
            price: 4500000, // ₦45,000 in kobo
            costPrice: 3200000,
            sku: 'LOAFM001',
            categoryId: createdCategories.find(c => c.slug === 'shoes-footwear')?.id || createdCategories[2].id,
            trackQuantity: true,
            stock: 25,
            isActive: true,
            isFeatured: false,
            weight: 600,
            dimensions: '40, 41, 42, 43, 44, 45'
          },
          {
            name: 'Handwoven Aso-Oke Fabric',
            slug: 'handwoven-aso-oke-fabric',
            description: 'Authentic handwoven Aso-Oke fabric for traditional Nigerian attire',
            price: 3500000, // ₦35,000 in kobo
            costPrice: 2500000,
            sku: 'ASOOKF001',
            categoryId: createdCategories.find(c => c.slug === 'traditional-wear')?.id || createdCategories[4].id,
            trackQuantity: true,
            stock: 20,
            isActive: true,
            isFeatured: true,
            weight: 400,
            dimensions: '5 yards'
          },
          {
            name: 'Stylish Ankara Handbag',
            slug: 'stylish-ankara-handbag',
            description: 'Fashionable handbag made from authentic Nigerian Ankara fabric',
            price: 1800000, // ₦18,000 in kobo
            costPrice: 1200000,
            sku: 'ANKBAG001',
            categoryId: createdCategories.find(c => c.slug === 'bags-accessories')?.id || createdCategories[3].id,
            trackQuantity: true,
            stock: 35,
            isActive: true,
            isFeatured: false,
            weight: 300,
            dimensions: '35cm x 25cm x 15cm'
          },
          {
            name: 'Women\'s Kaftan Dress',
            slug: 'womens-kaftan-dress',
            description: 'Flowing kaftan dress in vibrant African prints, perfect for any occasion',
            price: 2200000, // ₦22,000 in kobo
            costPrice: 1600000,
            sku: 'KAFTW001',
            categoryId: createdCategories.find(c => c.slug === 'womens-fashion')?.id || createdCategories[1].id,
            trackQuantity: true,
            stock: 40,
            isActive: true,
            isFeatured: true,
            weight: 350,
            dimensions: 'S, M, L, XL, XXL'
          },
          {
            name: 'Gold-Plated African Jewelry Set',
            slug: 'gold-plated-african-jewelry-set',
            description: 'Beautiful gold-plated jewelry set with traditional African motifs',
            price: 2800000, // ₦28,000 in kobo
            costPrice: 2000000,
            sku: 'JEWSET001',
            categoryId: createdCategories.find(c => c.slug === 'bags-accessories')?.id || createdCategories[3].id,
            trackQuantity: true,
            stock: 18,
            isActive: true,
            isFeatured: true,
            weight: 100,
            dimensions: 'One Size'
          },
          {
            name: 'Casual Denim Jacket',
            slug: 'casual-denim-jacket',
            description: 'Trendy denim jacket perfect for layering and casual outfits',
            price: 3200000, // ₦32,000 in kobo
            costPrice: 2400000,
            sku: 'DENIM001',
            categoryId: createdCategories.find(c => c.slug === 'mens-fashion')?.id || createdCategories[0].id,
            trackQuantity: true,
            stock: 28,
            isActive: true,
            isFeatured: false,
            weight: 450,
            dimensions: 'S, M, L, XL, XXL'
          },
          {
            name: 'High-Heel Sandals',
            slug: 'high-heel-sandals',
            description: 'Elegant high-heel sandals for formal occasions and parties',
            price: 2600000, // ₦26,000 in kobo
            costPrice: 1900000,
            sku: 'HEELSF001',
            categoryId: createdCategories.find(c => c.slug === 'shoes-footwear')?.id || createdCategories[2].id,
            trackQuantity: true,
            stock: 22,
            isActive: true,
            isFeatured: false,
            weight: 400,
            dimensions: '36, 37, 38, 39, 40, 41'
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