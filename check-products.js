const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.product.findMany({
      take: 3,
      select: { 
        id: true, 
        name: true, 
        price: true, 
        isActive: true,
        stock: true
      }
    });
    
    console.log('📦 Products in database:');
    if (products.length === 0) {
      console.log('   ❌ No products found');
    } else {
      products.forEach(p => {
        console.log(`   ✅ ${p.id}: ${p.name} - ₦${p.price} (Stock: ${p.stock}, Active: ${p.isActive})`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();