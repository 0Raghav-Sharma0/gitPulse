// Quick script to clear corrupted Vercel KV cache
import { kv } from '@vercel/kv';

console.log('🗑️  Clearing corrupted cache entries...');

try {
    // Get all keys
    const keys = await kv.keys('*');
    console.log(`Found ${keys.length} cache keys`);

    // Delete all
    if (keys.length > 0) {
        await Promise.all(keys.map(key => kv.del(key)));
        console.log('✅ Cache cleared successfully!');
    } else {
        console.log('ℹ️  No cache entries found');
    }
} catch (error) {
    console.error('❌ Error clearing cache:', error);
    process.exit(1);
}

process.exit(0);
