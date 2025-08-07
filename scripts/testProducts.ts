#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testProducts() {
  console.log("🧪 Testing direct Prisma product queries...");

  try {
    // Test 1: Count products
    const productCount = await prisma.product.count();
    console.log(`📊 Total products in database: ${productCount}`);

    // Test 2: Get first 5 products with basic info
    const products = await prisma.product.findMany({
      take: 5,
      include: {
        category: true,
        images: true,
      }
    });

    console.log("🛍️  First 5 products:");
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Price: ₦${product.price}`);
      console.log(`   Category: ${product.category.name}`);
      console.log(`   Images: ${product.images.length}`);
      console.log(`   Stock: ${product.stock}`);
      console.log("---");
    });

    // Test 3: Count categories
    const categoryCount = await prisma.category.count();
    console.log(`📁 Total categories in database: ${categoryCount}`);

    // Test 4: Get categories
    const categories = await prisma.category.findMany({
      take: 5,
      include: {
        products: true
      }
    });

    console.log("📂 First 5 categories:");
    categories.forEach((category, index) => {
      console.log(`${index + 1}. ${category.name}`);
      console.log(`   Products: ${category.products.length}`);
      console.log(`   Description: ${category.description}`);
      console.log("---");
    });

    console.log("✅ Database queries working perfectly!");
    console.log("\n🚀 Ready for API endpoint testing!");

  } catch (error) {
    console.error("❌ Database query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testProducts();