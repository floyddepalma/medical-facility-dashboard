import { Pool, PoolConfig } from 'pg';
import { createClient, RedisClientType } from 'redis';

// PostgreSQL connection pool
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
  max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const pool = new Pool(poolConfig);

// Test database connection
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Redis client (optional - disabled by default for simplicity)
let redisClient: RedisClientType | null = null;
let redisAvailable = false;
let redisEnabled = process.env.REDIS_ENABLED === 'true';

export async function getRedisClient(): Promise<RedisClientType | null> {
  // Skip Redis entirely if not enabled
  if (!redisEnabled || !redisAvailable) {
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      redisClient.on('error', (err) => {
        console.error('Redis error:', err);
        redisAvailable = false;
      });

      await redisClient.connect();
      console.log('✓ Redis connected');
      redisAvailable = true;
    } catch (err) {
      console.warn('⚠ Redis not available, running without cache');
      redisAvailable = false;
      redisClient = null;
    }
  }

  return redisClient;
}

// Initialize Redis if enabled
export async function initRedis(): Promise<void> {
  if (redisEnabled) {
    await getRedisClient();
  }
}

export async function closeConnections(): Promise<void> {
  await pool.end();
  if (redisClient) {
    await redisClient.quit();
  }
}
