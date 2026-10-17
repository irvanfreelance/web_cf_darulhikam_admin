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
 * Invalidate all campaign-related cache keys across both admin and public app.
 * Pass slug to also invalidate the specific detail page cache.
 */
export async function invalidateCampaignCache(slug?: string) {
  if (!redis) return;
  try {
    const keys: string[] = [
      'campaigns',
      'campaigns_list',
      'api:campaigns:all',
      'api:campaigns:carousel_v1',
      'api:categories:with_campaigns_v4',
      'web:footer_programs',
    ];
    if (slug) keys.push(`api:campaigns:detail:${slug}`);

    // Invalidate all search result caches by pattern
    const searchKeys = await redis.keys('api:campaigns:search:*');
    if (searchKeys.length > 0) keys.push(...searchKeys);

    await redis.del(...keys);
  } catch (error) {
    console.warn('Redis Campaign Cache Invalidation Error:', error);
  }
}

/**
 * Trigger Next.js on-demand revalidation on the public app.
 * Called after any campaign mutation so pages refresh immediately.
 */
export async function triggerPublicRevalidate(slug?: string) {
  const url = process.env.PUBLIC_APP_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) return;
  try {
    await fetch(`${url}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, slug }),
    });
  } catch {
    // non-critical — don't fail the main request
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
