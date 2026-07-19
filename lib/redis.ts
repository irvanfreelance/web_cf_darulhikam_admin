import { Redis } from '@upstash/redis';

// Support both Vercel KV naming (KV_REST_API_*) and legacy UPSTASH_REDIS_REST_* names
const url   = process.env.UPSTASH_REDIS_REST_URL   || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// Only initialize if we have the credentials
export const redis = (url && token) 
  ? new Redis({ url, token })
  : null;

/**
 * Safely invalidate cache keys.
 * Handles cases where Redis is not configured or fails.
 */
export async function invalidateCache(keys: string | string[]) {
  if (!redis) return;
  
  try {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    if (keysArray.length === 0) return;
    
    await redis.del(...keysArray);
  } catch (error) {
    // Log warning but don't crash the request
    console.warn('Redis Invalidation Error:', error);
  }
}

/**
 * Safely flush all cache.
 */
export async function safeFlushCache() {
  if (!redis) return;
  try {
    await redis.flushall();
  } catch (error) {
    console.warn('Redis Flush Error:', error);
  }
}
