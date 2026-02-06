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

// Redis client
let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
    });

    await redisClient.connect();
  }

  return redisClient;
}

export async function closeConnections(): Promise<void> {
  await pool.end();
  if (redisClient) {
    await redisClient.quit();
  }
}
