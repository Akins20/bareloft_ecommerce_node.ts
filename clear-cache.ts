import { GlobalRedisService } from './src/utils/globalRedisService';

async function clearCache() {
  try {
    console.log('🔄 Connecting to Redis...');
    const redis = await GlobalRedisService.getInstance();

    console.log('🗑️ Clearing all cache...');
    await redis.flushdb();

    console.log('✅ Cache cleared successfully!');
    await redis.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    process.exit(1);
  }
}

clearCache();
